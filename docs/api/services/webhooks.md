<div align="center">

# Inbound Webhooks Service Endpoints

</div>

---

## 20. Inbound Webhooks Service

**Base Path**: `/api/v1/webhooks`

### 20.1 Overview

Dedicated webhook ingestion service responsible for receiving, verifying, and enqueuing incoming webhooks from external providers (e.g., Razorpay, GitHub, Stripe). This service decouples third-party event ingestion from domain services to improve reliability and scaling.

### 20.2 Ingestion Endpoints (External Providers)

| Method | Endpoint      | Description                        | Auth Method            | Rate Limit |
| :----- | :------------ | :--------------------------------- | :--------------------- | :--------- |
| `GET`  | `/health`     | Health check (Simplified response) | 1000/hour              | Yes        |
| `POST` | `/razorpay`   | Razorpay webhook events            | API Key + Signature    | 5000/hour  |
| `POST` | `/github`     | GitHub webhook events              | Secret Signature       | 5000/hour  |
| `POST` | `/stripe`     | Stripe webhook events              | Secret Signature       | 5000/hour  |
| `POST` | `/cloudflare` | Cloudflare CDN webhook events      | Signature Verification | 5000/hour  |
| `POST` | `/{provider}` | Generic webhook handler            | Provider-specific      | 5000/hour  |

### 20.3 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /razorpay

```json
// Request (from Razorpay)
POST /api/v1/webhooks/razorpay
X-Razorpay-Signature: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
Content-Type: application/json

{
  "entity": "event",
  "accountId": "accXxxxxxxxxxxx",
  "event": "payment.captured",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "payRazorpayXyz789",
        "entity": "payment",
        "amount": 255000,
        "currency": "INR",
        "status": "captured",
        "orderId": "orderRazorpayAbc123",
        "method": "card",
        "amountRefunded": 0,
        "refundStatus": null,
        "captured": true,
        "description": "Advance payment for E-commerce Website Development",
        "email": "john@example.com",
        "contact": "+14155552671",
        "createdAt": 1705323000
      }
    }
  },
  "createdAt": 1705323100
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqWhk12345
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1705326600

{
  "status": "success",
  "message": "Webhook queued for processing successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqWhk12345",
    "version": "v1"
  }
}

// Error Response (401 Unauthorized - Invalid signature)
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqWhkInvalid

{
  "status": "error",
  "error": {
    "code": "WEBHOOK_001",
    "message": "Invalid webhook signature"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqWhkInvalid",
    "version": "v1"
  }
}
```

#### POST /github

```json
// Request (from GitHub)
POST /api/v1/webhooks/github
X-Hub-Signature-256: sha256=1234567890abcdef...
Content-Type: application/json

{
  "action": "completed",
  "workflowRun": {
    "id": 123456789,
    "name": "CI",
    "status": "completed",
    "conclusion": "success"
  }
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqWhkGh123
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1705326600

{
  "status": "success",
  "message": "GitHub event queued",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqWhkGh123",
    "version": "v1"
  }
}
```

#### POST /cloudflare

```json
// Request (from Cloudflare)
POST /api/v1/webhooks/cloudflare
cf-webhook-auth: whsec_cloudflare_secret_key_abc123
Content-Type: application/json

{
  "event": "cache.purge.completed",
  "zone": {
    "id": "zone_abc123",
    "name": "example.com"
  },
  "data": {
    "purgeType": "everything",
    "completedAt": "2024-01-15T10:30:00.000Z"
  },
  "createdAt": "2024-01-15T10:30:05.000Z"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqWhkCf123
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1705326600

{
  "received": true
}
```

Events handled: `cache.purge.completed`, `security.event`, `zone.update`
Processing: Async via webhook-worker queue

#### POST /{provider}

```json
// Request (from generic provider)
POST /api/v1/webhooks/custom-provider
X-Webhook-Signature: sha256=abcdef1234567890...
Content-Type: application/json

{
  "type": "event.occurred",
  "id": "evt_generic_123",
  "data": {
    "key": "value"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqWhkGen123
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1705326600

{
  "received": true
}
```

Catch-all handler for future webhook providers. Routes to `generic.provider.ts` for processing. Validates against registered webhook configurations.
Processing: Async via webhook-worker queue

### 20.4 Error Codes

| Code          | HTTP Status | Description                   | Retryable  |
| :------------ | :---------- | :---------------------------- | :--------- |
| `WEBHOOK_001` | 401         | Invalid webhook signature     | No         |
| `WEBHOOK_002` | 400         | Missing webhook signature     | No         |
| `WEBHOOK_003` | 422         | Unprocessable webhook payload | No         |
| `WEBHOOK_004` | 429         | Rate limit exceeded           | Yes (wait) |
| `WEBHOOK_005` | 503         | Queue service unavailable     | Yes        |

---
