<div align="center">

# Users Service Endpoints

</div>

---

## 4. Users Service

**Base Path**: `/api/v1/users`
**Admin Path**: `/api/v1/admin/users`

### 4.1 Overview

Manages user profiles, preferences, sessions, two-factor authentication, and account settings.

### 4.2 User Endpoints (JWT Required)

#### Profile Management

| Method   | Endpoint           | Description                        | Rate Limit | Idempotent |
| :------- | :----------------- | :--------------------------------- | :--------- | :--------- |
| `GET`    | `/health`          | Health check (Simplified response) | 1000/hour  | Yes        |
| `GET`    | `/profile`         | Get own profile                    | 1000/hour  | Yes        |
| `PATCH`  | `/profile`         | Update profile                     | 100/hour   | No         |
| `POST`   | `/change-password` | Change password                    | 20/hour    | No         |
| `POST`   | `/avatar`          | Upload avatar                      | 20/hour    | No         |
| `DELETE` | `/avatar`          | Remove avatar                      | 20/hour    | Yes        |
| `GET`    | `/preferences`     | Get preferences                    | 500/hour   | Yes        |
| `PATCH`  | `/preferences`     | Update preferences                 | 100/hour   | No         |

#### Two-Factor Authentication

| Method | Endpoint                | Description                 | Rate Limit | Idempotent |
| :----- | :---------------------- | :-------------------------- | :--------- | :--------- |
| `POST` | `/2fa/enable`           | Start 2FA setup             | 20/hour    | No         |
| `POST` | `/2fa/verify`           | Complete 2FA setup          | 20/hour    | No         |
| `POST` | `/2fa/disable`          | Disable 2FA                 | 20/hour    | No         |
| `GET`  | `/2fa/backup-codes`     | Get backup codes            | 20/hour    | Yes        |
| `POST` | `/2fa/regenerate-codes` | Regenerate backup codes     | 10/hour    | No         |
| `GET`  | `/2fa/status`           | Check 2FA enrollment status | 100/hour   | Yes        |

#### Session Management

| Method   | Endpoint                     | Description                | Rate Limit | Idempotent |
| :------- | :--------------------------- | :------------------------- | :--------- | :--------- |
| `GET`    | `/sessions`                  | List active sessions       | 100/hour   | Yes        |
| `GET`    | `/sessions/{sessionId}`      | Get session details        | 100/hour   | Yes        |
| `DELETE` | `/sessions/{sessionId}`      | Terminate specific session | 100/hour   | Yes        |
| `POST`   | `/sessions/terminate-others` | Logout all other sessions  | 20/hour    | No         |
| `POST`   | `/logout`                    | Logout current session     | 100/hour   | No         |

#### Account Management

| Method | Endpoint           | Description                     | Rate Limit | Idempotent |
| :----- | :----------------- | :------------------------------ | :--------- | :--------- |
| `POST` | `/delete-account`  | Request account deletion        | 5/hour     | No         |
| `POST` | `/cancel-deletion` | Cancel deletion request         | 10/hour    | No         |
| `GET`  | `/activity`        | View activity history           | 100/hour   | Yes        |
| `GET`  | `/data-export`     | Request GDPR data export        | 5/day      | No         |
| `GET`  | `/export/{id}`     | Download a specific data export | 20/hour    | Yes        |

### 4.3 Admin User Endpoints (Admin JWT Required)

| Method   | Endpoint                           | Description             | Rate Limit | Soft Delete   |     | Role |
| :------- | :--------------------------------- | :---------------------- | :--------- | :------------ | :-- | :--- |
| `GET`    | `/`                                | List all users          | 2000/hour  | N/A           |
| `GET`    | `/search`                          | Search users            | 1000/hour  | N/A           |
| `GET`    | `/{userId}`                        | Get user details        | 2000/hour  | N/A           |
| `PATCH`  | `/{userId}`                        | Update user             | 1000/hour  | N/A           |
| `PATCH`  | `/{userId}/role`                   | Change user role        | 500/hour   | N/A           |
| `PATCH`  | `/{userId}/status`                 | Change account status   | 500/hour   | N/A           |
| `POST`   | `/{userId}/force-password-reset`   | Force password reset    | 200/hour   | N/A           |
| `POST`   | `/{userId}/reset-password`         | Admin sets password     | 200/hour   | N/A           |
| `GET`    | `/{userId}/sessions`               | View user sessions      | 1000/hour  | N/A           |
| `DELETE` | `/sessions/{sessionId}`            | Terminate any session   | 500/hour   | N/A           |
| `POST`   | `/{userId}/terminate-all-sessions` | End all user sessions   | 200/hour   | N/A           |
| `GET`    | `/{userId}/activity`               | View user activity      | 1000/hour  | N/A           |
| `GET`    | `/logs`                            | Auth audit logs         | 1000/hour  | N/A           |
| `GET`    | `/security-stats`                  | Security metrics        | 500/hour   | N/A           |
| `POST`   | `/{userId}/export`                 | Export user data (GDPR) | 100/hour   | N/A           |
| `DELETE` | `/{userId}`                        | Delete user account     | 200/hour   | Yes (30 days) |
| `POST`   | `/{userId}/restore`                | Restore deleted user    | 100/hour   | N/A           |
| `POST`   | `/bulk`                            | Bulk operations         | 50/hour    | N/A           |

