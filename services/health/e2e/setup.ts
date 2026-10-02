import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';
// Do not set HEALTH_E2E_DISABLE_AUTH so AuthLibModule is loaded and admin routes enforce 401/403.

import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AppModule } from '../src/app.module';
import { DatabaseHealthService } from '../src/services/database-health.service';
import { CacheHealthService } from '../src/services/cache-health.service';
import { QueueHealthService } from '../src/services/queue-health.service';
import { StorageHealthService } from '../src/services/storage-health.service';
import { ExternalServicesHealthService } from '../src/services/external-services-health.service';
import { WorkersHealthService } from '../src/services/workers-health.service';
import { WebsocketHealthService } from '../src/services/websocket-health.service';
import { SystemMetricsService } from '../src/services/system-metrics.service';
import { FeatureFlagsHealthService } from '../src/services/feature-flags-health.service';
import { ServiceRegistryHealthService } from '../src/services/service-registry-health.service';

const GLOBAL_PREFIX = 'api/v1/health';

let app: INestApplication | null = null;

function decodeRoleFromAuthHeader(authHeader?: string): string | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
      role?: string;
    };
    return payload.role;
  } catch {
    return undefined;
  }
}

export async function setupApp(): Promise<INestApplication> {
  if (app) return app;

  const testingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DatabaseHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(CacheHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(QueueHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(StorageHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(ExternalServicesHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(WorkersHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(WebsocketHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideProvider(SystemMetricsService)
    .useValue({
      getMetrics: () => ({
        memory: {},
        cpu: {},
        disk: {},
        process: {},
      }),
    })
    .overrideProvider(FeatureFlagsHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        flags: {},
      }),
    })
    .overrideProvider(ServiceRegistryHealthService)
    .useValue({
      check: async () => ({
        status: 'unhealthy',
        responseTime: 1,
        details: {},
      }),
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        const role = decodeRoleFromAuthHeader(req?.headers?.authorization);
        if (!role) {
          throw new UnauthorizedException('Unauthorized');
        }
        req.user = { role };
        return true;
      },
    })
    .overrideGuard(RolesGuard)
    .useValue({
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        return req?.user?.role === 'ADMIN';
      },
    });

  const moduleRef = await testingModuleBuilder.compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  await app.listen(0);
  return app;
}

export async function teardownApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

export function getApp(): INestApplication {
  if (!app) throw new Error('App has not been initialized. Call setupApp() first.');
  return app;
}

export function getAppUrl(): string {
  if (!app) throw new Error('App has not been initialized. Call setupApp() first.');
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}
