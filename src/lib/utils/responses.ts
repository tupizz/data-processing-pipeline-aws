import { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export class LambdaResponse {
  private static createResponse(statusCode: number, body: any): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(body),
    };
  }

  static success(data: any, statusCode: number = 200): APIGatewayProxyResult {
    return this.createResponse(statusCode, data);
  }

  static accepted(requestId: string, message: string = 'Request accepted'): APIGatewayProxyResult {
    return this.createResponse(202, {
      requestId,
      message,
    });
  }

  static error(message: string, statusCode: number = 500): APIGatewayProxyResult {
    return this.createResponse(statusCode, {
      message,
    });
  }

  static badRequest(message: string, statusCode: number = 400): APIGatewayProxyResult {
    return this.createResponse(statusCode, {
      message,
    });
  }

  static validationError(error: z.ZodError): APIGatewayProxyResult {
    return this.createResponse(400, {
      message: 'Validation failed',
      issues: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
}