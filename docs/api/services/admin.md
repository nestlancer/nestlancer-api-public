<div align="center">

# Admin Service Endpoints

</div>

---

## 16. Admin Service

**Base Path**: `/api/v1/admin`

### 16.1 Overview

Administrative dashboard, system configuration, audit logging, webhook management, and user impersonation for debugging.

### 16.2 Admin Roles

| Role    | Description  | Permissions                                                                                 |
| :------ | :----------- | :------------------------------------------------------------------------------------------ |
| `admin` | System Admin | Full access to manage users, content, projects, system configuration, and support requests. |

### 16.3 Dashboard Endpoints

| Method | Endpoint                 | Description                        | Rate Limit | Role  |
| :----- | :----------------------- | :--------------------------------- | :--------- | :---- |
| `GET`  | `/health`                | Health check (Simplified response) | 1000/hour  | Yes   |
| `GET`  | `/dashboard/overview`    | Dashboard metrics                  | 2000/hour  | admin |
| `GET`  | `/dashboard/revenue`     | Revenue analytics                  | 2000/hour  | admin |
| `GET`  | `/dashboard/users`       | User metrics                       | 2000/hour  | admin |
| `GET`  | `/dashboard/projects`    | Project metrics                    | 2000/hour  | admin |
| `GET`  | `/dashboard/performance` | System performance                 | 2000/hour  | admin |
| `GET`  | `/dashboard/activity`    | Recent activity                    | 2000/hour  | admin |
| `GET`  | `/dashboard/alerts`      | System alerts                      | 2000/hour  | admin |

### 16.4 System Management Endpoints

| Method   | Endpoint                               | Description             | Rate Limit | Role  |
| :------- | :------------------------------------- | :---------------------- | :--------- | :---- |
| `GET`    | `/system/config`                       | Get system config       | 500/hour   | admin |
| `PATCH`  | `/system/config`                       | Update config           | 50/hour    | admin |
| `GET`    | `/system/email-templates`              | List email templates    | 500/hour   | admin |
| `GET`    | `/system/email-templates/{id}`         | Get template            | 500/hour   | admin |
| `PATCH`  | `/system/email-templates/{id}`         | Update template         | 200/hour   | admin |
| `GET`    | `/system/email-templates/{id}/preview` | Preview template        | 200/hour   | admin |
| `POST`   | `/system/email-templates/{id}/test`    | Send test email         | 50/hour    | admin |
| `POST`   | `/system/announcements`                | Send announcement       | 50/hour    | admin |
| `POST`   | `/system/maintenance`                  | Toggle maintenance mode | 20/hour    | admin |
| `GET`    | `/system/features`                     | List feature flags      | 500/hour   | admin |
| `PATCH`  | `/system/features/{flag}`              | Toggle feature          | 100/hour   | admin |
| `POST`   | `/system/cache/clear`                  | Clear cache             | 20/hour    | admin |
| `POST`   | `/system/cache/clear/{key}`            | Clear specific cache    | 50/hour    | admin |
| `GET`    | `/system/jobs`                         | List background jobs    | 1000/hour  | admin |
| `POST`   | `/system/jobs/{id}/retry`              | Retry failed job        | 100/hour   | admin |
| `DELETE` | `/system/jobs/{id}`                    | Cancel job              | 100/hour   | admin |
| `GET`    | `/system/logs`                         | View system logs        | 1000/hour  | admin |
| `GET`    | `/system/logs/download`                | Download logs           | 50/hour    | admin |

> **Note:** Feature flags are managed via `GET /system/features` (list) and `PATCH /system/features/{flag}` (toggle).
> Feature flags are loaded by `bash seed/seed.sh --phase=core` from `seed/payloads/core/feature-flags.json`.
> Use the toggle endpoint to enable or disable a flag at runtime.

### 16.5 Audit Endpoints

