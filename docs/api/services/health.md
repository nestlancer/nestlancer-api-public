<div align="center">

# Health Service Endpoints

</div>

---

## 2. Health Service

**Base Path**: `/api/v1/health`

### 2.1 Overview

Comprehensive health check endpoints for monitoring system status, service availability, and infrastructure health.

### 2.2 Endpoints

#### System Health Endpoints

| Method | Endpoint | Description                    | Auth | Rate Limit |
| :----- | :------- | :----------------------------- | :--- | :--------- |
| `GET`  | `/`      | Aggregated system health       | None | 60/min     |
| `GET`  | `/ready` | Kubernetes readiness probe     | None | 100/min    |
| `GET`  | `/live`  | Kubernetes liveness probe      | None | 100/min    |
| `HEAD` | `/ping`  | Lightweight availability check | None | 200/min    |

#### Infrastructure Health

| Method | Endpoint    | Description                         | Auth | Rate Limit |
| :----- | :---------- | :---------------------------------- | :--- | :--------- |
| `GET`  | `/database` | PostgreSQL connection & performance | None | 60/min     |
| `GET`  | `/cache`    | Redis connection & performance      | None | 60/min     |
| `GET`  | `/queue`    | RabbitMQ connection & queue status  | None | 60/min     |
| `GET`  | `/storage`  | S3/Cloudinary connectivity          | None | 60/min     |

#### Service Health

| Method | Endpoint         | Description                           | Auth | Rate Limit |
| :----- | :--------------- | :------------------------------------ | :--- | :--------- |
| `GET`  | `/microservices` | All microservices status              | None | 60/min     |
| `GET`  | `/external`      | Third-party services (Razorpay, etc.) | None | 60/min     |
| `GET`  | `/workers`       | Background worker status              | None | 60/min     |
| `GET`  | `/websocket`     | WebSocket server connectivity         | None | 60/min     |

#### System Metrics

| Method | Endpoint    | Description                | Auth | Rate Limit |
| :----- | :---------- | :------------------------- | :--- | :--------- |
| `GET`  | `/system`   | CPU, memory, disk usage    | None | 60/min     |
| `GET`  | `/features` | Feature flags status       | None | 60/min     |
| `GET`  | `/registry` | Service discovery registry | None | 60/min     |

#### Debug (Admin Only)

| Method | Endpoint | Description                     | Auth      | Rate Limit |
| :----- | :------- | :------------------------------ | :-------- | :--------- |
| `GET`  | `/debug` | Detailed diagnostic information | Admin JWT | 10/min     |

### 2.3 Service-Specific Health Endpoints

Each microservice exposes its own health endpoint:

| Service       | Endpoint                           | Response Time SLA |
| :------------ | :--------------------------------- | :---------------- |
| Auth          | `GET /api/v1/auth/health`          | < 50ms            |
| Users         | `GET /api/v1/users/health`         | < 50ms            |
| Projects      | `GET /api/v1/projects/health`      | < 100ms           |
| Payments      | `GET /api/v1/payments/health`      | < 100ms           |
| Requests      | `GET /api/v1/requests/health`      | < 50ms            |
| Quotes        | `GET /api/v1/quotes/health`        | < 50ms            |
| Portfolio     | `GET /api/v1/portfolio/health`     | < 50ms            |
| Media         | `GET /api/v1/media/health`         | < 100ms           |
| Messaging     | `GET /api/v1/messages/health`      | < 50ms            |
| Notifications | `GET /api/v1/notifications/health` | < 50ms            |
| Blog          | `GET /api/v1/blog/health`          | < 50ms            |
| Contact       | `GET /api/v1/contact/health`       | < 50ms            |
| Progress      | `GET /api/v1/progress/health`      | < 50ms            |
| Admin         | `GET /api/v1/admin/health`         | < 50ms            |

### 2.4 Response Examples

#### GET /health

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "7d 14h 30m 15s",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "auth": {
      "status": "healthy",
      "responseTime": 12,
      "uptime": "99.98%"
    },
    "users": {
      "status": "healthy",
      "responseTime": 8,
      "uptime": "99.99%"
    },
    "projects": {
      "status": "healthy",
      "responseTime": 15,
      "uptime": "99.95%"
    },
    "database": {
      "status": "healthy",
      "responseTime": 5,
      "connections": {
        "active": 12,
        "idle": 8,
        "total": 20
      }
    },
    "cache": {
      "status": "healthy",
      "responseTime": 2,
      "hitRate": 0.85,
      "memoryUsage": "45%"
    },
    "queue": {
      "status": "healthy",
      "responseTime": 3,
      "pendingJobs": 5,
      "workers": 10
    }
  },
  "checks": {
    "database": "pass",
    "cache": "pass",
    "queue": "pass",
    "storage": "pass",
    "externalServices": "pass"
  }
}
```

#### GET /ready (Kubernetes Readiness)

```json
HTTP/1.1 200 OK

{
  "status": "ready",
  "checks": {
    "database": true,
    "cache": true,
    "queue": true
  }
}
```

#### GET /live (Kubernetes Liveness)

```json
HTTP/1.1 200 OK

{
  "status": "alive",
  "uptime": 634215
}
```

#### GET /database

```json
HTTP/1.1 200 OK

{
  "status": "healthy",
  "responseTime": 5,
  "details": {
    "type": "PostgreSQL",
    "version": "15.2",
    "connections": {
      "active": 12,
      "idle": 8,
      "max": 100
    },
    "performance": {
      "avgQueryTime": 3.2,
      "slowQueries": 2
    }
  }
}
```

#### GET /debug (Admin Only)

```json
HTTP/1.1 200 OK

{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "server": {
    "hostname": "api-server-01",
    "platform": "linux",
    "architecture": "x64",
    "nodeVersion": "v20.10.0",
    "memory": {
      "total": 16777216,
      "free": 4194304,
      "used": 12582912,
      "usagePercent": 75
    },
    "cpu": {
      "cores": 8,
      "model": "Intel(R) Xeon(R) CPU",
      "loadAverage": [1.5, 1.8, 2.0]
    },
    "disk": {
      "total": 107374182400,
      "free": 53687091200,
      "used": 53687091200,
      "usagePercent": 50
    }
  },
  "process": {
    "pid": 1234,
    "uptime": 634215,
    "memory": {
      "rss": 524288,
      "heapTotal": 262144,
      "heapUsed": 131072,
      "external": 65536
    }
  },
  "dependencies": {
    "database": {
      "connected": true,
      "poolSize": 20,
      "activeConnections": 12
    },
    "cache": {
      "connected": true,
      "memory": "45%",
      "keys": 12500
    },
    "queue": {
      "connected": true,
      "channels": 5,
      "pendingJobs": 50
    }
  },
  "featureFlags": {
    "newDashboard": true,
    "advancedAnalytics": false,
    "betaFeatures": true
  }
}
```

### 2.5 Health Status Codes

| HTTP Code | Status    | Description                     |
| :-------- | :-------- | :------------------------------ |
| `200`     | Healthy   | All services operational        |
| `206`     | Degraded  | Some non-critical services down |
| `503`     | Unhealthy | Critical services unavailable   |

### 2.6 Health Status Values

| Status      | Description                        | Action Required  |
| :---------- | :--------------------------------- | :--------------- |
| `healthy`   | All checks passing                 | None             |
| `degraded`  | Some checks failing (non-critical) | Monitor closely  |
| `unhealthy` | Critical checks failing            | Immediate action |
| `unknown`   | Unable to determine status         | Investigate      |

---
