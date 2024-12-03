import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyHandler } from "aws-lambda";
import _ from "lodash";

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Initialize AWS clients
const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });


// Zod schema for input validation
const enrichmentSchema = z.object({
  contacts: z
    .array(
      z.object({
        first_name: z.string().min(1, "First name is required"),
        last_name: z.string().min(1, "Last name is required"),
        company_domain: z.string().min(1, "Company domain is required").email(),
      })
    )
    .min(1, "At least one contact must be provided"),
  fields_to_enrich: z
    .array(z.string().min(1))
    .min(1, "At least one field to enrich must be specified"),
});

// Lambda handler
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse and validate input
    const body = JSON.parse(event?.body || "");
    const { contacts, fields_to_enrich } = enrichmentSchema.parse(body);

    // Generate a unique request ID
    const requestId = uuidv4();

    // Divide contacts into batches of 100
    const batches = _.chunk(contacts, 100);

    // Add the enrichment request to DynamoDB
    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.STATUS_TABLE,
        Item: {
          requestId: { S: requestId },
          status: { S: "processing" },
          createdAt: { S: new Date().toISOString() },
          totalBatches: { N: batches.length.toString() },
          processedBatches: { N: "0" },
        },
      })
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.RESULTS_BUCKET,
        Key: `${requestId}/input.json`,
        Body: JSON.stringify({ contacts, fields_to_enrich }),
      })
    );


    // Send batches to SQS
    const messages = batches.map((batch, index) => ({
      Id: `${requestId}-${index}`,
      MessageBody: JSON.stringify({ requestId, batch }),
    }));

    await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: process.env.QUEUE_URL,
        Entries: messages,
      })
    );

    // Return response
    return {
      statusCode: 202,
      body: JSON.stringify({
        requestId,
        message: "Enrichment request accepted and being processed.",
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Validation failed.",
          issues: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        }),
      };
    }

    // Handle other errors
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "An internal server error occurred.",
      }),
    };
  }
};