| Method | Endpoint                      | Description          | Rate Limit | Role  |
| :----- | :---------------------------- | :------------------- | :--------- | :---- |
| `GET`  | `/audit`                      | List audit logs      | 2000/hour  | admin |
| `GET`  | `/audit/{id}`                 | Get audit entry      | 2000/hour  | admin |
| `GET`  | `/audit/user/{userId}`        | User audit trail     | 1000/hour  | admin |
| `GET`  | `/audit/resource/{type}/{id}` | Resource audit trail | 1000/hour  | admin |
| `POST` | `/audit/export`               | Export audit logs    | 20/hour    | admin |
| `GET`  | `/audit/stats`                | Audit statistics     | 1000/hour  | admin |

### 16.6 User Impersonation Endpoints (Debug)

| Method | Endpoint                      | Description                 | Rate Limit | Role  |
| :----- | :---------------------------- | :-------------------------- | :--------- | :---- |
| `POST` | `/users/{userId}/impersonate` | Start impersonation         | 20/hour    | admin |
| `POST` | `/impersonate/end`            | End impersonation           | 100/hour   | admin |
| `GET`  | `/impersonate/sessions`       | List impersonation sessions | 100/hour   | admin |

### 16.7 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET /dashboard/overview

```json
// Request
GET /api/v1/admin/dashboard/overview?period=30d
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
    "period": {
      "start": "2024-01-19",
      "end": "2024-02-18",
      "days": 30
    },
    "summary": {
      "totalUsers": 1250,
      "newUsers": 85,
      "activeProjects": 45,
      "completedProjects": 12,
      "pendingRequests": 18,
      "openQuotes": 8,
      "revenueThisMonth": 125000,
      "currency": "INR"
    },
    "trends": {
      "users": {
        "current": 1250,
        "previous": 1180,
        "change": 5.93,
        "trend": "up"
      },
      "revenue": {
        "current": 125000,
        "previous": 110000,
        "change": 13.64,
        "trend": "up"
      },
      "projects": {
        "current": 45,
        "previous": 42,
        "change": 7.14,
        "trend": "up"
      },
      "requests": {
        "current": 65,
        "previous": 58,
        "change": 12.07,
        "trend": "up"
      }
    },
    "recentActivity": [
      {
        "id": "activity1",
        "type": "paymentReceived",
        "title": "Payment Received",
        "description": "Payment of ₹5,000.00 received for E-commerce Platform",
        "amount": 5000,
        "currency": "INR",
        "project": {
          "id": "projAbc123",
          "title": "E-commerce Platform"
        },
        "user": {
          "id": "usrXyz789",
          "name": "John Doe"
        },
        "timestamp": "2024-02-18T10:30:00.000Z"
      },
      {
        "id": "activity2",
        "type": "projectCompleted",
        "title": "Project Completed",
        "description": "Mobile App project marked as completed",
        "project": {
          "id": "projDef456",
          "title": "Mobile App"
        },
        "timestamp": "2024-02-18T09:15:00.000Z"
      },
      {
        "id": "activity3",
        "type": "quoteAccepted",
        "title": "Quote Accepted",
        "description": "Quote for Website Redesign accepted",
        "quote": {
          "id": "quoteAbc123",
          "amount": 8500
        },
        "timestamp": "2024-02-18T08:45:00.000Z"
      }
    ],
    "alerts": [
      {
        "id": "alert1",
        "type": "warning",
        "title": "Quotes Expiring Soon",
        "message": "3 quotes are expiring within 24 hours",
        "action": {
          "text": "View Quotes",
          "url": "/admin/quotes?expiring=true"
        },
        "timestamp": "2024-02-18T00:00:00.000Z"
      },
      {
        "id": "alert2",
        "type": "info",
        "title": "Storage Usage",
        "message": "Storage usage at 75% capacity",
        "action": {
          "text": "View Storage",
          "url": "/admin/system/storage"
        },
        "timestamp": "2024-02-17T12:00:00.000Z"
      }
    ],
    "charts": {
      "revenueByMonth": [
        { "month": "2024-01", "revenue": 110000 },
        { "month": "2024-02", "revenue": 125000 }
      ],
      "usersByDay": [
        { "date": "2024-02-12", "new": 12, "active": 450 },
        { "date": "2024-02-13", "new": 15, "active": 478 },
        { "date": "2024-02-14", "new": 18, "active": 512 },
        { "date": "2024-02-15", "new": 14, "active": 489 },
        { "date": "2024-02-16", "new": 11, "active": 456 },
        { "date": "2024-02-17", "new": 8, "active": 398 },
        { "date": "2024-02-18", "new": 7, "active": 421 }
      ],
      "projectsByStatus": {
        "inProgress": 45,
        "pendingPayment": 8,
        "review": 5,
        "completed": 12,
        "onHold": 3
      }
    },
    "quickStats": {
      "avgProjectValue": 12500,
      "avgProjectDuration": "6 weeks",
      "clientSatisfaction": 4.8,
      "repeatClientRate": 35
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /users/{userId}/impersonate

```json
// Request
POST /api/v1/admin/users/usrAbc123/impersonate
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Debugging payment issue reported by user",
  "ticketId": "SUPPORT-12345"
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
  "message": "Impersonation session started",
  "data": {
    "impersonationSessionId": "impXyz789",
    "originalUser": {
      "id": "usrAdmin123",
      "email": "admin@yourdomain.com",
      "role": "admin"
    },
    "impersonatedUser": {
      "id": "usrAbc123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-02-18T11:30:00.000Z",
    "restrictions": [
      "Cannot change password",
      "Cannot delete account",
      "Cannot modify 2FA",
      "Cannot access payment methods"
    ]
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (403 - Cannot impersonate admin)
HTTP/1.1 403 - Cannot impersonate admin
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "ADMIN_008",
    "message": "Cannot impersonate admin users",
    "details": {
      "targetUserId": "usrAdmin456",
      "targetUserRole": "admin"
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /audit

```json
// Request
GET /api/v1/admin/audit?page=1&limit=50&userId=usrAbc123&action=login&from=2024-02-01&to=2024-02-18
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
      "id": "audit1",
      "action": "login",
      "category": "authentication",
      "description": "User logged in successfully",
      "user": {
        "id": "usrAbc123",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "resource": {
        "type": "session",
        "id": "sessXyz789"
      },
      "metadata": {
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "location": {
          "city": "San Francisco",
          "country": "US"
        },
        "method": "password",
        "success": true
      },
      "timestamp": "2024-02-18T10:30:00.000Z"
    },
    {
      "id": "audit2",
      "action": "login",
      "category": "authentication",
      "description": "User logged in successfully",
      "user": {
        "id": "usrAbc123",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "resource": {
        "type": "session",
        "id": "sessDef456"
      },
      "metadata": {
        "ip": "192.168.1.101",
        "userAgent": "Mozilla/5.0...",
        "location": {
          "city": "New York",
          "country": "US"
        },
        "method": "password",
        "success": true
      },
      "timestamp": "2024-02-15T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 28,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "filters": {
    "userId": "usrAbc123",
    "action": "login",
    "from": "2024-02-01",
    "to": "2024-02-18"
  },
  "metadata": {
    "timestamp": "2024-02-18T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 16.8 Error Codes

| Code        | HTTP Status | Description                     | Retryable  |
| :---------- | :---------- | :------------------------------ | :--------- |
| `ADMIN_001` | 403         | Admin access required           | No         |
| `ADMIN_002` | 403         | Admin access required           | No         |
| `ADMIN_003` | 422         | Invalid configuration value     | No         |
| `ADMIN_004` | 404         | Audit log not found             | No         |
| `ADMIN_008` | 403         | Cannot impersonate admin users  | No         |
| `ADMIN_009` | 429         | Admin rate limit exceeded       | Yes (wait) |
| `ADMIN_010` | 422         | Invalid announcement format     | No         |
| `ADMIN_013` | 404         | Email template not found        | No         |
| `ADMIN_014` | 404         | Feature flag not found          | No         |
| `ADMIN_015` | 400         | Maintenance mode already active | No         |

---
