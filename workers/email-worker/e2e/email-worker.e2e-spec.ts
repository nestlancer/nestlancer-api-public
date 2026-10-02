import {
  setupApp,
  teardownApp,
  getApp,
  getSendMock,
  getConsumeHandler,
  getSendToDlqMock,
  getSendToQueueMock,
} from './setup';
import { EmailConsumer } from '../src/consumers/email.consumer';
import { EmailWorkerService } from '../src/services/email-worker.service';
import { EmailRendererService } from '../src/services/email-renderer.service';
import { EmailRetryService } from '../src/services/email-retry.service';
import { EmailJobType } from '../src/interfaces/email-job.interface';
import type { EmailJob } from '../src/interfaces/email-job.interface';

describe('Email Worker - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Bootstrap (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(EmailConsumer)).toBeDefined();
      expect(app.get(EmailWorkerService)).toBeDefined();
      expect(app.get(EmailRendererService)).toBeDefined();
      expect(app.get(EmailRetryService)).toBeDefined();
    });
  });

  describe('EmailWorkerService - processEmail (E2E)', () => {
    let service: EmailWorkerService;
    const sendMock = getSendMock();

    beforeEach(() => {
      service = getApp().get(EmailWorkerService);
      sendMock.mockClear();
      sendMock.mockResolvedValue({ messageId: 'e2e-message-id' });
    });

    it('should send email with exact to, subject and HTML when job is valid and template exists', async () => {
      const job: EmailJob = {
        type: EmailJobType.VERIFICATION,
        to: 'user@example.com',
        data: {
          userName: 'Test User',
          verificationUrl: 'https://app.example.com/verify?token=abc',
          expiresIn: '24 hours',
        },
      };

      await service.processEmail(job);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const [call] = sendMock.mock.calls;
      expect(call[0]).toMatchObject({
        to: 'user@example.com',
        subject: 'Verify your email address',
      });
      expect(typeof call[0].html).toBe('string');
      expect(call[0].html).toContain('Test User');
      expect(call[0].html).toContain('Verify your email');
      expect(call[0].html).toContain('app.example.com/verify');
      expect(call[0].html).toContain('token');
      expect(call[0].html).toContain('abc');
    });

    it('should use WELCOME subject and render welcome template when type is WELCOME', async () => {
      const job: EmailJob = {
        type: EmailJobType.WELCOME,
        to: 'newuser@example.com',
        data: { userName: 'New User', loginUrl: 'https://app.example.com/login' },
      };

      await service.processEmail(job);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0].subject).toBe('Welcome to Nestlancer!');
      expect(sendMock.mock.calls[0][0].to).toBe('newuser@example.com');
      expect(sendMock.mock.calls[0][0].html).toContain('New User');
    });

    it('should call retry (sendToQueue) and not send mail when render throws unknown template', async () => {
      const sendToQueueMock = getSendToQueueMock();
      sendToQueueMock.mockClear();

      const job: EmailJob = {
        type: 'UNKNOWN_TYPE' as EmailJobType,
        to: 'u@example.com',
        data: {},
      };

      await service.processEmail(job);

      expect(sendMock).not.toHaveBeenCalled();
      expect(sendToQueueMock).toHaveBeenCalledTimes(1);
      const [queueName, payload] = sendToQueueMock.mock.calls[0];
      expect(typeof queueName).toBe('string');
      expect(payload).toMatchObject({ type: 'UNKNOWN_TYPE', to: 'u@example.com' });
      expect((payload as { retryCount?: number }).retryCount).toBe(1);
    });
  });

  describe('EmailConsumer - message handling (E2E)', () => {
    const sendMock = getSendMock();

    beforeEach(() => {
      sendMock.mockClear();
      sendMock.mockResolvedValue({ messageId: 'e2e-id' });
    });

    it('should parse valid JSON message and call processEmail so send is invoked with expected shape', async () => {
      const job: EmailJob = {
        type: EmailJobType.PASSWORD_RESET,
        to: 'reset@example.com',
        data: {
          userName: 'Reset User',
          resetUrl: 'https://app.example.com/reset?token=xyz',
          expiresIn: '1 hour',
        },
      };
      const msg = { content: Buffer.from(JSON.stringify(job)) };

      const handler = getConsumeHandler();
      await handler(msg);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0].to).toBe('reset@example.com');
      expect(sendMock.mock.calls[0][0].subject).toBe('Reset your password');
      expect(sendMock.mock.calls[0][0].html).toContain('Reset User');
      expect(sendMock.mock.calls[0][0].html).toContain('app.example.com/reset');
      expect(sendMock.mock.calls[0][0].html).toContain('token');
      expect(sendMock.mock.calls[0][0].html).toContain('xyz');
    });

    it('should throw on invalid JSON and not call send', async () => {
      const msg = { content: Buffer.from('not valid json {{{') };

      const handler = getConsumeHandler();
      await expect(handler(msg)).rejects.toThrow();

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('EmailRetryService - handleFailure (E2E)', () => {
    let retryService: EmailRetryService;
    const sendToDlqMock = getSendToDlqMock();
    const sendToQueueMock = getSendToQueueMock();

    beforeEach(() => {
      retryService = getApp().get(EmailRetryService);
      sendToDlqMock.mockClear();
      sendToQueueMock.mockClear();
    });

    it('should send to DLQ when retry count exceeds max and not re-queue', async () => {
      const job = {
        type: EmailJobType.ANNOUNCEMENT,
        to: 'u@example.com',
        data: { title: 'Test' },
        retryCount: 3,
      };

      await retryService.handleFailure('email.queue', job, new Error('Delivery failed'));

      expect(sendToDlqMock).toHaveBeenCalledTimes(1);
      expect(sendToDlqMock.mock.calls[0][0]).toBe('email.queue');
      expect(sendToDlqMock.mock.calls[0][1]).toEqual(job);
      expect(sendToDlqMock.mock.calls[0][2]).toBe('Delivery failed');
      expect(sendToQueueMock).not.toHaveBeenCalled();
    });

    it('should re-queue with incremented retryCount when under max retries', async () => {
      const job = {
        type: EmailJobType.WELCOME,
        to: 'u@example.com',
        data: {},
      };

      await retryService.handleFailure('email.queue', job, new Error('SMTP error'));

      expect(sendToQueueMock).toHaveBeenCalledTimes(1);
      expect(sendToDlqMock).not.toHaveBeenCalled();
      const [, payload, options] = sendToQueueMock.mock.calls[0];
      expect((payload as { retryCount: number }).retryCount).toBe(1);
      expect(options?.headers?.['x-delay']).toBeDefined();
    });
  });
});
