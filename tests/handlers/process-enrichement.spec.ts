import '@/lib/utils/di';

import { handler } from '@/handlers/process';
import { IMockAPIAdapter, IS3ServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';

import { container } from 'tsyringe';

jest.mock('@/lib/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Process Enrichment Lambda Handler', () => {
  let s3ServiceMock: jest.Mocked<IS3ServiceAdapter>;
  let mockAPIAdapterMock: jest.Mocked<IMockAPIAdapter>;
  let statusRepositoryMock: jest.Mocked<IStatusRepository>;

  beforeAll(() => {
    container.reset();

    s3ServiceMock = {
      uploadObject: jest.fn(),
      getObject: jest.fn(),
    } as jest.Mocked<IS3ServiceAdapter>;

    mockAPIAdapterMock = {
      enrich: jest.fn(),
    } as jest.Mocked<IMockAPIAdapter>;

    statusRepositoryMock = {
      saveRequest: jest.fn(),
      getStatus: jest.fn(),
      updateStatus: jest.fn(),
      incrementProcessedBatches: jest.fn(),
    } as jest.Mocked<IStatusRepository>;

    // Register mocks in the container
    container.register('S3ServiceAdapter', { useValue: s3ServiceMock });
    container.register('MockAPIAdapter', { useValue: mockAPIAdapterMock });
    container.register('StatusRepository', { useValue: statusRepositoryMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a single batch and update the request status', async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            requestId: 'test-request-id',
            batch: [{ id: 1, name: 'John Doe' }],
            outputKey: 'test/output.json',
          }),
        },
      ],
    };

    const mockOutput = JSON.stringify({ enriched_contacts: [] });
    const enrichedContacts = [
      {
        id: 1,
        name: 'John Doe',
        enriched: true,
        first_name: 'John',
        last_name: 'Doe',
        company_domain: 'example.com',
        professional_email: 'john.doe@example.com',
        personal_phone: '1234567890',
      },
    ];

    s3ServiceMock.getObject.mockResolvedValue(mockOutput);
    mockAPIAdapterMock.enrich.mockResolvedValue(enrichedContacts);
    statusRepositoryMock.incrementProcessedBatches.mockResolvedValue({
      processedBatches: 1,
      totalBatches: 1,
    });

    await handler(mockEvent as any, {} as any, () => {});

    expect(mockAPIAdapterMock.enrich).toHaveBeenCalledWith([{ id: 1, name: 'John Doe' }]);
    expect(s3ServiceMock.uploadObject).toHaveBeenCalledWith(
      'test/output.json',
      JSON.stringify({ enriched_contacts: enrichedContacts }),
    );
    expect(statusRepositoryMock.incrementProcessedBatches).toHaveBeenCalledWith('test-request-id');
    expect(statusRepositoryMock.updateStatus).toHaveBeenCalledWith('test-request-id', 'completed');
  });

  it('should process multiple batches without marking request as complete', async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            requestId: 'test-request-id',
            batch: [{ id: 2, name: 'Jane Doe' }],
            outputKey: 'test/output.json',
          }),
        },
      ],
    };

    const mockOutput = JSON.stringify({ enriched_contacts: [] });
    const enrichedContacts = [
      {
        id: 1,
        name: 'John Doe',
        enriched: true,
        first_name: 'John',
        last_name: 'Doe',
        company_domain: 'example.com',
        professional_email: 'john.doe@example.com',
        personal_phone: '1234567890',
      },
    ];

    s3ServiceMock.getObject.mockResolvedValue(mockOutput);
    mockAPIAdapterMock.enrich.mockResolvedValue(enrichedContacts);
    statusRepositoryMock.incrementProcessedBatches.mockResolvedValue({
      processedBatches: 1,
      totalBatches: 2,
    });

    await handler(mockEvent as any, {} as any, () => {});

    expect(mockAPIAdapterMock.enrich).toHaveBeenCalledWith([{ id: 2, name: 'Jane Doe' }]);
    expect(s3ServiceMock.uploadObject).toHaveBeenCalledWith(
      'test/output.json',
      JSON.stringify({ enriched_contacts: enrichedContacts }),
    );
    expect(statusRepositoryMock.incrementProcessedBatches).toHaveBeenCalledWith('test-request-id');
    expect(statusRepositoryMock.updateStatus).not.toHaveBeenCalled();
  });

  it('should handle errors and log them', async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            requestId: 'test-request-id',
            batch: [{ id: 3, name: 'Error User' }],
            outputKey: 'test/output.json',
          }),
        },
      ],
    };

    mockAPIAdapterMock.enrich.mockRejectedValue(new Error('Enrichment error'));

    await expect(handler(mockEvent as any, {} as any, () => {})).rejects.toThrow('Enrichment error');

    expect(mockAPIAdapterMock.enrich).toHaveBeenCalledWith([{ id: 3, name: 'Error User' }]);
  });
});
