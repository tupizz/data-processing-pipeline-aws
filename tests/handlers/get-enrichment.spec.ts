import 'reflect-metadata';

import { handler } from '@/handlers/get';
import { IS3ServiceAdapter, ISQSServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import { LambdaResponse } from '@/lib/utils/responses';
import { container } from 'tsyringe';

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Get Status Lambda Handler', () => {
  let s3ServiceMock: jest.Mocked<IS3ServiceAdapter>;
  let sqsServiceMock: jest.Mocked<ISQSServiceAdapter>;
  let statusRepositoryMock: jest.Mocked<IStatusRepository>;

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
    jest.spyOn(LambdaResponse, 'badRequest');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return status successfully for a valid requestId', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'test-request-id',
      },
    } as any;

    const mockResult = {
      requestId: 'test-request-id',
      status: 'processing',
      totalBatches: 10,
      processedBatches: 5,
      createdAt: new Date().toISOString(),
    };

    statusRepositoryMock.getStatus.mockResolvedValue(mockResult);

    const result = await handler(mockEvent, {} as any, () => {});

    expect(statusRepositoryMock.getStatus).toHaveBeenCalledWith('test-request-id');
    expect(LambdaResponse.success).toHaveBeenCalledWith(mockResult);
    expect(result).toEqual(expect.objectContaining({ statusCode: 200 }));
  });

  it('should return an error for a missing requestId', async () => {
    const mockEvent = {
      pathParameters: null,
    } as any;

    const result = await handler(mockEvent, {} as any, () => {});

    expect(LambdaResponse.badRequest).toHaveBeenCalledWith('Missing requestId');
    expect(result).toEqual(expect.objectContaining({ statusCode: 400 }));
  });

  it('should handle errors from the repository gracefully', async () => {
    const mockEvent = {
      pathParameters: { id: 'test-request-id' },
    } as any;

    statusRepositoryMock.getStatus.mockRejectedValue(new Error('Database error'));

    const result = await handler(mockEvent, {} as any, () => {});

    expect(statusRepositoryMock.getStatus).toHaveBeenCalledWith('test-request-id');
    expect(LambdaResponse.error).toHaveBeenCalledWith('An internal server error occurred.');
    expect(result).toEqual(expect.objectContaining({ statusCode: 500 }));
  });
});
