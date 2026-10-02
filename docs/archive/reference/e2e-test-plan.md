## 📖 Table of Contents

- [Directory Structure](#directory-structure)
- [Key Files Implementation](#key-files-implementation)
- [Example E2E Test Files](#example-e2e-test-files)
- [Package.json Scripts](#packagejson-scripts)
- [Summary: The Two Layers](#summary-the-two-layers)
- [Corrections applied (vs. project config)](#corrections-applied-vs-project-config)

---

## Directory Structure

This project uses **tests/e2e/** for root-level system E2E tests (see `scripts/test/run-e2e.sh` and `package.json`). The same structure can live under **e2e/** if you prefer; adjust paths in configs and scripts accordingly.

```
.
├── tests/e2e/                               # ← ROOT-LEVEL SYSTEM E2E TESTS (or e2e/)
│   ├── jest.e2e.config.ts
│   ├── tsconfig.e2e.json
│   ├── setup/
│   │   ├── global-setup.ts                 # Start all services before tests
│   │   ├── global-teardown.ts              # Cleanup after all tests
│   │   ├── test-environment.ts             # Custom Jest environment
│   │   └── docker-compose.e2e.yml          # Optional: E2E-only infra (see note below)
│   ├── helpers/
│   │   ├── api-client.ts                   # HTTP client hitting the gateway
│   │   ├── ws-client.ts                    # WebSocket test client
│   │   ├── auth.helper.ts                  # Login, get tokens, etc.
│   │   ├── database.helper.ts              # Seed/clean DB between tests
│   │   ├── queue.helper.ts                 # Wait for async message processing
│   │   ├── mail.helper.ts                  # Intercept/verify emails
│   │   └── wait-for.helper.ts              # Poll until condition is met
│   ├── fixtures/
│   │   ├── users.fixture.ts
│   │   ├── projects.fixture.ts
│   │   ├── payments.fixture.ts
│   │   └── media.fixture.ts
│   ├── flows/                               # ← CROSS-SERVICE USER JOURNEYS
│   │   ├── auth/
│   │   │   ├── registration.e2e-spec.ts
│   │   │   ├── login-logout.e2e-spec.ts
│   │   │   ├── password-reset.e2e-spec.ts
│   │   │   └── two-factor-auth.e2e-spec.ts
│   │   ├── project-lifecycle/
│   │   │   ├── request-to-quote.e2e-spec.ts
│   │   │   ├── quote-to-project.e2e-spec.ts
│   │   │   ├── project-progress.e2e-spec.ts
│   │   │   ├── project-payment.e2e-spec.ts
│   │   │   └── full-project-lifecycle.e2e-spec.ts
│   │   ├── messaging/
│   │   │   ├── send-receive-messages.e2e-spec.ts
│   │   │   ├── real-time-messaging.e2e-spec.ts
│   │   │   └── message-notifications.e2e-spec.ts
│   │   ├── payments/
│   │   │   ├── payment-flow.e2e-spec.ts
│   │   │   ├── refund-flow.e2e-spec.ts
│   │   │   └── webhook-payment-sync.e2e-spec.ts
│   │   ├── content/
│   │   │   ├── blog-publish.e2e-spec.ts
│   │   │   ├── portfolio-management.e2e-spec.ts
│   │   │   └── media-upload.e2e-spec.ts
│   │   ├── admin/
│   │   │   ├── user-management.e2e-spec.ts
│   │   │   ├── system-config.e2e-spec.ts
│   │   │   └── impersonation.e2e-spec.ts
│   │   └── notifications/
│   │       ├── notification-delivery.e2e-spec.ts
│   │       └── notification-preferences.e2e-spec.ts
│   └── smoke/                               # ← QUICK HEALTH CHECKS
│       ├── gateway-routing.e2e-spec.ts
│       ├── service-health.e2e-spec.ts
│       └── websocket-connection.e2e-spec.ts
│
│   # Note: For this repo, E2E can also use the full stack via
│   # docker-compose.yml + docker-compose.dev.yml + docker-compose.test.yml
│   # and .env.e2e (see scripts/test/run-e2e.sh). The docker-compose.e2e.yml
│   # below is for an isolated infra (e.g. CI) with its own Postgres/Redis/RabbitMQ.
│
├── services/
│   ├── auth/
│   │   ├── e2e/                            # ← PER-SERVICE E2E TESTS
│   │   │   ├── jest.e2e.config.ts
│   │   │   ├── setup.ts
│   │   │   ├── auth.e2e-spec.ts
│   │   │   ├── registration.e2e-spec.ts
│   │   │   └── token-refresh.e2e-spec.ts
│   │   └── src/
│   ├── users/
│   │   ├── e2e/
│   │   │   ├── jest.e2e.config.ts
│   │   │   ├── setup.ts
│   │   │   ├── profile.e2e-spec.ts
│   │   │   └── admin-users.e2e-spec.ts
│   │   └── src/
│   ├── projects/
│   │   ├── e2e/
│   │   │   ├── jest.e2e.config.ts
│   │   │   ├── setup.ts
│   │   │   ├── create-project.e2e-spec.ts
│   │   │   └── project-admin.e2e-spec.ts
│   │   └── src/
│   ├── payments/
│   │   ├── e2e/
│   │   │   ├── jest.e2e.config.ts
│   │   │   ├── setup.ts
│   │   │   ├── payment-intent.e2e-spec.ts
│   │   │   └── razorpay-webhook.e2e-spec.ts
│   │   └── src/
│   ├── messaging/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── notifications/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── blog/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── portfolio/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── progress/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── quotes/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── requests/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── media/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── contact/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── admin/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   ├── health/
│   │   ├── e2e/
│   │   │   └── ...
│   │   └── src/
│   └── webhooks/
│       ├── e2e/
│       │   └── ...
│       └── src/
│
├── gateway/
│   ├── e2e/                                # ← GATEWAY-LEVEL E2E
│   │   ├── jest.e2e.config.ts
│   │   ├── proxy-routing.e2e-spec.ts
│   │   ├── rate-limiting.e2e-spec.ts
│   │   └── auth-middleware.e2e-spec.ts
│   └── src/
│
└── ws-gateway/
    ├── e2e/                                # ← WEBSOCKET GATEWAY E2E
    │   ├── jest.e2e.config.ts
    │   ├── connection.e2e-spec.ts
    │   ├── messaging-realtime.e2e-spec.ts
    │   └── presence.e2e-spec.ts
    └── src/
```

---

## Key Files Implementation

### 1. Docker Compose for E2E

```yaml
# tests/e2e/setup/docker-compose.e2e.yml  (or e2e/setup/ if using e2e/ at root)
version: '3.8'

services:
  postgres-e2e:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: e2e_user
      POSTGRES_PASSWORD: e2e_password
      POSTGRES_DB: nestlancer_e2e
    ports:
      - '5433:5432'
    tmpfs:
      - /var/lib/postgresql/data # RAM-backed for speed

  redis-e2e:
    image: redis:7-alpine
    ports:
      - '6380:6379'
    command: redis-server --save "" # No persistence

  rabbitmq-e2e:
    image: rabbitmq:3.13-management-alpine
    ports:
      - '5673:5672'
      - '15673:15672'
    environment:
      RABBITMQ_DEFAULT_USER: e2e_user
      RABBITMQ_DEFAULT_PASS: e2e_password

  mailpit:
    image: axllent/mailpit
    ports:
      - '1026:1025' # SMTP
      - '8026:8025' # Web UI for inspecting emails
```

### 2. Global Setup

```typescript
// e2e/setup/global-setup.ts
import { execSync } from 'child_process';
import { Client } from 'pg';
import * as path from 'path';

const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForService(url: string, name: string): Promise<void> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✓ ${name} is ready`);
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
  }
  throw new Error(`${name} failed to start within ${MAX_RETRIES}s`);
}

async function waitForRedis(): Promise<void> {
  const net = await import('net');
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(6380, 'localhost', () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
      });
      console.log('✓ Redis is ready');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('Redis failed to start');
}

async function waitForPostgres(): Promise<void> {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'e2e_user',
    password: 'e2e_password',
    database: 'nestlancer_e2e',
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.end();
      console.log('✓ PostgreSQL is ready');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('PostgreSQL failed to start');
}

export default async function globalSetup(): Promise<void> {
  console.log('\n🚀 Starting E2E test environment...\n');

  // 1. Start infrastructure (path matches tests/e2e/ or e2e/)
  const composePath = 'tests/e2e/setup/docker-compose.e2e.yml';
  execSync(`docker compose -f ${composePath} up -d --wait`, { stdio: 'inherit' });

  // 2. Wait for infrastructure
  await waitForPostgres();
  await waitForRedis(); // see below - Redis does not speak HTTP

  // 3. Run migrations (Prisma schema is in prisma/schema/, config in prisma.config.ts)
  const e2eDbUrl =
    process.env.E2E_DATABASE_URL ||
    'postgresql://e2e_user:e2e_password@localhost:5433/nestlancer_e2e';
  const repoRoot = path.join(__dirname, '../../..'); // tests/e2e/setup -> repo root
  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: e2eDbUrl },
  });

  // 4. Seed base data (roles, permissions, config)
  execSync('pnpm prisma db seed', {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: e2eDbUrl, NODE_ENV: 'e2e' },
  });

  // 5. Start all services (or use docker compose for services too)
  // Option A: Start via docker compose (recommended for CI)
  // execSync('docker compose -f docker-compose.e2e.yml up -d --wait', {
  //   stdio: 'inherit',
  // });

  // Option B: Start via NestJS in-process (faster for local dev)
  // Services are started in test-environment.ts per-worker

  // 6. Wait for gateway to be ready
  // await waitForService('http://localhost:3000/health', 'Gateway');

  console.log('\n✓ E2E environment ready\n');
}
```

```typescript
// e2e/setup/global-teardown.ts
import { execSync } from 'child_process';

export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Tearing down E2E environment...\n');

  const composePath = 'tests/e2e/setup/docker-compose.e2e.yml';
  execSync(`docker compose -f ${composePath} down -v --remove-orphans`, { stdio: 'inherit' });

  console.log('✓ E2E environment cleaned up\n');
}
```

### 3. Root E2E Jest Config

```typescript
// tests/e2e/jest.e2e.config.ts
import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e',
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.e2e.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  globalSetup: './setup/global-setup.ts',
  globalTeardown: './setup/global-teardown.ts',
  testTimeout: 60_000, // 60s per test - E2E can be slow
  maxWorkers: 1, // Sequential - services share state
  verbose: true,
  setupFilesAfterEnv: ['./helpers/setup-after-env.ts'],
  moduleNameMapper: {
    '^@nestlancer/common$': '<rootDir>/../../libs/common/src',
    '^@nestlancer/common/(.*)$': '<rootDir>/../../libs/common/src/$1',
    '^@nestlancer/config$': '<rootDir>/../../libs/config/src',
    '^@nestlancer/config/(.*)$': '<rootDir>/../../libs/config/src/$1',
    '^@nestlancer/database$': '<rootDir>/../../libs/database/src',
    '^@nestlancer/database/(.*)$': '<rootDir>/../../libs/database/src/$1',
  },
};

export default config;
```

```json
// tests/e2e/tsconfig.e2e.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/e2e",
    "types": ["jest", "node"],
    "paths": {
      "@nestlancer/common": ["../../libs/common/src"],
      "@nestlancer/common/*": ["../../libs/common/src/*"],
      "@nestlancer/config": ["../../libs/config/src"],
      "@nestlancer/config/*": ["../../libs/config/src/*"],
      "@nestlancer/database": ["../../libs/database/src"],
      "@nestlancer/database/*": ["../../libs/database/src/*"]
    }
  },
  "include": ["./**/*.ts"]
}
```

### 4. API Client Helper

```typescript
// e2e/helpers/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseURL = 'http://localhost:3000/api/v1') {
    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      validateStatus: () => true, // Don't throw on non-2xx
    });
  }

  setToken(token: string): void {
    this.authToken = token;
  }

  clearToken(): void {
    this.authToken = null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, { ...config, headers: this.getHeaders() });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, { ...config, headers: this.getHeaders() });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, { ...config, headers: this.getHeaders() });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, { ...config, headers: this.getHeaders() });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, { ...config, headers: this.getHeaders() });
  }

  async uploadFile(url: string, filePath: string, fieldName = 'file'): Promise<AxiosResponse> {
    const FormData = (await import('form-data')).default;
    const fs = await import('fs');
    const form = new FormData();
    form.append(fieldName, fs.createReadStream(filePath));
    return this.client.post(url, form, {
      headers: { ...this.getHeaders(), ...form.getHeaders() },
    });
  }
}

