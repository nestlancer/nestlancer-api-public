import { Test, TestingModule } from '@nestjs/testing';
import { GithubWebhookProcessor } from '../../../src/processors/github-webhook.processor';
import { WebhookWorkerService } from '../../../src/services/webhook-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { IncomingWebhookJob } from '../../../src/interfaces/webhook-job.interface';

describe('GithubWebhookProcessor', () => {
  let processor: GithubWebhookProcessor;
  let webhookService: jest.Mocked<WebhookWorkerService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubWebhookProcessor,
        {
          provide: WebhookWorkerService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<GithubWebhookProcessor>(GithubWebhookProcessor);
    webhookService = module.get(WebhookWorkerService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleGithub', () => {
    it('should dispatch github event to webhook service', async () => {
      webhookService.dispatch.mockResolvedValue();

      const job: IncomingWebhookJob = {
        incomingWebhookId: 'webhook-2',
        provider: 'github',
        eventType: 'push',
        payload: { ref: 'refs/heads/main' },
      };

      await processor.handleGithub(job);

      expect(logger.log).toHaveBeenCalledWith('Processing GitHub event: push');
      expect(webhookService.dispatch).toHaveBeenCalledWith('github', 'push', {
        ref: 'refs/heads/main',
      });
    });
  });
});
