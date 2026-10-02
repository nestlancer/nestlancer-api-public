import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from '../../../../src/controllers/user/conversations.controller';
import { ConversationsService, UnreadCountService } from '../../../../src/services';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let conversationsService: jest.Mocked<ConversationsService>;
  let unreadCountService: jest.Mocked<UnreadCountService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: {
            getConversations: jest.fn(),
          },
        },
        {
          provide: UnreadCountService,
          useValue: {
            getUnreadCount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
    conversationsService = module.get(ConversationsService);
    unreadCountService = module.get(UnreadCountService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const mockData = { items: [], meta: {} };
      conversationsService.getConversations.mockResolvedValue(mockData as any);

      const result = await controller.getConversations('user1', { page: 1 });

      expect(conversationsService.getConversations).toHaveBeenCalledWith('user1', { page: 1 });
      expect(result).toEqual({ status: 'success', ...mockData });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      unreadCountService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount('user1');

      expect(unreadCountService.getUnreadCount).toHaveBeenCalledWith('user1');
      expect(result).toEqual({ status: 'success', data: 5 });
    });
  });
});
