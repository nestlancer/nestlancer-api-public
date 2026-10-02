import { Test, TestingModule } from '@nestjs/testing';
import { GithubDeploymentHandler } from '../../../../src/handlers/github/deployment.handler';
import { LoggerService } from '@nestlancer/logger';

describe('GithubDeploymentHandler', () => {
  let handler: GithubDeploymentHandler;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubDeploymentHandler,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<GithubDeploymentHandler>(GithubDeploymentHandler);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for github deployment events', () => {
      expect(handler.canHandle('github', 'deployment')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('razorpay', 'deployment')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('github', 'push')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should log the deployment event', async () => {
      const payload = {
        deployment: { environment: 'production' },
      };

      await handler.handle(payload);

      expect(logger.log).toHaveBeenCalledWith('Received GitHub deployment event: production');
    });
  });
});
