import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { testMigrationsReady } from '../../../libs/testing/src/helpers/test-database.helper';
import {
  setupApp as setupAuthApp,
  teardownApp as teardownAuthApp,
  getApp as getAuthApp,
} from '../../auth/e2e/setup';
import { setupApp, teardownApp, getApp, getGlobalPrefix } from './setup';

const E2E_USER_ID = 'e2e-user-1';
const E2E_USER_EMAIL = 'e2e-user-1@example.com';
const E2E_ADMIN_ID = 'e2e-admin-1';
const E2E_PASSWORD = 'E2ePass123!';
const NEW_PASSWORD = 'E2eNewPass456!';

function adminAuthHeader() {
  const token = createTestJwt(
    { sub: E2E_ADMIN_ID, email: 'e2e-admin-1@example.com', role: 'ADMIN' },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Force password reset — login block and recovery (E2E)', () => {
  const usersPrefix = getGlobalPrefix();
  const authPrefix = 'api/v1/auth';
  let migrationsOk = false;

  beforeAll(async () => {
    await setupApp();
    migrationsOk = testMigrationsReady();
    if (migrationsOk) {
      await setupAuthApp();
    }
  });

  afterAll(async () => {
    if (migrationsOk) {
      await teardownAuthApp();
    }
    await teardownApp();
  });

  it('blocks login after force reset, then allows login after password change', async () => {
    if (!migrationsOk) {
      console.warn(
        'Skipping: database migrations could not be applied (check DATABASE_URL permissions).',
      );
      return;
    }

    const loginPayload = { email: E2E_USER_EMAIL, password: E2E_PASSWORD };

    const loginOk = await request(getAuthApp().getHttpServer())
      .post(`/${authPrefix}/login`)
      .send(loginPayload)
      .set('User-Agent', 'E2ETest/1.0');

    expect(loginOk.status).toBe(200);
    expect(loginOk.body.status).toBe('success');
    expect(loginOk.body.data?.accessToken).toBeDefined();

    const forceRes = await request(getApp().getHttpServer())
      .post(`/${usersPrefix}/admin/users/${E2E_USER_ID}/force-password-reset`)
      .set(adminAuthHeader());

    expect(forceRes.status).toBe(201);
    expect(forceRes.body.data?.passwordResetRequired).toBe(true);

    const loginBlocked = await request(getAuthApp().getHttpServer())
      .post(`/${authPrefix}/login`)
      .send(loginPayload)
      .set('User-Agent', 'E2ETest/1.0');

    expect(loginBlocked.status).toBe(422);
    expect(loginBlocked.body.error?.code).toBe('AUTH_PASSWORD_CHANGE_REQUIRED');

    const userToken = createTestJwt(
      { sub: E2E_USER_ID, email: E2E_USER_EMAIL, role: 'USER' },
      { secret: process.env.JWT_ACCESS_SECRET },
    );

    const changeRes = await request(getApp().getHttpServer())
      .post(`/${usersPrefix}/users/change-password`)
      .set({ Authorization: `Bearer ${userToken}` })
      .send({
        currentPassword: E2E_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect([200, 201]).toContain(changeRes.status);
    expect(changeRes.body.data?.passwordChanged).toBe(true);

    const loginNew = await request(getAuthApp().getHttpServer())
      .post(`/${authPrefix}/login`)
      .send({ email: E2E_USER_EMAIL, password: NEW_PASSWORD })
      .set('User-Agent', 'E2ETest/1.0');

    expect(loginNew.status).toBe(200);
    expect(loginNew.body.data?.accessToken).toBeDefined();
  });
});
