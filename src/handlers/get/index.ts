import "reflect-metadata";

import "@/lib/utils/di";

import { IStatusRepository } from "@/lib/repository";
import logger from "@/lib/utils/logger";
import { LambdaResponse } from "@/lib/utils/responses";
import { APIGatewayProxyHandler } from "aws-lambda";
import { container } from "tsyringe";

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("[PRIMER GET] Getting status", {
    event: event.pathParameters?.id,
  });

  const id = event?.pathParameters?.id;
  if (!id) {
    return LambdaResponse.error("Missing requestId");
  }

  const statusRepository = container.resolve<IStatusRepository>("StatusRepository");
  const result = await statusRepository.getStatus(id);

  return LambdaResponse.success(result);
};
