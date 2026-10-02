import { Test, TestingModule } from '@nestjs/testing';
import { GithubPushHandler } from '../../../../src/handlers/github/push.handler';
import { LoggerService } from '@nestlancer/logger';

describe('GithubPushHandler', () => {
  let handler: GithubPushHandler;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubPushHandler,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<GithubPushHandler>(GithubPushHandler);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for github push events', () => {
      expect(handler.canHandle('github', 'push')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('razorpay', 'push')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('github', 'pull_request')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should log the push event', async () => {
      const payload = {
        repository: { full_name: 'org/repo' },
        ref: 'refs/heads/main',
      };

      await handler.handle(payload);

      expect(logger.log).toHaveBeenCalledWith('Received GitHub push event for repo: org/repo');
    });
  });
});
