## 📖 Table of Contents

- [Status](#status)
- [Date](#date)
- [Context](#context)
- [Decision](#decision)
- [Rationale](#rationale)
- [Alternatives Considered](#alternatives-considered)
- [Consequences](#consequences)

---

## Status

Accepted

---

## Date

2025-12-01

---

## Context

We need a secure authentication system supporting both web (cookie-based) and mobile/API (Bearer token) clients with session management and 2FA.

---

## Decision

Use **JWT with refresh token rotation** and dual delivery mechanism.

### ⚙️ Configuration

- **Access token**: 15 minute expiry, RS256/HS256 signed
- **Refresh token**: 7 day expiry, stored hashed in DB, rotated on use
- **Delivery**: httpOnly cookies for web, Bearer header for mobile/API
- **CSRF**: Double-submit cookie pattern for cookie-based auth
- **2FA**: TOTP via speakeasy library (optional per user)
- **Account lockout**: After 5 failed attempts within 15 minutes

### Token Flow

```
Login → access_token (15m) + refresh_token (7d, hashed in DB)
  → Token expires → POST /auth/refresh with refresh_token
    → Old refresh revoked → New pair issued (rotation)
      → If old refresh reused → Entire family revoked (theft detection)
```

---

## Rationale

- Short-lived access tokens minimize exposure window
- Refresh token rotation detects token theft via family tracking
- Dual delivery supports web and mobile without compromise
- CSRF protection only needed for cookie-based delivery

---

## Alternatives Considered

- **Session-based auth**: Less suitable for API-first architecture, stateful server
- **OAuth2 only**: Overkill for single-platform auth, adds complexity

---

## Consequences

- `JwtAuthGuard` as global guard with `@Public()` opt-out
- `RolesGuard` for RBAC with only USER and ADMIN roles
- `CsrfGuard` applied conditionally for cookie-based requests
