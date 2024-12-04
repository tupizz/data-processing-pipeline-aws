import { Logger } from "@aws-lambda-powertools/logger";

import { LogFormatter, LogItem } from "@aws-lambda-powertools/logger";
import type { LogAttributes, UnformattedAttributes } from "@aws-lambda-powertools/logger/types";

type PrimerLog = LogAttributes;

class PrimerLogFormatter extends LogFormatter {
  public formatAttributes(attributes: UnformattedAttributes, additionalLogAttributes: LogAttributes): LogItem {
    const baseAttributes: PrimerLog = {
      message: attributes.message,
      service: attributes.serviceName,
      environment: attributes.environment,
      awsRegion: attributes.awsRegion,
      correlationIds: {
        awsRequestId: attributes.lambdaContext?.awsRequestId,
        xRayTraceId: attributes.xRayTraceId,
      },
      lambdaFunction: {
        name: attributes.lambdaContext?.functionName,
        arn: attributes.lambdaContext?.invokedFunctionArn,
        memoryLimitInMB: attributes.lambdaContext?.memoryLimitInMB,
        version: attributes.lambdaContext?.functionVersion,
        coldStart: attributes.lambdaContext?.coldStart,
      },
      logLevel: attributes.logLevel,
      timestamp: this.formatTimestamp(attributes.timestamp),
      logger: {
        sampleRateValue: attributes.sampleRateValue,
      },
    };

    const logItem = new LogItem({ attributes: baseAttributes });
    logItem.addAttributes(additionalLogAttributes); 

    return logItem;
  }
}

const logger = new Logger({
  logFormatter: new PrimerLogFormatter(),
  sampleRateValue: 0.5,
  persistentLogAttributes: {
    awsAccountId: process.env.AWS_ACCOUNT_ID,
    logger: {
      name: "@aws-lambda-powertools/logger",
      version: "0.0.1",
    },
  },
});

export default logger;
