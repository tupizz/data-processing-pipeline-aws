import 'reflect-metadata';

import { container } from 'tsyringe';

import { IS3ServiceAdapter, ISQSServiceAdapter } from '@/lib/infra';
import { IStatusRepository } from '@/lib/repository';
import '@/lib/utils/di';

function run() {
  const statusRepository = container.resolve<IStatusRepository>('StatusRepository');
  const s3Adapter = container.resolve<IS3ServiceAdapter>('S3ServiceAdapter');
  const sqsAdapter = container.resolve<ISQSServiceAdapter>('SQSServiceAdapter');

  console.log(statusRepository);
  console.log(s3Adapter);
  console.log(sqsAdapter);
}

run();
