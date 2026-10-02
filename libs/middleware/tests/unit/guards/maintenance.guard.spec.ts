import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceGuard } from '../../../src/guards/maintenance.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('MaintenanceGuard', () => {
  let guard: MaintenanceGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceGuard],
    }).compile();

    guard = module.get<MaintenanceGuard>(MaintenanceGuard);
  });

  it('should allow access when maintenance mode is off', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ path: '/test' }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should block access when maintenance mode is on', async () => {
    guard.setMaintenanceMode(true);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ path: '/api/v1/requests', user: { role: 'USER' } }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
  });

  it('should allow access for ADMIN even in maintenance mode', async () => {
    guard.setMaintenanceMode(true);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ path: '/api/v1/requests', user: { role: 'ADMIN' } }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow auth and health paths during maintenance', async () => {
    guard.setMaintenanceMode(true);
    for (const path of ['/api/v1/health', '/api/v1/auth/login', '/api/v1/system/status']) {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ path, user: { role: 'USER' } }),
        }),
      } as ExecutionContext;
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('should allow public portfolio/blog GET reads during maintenance', async () => {
    guard.setMaintenanceMode(true);
    for (const path of [
      '/api/v1/portfolio',
      '/api/v1/portfolio/featured',
      '/api/v1/portfolio/abc',
      '/api/v1/blog/posts',
      '/api/v1/blog/posts/hello-world',
    ]) {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ path, method: 'GET', user: { role: 'USER' } }),
        }),
      } as ExecutionContext;
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('should still block client app APIs and admin writes during maintenance', async () => {
    guard.setMaintenanceMode(true);
    for (const path of ['/api/v1/notifications', '/api/v1/admin/blog/posts', '/api/v1/requests']) {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ path, method: 'GET', user: { role: 'USER' } }),
        }),
      } as ExecutionContext;
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
    }
  });
});