// Pre-configured instances
export const publicApi = new ApiClient();
export const adminApi = new ApiClient();
export const userApi = new ApiClient();
```

### 5. Auth Helper

```typescript
// e2e/helpers/auth.helper.ts
import { ApiClient } from './api-client';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
  refreshToken: string;
}

export class AuthHelper {
  constructor(private api: ApiClient) {}

  async registerUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<TestUser> {
    const res = await this.api.post('/auth/register', data);
    if (res.status !== 201) {
      throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.data)}`);
    }
    return {
      id: res.data.data.user.id,
      email: data.email,
      password: data.password,
      token: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken,
    };
  }

  async loginUser(email: string, password: string): Promise<TestUser> {
    const res = await this.api.post('/auth/login', { email, password });
    if (res.status !== 200) {
      throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.data)}`);
    }
    return {
      id: res.data.data.user.id,
      email,
      password,
      token: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken,
    };
  }

  async loginAsAdmin(): Promise<TestUser> {
    return this.loginUser('admin@nestlancer.com', 'AdminPassword123!');
  }

  async loginAsClient(): Promise<TestUser> {
    return this.loginUser('client@test.com', 'ClientPassword123!');
  }

  async createAuthenticatedClient(email: string, password: string): Promise<ApiClient> {
    const user = await this.loginUser(email, password);
    const client = new ApiClient();
    client.setToken(user.token);
    return client;
  }
}
```

### 6. Database Helper

```typescript
// e2e/helpers/database.helper.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl:
    process.env.DATABASE_URL ?? 'postgresql://e2e_user:e2e_password@localhost:5433/nestlancer_e2e',
});

