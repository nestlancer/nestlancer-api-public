import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseHealthService } from '../../../src/services/database-health.service';

import { PrismaReadService as PrismaService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

describe('DatabaseHealthService', () => {
  let service: DatabaseHealthService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $metrics: { json: jest.fn().mockResolvedValue({ counters: [] }) },
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue(2000),
    };
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    // Manually instantiate since DI token names may differ
    service = new DatabaseHealthService(mockPrisma, mockConfigService, mockLogger);
  });

  describe('check', () => {
    it('should return healthy status when database is reachable', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details.type).toBe('PostgreSQL');
    });

    it('should return connection pool metrics when available', async () => {
      mockPrisma.$metrics.json.mockResolvedValue({
        counters: [
          { name: 'prisma_pool_connections_busy', value: 3 },
          { name: 'prisma_pool_connections_idle', value: 7 },
          { name: 'prisma_pool_connections_open', value: 10 },
        ],
      });

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.connections.active).toBe(3);
      expect(result.details.connections.idle).toBe(7);
      expect(result.details.connections.total).toBe(10);
    });

    it('should handle metrics not being available', async () => {
      mockPrisma.$metrics = { json: jest.fn().mockRejectedValue(new Error('Metrics not enabled')) };

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.connections.active).toBe(0);
      expect(result.details.connections.idle).toBe(0);
    });

    it('should return unhealthy status when database query fails', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection refused');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return unhealthy on timeout', async () => {
      mockConfigService.get.mockReturnValue(1); // 1ms timeout
      mockPrisma.$queryRaw = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database query timeout');
    });

    it('should use default timeout when config value is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const result = await service.check();
      expect(result.status).toBe('healthy');
    });
  });
});
