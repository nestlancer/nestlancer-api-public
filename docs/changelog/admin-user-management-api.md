<div align="center">

# Admin user management API — changelog

</div>

---

## Breaking / security (unreleased)

### Sanitized responses

- `GET /admin/users/:userId` no longer returns raw Prisma user rows. Response is a safe `AdminUserDetail` object (no `passwordHash`, `twoFactorSecret`, or raw `authConfig` secrets).
- `GET /admin/users/:userId/sessions` session objects omit the `token` field.

### Password reset

- `POST /admin/users/:userId/reset-password` requires body `{ "newPassword": "..." }` (min 8 characters). Server-generated passwords are no longer supported.
- Response shape: `{ "passwordReset": true, "message": "..." }` — no plaintext password in JSON.

### Force password reset

- `POST /admin/users/:userId/force-password-reset` sets `AuthConfig.mustChangePassword` and revokes sessions.
- Login and `POST /auth/refresh` return business error code `AUTH_PASSWORD_CHANGE_REQUIRED` until the user changes their password.

### GDPR export

- `POST /admin/users/:userId/export` queues a GDPR export via outbox (`USER_DATA_EXPORT_REQUESTED`), same path as self-service export.

### Roles

- All admin user routes require `ADMIN` only. `SUPER_ADMIN` is removed.

### Single administrator

- Cannot demote, suspend, or delete the only `ADMIN` account.
- Cannot promote a second user to `ADMIN` while another active admin exists.
