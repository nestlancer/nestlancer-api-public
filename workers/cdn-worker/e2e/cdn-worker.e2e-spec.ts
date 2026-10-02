import { setupApp, teardownApp, getApp, getInvalidateMock, getPurgeAllMock } from './setup';
import { CdnConsumer } from '../src/consumers/cdn.consumer';
import { CdnWorkerService } from '../src/services/cdn-worker.service';
import { BatchCollectorService } from '../src/services/batch-collector.service';
import { PathInvalidationProcessor } from '../src/processors/path-invalidation.processor';
import { BatchInvalidationProcessor } from '../src/processors/batch-invalidation.processor';
import type { CdnJob } from '../src/interfaces/cdn-job.interface';

describe('CDN Worker - E2E', () => {
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
      expect(app.get(CdnConsumer)).toBeDefined();
      expect(app.get(CdnWorkerService)).toBeDefined();
      expect(app.get(BatchCollectorService)).toBeDefined();
      expect(app.get(PathInvalidationProcessor)).toBeDefined();
      expect(app.get(BatchInvalidationProcessor)).toBeDefined();
    });
  });

  describe('CdnWorkerService - invalidateBatch and purgeAll (E2E)', () => {
    let service: CdnWorkerService;
    const invalidateMock = getInvalidateMock();
    const purgeAllMock = getPurgeAllMock();

    beforeEach(() => {
      service = getApp().get(CdnWorkerService);
      invalidateMock.mockClear();
      purgeAllMock.mockClear();
      invalidateMock.mockImplementation((paths: string[]) =>
        Promise.resolve({ id: 'e2e-invalidation-1', status: 'completed', paths }),
      );
      purgeAllMock.mockResolvedValue(undefined);
    });

    it('invalidateBatch should call provider invalidate with exact paths and not throw', async () => {
      const paths = ['/api/v1/posts/1', '/api/v1/users/2'];
      await service.invalidateBatch(paths);

      expect(invalidateMock).toHaveBeenCalledTimes(1);
      expect(invalidateMock).toHaveBeenCalledWith(paths);
    });

    it('purgeAll should call provider purgeAll once and not throw', async () => {
      await service.purgeAll();

      expect(purgeAllMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('BatchInvalidationProcessor - process (E2E)', () => {
    let processor: BatchInvalidationProcessor;
    const invalidateMock = getInvalidateMock();

    beforeEach(() => {
      processor = getApp().get(BatchInvalidationProcessor);
      invalidateMock.mockClear();
      invalidateMock.mockImplementation((paths: string[]) =>
        Promise.resolve({ id: 'e2e-batch-1', status: 'completed', paths }),
      );
    });

    it('process should call CdnWorkerService.invalidateBatch and provider receives exact paths', async () => {
      const paths = ['/blog/1', '/blog/2'];
      await processor.process(paths);

      expect(invalidateMock).toHaveBeenCalledTimes(1);
      expect(invalidateMock).toHaveBeenCalledWith(paths);
    });
  });

  describe('CdnConsumer - message handling (E2E)', () => {
    let consumer: CdnConsumer;
    const invalidateMock = getInvalidateMock();
    const purgeAllMock = getPurgeAllMock();

    beforeEach(() => {
      consumer = getApp().get(CdnConsumer);
      invalidateMock.mockClear();
      purgeAllMock.mockClear();
      invalidateMock.mockImplementation((paths: string[]) =>
        Promise.resolve({ id: 'e2e-msg-1', status: 'completed', paths }),
      );
      purgeAllMock.mockResolvedValue(undefined);
    });

    it('INVALIDATE_BATCH: valid message should call provider invalidate with job paths', async () => {
      const payload: CdnJob = {
        type: 'INVALIDATE_BATCH',
        paths: ['/api/projects/1', '/api/media/2'],
      };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;

      await (consumer as any).handleMessage(msg);

      expect(invalidateMock).toHaveBeenCalledTimes(1);
      expect(invalidateMock).toHaveBeenCalledWith(payload.paths);
    });

    it('PURGE_ALL: valid message should call provider purgeAll', async () => {
      const payload: CdnJob = { type: 'PURGE_ALL' };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;

      await (consumer as any).handleMessage(msg);

      expect(purgeAllMock).toHaveBeenCalledTimes(1);
    });

    it('INVALIDATE_PATH: valid message with paths should call invalidatePath for each path', async () => {
      const payload: CdnJob = {
        type: 'INVALIDATE_PATH',
        paths: ['/a', '/b'],
      };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;
      const invalidatePathSpy = jest.spyOn(getApp().get(CdnWorkerService), 'invalidatePath');

      await (consumer as any).handleMessage(msg);

      expect(invalidatePathSpy).toHaveBeenCalledTimes(2);
      expect(invalidatePathSpy).toHaveBeenNthCalledWith(1, '/a');
      expect(invalidatePathSpy).toHaveBeenNthCalledWith(2, '/b');
      invalidatePathSpy.mockRestore();
    });

    it('INVALIDATE_PATH: empty paths should not call invalidatePath', async () => {
      const payload: CdnJob = { type: 'INVALIDATE_PATH', paths: [] };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;
      const invalidatePathSpy = jest.spyOn(getApp().get(CdnWorkerService), 'invalidatePath');

      await (consumer as any).handleMessage(msg);

      expect(invalidatePathSpy).not.toHaveBeenCalled();
      invalidatePathSpy.mockRestore();
    });

    it('invalid JSON should throw and not call provider', async () => {
      const msg = { content: Buffer.from('not valid json {{{') } as any;

      await expect((consumer as any).handleMessage(msg)).rejects.toThrow();
      expect(invalidateMock).not.toHaveBeenCalled();
      expect(purgeAllMock).not.toHaveBeenCalled();
    });

    it('unknown job type should not throw and should not call invalidate or purgeAll', async () => {
      const payload = { type: 'UNKNOWN_TYPE', paths: ['/x'] };
      const msg = { content: Buffer.from(JSON.stringify(payload)) } as any;

      await (consumer as any).handleMessage(msg);

      expect(invalidateMock).not.toHaveBeenCalled();
      expect(purgeAllMock).not.toHaveBeenCalled();
    });
  });
});