export class DatabaseHelper {
  /**
   * Truncate all tables except system tables (roles, permissions, config).
   * Call between test suites to get a clean state.
   */
  static async cleanTransactionalData(): Promise<void> {
    const tablesToClean = [
      'webhook_delivery',
      'webhook_log',
      'notification',
      'push_subscription',
      'notification_preference',
      'message_reaction',
      'message',
      'conversation_participant',
      'conversation',
      'progress_entry',
      'deliverable',
      'milestone',
      'payment',
      'invoice',
      'quote_line_item',
      'quote',
      'project',
      'service_request',
      'contact_response',
      'contact_message',
      'comment',
      'post_tag',
      'post',
      'portfolio_image',
      'portfolio_item',
      'media',
      'audit_log',
      'outbox_event',
      'idempotency_key',
      'refresh_token',
      'user_session',
      // Keep users last due to FK constraints
      // 'user',  ← only if you want to re-seed users
    ];

    for (const table of tablesToClean) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }

  static async seedTestUsers(): Promise<void> {
    // Insert standard test users needed by E2E flows
    // ...
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }

  static getClient(): PrismaClient {
    return prisma;
  }
}
```

### 7. Async Wait Helper

```typescript
// e2e/helpers/wait-for.helper.ts

/**
 * Poll until a condition becomes true.
 * Critical for microservices E2E where things happen asynchronously
 * (message queues, workers, notifications).
 */
