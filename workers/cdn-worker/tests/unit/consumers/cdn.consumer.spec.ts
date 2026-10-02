import { Test, TestingModule } from '@nestjs/testing';

import { QueueConsumerService } from '@nestlancer/queue';

import { CdnConsumer } from '../../../src/consumers/cdn.consumer';
import { CdnWorkerService } from '../../../src/services/cdn-worker.service';

describe('CdnConsumer', () => {
  let provider: CdnConsumer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CdnConsumer,
        {
          provide: CdnWorkerService,
          useValue: {
            invalidatePath: jest.fn(),
            invalidateBatch: jest.fn(),
            purgeAll: jest.fn(),
          },
        },
        {
          provide: QueueConsumerService,
          useValue: {
            consume: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<CdnConsumer>(CdnConsumer);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
