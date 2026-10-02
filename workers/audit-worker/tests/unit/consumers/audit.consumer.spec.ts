import { Test, TestingModule } from '@nestjs/testing';
import { AuditConsumer } from '../../../src/consumers/audit.consumer';
import { AuditWorkerService } from '../../../src/services/audit-worker.service';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';

describe('AuditConsumer', () => {
  let provider: AuditConsumer;
  let auditWorkerService: AuditWorkerService;
  let dlqService: DlqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditConsumer,
        {
          provide: AuditWorkerService,
          useValue: {
            handleAuditEntry: jest.fn(),
          },
        },
        {
          provide: QueueConsumerService,
          useValue: {
            consume: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('audit.queue'),
          },
        },
        {
          provide: DlqService,
          useValue: {
            sendToDlq: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<AuditConsumer>(AuditConsumer);
    auditWorkerService = module.get<AuditWorkerService>(AuditWorkerService);
    dlqService = module.get<DlqService>(DlqService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should process a valid message', async () => {
      const validPayload = {
        action: 'test.action',
        category: 'test.category',
        description: 'test description',
      };
      const msg = {
        content: Buffer.from(JSON.stringify(validPayload)),
      } as ConsumeMessage;

      await (provider as any).handleMessage(msg);

      expect(auditWorkerService.handleAuditEntry).toHaveBeenCalled();
      expect(dlqService.sendToDlq).not.toHaveBeenCalled();
    });

    it('should send to DLQ if validation fails', async () => {
      const invalidPayload = {
        action: '', // Empty action should fail validation
        category: 'test.category',
      };
      const msg = {
        content: Buffer.from(JSON.stringify(invalidPayload)),
      } as ConsumeMessage;

      await expect((provider as any).handleMessage(msg)).rejects.toThrow('Validation failed');

      expect(auditWorkerService.handleAuditEntry).not.toHaveBeenCalled();
      expect(dlqService.sendToDlq).toHaveBeenCalledWith(
        'audit.queue',
        expect.any(String),
        'Validation failed',
      );
    });

    it('should send to DLQ if processing fails', async () => {
      const validPayload = {
        action: 'test.action',
        category: 'test.category',
        description: 'test description',
      };
      const msg = {
        content: Buffer.from(JSON.stringify(validPayload)),
      } as ConsumeMessage;

      jest.spyOn(auditWorkerService, 'handleAuditEntry').mockRejectedValue(new Error('DB Error'));

      await expect((provider as any).handleMessage(msg)).rejects.toThrow('DB Error');

      expect(dlqService.sendToDlq).toHaveBeenCalledWith(
        'audit.queue',
        expect.any(String),
        'DB Error',
      );
    });
  });
});
