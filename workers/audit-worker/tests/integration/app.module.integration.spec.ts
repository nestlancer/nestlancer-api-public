import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../../src/app.module';
import { AuditConsumer } from '../../src/consumers/audit.consumer';
import { AuditWorkerService } from '../../src/services/audit-worker.service';
import { BatchBufferService } from '../../src/services/batch-buffer.service';
import { AuditBatchInsertProcessor } from '../../src/processors/audit-batch-insert.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

describe('AuditModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        auditLog: { createMany: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn(), auditLog: { findMany: jest.fn() } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Configuration & Dependencies', () => {
    it('should initialize the audit worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AuditModule dependencies', () => {
      const auditModule = app.get(AuditModule);
      expect(auditModule).toBeDefined();
    });

    it('should load audit configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
    });

    it('should resolve all audit processors and services', () => {
      const providers = [
        AuditConsumer,
        AuditWorkerService,
        BatchBufferService,
        AuditBatchInsertProcessor,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });
  });
});
