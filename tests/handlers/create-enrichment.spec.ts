import { handler } from '@/handlers/create';
import { IS3ServiceAdapter, ISQSServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import logger from '@/lib/utils/logger';
import { LambdaResponse } from '@/lib/utils/responses';
import 'reflect-metadata';
import { container } from 'tsyringe';

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  default: {
    error: jest.fn(),
  },
}));

describe('Create Enrichment Lambda Handler', () => {
  let s3ServiceMock: jest.Mocked<IS3ServiceAdapter>;
  let sqsServiceMock: jest.Mocked<ISQSServiceAdapter>;
  let statusRepositoryMock: jest.Mocked<IStatusRepository>;

  const mockContext = {
    awsRequestId: 'test-request-id',
  } as any;

  beforeAll(() => {
    container.reset();

    container.register('BucketName', { useValue: 'primer-test-bucket' });
    container.register('ProcessingQueueUrl', { useValue: 'URL' });
    container.register('StatusTableName', { useValue: 'primer-test-status' });

    s3ServiceMock = { uploadObject: jest.fn(), getObject: jest.fn() } as jest.Mocked<IS3ServiceAdapter>;
    sqsServiceMock = { sendMessages: jest.fn() } as jest.Mocked<ISQSServiceAdapter>;
    statusRepositoryMock = {
      saveRequest: jest.fn(),
      getStatus: jest.fn(),
      updateStatus: jest.fn(),
      incrementProcessedBatches: jest.fn(),
    } as jest.Mocked<IStatusRepository>;

    // Register with the mocks
    container.register('S3ServiceAdapter', { useValue: s3ServiceMock });
    container.register('SQSServiceAdapter', { useValue: sqsServiceMock });
    container.register('StatusRepository', { useValue: statusRepositoryMock });

    // Create spies for LambdaResponse methods
    jest.spyOn(LambdaResponse, 'success');
    jest.spyOn(LambdaResponse, 'error');
    jest.spyOn(LambdaResponse, 'validationError');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return validation error for invalid input', async () => {
    const mockEvent = {
      body: JSON.stringify({
        contacts: [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            company_domain: 'example@gmail.com',
          },
        ],
        fields_to_enrich: ['email'],
      }),
    } as any;

    const result = await handler(mockEvent, mockContext, () => {});

    expect(s3ServiceMock.uploadObject).toHaveBeenCalledTimes(2);
    expect(statusRepositoryMock.saveRequest).toHaveBeenCalled();
    expect(sqsServiceMock.sendMessages).toHaveBeenCalled();
    expect(LambdaResponse.success).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Request accepted',
        requestId: expect.any(String),
        downloadUrl: expect.any(String),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ statusCode: 200 }));
  });

  it('should return validation error for invalid input', async () => {
    const mockEvent = {
      body: JSON.stringify({
        contacts: 'invalid', // Invalid type for testing
        fields_to_enrich: ['email'],
      }),
    } as any;

    const result = await handler(mockEvent, mockContext, () => {});

    expect(LambdaResponse.validationError).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ statusCode: 400 }));
  });

  it('should handle internal errors gracefully', async () => {
    const mockEvent = {
      body: JSON.stringify({
        contacts: [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            company_domain: 'example@gmail.com',
          },
        ],
        fields_to_enrich: ['email'],
      }),
    } as any;

    s3ServiceMock.uploadObject.mockRejectedValueOnce(new Error('S3 error'));

    const result = await handler(mockEvent, mockContext, () => {});

    expect(logger.error).toHaveBeenCalledWith('Error processing request:', {
      error: expect.any(Error),
    });
    expect(LambdaResponse.error).toHaveBeenCalledWith('An internal server error occurred.');
    expect(result).toEqual(expect.objectContaining({ statusCode: 500 }));
  });
});