### 4.4 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET /profile

```json
// Request
GET /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000

{
  "status": "success",
  "data": {
    "id": "usrAbc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+14155552671",
    "avatar": "https://cdn.example.com/avatars/usrAbc123.jpg",
    "role": "user",
    "emailVerified": true,
    "twoFactorEnabled": true,
    "timezone": "America/New_York",
    "language": "en",
    "country": "US",
    "preferences": {
      "notifications": {
        "email": true,
        "push": true
      },
      "privacy": {
        "profileVisibility": "private",
        "showEmail": false
      }
    },
    "stats": {
      "projectsCompleted": 5,
      "totalSpent": 42500
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "lastLoginAt": "2024-01-15T09:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /profile

```json
// Request
PATCH /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+14155552671",
  "timezone": "America/Los_Angeles",
  "language": "en"
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
  "message": "Profile updated successfully",
  "data": {
    "id": "usrAbc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+14155552671",
    "timezone": "America/Los_Angeles",
    "language": "en",
    "avatar": "https://cdn.example.com/avatars/usrAbc123.jpg",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (422 Validation Error)
HTTP/1.1 422 Validation Error
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "USER_007",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "123-456-7890",
      "expectedFormat": "E.164 (e.g., +14155552671)"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /change-password

```json
// Request
POST /api/v1/users/change-password
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
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
  "message": "Password changed successfully. Please login with your new password.",
  "data": {
    "passwordChanged": true,
    "changedAt": "2024-01-15T10:30:00.000Z",
    "allSessionsTerminated": true
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (401 Unauthorized - Wrong current password)
HTTP/1.1 401 Unauthorized - Wrong current password
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "USER_005",
    "message": "Current password is incorrect",
    "details": {
      "field": "currentPassword"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /2fa/enable

```json
// Request
POST /api/v1/users/2fa/enable
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "password": "CurrentPassword123!"
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
  "message": "Scan the QR code with your authenticator app",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "qrCodeUrl": "otpauth://totp/YourDomain:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=YourDomain",
    "backupCodes": [
      "ABCD-EFGH-IJKL",
      "MNOP-QRST-UVWX",
      "YZ12-3456-7890",
      "QWER-TYUI-OPAS",
      "DFGH-JKLZ-XCVB"
    ],
    "expiresAt": "2024-01-15T10:40:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (409 Conflict - 2FA already enabled)
HTTP/1.1 409 Conflict - 2FA already enabled
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "USER_009",
    "message": "Two-factor authentication is already enabled",
    "details": {
      "enabledAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /2fa/verify

```json
// Request
POST /api/v1/users/2fa/verify
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "code": "123456"
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
  "message": "Two-factor authentication enabled successfully",
  "data": {
    "twoFactorEnabled": true,
    "enabledAt": "2024-01-15T10:30:00.000Z",
    "backupCodesRemaining": 5
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
    "code": "USER_011",
    "message": "Invalid 2FA code",
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
```

#### GET /2fa/status

```json
// Request
GET /api/v1/users/2fa/status
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

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
    "twoFactorEnabled": true,
    "method": "totp",
    "enrolledAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /sessions

```json
// Request
GET /api/v1/users/sessions
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

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
  "data": [
    {
      "id": "sessAbc123",
      "device": {
        "type": "desktop",
        "browser": "Chrome 120.0",
        "os": "macOS 14.0"
      },
      "location": {
        "city": "San Francisco",
        "region": "California",
        "country": "US",
        "ip": "192.168.1.100"
      },
      "current": true,
      "createdAt": "2024-01-15T09:00:00.000Z",
      "lastActivityAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2024-02-15T09:00:00.000Z"
    },
    {
      "id": "sessDef456",
      "device": {
        "type": "mobile",
        "browser": "Safari 17.0",
        "os": "iOS 17.2"
      },
      "location": {
        "city": "New York",
        "region": "New York",
        "country": "US",
        "ip": "192.168.1.101"
      },
      "current": false,
      "createdAt": "2024-01-14T15:00:00.000Z",
      "lastActivityAt": "2024-01-14T20:30:00.000Z",
      "expiresAt": "2024-02-14T15:00:00.000Z"
    }
  ],
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### DELETE /sessions/{sessionId}

```json
// Request
DELETE /api/v1/users/sessions/sessDef456
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
X-CSRF-Token: csrfAbc123

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
  "message": "Session terminated successfully",
  "data": {
    "sessionId": "sessDef456",
    "terminatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (403 Forbidden - Cannot terminate current session)
HTTP/1.1 403 Forbidden - Cannot terminate current session
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "USER_004",
    "message": "Cannot terminate current session. Use logout instead.",
    "details": {
      "sessionId": "sessAbc123",
      "logoutEndpoint": "/api/v1/users/logout"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /delete-account

```json
// Request
POST /api/v1/users/delete-account
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "password": "CurrentPassword123!",
  "reason": "noLongerNeeded",
  "feedback": "Found a better alternative"
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
  "message": "Account deletion scheduled. You have 30 days to cancel this request.",
  "data": {
    "deletionScheduledAt": "2024-01-15T10:30:00.000Z",
    "deletionDate": "2024-02-14T10:30:00.000Z",
    "gracePeriodDays": 30,
    "canCancelUntil": "2024-02-14T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /export/{id}

```json
// Request
GET /api/v1/users/export/expAbc123
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

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
    "downloadUrl": "https://cdn.example.com/exports/expAbc123.json",
    "expiresAt": "2024-01-16T10:30:00.000Z",
    "format": "json"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /preferences

```json
// Request
PATCH /api/v1/users/preferences
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "notifications": {
    "email": {
      "projectUpdates": true,
      "paymentReminders": true,
      "marketing": false,
      "digest": "weekly"
    },
    "push": {
      "messages": true,
      "projectUpdates": true
    }
  },
  "privacy": {
    "profileVisibility": "private",
    "showEmail": false,
    "showPhone": false
  }
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
  "message": "Preferences updated successfully",
  "data": {
    "notifications": {
      "email": {
        "projectUpdates": true,
        "paymentReminders": true,
        "marketing": false,
        "digest": "weekly"
      },
      "push": {
        "messages": true,
        "projectUpdates": true
      }
    },
    "privacy": {
      "profileVisibility": "private",
      "showEmail": false,
      "showPhone": false
    },
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 4.5 Admin Examples

#### GET /admin/users

```json
// Request
GET /api/v1/admin/users?page=1&limit=20&status=active&sortBy=createdAt&order=desc
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

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
  "data": [
    {
      "id": "usrAbc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "twoFactorEnabled": true,
      "stats": {
        "projectsCompleted": 5,
        "totalSpent": 42500
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-15T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### DELETE /admin/users/{userId}

```json
// Request
DELETE /api/v1/admin/users/usrAbc123?reason=spamAccount
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK) - Soft Delete
{
  "status": "success",
  "message": "User account deleted successfully (soft delete - 30 day grace period)",
  "data": {
    "userId": "usrAbc123",
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "permanentDeletionDate": "2024-02-14T10:30:00.000Z",
    "canRestore": true,
    "restoreDeadline": "2024-02-14T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 4.6 Error Codes

| Code       | HTTP Status | Description                        | Retryable     |
| :--------- | :---------- | :--------------------------------- | :------------ |
| `USER_001` | 404         | User not found                     | No            |
| `USER_002` | 400         | Profile update failed              | Yes           |
| `USER_003` | 404         | Session not found                  | No            |
| `USER_004` | 403         | Cannot delete active session       | No            |
| `USER_005` | 401         | Invalid current password           | No            |
| `USER_006` | 422         | Password requirements not met      | No            |
| `USER_007` | 422         | Invalid phone number format        | No            |
| `USER_008` | 400         | Email change requires verification | No            |
| `USER_009` | 409         | 2FA already enabled                | No            |
| `USER_010` | 400         | 2FA not enabled                    | No            |
| `USER_011` | 400         | Invalid 2FA code                   | Yes (limited) |
| `USER_012` | 400         | All backup codes used              | No            |
| `USER_013` | 400         | Invalid preference value           | No            |
| `USER_014` | 413         | Avatar file too large              | No            |
| `USER_015` | 415         | Unsupported avatar format          | No            |

---
