import 'reflect-metadata';

import '@/lib/utils/di';

import { IS3ServiceAdapter, ISQSServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { requestContacts } from '@/lib/utils/requestContacts';
import { LambdaResponse } from '@/lib/utils/responses';
import { APIGatewayProxyHandler } from 'aws-lambda';
import _ from 'lodash';
import { container } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { contactsArraySchema, validateEnrichmentInput } from './validate';

// Lambda handler
export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info('[PRIMER CREATE] Processing request', {
    event: event.body?.length,
  });

  try {
    const statusRepository = container.resolve<IStatusRepository>('StatusRepository');
    const s3Adapter = container.resolve<IS3ServiceAdapter>('S3ServiceAdapter');
    const sqsAdapter = container.resolve<ISQSServiceAdapter>('SQSServiceAdapter');

    const body = JSON.parse(event?.body || '');
    const { contacts, fields_to_enrich } = validateEnrichmentInput(body);

    let contactsArray: z.infer<typeof contactsArraySchema> = [];
    if (Array.isArray(contacts)) {
      contactsArray = contacts;
    } else {
      const plainContacts = await requestContacts(contacts);
      contactsArray = plainContacts?.contacts || [];
    }

    if (contactsArray.length === 0) {
      return LambdaResponse.error('No contacts found');
    }

    // Generate a unique request ID
    const requestId = uuidv4();

    // Add the enrichment request to DynamoDB
    await s3Adapter.uploadObject(
      `${requestId}/input.json`,
      JSON.stringify({ contacts: contactsArray, fields_to_enrich }),
    );

    // Upload an empty output file to S3
    await s3Adapter.uploadObject(`${requestId}/output.json`, JSON.stringify({ enriched_contacts: [] }));

    const BUCKET_NAME = container.resolve<string>('BucketName');
    const downloadUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${requestId}/output.json`;

    // Divide contacts into batches of 100 and save the request to DynamoDB
    const batches = _.chunk(contactsArray, 100);
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
