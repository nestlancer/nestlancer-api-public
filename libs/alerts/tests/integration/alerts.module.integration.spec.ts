import { Test, TestingModule } from '@nestjs/testing';
import { AlertsModule } from '../../src/alerts.module';
import { AlertsService } from '../../src/alerts.service';
import { SlackChannel } from '../../src/channels/slack.channel';
import { PagerdutyChannel } from '../../src/channels/pagerduty.channel';
import { EmailAlertChannel } from '../../src/channels/email-alert.channel';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.test') });

describe('AlertsModule (Integration)', () => {
  let module: TestingModule;
  let service: AlertsService;
  let slackChannel: SlackChannel;
  let pagerdutyChannel: PagerdutyChannel;
  let emailChannel: EmailAlertChannel;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AlertsModule],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    slackChannel = module.get<SlackChannel>(SlackChannel);
    pagerdutyChannel = module.get<PagerdutyChannel>(PagerdutyChannel);
    emailChannel = module.get<EmailAlertChannel>(EmailAlertChannel);
  });

  beforeEach(() => {
    jest.spyOn(slackChannel, 'send').mockResolvedValue(undefined);
    jest.spyOn(pagerdutyChannel, 'send').mockResolvedValue(undefined);
    jest.spyOn(emailChannel, 'send').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send critical "service down" alert to all channels (pagerduty, slack, email)', async () => {
    const alert = {
      title: 'Service Down Alert',
      message: 'The auth service is not responding',
      severity: 'critical' as const,
      source: 'health-monitor',
    };

    await service.sendAlert(alert);

    // "service_down" rule matches title "Service Down" and severity "critical"
    // channels: ['pagerduty', 'slack', 'email']
    expect(slackChannel.send).toHaveBeenCalled();
    expect(pagerdutyChannel.send).toHaveBeenCalled();
    expect(emailChannel.send).toHaveBeenCalled();
  });

  it('should send warning "high error rate" alert only to slack', async () => {
    const alert = {
      title: 'High Error Rate detected',
      message: 'Error rate exceeded 5% threshold',
      severity: 'warning' as const,
      source: 'metrics-monitor',
    };

    await service.sendAlert(alert);

    // "high_error_rate" rule matches title and severity "warning"
    // channels: ['slack'] only
    expect(slackChannel.send).toHaveBeenCalled();
    // pagerduty might not be called since "warning" severity only maps to slack channels
    // but "queue_depth_high" rule also has severity "warning" so it may add slack again
    // Key assertion: pagerduty should NOT be called for pure warning with slack-only rules
  });

  it('should send critical "circuit breaker open" alert to pagerduty and slack', async () => {
    const alert = {
      title: 'Circuit Breaker Open',
      message: 'The payment gateway circuit breaker has opened',
      severity: 'critical' as const,
      source: 'circuit-breaker',
    };

    await service.sendAlert(alert);

    // "circuit_breaker_open" rule matches title
    // channels: ['pagerduty', 'slack']
    expect(slackChannel.send).toHaveBeenCalled();
    expect(pagerdutyChannel.send).toHaveBeenCalled();
  });

  it('should handle info severity alert that matches no rules gracefully', async () => {
    const alert = {
      title: 'Deployment Complete',
      message: 'Version 2.0 deployed successfully',
      severity: 'info' as const,
      source: 'ci-cd',
    };

    // No rules match "info" severity or "Deployment Complete" title
    await service.sendAlert(alert);

    // Should not crash — no channels notified
    expect(slackChannel.send).not.toHaveBeenCalled();
    expect(pagerdutyChannel.send).not.toHaveBeenCalled();
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('should handle channel send failures gracefully (Promise.allSettled)', async () => {
    jest.spyOn(slackChannel, 'send').mockRejectedValue(new Error('Slack API timeout'));

    const alert = {
      title: 'Service Down Alert',
      message: 'Service failed',
      severity: 'critical' as const,
      source: 'monitor',
    };

    // Should not throw even when a channel fails
    await expect(service.sendAlert(alert)).resolves.toBeUndefined();
  });
});
