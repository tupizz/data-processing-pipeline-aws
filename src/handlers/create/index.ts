import 'reflect-metadata';

import '@/lib/utils/di';

import { IS3ServiceAdapter, ISQSServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { LambdaResponse } from '@/lib/utils/responses';
import { APIGatewayProxyHandler } from 'aws-lambda';
import _ from 'lodash';
import { container } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validateEnrichmentInput } from './validate';

// Lambda handler
export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info('[PRIMER CREATE] Processing request', {
    event: event.body?.length,
  });

  // IMPROVENTS:
  // 1) we could receive instead of huge JSON a file in S3, improve latency and cost.
  //
  // 2) When dealing with high volume of data (> 100k contacts) we should use a more efficient way to process the data.
  // we could post the request to SQS and process it in a different lambda. And then fan-out the results to the processing lambda.
  //
  // 3) based on the input create a signature using the SHA-256 algorithm.
  // Why having this? To ensure we don't process the same request twice.
  // save the signature in the request metadata.
  // when the enrichment is done, check the signature and return the result.
  // Why SHA-256? Because it's a secure hash (collision resistance) function that is widely used for creating digital signatures.
  // export const getJsonHash = (obj: object): string => {
  //   const canonicalJSON = JSON.stringify(obj, Object.keys(obj).sort());
  //   return crypto.createHash("sha256").update(canonicalJSON, "utf8").digest("hex");
  // };

  try {
    const statusRepository = container.resolve<IStatusRepository>('StatusRepository');
    const s3Adapter = container.resolve<IS3ServiceAdapter>('S3ServiceAdapter');
    const sqsAdapter = container.resolve<ISQSServiceAdapter>('SQSServiceAdapter');

    const body = JSON.parse(event?.body || '');
    const { contacts, fields_to_enrich } = validateEnrichmentInput(body);

    // Generate a unique request ID
    const requestId = uuidv4();

    // Add the enrichment request to DynamoDB
    await s3Adapter.uploadObject(`${requestId}/input.json`, JSON.stringify({ contacts, fields_to_enrich }));

    // Upload an empty output file to S3
    await s3Adapter.uploadObject(`${requestId}/output.json`, JSON.stringify({ enriched_contacts: [] }));

    const BUCKET_NAME = container.resolve<string>('BucketName');
    const downloadUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${requestId}/output.json`;

    // Divide contacts into batches of 100 and save the request to DynamoDB
    const batches = _.chunk(contacts, 100);
    await statusRepository.saveRequest(requestId, batches.length, 'processing', downloadUrl);

    // Map batches to SQS messages and send them to the queue
    const messages = batches.map((batch, index) => ({
      id: `${requestId}-${index}`,
      body: {
        requestId,
        outputKey: `${requestId}/output.json`,
        batch,
      },
    }));

    // Send messages in chunks of 10 to comply with SQS limitations
    const messageChunks = _.chunk(messages, 10);
    for (const chunk of messageChunks) {
      await sqsAdapter.sendMessages(chunk);
    }

    return LambdaResponse.success({
      message: 'Request accepted',
      requestId,
      downloadUrl,
    });
  } catch (error) {
    logger.error('Error processing request:', { error });
    if (error instanceof z.ZodError) {
      return LambdaResponse.validationError(error);
    }
    return LambdaResponse.error('An internal server error occurred.');
  }
};
