import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AuditModule } from '../../src/app.module';
import { AuditConsumer } from '../../src/consumers/audit.consumer';
import { AuditWorkerService } from '../../src/services/audit-worker.service';
import { AuditBatchInsertProcessor } from '../../src/processors/audit-batch-insert.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('Audit Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({ sendToDlq: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(PrismaWriteService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        auditLog: { createMany: jest.fn(), create: jest.fn() },
        $transaction: jest.fn(),
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        auditLog: { findMany: jest.fn() },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the audit worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AuditModule', () => {
      const auditModule = app.get(AuditModule);
      expect(auditModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve AuditWorkerService', () => {
      const service = app.get(AuditWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve AuditConsumer', () => {
      const consumer = app.get(AuditConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve AuditBatchInsertProcessor', () => {
      const processor = app.get(AuditBatchInsertProcessor);
      expect(processor).toBeDefined();
    });
    describe('AuditWorkerService & Processor Logic', () => {
      let service: AuditWorkerService;
      let processor: AuditBatchInsertProcessor;
      let prisma: PrismaWriteService;

      beforeEach(() => {
        service = app.get(AuditWorkerService);
        processor = app.get(AuditBatchInsertProcessor);
        prisma = app.get(PrismaWriteService);

        jest.spyOn(processor, 'insertBatch');
        (prisma.auditLog.createMany as jest.Mock).mockClear();
      });

      it('should handle audit entry and process batch insertion correctly', async () => {
        const entryProps = {
          action: 'USER_LOGIN',
          category: 'AUTH',
          description: 'User logged in',
          userId: 'test-user-123',
          ip: '127.0.0.1',
        };

        await service.handleAuditEntry(entryProps as any);
        await service.flush();

        expect(processor.insertBatch).toHaveBeenCalledWith([entryProps]);
        expect(prisma.auditLog.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ action: 'USER_LOGIN', userId: 'test-user-123' }),
          ]),
        });
      });

      it('should fallback to file writing on database failure', async () => {
        const fs = require('fs');
        jest.spyOn(fs.promises, 'appendFile').mockResolvedValue(undefined);
        (prisma.auditLog.createMany as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

        const entryProps = {
          action: 'DB_FAILED_ACTION',
          category: 'TEST',
          description: 'Failed action test',
        };

        await processor.insertBatch([entryProps]);

        expect(fs.promises.appendFile).toHaveBeenCalled();
      });
    });

    describe('AuditConsumer', () => {
      let consumer: AuditConsumer;
      let service: AuditWorkerService;

      beforeEach(() => {
        consumer = app.get(AuditConsumer);
        service = app.get(AuditWorkerService);
        jest.spyOn(service, 'handleAuditEntry').mockResolvedValue(undefined);
      });

      it('should parse RabbitMQ messages and forward to AuditWorkerService', async () => {
        const payload = {
          action: 'RABBITMQ_TEST',
          category: 'TEST',
          description: 'RabbitMQ test description',
        };
        const msg: any = { content: Buffer.from(JSON.stringify(payload)) };

        await (consumer as any).handleMessage(msg);

        expect(service.handleAuditEntry).toHaveBeenCalledWith(expect.objectContaining(payload));
      });

      it('should throw error for invalid JSON payload', async () => {
        const msg: any = { content: Buffer.from('invalid json') };

        await expect((consumer as any).handleMessage(msg)).rejects.toThrow();
      });
    });
  });
});
