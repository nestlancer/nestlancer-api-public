import { Test, TestingModule } from '@nestjs/testing';
import { NestlancerConfigModule } from '../../src/config.module';
import { NestlancerConfigService } from '../../src/config.service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.test') });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:5432/postgres';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-12345';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-12345';
process.env.REDIS_CACHE_URL ||= 'redis://127.0.0.1:6379';

describe('ConfigModule (Integration)', () => {
  let module: TestingModule;
  let service: NestlancerConfigService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    module = await Test.createTestingModule({
      imports: [NestlancerConfigModule.forRoot()],
    }).compile();

    service = module.get<NestlancerConfigService>(NestlancerConfigService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct configuration values', () => {
    expect(service.nodeEnv).toBe('test');
    expect(service.isTest).toBe(true);
    expect(service.databaseUrl).toContain('127.0.0.1');
    expect(service.redisCacheUrl).toContain('127.0.0.1');
  });

  it('should return default values for optional keys', () => {
    expect(service.appName).toBe('Nestlancer');
    expect(service.port).toBe(3000);
  });
});
