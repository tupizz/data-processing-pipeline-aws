import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { inject, injectable } from "tsyringe";

export interface ISQSServiceAdapter {
  sendMessages(messages: Array<{ id: string; body: object }>): Promise<void>;
}

@injectable()
export class SQSServiceAdapter implements ISQSServiceAdapter {
  private readonly sqsClient: SQSClient;

  constructor(@inject("ProcessingQueueUrl") private queueUrl: string) {
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION });
  }

  async sendMessages(messages: Array<{ id: string; body: object }>): Promise<void> {
    const entries = messages.map((msg) => ({
      Id: msg.id,
      MessageBody: JSON.stringify(msg.body),
    }));

    const params = {
      QueueUrl: this.queueUrl,
      Entries: entries,
    };

    await this.sqsClient.send(new SendMessageBatchCommand(params));
  }
}