export async function waitFor(
  conditionFn: () => Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    description?: string;
  } = {},
): Promise<void> {
  const { timeout = 15_000, interval = 500, description = 'condition' } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await conditionFn()) return;
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Timed out waiting for: ${description} (${timeout}ms)`);
}

/**
 * Wait until an API endpoint returns the expected status.
 */
export async function waitForApiResponse(
  fetchFn: () => Promise<{ status: number; data: any }>,
  expectedStatus: number,
  timeout = 15_000,
): Promise<any> {
  let lastResponse: any;
  await waitFor(
    async () => {
      lastResponse = await fetchFn();
      return lastResponse.status === expectedStatus;
    },
    { timeout, description: `API to return ${expectedStatus}` },
  );
  return lastResponse;
}
```

### 8. WebSocket Test Client

```typescript
// e2e/helpers/ws-client.ts
import { io, Socket } from 'socket.io-client';

export class WsTestClient {
  private socket: Socket;
  private receivedEvents: Map<string, any[]> = new Map();

  constructor(
    private url = 'http://localhost:3100', // ws-gateway port (see docker-compose / run-e2e.sh)
    private token?: string,
  ) {}

  async connect(namespace = '/'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.url}${namespace}`, {
        auth: this.token ? { token: this.token } : undefined,
        transports: ['websocket'],
        timeout: 10_000,
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (err) => reject(err));

      // Capture all events
      this.socket.onAny((event, ...args) => {
        if (!this.receivedEvents.has(event)) {
          this.receivedEvents.set(event, []);
        }
        this.receivedEvents.get(event)!.push(args);
      });
    });
  }

  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  async waitForEvent(event: string, timeout = 10_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout waiting for WS event: ${event}`)),
        timeout,
      );
      this.socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  getReceivedEvents(event: string): any[] {
    return this.receivedEvents.get(event) ?? [];
  }

  disconnect(): void {
    this.socket?.disconnect();
  }
}
```

---

## Example E2E Test Files

### Smoke Test

```typescript
// tests/e2e/smoke/gateway-routing.e2e-spec.ts
import { publicApi } from '../helpers/api-client';

describe('Gateway Routing (smoke)', () => {
  it('GET /health returns 200', async () => {
    const res = await publicApi.get('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('healthy'); // gateway health returns { status: 'healthy', ... }
  });

  it('GET /unknown returns 404', async () => {
    const res = await publicApi.get('/nonexistent-route');
    expect(res.status).toBe(404);
  });

  it('protected route without token returns 401', async () => {
    const res = await publicApi.get('/users/profile');
    expect(res.status).toBe(401);
  });
});
```

### Full Project Lifecycle E2E

```typescript
// tests/e2e/flows/project-lifecycle/full-project-lifecycle.e2e-spec.ts
import { ApiClient, publicApi } from '../../helpers/api-client';
import { AuthHelper, TestUser } from '../../helpers/auth.helper';
import { DatabaseHelper } from '../../helpers/database.helper';
import { waitFor } from '../../helpers/wait-for.helper';

describe('Full Project Lifecycle (E2E)', () => {
  let admin: TestUser;
  let client: TestUser;
  let adminApi: ApiClient;
  let clientApi: ApiClient;
  const auth = new AuthHelper(publicApi);

  beforeAll(async () => {
    await DatabaseHelper.cleanTransactionalData();

    // Register a client
    client = await auth.registerUser({
      email: 'lifecycle-client@test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Client',
    });
    clientApi = new ApiClient();
    clientApi.setToken(client.token);

    // Login as admin
    admin = await auth.loginAsAdmin();
    adminApi = new ApiClient();
    adminApi.setToken(admin.token);
  });

  let requestId: string;
  let quoteId: string;
  let projectId: string;
  let milestoneId: string;
  let paymentId: string;

  // ──────────────────────────────────────────────
  // STEP 1: Client submits a service request
  // ──────────────────────────────────────────────
  it('step 1: client submits a service request', async () => {
    const res = await clientApi.post('/requests', {
      title: 'E-commerce Website',
      description: 'Need a full e-commerce site with payment integration',
      budget: 500000, // ₹5,000 in paise
      deadline: '2025-06-01',
      category: 'WEB_DEVELOPMENT',
    });

    expect(res.status).toBe(201);
    expect(res.data.data.id).toBeDefined();
    requestId = res.data.data.id;
  });

  // ──────────────────────────────────────────────
  // STEP 2: Admin reviews and creates a quote
  // ──────────────────────────────────────────────
  it('step 2: admin creates a quote for the request', async () => {
    // Admin sees the request
    const reqRes = await adminApi.get(`/admin/requests/${requestId}`);
    expect(reqRes.status).toBe(200);

    // Admin creates quote
    const res = await adminApi.post('/admin/quotes', {
      requestId,
      lineItems: [
        { description: 'Frontend Development', amount: 250000 },
        { description: 'Backend + Payment Integration', amount: 200000 },
        { description: 'Testing & Deployment', amount: 50000 },
      ],
      validUntil: '2025-04-01',
      notes: 'Includes 2 rounds of revisions',
    });

    expect(res.status).toBe(201);
    quoteId = res.data.data.id;
  });

  // ──────────────────────────────────────────────
  // STEP 3: Client receives notification and accepts quote
  // ──────────────────────────────────────────────
  it('step 3: client sees notification and accepts quote', async () => {
    // Wait for async notification to be created by worker
    await waitFor(
      async () => {
        const res = await clientApi.get('/notifications?unreadOnly=true');
        return res.data.data.items.some((n: any) => n.type === 'QUOTE_RECEIVED');
      },
      { timeout: 15_000, description: 'quote notification' },
    );

    // Client views the quote
    const quoteRes = await clientApi.get(`/quotes/${quoteId}`);
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.data.data.total).toBe(500000);

    // Client accepts
    const acceptRes = await clientApi.post(`/quotes/${quoteId}/accept`);
    expect(acceptRes.status).toBe(200);
  });

  // ──────────────────────────────────────────────
  // STEP 4: Project is auto-created from accepted quote
  // ──────────────────────────────────────────────
  it('step 4: project is created from accepted quote', async () => {
    await waitFor(
      async () => {
        const res = await clientApi.get('/projects');
        return res.data.data.items.length > 0;
      },
      { timeout: 15_000, description: 'project creation' },
    );

    const res = await clientApi.get('/projects');
    projectId = res.data.data.items[0].id;
    expect(res.data.data.items[0].status).toBe('IN_PROGRESS');
  });

  // ──────────────────────────────────────────────
  // STEP 5: Admin creates milestones
  // ──────────────────────────────────────────────
  it('step 5: admin creates milestones for the project', async () => {
    const res = await adminApi.post(`/admin/projects/${projectId}/milestones`, {
      title: 'Frontend Complete',
      description: 'All pages implemented',
      dueDate: '2025-05-01',
      amount: 250000,
    });

    expect(res.status).toBe(201);
    milestoneId = res.data.data.id;
  });

  // ──────────────────────────────────────────────
  // STEP 6: Admin uploads deliverable, client approves
  // ──────────────────────────────────────────────
  it('step 6: admin submits deliverable, client approves milestone', async () => {
    // Admin marks milestone as delivered
    const deliverRes = await adminApi.post(`/admin/milestones/${milestoneId}/deliver`, {
      notes: 'Frontend is complete, please review staging URL',
      deliverableUrl: 'https://staging.example.com',
    });
    expect(deliverRes.status).toBe(200);

    // Client approves
    const approveRes = await clientApi.post(`/milestones/${milestoneId}/approve`, {
      feedback: 'Looks great!',
    });
    expect(approveRes.status).toBe(200);
  });

  // ──────────────────────────────────────────────
  // STEP 7: Payment is triggered
  // ──────────────────────────────────────────────
  it('step 7: client makes payment for approved milestone', async () => {
    const intentRes = await clientApi.post('/payments/create-intent', {
      projectId,
      milestoneId,
      amount: 250000,
    });
    expect(intentRes.status).toBe(201);
    paymentId = intentRes.data.data.id;

    // Simulate Razorpay webhook confirming payment
    const webhookRes = await publicApi.post('/webhooks/razorpay', {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: intentRes.data.data.razorpayOrderId,
            amount: 250000,
            status: 'captured',
          },
        },
      },
    });
    // Webhook should return 200 (acknowledged)
    expect(webhookRes.status).toBe(200);

    // Verify payment status updated
    await waitFor(
      async () => {
        const res = await clientApi.get(`/payments/${paymentId}`);
        return res.data.data.status === 'COMPLETED';
      },
      { timeout: 20_000, description: 'payment completion' },
    );
  });

  // ──────────────────────────────────────────────
  // STEP 8: Verify everything is consistent
  // ──────────────────────────────────────────────
  it('step 8: final state is consistent across all services', async () => {
    // Request status
    const reqRes = await clientApi.get(`/requests/${requestId}`);
    expect(reqRes.data.data.status).toBe('CONVERTED');

    // Quote status
    const quoteRes = await clientApi.get(`/quotes/${quoteId}`);
    expect(quoteRes.data.data.status).toBe('ACCEPTED');

    // Project status
    const projRes = await clientApi.get(`/projects/${projectId}`);
    expect(projRes.data.data.status).toBe('IN_PROGRESS');

    // Milestone status
    const mileRes = await clientApi.get(`/projects/${projectId}/milestones/${milestoneId}`);
    expect(mileRes.data.data.status).toBe('APPROVED');

    // Payment
    const payRes = await clientApi.get(`/payments/${paymentId}`);
    expect(payRes.data.data.status).toBe('COMPLETED');
  });

  afterAll(async () => {
    await DatabaseHelper.disconnect();
  });
});
```

### Per-Service E2E Example

```typescript
// services/auth/e2e/jest.e2e.config.ts
import type { Config } from 'jest';

const config: Config = {
  displayName: 'auth-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testTimeout: 30_000,
  maxWorkers: 1,
};

export default config;
```

```typescript
// services/auth/e2e/setup.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let app: INestApplication;

export async function setupApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  // Apply the same pipes, filters, interceptors as main.ts
  await app.init();
  await app.listen(0); // Random port
  return app;
}

export async function teardownApp(): Promise<void> {
  await app?.close();
}

export function getAppUrl(): string {
  const server = app.getHttpServer();
  const address = server.address();
  return `http://localhost:${address.port}`;
}
```

```typescript
// services/auth/e2e/registration.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import axios from 'axios';
import { setupApp, teardownApp, getAppUrl } from './setup';

