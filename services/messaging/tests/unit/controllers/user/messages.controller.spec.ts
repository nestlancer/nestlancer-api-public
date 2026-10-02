import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from '../../../../src/controllers/user/messages.controller';
import {
  MessagingService,
  MessageSearchService,
  MessageReadService,
  UnreadCountService,
  MessageThreadsService,
  MessagingAccessService,
} from '../../../../src/services';
import { CreateMessageDto } from '../../../../src/dto/create-message.dto';
import { UpdateMessageDto } from '../../../../src/dto/update-message.dto';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('MessagesController', () => {
  let controller: MessagesController;
  let messagingService: jest.Mocked<MessagingService>;
  let searchService: jest.Mocked<MessageSearchService>;
  let readService: jest.Mocked<MessageReadService>;
  let messagingAccess: jest.Mocked<MessagingAccessService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagingService,
          useValue: {
            sendMessage: jest.fn(),
            getMessagesForProject: jest.fn(),
            updateMessage: jest.fn(),
            deleteMessage: jest.fn(),
          },
        },
        {
          provide: MessageSearchService,
          useValue: {
            searchMessages: jest.fn(),
          },
        },
        {
          provide: MessageReadService,
          useValue: {
            markAsRead: jest.fn(),
            markProjectMessagesAsRead: jest.fn(),
          },
        },
        { provide: UnreadCountService, useValue: { getUnreadCount: jest.fn() } },
        { provide: MessageThreadsService, useValue: { getThreads: jest.fn() } },
        {
          provide: MessagingAccessService,
          useValue: {
            requireProjectParticipant: jest.fn().mockResolvedValue(undefined),
            requireMessageAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    messagingService = module.get(MessagingService);
    searchService = module.get(MessageSearchService);
    readService = module.get(MessageReadService);
    messagingAccess = module.get(MessagingAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should call messagingService.sendMessage', async () => {
      messagingService.sendMessage.mockResolvedValue({ id: '1' } as any);
      const dto: CreateMessageDto = { content: 'hello', projectId: 'p1', type: 'TEXT' };

      const result = await controller.sendMessage('user1', dto);

      expect(messagingService.sendMessage).toHaveBeenCalledWith('user1', dto);
      expect(result).toEqual({ status: 'success', data: { id: '1' } });
    });
  });

  describe('getProjectMessages', () => {
    it('should call messagingService.getMessagesForProject', async () => {
      messagingService.getMessagesForProject.mockResolvedValue({ items: [], meta: {} } as any);

      const result = await controller.getProjectMessages('user1', 'p1', { page: 1 });

      expect(messagingService.getMessagesForProject).toHaveBeenCalledWith('user1', 'p1', {
        page: 1,
      });
      expect(result.status).toBe('success');
    });
  });

  describe('searchMessages', () => {
    it('should call searchService.searchMessages', async () => {
      searchService.searchMessages.mockResolvedValue({ items: [], meta: {} } as any);

      const result = await controller.searchMessages('user1', 'p1', 'query', '1');

      expect(messagingAccess.requireProjectParticipant).toHaveBeenCalledWith('user1', 'p1');
      expect(searchService.searchMessages).toHaveBeenCalledWith('p1', 'query', 1);
      expect(result.status).toBe('success');
    });
  });

  describe('editMessage', () => {
    it('should call messagingService.updateMessage', async () => {
      messagingService.updateMessage.mockResolvedValue({ id: '1' } as any);
      const dto: UpdateMessageDto = { content: 'updated' };

      const result = await controller.editMessage('user1', '1', dto);

      expect(messagingService.updateMessage).toHaveBeenCalledWith('user1', '1', dto);
      expect(result.status).toBe('success');
    });
  });

  describe('deleteMessage', () => {
    it('should call messagingService.deleteMessage', async () => {
      messagingService.deleteMessage.mockResolvedValue({} as any);

      const result = await controller.deleteMessage('user1', '1');

      expect(messagingService.deleteMessage).toHaveBeenCalledWith('user1', '1');
      expect(result.status).toBe('success');
    });
  });

  describe('markAsRead', () => {
    it('should call readService.markAsRead', async () => {
      readService.markAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAsRead('user1', '1');

      expect(readService.markAsRead).toHaveBeenCalledWith('user1', '1');
      expect(result.status).toBe('success');
    });
  });

  describe('markProjectAsRead', () => {
    it('should call readService.markProjectMessagesAsRead', async () => {
      readService.markProjectMessagesAsRead.mockResolvedValue({ success: true, updatedCount: 0 });

      const result = await controller.markProjectAsRead('user1', 'p1');

      expect(readService.markProjectMessagesAsRead).toHaveBeenCalledWith('user1', 'p1');
      expect(result.status).toBe('success');
    });
  });
});
