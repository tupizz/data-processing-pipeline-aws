import '@/lib/utils/di';

import { EnrichedContact, IMockAPIAdapter, IS3ServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { Retryable } from '@/lib/utils/Retryable';
import { SQSHandler } from 'aws-lambda';
import { container } from 'tsyringe';

export const handler: SQSHandler = async (event) => {
  try {
    logger.info('[PRIMER PROCESS] Processing batch', {
      event: event.Records[0].body.length,
    });

    const statusRepository = container.resolve<IStatusRepository>('StatusRepository');
    const mockAPIAdapter = container.resolve<IMockAPIAdapter>('MockAPIAdapter');
    const s3Adapter = container.resolve<IS3ServiceAdapter>('S3ServiceAdapter');

    for (const record of event.Records) {
      const { requestId, batch, outputKey } = JSON.parse(record.body);

      logger.info({
        message: `Processing batch for request ${requestId}`,
        requestId,
        batchLength: batch.length,
      });

      const MAX_RETRIES = 3;
      const INITIAL_DELAY = 1000;
      const FACTOR = 2;
      const enrichedContacts = await Retryable.retryWithBackoff<EnrichedContact[]>(
        () => mockAPIAdapter.enrich(batch),
        async (attempt) => {
          logger.info(`Retrying batch for request ${requestId} - attempt ${attempt}`);
        },
        MAX_RETRIES,
        INITIAL_DELAY,
        FACTOR,
      );

      const output = await s3Adapter.getObject(outputKey);
      const outputJson = JSON.parse(output);
      outputJson.enriched_contacts = [...outputJson.enriched_contacts, ...enrichedContacts];
      await s3Adapter.uploadObject(outputKey, JSON.stringify(outputJson));

      // Increment processedBatches count in the status repository
      const requestStatus = await statusRepository.incrementProcessedBatches(requestId);

      // If all batches are processed, mark the request as "complete"
      if (requestStatus.processedBatches === requestStatus.totalBatches) {
        await statusRepository.updateStatus(requestId, 'completed');
        logger.info(`Request ${requestId} marked as complete.`);
      }
    }
  } catch (error) {
    logger.error({
      message: 'Error processing batch',
      error,
    });

    throw error;
  }
};
