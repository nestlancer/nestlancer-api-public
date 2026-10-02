import { Test, TestingModule } from '@nestjs/testing';
import { PrismaReadService } from '@nestlancer/database';
import { MessageThreadsController } from '../../../../src/controllers/user/message-threads.controller';
import {
  MessageThreadsService,
  MessagingAccessService,
  MessagingService,
} from '../../../../src/services';

describe('MessageThreadsController', () => {
  let controller: MessageThreadsController;
  let threadsService: jest.Mocked<MessageThreadsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageThreadsController],
      providers: [
        {
          provide: MessageThreadsService,
          useValue: {
            getThreadReplies: jest.fn(),
          },
        },
        {
          provide: MessagingAccessService,
          useValue: {
            requireMessageAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            message: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get<MessageThreadsController>(MessageThreadsController);
    threadsService = module.get(MessageThreadsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getThreadReplies', () => {
    it('should return thread replies', async () => {
      const mockData = { items: [], meta: {} };
      threadsService.getThreadReplies.mockResolvedValue(mockData as any);

      const result = await controller.getThreadReplies('user1', 'msg1', { page: 1 });

      expect(threadsService.getThreadReplies).toHaveBeenCalledWith('msg1', { page: 1 });
      expect(result).toEqual({ status: 'success', ...mockData });
    });
  });
});
