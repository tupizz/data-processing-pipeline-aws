import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  const id = event?.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing requestId" }) };
  }

  const result = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.STATUS_TABLE,
      Key: { requestId: { S: id } },
    })
  );

  return { statusCode: 200, body: JSON.stringify(result.Item) };
};
