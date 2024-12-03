import { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { requestId, batch } = JSON.parse(record.body);
    console.log(requestId, batch);
  }
}