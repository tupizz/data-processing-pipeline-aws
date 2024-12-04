import "@/lib/utils/di";

import { IStatusRepository } from "@/lib/repository";
import logger from "@/lib/utils/logger";
import { SQSHandler } from "aws-lambda";
import { container } from "tsyringe";

export const handler: SQSHandler = async (event) => {
  try {
    logger.info("[PRIMER PROCESS] Processing batch", {
      event: event.Records[0].body.length,
    });

    const statusRepository =
      container.resolve<IStatusRepository>("StatusRepository");

    for (const record of event.Records) {
      const { requestId, batch } = JSON.parse(record.body);

      // TODO: Process batch
      logger.info({
        message: `Processing batch for request ${requestId}`,
        requestId,
        batchLength: batch.length,
      });

      // Increment processedBatches count in the status repository
      const requestStatus = await statusRepository.incrementProcessedBatches(
        requestId
      );

      // If all batches are processed, mark the request as "complete"
      if (requestStatus.processedBatches === requestStatus.totalBatches) {
        await statusRepository.updateStatus(requestId, "completed");
        logger.info(`Request ${requestId} marked as complete.`);
      }
    }
  } catch (error) {
    logger.error({
      message: "Error processing batch",
      error,
    });
    
    throw error;
  }
};