describe('Auth Service - Registration (E2E)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await setupApp();
    baseUrl = getAppUrl();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('should register a new user successfully', async () => {
    const res = await axios.post(`${baseUrl}/auth/register`, {
      email: 'newuser@example.com',
      password: 'StrongP@ssw0rd!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(res.status).toBe(201);
    expect(res.data.data.accessToken).toBeDefined();
    expect(res.data.data.user.email).toBe('newuser@example.com');
  });

  it('should reject duplicate email', async () => {
    const res = await axios.post(
      `${baseUrl}/auth/register`,
      {
        email: 'newuser@example.com',
        password: 'AnotherP@ss1!',
        firstName: 'John',
        lastName: 'Doe',
      },
      { validateStatus: () => true },
    );

    expect(res.status).toBe(409);
  });

  it('should reject weak passwords', async () => {
    const res = await axios.post(
      `${baseUrl}/auth/register`,
      {
        email: 'weak@example.com',
        password: '123',
        firstName: 'Weak',
        lastName: 'Password',
      },
      { validateStatus: () => true },
    );

    expect(res.status).toBe(400);
  });
});
```

---

## Package.json Scripts

```jsonc
// root package.json - E2E scripts (align with tests/e2e/ or e2e/)
{
  "scripts": {
    "test:e2e": "jest --config tests/e2e/jest.e2e.config.ts --runInBand",
    "test:e2e:smoke": "jest --config tests/e2e/jest.e2e.config.ts --testPathPattern=smoke --runInBand",
    "test:e2e:flows": "jest --config tests/e2e/jest.e2e.config.ts --testPathPattern=flows --runInBand",
    "test:e2e:auth": "jest --config services/auth/e2e/jest.e2e.config.ts --runInBand",
    "test:e2e:payments": "jest --config services/payments/e2e/jest.e2e.config.ts --runInBand",
    "test:e2e:infra:up": "docker compose -f tests/e2e/setup/docker-compose.e2e.yml up -d",
    "test:e2e:infra:down": "docker compose -f tests/e2e/setup/docker-compose.e2e.yml down -v",
  },
}
```

Existing script `test:e2e:suite` uses `tests/e2e/jest.e2e.config.ts`; pass a pattern, e.g. `pnpm run test:e2e:suite smoke`.

Add to `turbo.json`:

```jsonc
{
  "pipeline": {
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false,
    },
  },
}
```

---

## Summary: The Two Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                 SYSTEM E2E  (tests/e2e/ or e2e/)                │
│                                                                 │
│  Tests go THROUGH the Gateway → hit real services → real DB     │
│  Tests full user journeys across multiple microservices         │
│  Verifies async flows (queues, workers, webhooks)                │
│                                                                 │
│  smoke/             → Quick: is everything wired up?            │
│  flows/             → Full multi-step user journeys             │
│  helpers/           → Shared utilities                          │
│  fixtures/          → Test data                                 │
│  setup/             → Infra bootstrap/teardown                  │
├─────────────────────────────────────────────────────────────────┤
│                  SERVICE E2E  (services/*/e2e/)                 │
│                                                                 │
│  Tests hit ONE service directly (no gateway)                   │
│  Real DB + real Redis, but mocked external services            │
│  Faster, more isolated, easier to debug                        │
│                                                                 │
│  services/auth/e2e/       → Auth endpoints                     │
│  services/payments/e2e/   → Payment endpoints                  │
│  services/projects/e2e/   → Project CRUD                       │
│  ...every service gets its own e2e/                            │
├─────────────────────────────────────────────────────────────────┤
│  gateway/e2e/             → Proxy routing, rate limits, CORS   │
│  ws-gateway/e2e/          → WebSocket connections, rooms       │
└─────────────────────────────────────────────────────────────────┘
```

