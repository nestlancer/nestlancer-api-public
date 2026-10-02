import * as fs from 'fs';
import { setupApp, teardownApp, getApp, getCreateManyMock } from './setup';
import { AuditConsumer } from '../src/consumers/audit.consumer';
import { AuditWorkerService } from '../src/services/audit-worker.service';
import { BatchBufferService } from '../src/services/batch-buffer.service';
import { AuditBatchInsertProcessor } from '../src/processors/audit-batch-insert.processor';
import type { AuditEntry } from '../src/interfaces/audit-job.interface';

describe('Audit Worker - E2E', () => {
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
      expect(app.get(AuditConsumer)).toBeDefined();
      expect(app.get(AuditWorkerService)).toBeDefined();
      expect(app.get(BatchBufferService)).toBeDefined();
      expect(app.get(AuditBatchInsertProcessor)).toBeDefined();
    });
  });

  describe('AuditWorkerService - handleAuditEntry and flush (E2E)', () => {
    let service: AuditWorkerService;
    const createManyMock = getCreateManyMock();

    beforeEach(() => {
      service = getApp().get(AuditWorkerService);
      createManyMock.mockClear();
      createManyMock.mockResolvedValue({ count: 0 });
    });

    it('should buffer one entry and on flush write exact shape to DB via createMany', async () => {
      const entry: AuditEntry = {
        action: 'user.login',
        category: 'AUTH',
        description: 'User logged in',
        resourceType: 'user',
        resourceId: 'usr-123',
        userId: 'usr-456',
        ip: '127.0.0.1',
        userAgent: 'E2E-test',
      };

      await service.handleAuditEntry(entry);
      await service.flush();

      expect(createManyMock).toHaveBeenCalledTimes(1);
      const call = createManyMock.mock.calls[0][0];
      expect(call).toHaveProperty('data');
      expect(Array.isArray(call.data)).toBe(true);
      expect(call.data).toHaveLength(1);
      const inserted = call.data[0];
      expect(inserted.action).toBe(entry.action);
      expect(inserted.category).toBe(entry.category);
      expect(inserted.description).toBe(entry.description);
      expect(inserted.resourceType).toBe(entry.resourceType);
      expect(inserted.resourceId).toBe(entry.resourceId);
      expect(inserted.userId).toBe(entry.userId);
      expect(inserted.ip).toBe(entry.ip);
      expect(inserted.userAgent).toBe(entry.userAgent);
      expect(inserted.createdAt).toBeDefined();
    });

    it('should buffer multiple entries and single flush writes one batch with all entries', async () => {
      const entries: AuditEntry[] = [
        { action: 'project.create', category: 'PROJECT', description: 'Project created' },
        { action: 'project.update', category: 'PROJECT', description: 'Project updated' },
      ];

      for (const e of entries) {
        await service.handleAuditEntry(e);
      }
      await service.flush();

      expect(createManyMock).toHaveBeenCalledTimes(1);
      const call = createManyMock.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
      expect(call.data[0].action).toBe('project.create');
      expect(call.data[0].category).toBe('PROJECT');
      expect(call.data[1].action).toBe('project.update');
    });

    it('should not call createMany when flush is called with empty buffer', async () => {
      await service.flush();
      expect(createManyMock).not.toHaveBeenCalled();
    });
  });

  describe('AuditConsumer - message handling (E2E)', () => {
    let consumer: AuditConsumer;
    let service: AuditWorkerService;
    const createManyMock = getCreateManyMock();

    beforeEach(() => {
      const app = getApp();
      consumer = app.get(AuditConsumer);
      service = app.get(AuditWorkerService);
      createManyMock.mockClear();
      createManyMock.mockResolvedValue({ count: 0 });
    });

    it('should parse valid JSON message and after flush write payload to DB', async () => {
      const payload: AuditEntry = {
        action: 'quote.submit',
        category: 'QUOTE',
        description: 'Quote submitted',
        userId: 'usr-e2e',
        resourceId: 'req-1',
      };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;

      await (consumer as any).handleMessage(msg);
      await service.flush();

      expect(createManyMock).toHaveBeenCalledTimes(1);
      const call = createManyMock.mock.calls[0][0];
      expect(call.data).toHaveLength(1);
      expect(call.data[0].action).toBe(payload.action);
      expect(call.data[0].category).toBe(payload.category);
      expect(call.data[0].description).toBe(payload.description);
      expect(call.data[0].userId).toBe(payload.userId);
      expect(call.data[0].resourceId).toBe(payload.resourceId);
    });

    it('should throw on invalid JSON and not call createMany', async () => {
      const msg = { content: Buffer.from('not valid json {{{') } as any;

      await expect((consumer as any).handleMessage(msg)).rejects.toThrow();
      await service.flush();
      expect(createManyMock).not.toHaveBeenCalled();
    });
  });

  describe('AuditBatchInsertProcessor - fallback on DB failure (E2E)', () => {
    let processor: AuditBatchInsertProcessor;
    const createManyMock = getCreateManyMock();

    beforeEach(() => {
      processor = getApp().get(AuditBatchInsertProcessor);
      createManyMock.mockClear();
    });

    it('should write to fallback file when createMany rejects', async () => {
      const appendFileSpy = jest.spyOn(fs.promises, 'appendFile').mockResolvedValue(undefined);
      createManyMock.mockRejectedValueOnce(new Error('DB unavailable'));

      const entries: AuditEntry[] = [
        { action: 'fallback.action', category: 'SYSTEM', description: 'Fallback test' },
      ];

      await processor.insertBatch(entries);

      expect(appendFileSpy).toHaveBeenCalledTimes(1);
      const [filePath, data] = appendFileSpy.mock.calls[0];
      expect(typeof filePath).toBe('string');
      expect(filePath).toContain('audit');
      expect(data).toContain('fallback.action');
      expect(data).toContain('Fallback test');
      appendFileSpy.mockRestore();
    });
  });
});
