import { Test, TestingModule } from '@nestjs/testing';
import { MessageThreadsService } from '../../../src/services/message-threads.service';
import { PrismaReadService } from '@nestlancer/database';

describe('MessageThreadsService', () => {
  let provider: MessageThreadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageThreadsService,
        {
          provide: PrismaReadService,
          useValue: {
            message: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
      ],
    }).compile();

    provider = module.get<MessageThreadsService>(MessageThreadsService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
