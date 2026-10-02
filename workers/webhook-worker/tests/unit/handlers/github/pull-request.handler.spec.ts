import { Test, TestingModule } from '@nestjs/testing';
import { GithubPullRequestHandler } from '../../../../src/handlers/github/pull-request.handler';
import { LoggerService } from '@nestlancer/logger';

describe('GithubPullRequestHandler', () => {
  let handler: GithubPullRequestHandler;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubPullRequestHandler,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<GithubPullRequestHandler>(GithubPullRequestHandler);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for github pull_request events', () => {
      expect(handler.canHandle('github', 'pull_request')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('razorpay', 'pull_request')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('github', 'push')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should log the pull request event', async () => {
      const payload = {
        action: 'opened',
        pull_request: { title: 'Fix bug #42' },
      };

      await handler.handle(payload);

      expect(logger.log).toHaveBeenCalledWith('Received GitHub PR event: opened on Fix bug #42');
    });
  });
});
