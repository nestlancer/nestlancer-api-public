import { Test, TestingModule } from '@nestjs/testing';
import { MiddlewareModule } from '../../src/middleware.module';
import { ThrottleGuard } from '../../src/guards/throttle.guard';
import { MaintenanceGuard } from '../../src/guards/maintenance.guard';
import { ConfigModule } from '@nestjs/config';
import { ExecutionContext, HttpException } from '@nestjs/common';

function createMockContext(overrides: {
  ip?: string;
  userId?: string;
  path?: string;
  role?: string;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip: overrides.ip || '127.0.0.1',
        path: overrides.path || '/api/test',
        user: overrides.userId
          ? { userId: overrides.userId, role: overrides.role || 'USER' }
          : undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('MiddlewareModule (Integration)', () => {
  let module: TestingModule;
  let throttleGuard: ThrottleGuard;
  let maintenanceGuard: MaintenanceGuard;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        MiddlewareModule,
      ],
    }).compile();

    throttleGuard = module.get<ThrottleGuard>(ThrottleGuard);
    maintenanceGuard = module.get<MaintenanceGuard>(MaintenanceGuard);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(throttleGuard).toBeDefined();
    expect(maintenanceGuard).toBeDefined();
  });

  describe('ThrottleGuard', () => {
    it('should allow requests below the rate limit', () => {
      const context = createMockContext({ ip: `throttle-test-${Date.now()}` });
      const result = throttleGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow multiple requests from different IPs', () => {
      const ctx1 = createMockContext({ ip: `ip-a-${Date.now()}` });
      const ctx2 = createMockContext({ ip: `ip-b-${Date.now()}` });

      expect(throttleGuard.canActivate(ctx1)).toBe(true);
      expect(throttleGuard.canActivate(ctx2)).toBe(true);
    });
  });

  describe('MaintenanceGuard', () => {
    afterEach(() => {
      maintenanceGuard.setMaintenanceMode(false);
    });

    it('should allow requests when maintenance mode is off', () => {
      const context = createMockContext({});
      const result = maintenanceGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should block requests when maintenance mode is on', () => {
      maintenanceGuard.setMaintenanceMode(true);
      const context = createMockContext({});

      expect(() => maintenanceGuard.canActivate(context)).toThrow(HttpException);
    });

    it('should allow health endpoint during maintenance', () => {
      maintenanceGuard.setMaintenanceMode(true);
      const context = createMockContext({ path: '/health' });

      const result = maintenanceGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow admin users during maintenance', () => {
      maintenanceGuard.setMaintenanceMode(true);
      const context = createMockContext({ userId: 'admin-1', role: 'ADMIN' });

      const result = maintenanceGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw SERVICE_UNAVAILABLE with correct error shape during maintenance', () => {
      maintenanceGuard.setMaintenanceMode(true);
      const context = createMockContext({});

      try {
        maintenanceGuard.canActivate(context);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(503);
        const response = error.getResponse();
        expect(response.code).toBe('SYS_MAINTENANCE');
      }
    });
  });
});
