import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { inject, injectable } from "tsyringe";

export interface StatusRecord {
  requestId: string;
  status: string;
  createdAt: string;
  totalBatches: number;
  processedBatches: number;
}

export interface IStatusRepository {
  saveRequest(
    requestId: string,
    totalBatches: number,
    status: "processing" | "completed" | "failed",
    outputFileKey: string
  ): Promise<void>;
  getStatus(requestId: string): Promise<StatusRecord | null>;
  updateStatus(requestId: string, status: "processing" | "completed" | "failed"): Promise<void>;
  incrementProcessedBatches(requestId: string): Promise<{ processedBatches: number; totalBatches: number }>;
}

@injectable()
export class StatusRepository implements IStatusRepository {
  private readonly tableName: string;
  private readonly dynamoClient: DynamoDBClient;

  constructor(@inject("StatusTableName") tableName: string) {
    this.tableName = tableName;
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  }

  async saveRequest(
    requestId: string,
    totalBatches: number,
    status: "processing" | "completed" | "failed",
    outputFileKey: string
  ): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        requestId: { S: requestId },
        status: { S: status },
        createdAt: { S: new Date().toISOString() },
        totalBatches: { N: totalBatches.toString() },
        processedBatches: { N: "0" },
        outputFileKey: { S: outputFileKey },
      },
    };

    await this.dynamoClient.send(new PutItemCommand(params));
  }

  async updateStatus(requestId: string, status: "processing" | "completed" | "failed"): Promise<void> {
    const params = {
      TableName: this.tableName,
      Key: { requestId: { S: requestId } },
      UpdateExpression: "SET #st = :status",
      ExpressionAttributeValues: {
        ":status": { S: status },
      },
      ExpressionAttributeNames: {
        "#st": "status"
      },
    };

    await this.dynamoClient.send(new UpdateItemCommand(params));
  }

  async incrementProcessedBatches(requestId: string): Promise<{ processedBatches: number; totalBatches: number }> {
    const updateParam: UpdateItemCommandInput = {
      TableName: this.tableName,
      Key: { requestId: { S: requestId } },
      UpdateExpression: "SET processedBatches = processedBatches + :inc",
      ExpressionAttributeValues: {
        ":inc": { N: "1" },
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.dynamoClient.send(new UpdateItemCommand(updateParam));

    if (!result.Attributes) throw new Error("Failed to update processed batches");

    return {
      processedBatches: parseInt(result.Attributes.processedBatches.N!, 10),
      totalBatches: parseInt(result.Attributes.totalBatches.N!, 10),
    };
  }

  async getStatus(requestId: string): Promise<StatusRecord | null> {
    const params = {
      TableName: this.tableName,
      Key: { requestId: { S: requestId } },
    };

    const result = await this.dynamoClient.send(new GetItemCommand(params));

    if (!result.Item) return null;

    return {
      requestId: result.Item.requestId.S!,
      status: result.Item.status.S!,
      createdAt: result.Item.createdAt.S!,
      totalBatches: parseInt(result.Item.totalBatches.N!, 10),
      processedBatches: parseInt(result.Item.processedBatches.N!, 10),
    };
  }
}
