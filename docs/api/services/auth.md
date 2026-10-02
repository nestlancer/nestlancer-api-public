<div align="center">

# Authentication Service Endpoints

</div>

---

## 3. Authentication Service

**Base Path**: `/api/v1/auth`

### 3.1 Overview

Handles user authentication, registration, email verification, password management, and two-factor authentication.

### 3.2 Security Features

- JWT-based authentication (RS256 signing)
- Password hashing (bcrypt, cost factor 12)
- Rate limiting (aggressive for auth endpoints)
- Account lockout after 5 failed attempts (30 min duration)
- 2FA support (TOTP + backup codes)
- Email verification required
- Turnstile protection on registration/login

### 3.3 Public Endpoints (No Auth Required)

| Method | Endpoint           | Description               | Rate Limit   | Turnstile     |
| :----- | :----------------- | :------------------------ | :----------- | :------------ |
| `POST` | `/register`        | Create new account        | 5/hour/IP    | Required      |
| `POST` | `/login`           | Authenticate user         | 10/hour/IP   | After 3 fails |
| `POST` | `/verify-email`    | Verify email with token   | 5/hour/IP    | No            |
| `POST` | `/forgot-password` | Request password reset    | 3/hour/email | Yes           |
| `POST` | `/reset-password`  | Reset password with token | 5/hour/token | No            |
| `GET`  | `/check-email`     | Check email availability  | 5/min/IP     | Yes           |
| `GET`  | `/csrf-token`      | Get CSRF token            | 60/min       | No            |
| `GET`  | `/health`          | Service health check      | 60/min/IP    | No            |

### 3.4 Authenticated Endpoints (Token Required)

| Method | Endpoint               | Description               | Auth          | Rate Limit      |
| :----- | :--------------------- | :------------------------ | :------------ | :-------------- |
| `POST` | `/refresh`             | Refresh access token      | Refresh Token | 30/hour/token   |
| `POST` | `/verify-2fa`          | Complete 2FA verification | Session Token | 10/5min/session |
| `POST` | `/resend-verification` | Resend verification email | JWT           | 3/hour/email    |

### 3.5 Request/Response Examples

#### POST /register

```json
// Request
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+14155552671",
  "acceptTerms": true,
  "marketingConsent": false,
  "turnstileToken": "03AGdBq25..."
}

// Response (201 Created)
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Account created successfully. Please verify your email.",
  "data": {
    "userId": "usrAbc123",
    "email": "user@example.com",
    "emailVerificationSent": true,
    "emailVerificationExpiresAt": "2024-01-15T22:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Email exists)
HTTP/1.1 400 Bad Request - Email exists
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_006",
    "message": "Email already registered",
    "details": {
      "field": "email",
      "value": "user@example.com"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (422 Validation Failed)
HTTP/1.1 422 Validation Failed
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_007",
    "message": "Password does not meet security requirements",
    "details": {
      "field": "password",
      "requirements": {
        "minLength": 8,
        "uppercase": true,
        "lowercase": true,
        "number": true,
        "specialChar": true
      },
      "missing": ["uppercase", "specialChar"]
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /login

```json
// Request
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": false
}

