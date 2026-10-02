import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestlancerConfigService } from '../../src/config.service';

describe('NestlancerConfigService', () => {
  let service: NestlancerConfigService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestlancerConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NestlancerConfigService>(NestlancerConfigService);
  });

  describe('get', () => {
    it('should call getOrThrow on the underlying configService', () => {
      mockConfigService.getOrThrow.mockReturnValue('test-value');
      const result = service.get('SOME_KEY');
      expect(result).toBe('test-value');
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('SOME_KEY');
    });
  });

  describe('getOptional', () => {
    it('should return value from configService if exists', () => {
      mockConfigService.get.mockReturnValue('existing-value');
      const result = service.getOptional('SOME_KEY', 'default');
      expect(result).toBe('existing-value');
    });

    it('should return default value if configService returns undefined', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const result = service.getOptional('SOME_KEY', 'default');
      expect(result).toBe('default');
    });
  });

  describe('General Getters', () => {
    it('should return nodeEnv', () => {
      mockConfigService.getOrThrow.mockReturnValue('production');
      expect(service.nodeEnv).toBe('production');
      expect(service.isProduction).toBe(true);
      expect(service.isDevelopment).toBe(false);
    });

    it('should return port as number', () => {
      mockConfigService.get.mockReturnValue('4000');
      expect(service.port).toBe(4000);
    });
  });

  describe('Database Getters', () => {
    it('should return databaseUrl', () => {
      mockConfigService.getOrThrow.mockReturnValue('postgresql://localhost');
      expect(service.databaseUrl).toBe('postgresql://localhost');
    });
  });

  describe('Redis Getters', () => {
    it('should return redisCacheUrl', () => {
      mockConfigService.getOrThrow.mockReturnValue('redis://localhost');
      expect(service.redisCacheUrl).toBe('redis://localhost');
    });
  });

  describe('JWT Getters', () => {
    it('should return jwtAccessSecret', () => {
      mockConfigService.getOrThrow.mockReturnValue('secret');
      expect(service.jwtAccessSecret).toBe('secret');
    });
  });
});