**Run order in CI:**

```
Unit tests → Integration tests → Service E2E → System E2E (smoke) → System E2E (flows)
```

---

## Corrections applied (vs. project config)

- **E2E directory**: Plan uses **tests/e2e/** to match `scripts/test/run-e2e.sh` and root `package.json` (optional **e2e/** at root noted).
- **Path aliases**: Replaced `@app/common`, `@app/config`, `@app/database` with **@nestlancer/common**, **@nestlancer/config**, **@nestlancer/database** per `tsconfig.base.json`.
- **Jest**: Fixed **setupFilesAfterSetup** → **setupFilesAfterEnv**; `moduleNameMapper` and **tsconfig.e2e.json** paths use `@nestlancer/*` and correct relative paths from `tests/e2e/`.
- **API base URL**: Set to **http://localhost:3000/api/v1** (gateway global prefix is `api/v1`).
- **Health response**: Smoke test expects **status: 'healthy'** (gateway returns `getGatewayHealth().status === 'healthy'`).
- **Redis in global-setup**: Replaced HTTP check with **TCP connect to port 6380** (Redis does not serve HTTP).
- **Prisma**: Migrations and seed use **pnpm** and repo root; seed via **pnpm prisma db seed**; support **E2E_DATABASE_URL** or default E2E URL.
- **WebSocket base URL**: Default port **3100** for ws-gateway (per `docker-compose.test.yml` / `run-e2e.sh`).
- **Docker Compose paths**: All compose paths use **tests/e2e/setup/docker-compose.e2e.yml** (or **e2e/setup/** if using root **e2e/**).
- **Package scripts**: E2E Jest config path set to **tests/e2e/jest.e2e.config.ts**; documented existing **test:e2e:suite**.
- **Database helper**: Uses **process.env.DATABASE_URL** when set so it works with `.env.e2e` or E2E compose.