// Response (200 OK) - No 2FA
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "usrAbc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "avatar": "https://cdn.example.com/avatars/usrAbc123.jpg",
      "emailVerified": true,
      "twoFactorEnabled": false
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Response (202 Accepted) - 2FA Required
{
  "status": "partial",
  "message": "Two-factor authentication required",
  "data": {
    "requires2FA": true,
    "authSessionId": "sess2FaXyz789",
    "methodsAvailable": ["totp", "backupCode"],
    "expiresAt": "2024-01-15T10:40:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (401 Unauthorized - Invalid credentials)
HTTP/1.1 401 Unauthorized - Invalid credentials
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_001",
    "message": "Invalid email or password",
    "details": {
      "attemptsRemaining": 2
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (403 Forbidden - Account locked)
HTTP/1.1 403 Forbidden - Account locked
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_003",
    "message": "Account temporarily locked due to multiple failed login attempts",
    "details": {
      "lockedUntil": "2024-01-15T11:00:00.000Z",
      "reason": "tooManyFailedAttempts",
      "lockDuration": 1800
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (403 Forbidden - Email not verified)
HTTP/1.1 403 Forbidden - Email not verified
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_002",
    "message": "Email address not verified",
    "details": {
      "email": "user@example.com",
      "canResendAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /verify-2fa

```json
// Request
POST /api/v1/auth/verify-2fa
Content-Type: application/json

{
  "authSessionId": "sess2FaXyz789",
  "code": "123456",
  "method": "totp"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "usrAbc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Invalid code)
HTTP/1.1 400 Bad Request - Invalid code
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_005",
    "message": "Invalid 2FA code",
    "details": {
      "method": "totp",
      "attemptsRemaining": 2
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (401 Unauthorized - Session expired)
HTTP/1.1 401 Unauthorized - Session expired
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_009",
    "message": "Authentication session expired",
    "details": {
      "authSessionId": "sess2FaXyz789",
      "expiredAt": "2024-01-15T10:40:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:45:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /refresh

```json
// Request
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (401 Unauthorized - Invalid token)
HTTP/1.1 401 Unauthorized - Invalid token
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_004",
    "message": "Invalid or expired refresh token",
    "details": {
      "reason": "tokenExpired"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /verify-email

```json
// Request
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Email verified successfully",
  "data": {
    "emailVerified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Invalid/expired token)
HTTP/1.1 400 Bad Request - Invalid/expired token
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_004",
    "message": "Invalid or expired verification token",
    "details": {
      "reason": "tokenExpired",
      "canRequestNew": true
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /forgot-password

```json
// Request
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com",
  "turnstileToken": "03AGdBq25..."
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "If an account exists with this email, you will receive password reset instructions",
  "data": {
    "emailSent": true
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Note: Always returns 200 to prevent email enumeration
```

#### POST /reset-password

```json
// Request
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass123!"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Password reset successfully",
  "data": {
    "passwordChanged": true,
    "changedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Weak password)
HTTP/1.1 400 Bad Request - Weak password
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "AUTH_007",
    "message": "Password does not meet security requirements",
    "details": {
      "requirements": {
        "minLength": 8,
        "uppercase": true,
        "lowercase": true,
        "number": true,
        "specialChar": true
      },
      "missing": ["specialChar"]
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /check-email

```json
// Request
GET /api/v1/auth/check-email?email=user@example.com&turnstileToken=03AGdBq25...

// Response (200 OK) - Generic response to prevent enumeration
{
  "status": "success",
  "data": {
    "valid": true
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Note: Does not reveal if email exists, only validates format
```

### 3.6 JWT Token Structure

#### Access Token Payload

```json
{
  "sub": "usrAbc123",
  "email": "user@example.com",
  "role": "user",
  "type": "access",
  "iat": 1705323000,
  "exp": 1705323900,
  "jti": "jwtXyz789"
}
```

#### Refresh Token Payload

```json
{
  "sub": "usrAbc123",
  "type": "refresh",
  "iat": 1705323000,
  "exp": 1707915000,
  "jti": "jwtAbc123"
}
```

### 3.7 Error Codes

| Code       | HTTP Status | Description                   | Retry |
| :--------- | :---------- | :---------------------------- | :---- |
| `AUTH_001` | 401         | Invalid credentials           | Yes   |
| `AUTH_002` | 403         | Account not verified          | No    |
| `AUTH_003` | 403         | Account locked                | Wait  |
| `AUTH_004` | 401         | Invalid/expired token         | No    |
| `AUTH_005` | 400         | 2FA verification failed       | Yes   |
| `AUTH_006` | 409         | Email already registered      | No    |
| `AUTH_007` | 422         | Password requirements not met | No    |
| `AUTH_008` | 422         | Invalid email format          | No    |
| `AUTH_009` | 401         | Session expired               | No    |
| `AUTH_010` | 429         | Too many failed attempts      | Wait  |
| `AUTH_011` | 400         | Turnstile verification failed | Yes   |
| `AUTH_012` | 400         | Invalid verification token    | No    |
| `AUTH_013` | 410         | Password reset token expired  | No    |

---
