import { SystemMetricsService } from '../../../src/services/system-metrics.service';

describe('SystemMetricsService', () => {
  let service: SystemMetricsService;

  beforeEach(() => {
    service = new SystemMetricsService();
  });

  describe('getMetrics', () => {
    it('should return cpu metrics', () => {
      const result = service.getMetrics();
      expect(result.cpu).toBeDefined();
      expect(result.cpu.cores).toBeGreaterThan(0);
      expect(result.cpu.model).toBeDefined();
      expect(result.cpu.loadAverage).toBeDefined();
      expect(result.cpu.loadAverage).toHaveLength(3);
    });

    it('should return memory metrics', () => {
      const result = service.getMetrics();
      expect(result.memory).toBeDefined();
      expect(result.memory.total).toBeGreaterThan(0);
      expect(result.memory.free).toBeGreaterThanOrEqual(0);
      expect(result.memory.used).toBeGreaterThanOrEqual(0);
      expect(result.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.memory.usagePercent).toBeLessThanOrEqual(100);
    });

    it('should return disk metrics', () => {
      const result = service.getMetrics();
      expect(result.disk).toBeDefined();
      expect(result.disk.total).toBeGreaterThan(0);
      expect(result.disk.usagePercent).toBeDefined();
    });

    it('should return process metrics', () => {
      const result = service.getMetrics();
      expect(result.process).toBeDefined();
      expect(result.process.pid).toBe(process.pid);
      expect(result.process.uptime).toBeGreaterThan(0);
      expect(result.process.memory).toBeDefined();
      expect(result.process.memory.heapUsed).toBeDefined();
      expect(result.process.memory.rss).toBeDefined();
    });

    it('should return consistent memory calculations', () => {
      const result = service.getMetrics();
      expect(result.memory.total).toBe(result.memory.free + result.memory.used);
    });
  });
});
