import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundJobsService } from '../../../src/services/background-jobs.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService } from '@nestlancer/queue';

describe('BackgroundJobsService', () => {
  let service: BackgroundJobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundJobsService,
        { provide: QueuePublisherService, useValue: { publish: jest.fn() } },
        { provide: PrismaWriteService, useValue: { job: { update: jest.fn() } } },
        { provide: PrismaReadService, useValue: { job: { findMany: jest.fn() } } },
      ],
    }).compile();

    service = module.get<BackgroundJobsService>(BackgroundJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
