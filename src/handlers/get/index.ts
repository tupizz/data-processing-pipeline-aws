import 'reflect-metadata';

import '@/lib/utils/di';

import { IStatusRepository } from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { LambdaResponse } from '@/lib/utils/responses';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { container } from 'tsyringe';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('[PRIMER GET] Getting status', {
      event: event.pathParameters?.id,
    });

    const id = event?.pathParameters?.id;
    if (!id) {
      return LambdaResponse.badRequest('Missing requestId');
    }

    const statusRepository = container.resolve<IStatusRepository>('StatusRepository');
    const result = await statusRepository.getStatus(id);

    return LambdaResponse.success(result);
  } catch (error) {
    logger.error('[PRIMER GET] Error getting status', { error });
    return LambdaResponse.error('An internal server error occurred.');
  }
};
