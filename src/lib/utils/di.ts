import 'reflect-metadata';

import * as infraModules from '@/lib/infra';
import * as repositoryModules from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { container } from 'tsyringe';

/**
 * Register all environment variables
 */
container.register('StatusTableName', {
  useValue: process.env.STATUS_TABLE || 'enrichment-status',
});
container.register('BucketName', {
  useValue: process.env.RESULTS_BUCKET || 'storage',
});
container.register('ProcessingQueueUrl', {
  useValue: process.env.QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/156041436605/batch-processing-queue',
});

/**
 * Register all infra modules
 */
Object.entries(infraModules).forEach(([key, module]) => {
  logger.info(`Registering ${key} module`);
  if (key.endsWith('Adapter')) {
    container.registerSingleton(key, module as any);
  }
});

/**
 * Register all repository modules
 */
Object.entries(repositoryModules).forEach(([key, module]) => {
  logger.info(`Registering ${key} module`);
  if (key.endsWith('Repository')) {
    container.registerSingleton(key, module as any);
  }
});
