<div align="center">

# Payments Service Endpoints

</div>

---

## 9. Payments Service

**Base Path**: `/api/v1/payments`
**Admin Path**: `/api/v1/admin/payments`

### 9.1 Overview

Handles payment processing for project milestones via **Razorpay** (online) and **offline bank/UPI transfer** (client uploads proof; admin verifies). Platform settlement account details (bank/UPI) are stored in the database and managed by admins — not via env/Infisical.

### 9.2 Payment Status Flow

```
CREATED → PENDING → PROCESSING → COMPLETED     (Razorpay)
CREATED → PENDING_VERIFICATION → COMPLETED     (offline bank/UPI; admin approve)
                              ↘ FAILED / CREATED (admin reject; retry allowed)
COMPLETED → REFUNDED | DISPUTED
```

### 9.3 Supported Payment Methods

| Method        | Provider / path                         | Notes                                      |
| :------------ | :-------------------------------------- | :----------------------------------------- |
| Razorpay      | Card / UPI / netbanking / wallets       | `create-intent` → checkout → confirm/webhook |
| Bank / UPI    | Direct transfer to platform accounts    | `bank-transfer/submit` → admin approve/reject |
| Manual        | Admin override                          | `POST /admin/payments/manual` (immediate complete) |

### 9.3.1 Offline transfer + platform accounts

| Method  | Endpoint (user `/api/v1/payments`) | Description |
| :------ | :------------------------------------ | :---------- |
| `GET`   | `/platform-accounts`                  | Active bank/UPI accounts for offline pay |
| `POST`  | `/bank-transfer/submit`               | Submit UTR + proof media IDs |

| Method   | Endpoint (admin `/api/v1/admin/payments`) | Description |
| :------- | :--------------------------------------- | :---------- |
| `GET`    | `/accounts`                              | List all platform accounts |
| `POST`   | `/accounts`                              | Create account |
| `PATCH`  | `/accounts/{id}`                         | Update / set primary |
| `DELETE` | `/accounts/{id}`                         | Soft-disable |
| `POST`   | `/{id}/approve-transfer`                 | Approve offline transfer |
| `POST`   | `/{id}/reject-transfer`                  | Reject offline transfer |

Filter `GET /admin/payments?status=PENDING_VERIFICATION` for the verification queue.

### 9.4 User Endpoints (JWT Required)

| Method   | Endpoint                           | Description                            | Rate Limit | Idempotent |
| :------- | :--------------------------------- | :------------------------------------- | :--------- | :--------- |
| `POST`   | `/create-intent`                   | Create payment intent                  | 100/hour   | No         |
| `POST`   | `/initiate`                        | Initiate Razorpay payment              | 100/hour   | Yes        |
| `POST`   | `/confirm`                         | Confirm payment                        | 100/hour   | Yes        |
| `POST`   | `/cancel`                          | Cancel pending payment                 | 50/hour    | Yes        |
| `GET`    | `/`                                | List user payments                     | 1000/hour  | Yes        |
| `GET`    | `/{id}`                            | Get payment details                    | 1000/hour  | Yes        |
| `GET`    | `/{id}/status`                     | Check payment status                   | 2000/hour  | Yes        |
| `GET`    | `/{id}/receipt`                    | Download receipt PDF                   | 100/hour   | Yes        |
| `GET`    | `/{id}/invoice`                    | Download invoice PDF                   | 100/hour   | Yes        |
| `GET`    | `/projects/{projectId}`            | Get project payments                   | 500/hour   | Yes        |
| `GET`    | `/projects/{projectId}/milestones` | Get payment milestones                 | 500/hour   | Yes        |
| `GET`    | `/methods`                         | List saved payment methods             | 500/hour   | Yes        |
| `POST`   | `/methods`                         | Save payment method                    | 50/hour    | No         |
| `DELETE` | `/methods/{id}`                    | Remove payment method                  | 50/hour    | Yes        |
| `GET`    | `/stats`                           | User payment statistics                | 100/hour   | Yes        |
| `POST`   | `/{id}/verify`                     | Verify payment after Razorpay callback | 100/hour   | Yes        |
| `POST`   | `/{id}/dispute`                    | File a payment dispute                 | 50/hour    | No         |
| `GET`    | `/invoices`                        | List user invoices                     | 500/hour   | Yes        |
| `GET`    | `/invoices/{id}`                   | Get invoice details                    | 500/hour   | Yes        |
| `GET`    | `/invoices/{id}/download`          | Download invoice PDF                   | 100/hour   | Yes        |

### 9.5 Admin Endpoints (Admin JWT Required)

| Method  | Endpoint                           | Description                    | Rate Limit | Idempotent |     | Role |
| :------ | :--------------------------------- | :----------------------------- | :--------- | :--------- | :-- | :--- |
| `POST`  | `/projects/{projectId}/milestones` | Create payment milestones      | 200/hour   | No         |
| `GET`   | `/milestones`                      | List all payment milestones    | 2000/hour  | Yes        |
| `GET`   | `/milestones/{id}`                 | Get milestone details          | 2000/hour  | Yes        |
| `PATCH` | `/milestones/{id}`                 | Update milestone               | 200/hour   | No         |
| `POST`  | `/milestones/{id}/mark-complete`   | Mark work complete             | 200/hour   | No         |
| `POST`  | `/milestones/{id}/request-payment` | Send payment request           | 100/hour   | No         |
| `POST`  | `/milestones/{id}/release`         | Release escrowed payment       | 100/hour   | Yes        |
| `GET`   | `/`                                | List all payments              | 2000/hour  | Yes        |
| `GET`   | `/{id}`                            | Get payment (admin view)       | 2000/hour  | Yes        |
| `POST`  | `/{id}/refund`                     | Process refund                 | 100/hour   | Yes        |
| `POST`  | `/{id}/verify`                     | Manual verification            | 100/hour   | No         |
| `GET`   | `/stats`                           | Payment statistics             | 500/hour   | Yes        |
| `GET`   | `/disputes`                        | List payment disputes          | 500/hour   | Yes        |
| `GET`   | `/disputes/{id}`                   | Get dispute details            | 500/hour   | Yes        |
| `POST`  | `/disputes/{id}/respond`           | Respond to dispute             | 100/hour   | No         |
| `POST`  | `/disputes/{id}/resolve`           | Resolve dispute                | 50/hour    | No         |
| `GET`   | `/reconciliation`                  | Payment reconciliation report  | 200/hour   | Yes        |
| `POST`  | `/manual`                          | Create manual payment entry    | 100/hour   | No         |
| `GET`   | `/revenue/report`                  | Revenue analytics report       | 500/hour   | Yes        |
| `GET`   | `/revenue/export`                  | Export revenue data            | 200/hour   | Yes        |
| `GET`   | `/{id}/transactions`               | Payment transaction history    | 500/hour   | Yes        |
| `GET`   | `/{id}/timeline`                   | Payment lifecycle timeline     | 500/hour   | Yes        |
| `GET`   | `/methods/supported`               | List supported payment methods | 500/hour   | Yes        |
| `PATCH` | `/settings`                        | Update payment configuration   | 50/hour    | No         |
| `POST`  | `/reconcile`                       | Trigger payment reconciliation | 50/hour    | No         |

### 9.6 Webhook Endpoint (Moved to Ingestion Service)

> **Note:** Razorpay incoming webhooks are now ingested through the central **Webhook Ingestion Service**. See `120-webhooks-inbound-endpoints.md` for details (`POST /api/v1/webhooks/razorpay`). The Ingestion service validates the signature and enqueues the event for the Payments service to process asynchronously.

### 9.7 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /create-intent

```json
// Request
POST /api/v1/payments/create-intent
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "projectId": "projAbc123",
  "milestoneId": "msAdvance",
  "type": "advance",
  "amount": 2550,
  "currency": "INR",
  "description": "Advance payment for E-commerce Website Development"
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
    "paymentIntentId": "piXyz789",
    "orderId": "orderRazorpayAbc123",
    "amount": 255000,  // In smallest currency unit (cents)
    "currency": "INR",
    "description": "Advance payment for E-commerce Website Development",
    "razorpay": {
      "key": "rzpLiveXxxxxxxxxxxxx",
      "orderId": "orderRazorpayAbc123",
      "amount": 255000,
      "currency": "INR",
      "name": "YourCompany",
      "description": "Advance payment for E-commerce Website Development",
      "image": "https://yourdomain.com/logo.png",
      "prefill": {
        "name": "John Doe",
        "email": "john@example.com",
        "contact": "+14155552671"
      },
      "theme": {
        "color": "#3399cc"
      }
    },
    "expiresAt": "2024-01-15T11:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /initiate

```json
// Request
POST /api/v1/payments/initiate
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "paymentIntentId": "piXyz789",
  "method": "card",
  "saveMethod": false
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
  "message": "Payment initiated successfully",
  "data": {
    "paymentId": "pmtAbc123",
    "status": "pending",
    "razorpayOrderId": "orderRazorpayAbc123",
    "amount": 255000,
    "currency": "INR",
    "checkoutUrl": "https://api.razorpay.com/v1/checkout/...",
    "expiresAt": "2024-01-15T11:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /confirm

```json
// Request
POST /api/v1/payments/confirm
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "paymentIntentId": "piXyz789",
  "razorpayPaymentId": "payRazorpayXyz789",
  "razorpayOrderId": "orderRazorpayAbc123",
  "razorpaySignature": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
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
  "message": "Payment confirmed successfully",
  "data": {
    "paymentId": "pmtAbc123",
    "status": "completed",
    "amount": 2550,
    "currency": "INR",
    "paidAt": "2024-01-15T10:35:00.000Z",
    "method": "card",
    "last4": "4242",
    "receipt": {
      "receiptNumber": "RCP-2024-001234",
      "pdfUrl": "https://api.yourdomain.com/payments/pmtAbc123/receipt",
      "invoiceUrl": "https://api.yourdomain.com/payments/pmtAbc123/invoice"
    },
    "project": {
      "id": "projAbc123",
      "title": "E-commerce Website Development",
      "newStatus": "inProgress"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Signature verification failed)
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "PAYMENT_008",
    "message": "Payment signature verification failed",
    "details": {
      "reason": "invalidSignature",
      "paymentId": "payRazorpayXyz789"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{id}

```json
// Request
GET /api/v1/payments/pmtAbc123
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
    "id": "pmtAbc123",
    "status": "completed",
    "type": "advance",
    "amount": 2550,
    "currency": "INR",
    "description": "Advance payment for E-commerce Website Development",
    "project": {
      "id": "projAbc123",
      "title": "E-commerce Website Development"
    },
    "milestone": {
      "id": "msAdvance",
      "name": "Project initiation and setup",
      "percentage": 30
    },
    "paymentMethod": {
      "type": "card",
      "brand": "visa",
      "last4": "4242",
      "expiryMonth": 12,
      "expiryYear": 2025
    },
    "razorpay": {
      "paymentId": "payRazorpayXyz789",
      "orderId": "orderRazorpayAbc123"
    },
    "receipt": {
      "receiptNumber": "RCP-2024-001234",
      "pdfUrl": "https://api.yourdomain.com/payments/pmtAbc123/receipt"
    },
    "invoice": {
      "invoiceNumber": "INV-2024-001234",
      "pdfUrl": "https://api.yourdomain.com/payments/pmtAbc123/invoice"
    },
    "timeline": {
      "createdAt": "2024-01-15T10:30:00.000Z",
      "initiatedAt": "2024-01-15T10:31:00.000Z",
      "completedAt": "2024-01-15T10:35:00.000Z",
      "processingTime": "4 minutes"
    },
    "refunds": [],
    "metadata": {
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "location": {
        "city": "San Francisco",
        "country": "US"
      }
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/refund (Admin)

```json
// Request
POST /api/v1/admin/payments/pmtAbc123/refund
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 1275,  // Partial refund (50%)
  "reason": "clientRequest",
  "notes": "Client requested to reduce project scope",
  "notifyClient": true
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
  "message": "Refund processed successfully",
  "data": {
    "refundId": "rfndXyz789",
    "paymentId": "pmtAbc123",
    "amount": 1275,
    "currency": "INR",
    "type": "partial",
    "reason": "clientRequest",
    "status": "processing",
    "estimatedArrival": "2024-01-20T00:00:00.000Z",
    "razorpay": {
      "refundId": "rfndRazorpayXyz789"
    },
    "processedAt": "2024-01-17T14:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-17T14:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Refund exceeds payment)
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "PAYMENT_011",
    "message": "Refund amount exceeds payment amount",
    "details": {
      "paymentAmount": 2550,
      "requestedRefund": 3000,
      "previousRefunds": 0,
      "maxRefundable": 2550
    }
  },
  "metadata": {
    "timestamp": "2024-01-17T14:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /projects/{projectId}/milestones

```json
// Request
GET /api/v1/payments/projects/projAbc123/milestones
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
    "projectId": "projAbc123",
    "totalAmount": 8500,
    "currency": "INR",
    "milestones": [
      {
        "id": "msAdvance",
        "type": "advance",
        "name": "Project initiation and setup",
        "description": "Advance payment (30%)",
        "amount": 2550,
        "percentage": 30,
        "status": "paid",
        "dueDate": "2024-02-01",
        "payment": {
          "id": "pmtAbc123",
          "paidAt": "2024-01-20T10:00:00.000Z",
          "method": "card"
        }
      },
      {
        "id": "msDesign",
        "type": "milestone",
        "name": "Design and frontend development",
        "description": "Design completion payment (35%)",
        "amount": 2975,
        "percentage": 35,
        "status": "pending",
        "dueDate": "2024-02-20",
        "workStatus": "inProgress",
        "completionPercentage": 85,
        "canPay": false,
        "reason": "Work not yet marked complete by admin"
      },
      {
        "id": "msFinal",
        "type": "final",
        "name": "Backend development and deployment",
        "description": "Final payment (35%)",
        "amount": 2975,
        "percentage": 35,
        "status": "pending",
        "dueDate": "2024-04-01",
        "workStatus": "notStarted",
        "completionPercentage": 0,
        "canPay": false,
        "reason": "Dependent on previous milestones"
      }
    ],
    "summary": {
      "total": 8500,
      "paid": 2550,
      "pending": 5950,
      "nextDue": {
        "milestoneId": "msDesign",
        "amount": 2975,
        "dueDate": "2024-02-20"
      }
    }
  },
  "metadata": {
    "timestamp": "2024-02-16T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/verify

```json
// Request
POST /api/v1/payments/pmtAbc123/verify
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "razorpayPaymentId": "payRazorpayXyz789",
  "razorpaySignature": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqDef456

{
  "status": "success",
  "data": {
    "id": "pmtAbc123",
    "verified": true
  },
  "metadata": {
    "timestamp": "2024-01-15T10:36:00.000Z",
    "requestId": "reqDef456",
    "version": "v1"
  }
}
```

#### POST /{id}/dispute

```json
// Request
POST /api/v1/payments/pmtAbc123/dispute
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "serviceNotDelivered",
  "description": "The milestone deliverables were not completed as agreed upon in the project scope."
}

// Response (201 Created)
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqGhi789

{
  "status": "success",
  "data": {
    "disputeId": "dspXyz456",
    "paymentId": "pmtAbc123",
    "status": "OPEN"
  },
  "metadata": {
    "timestamp": "2024-01-18T09:00:00.000Z",
    "requestId": "reqGhi789",
    "version": "v1"
  }
}
```

#### GET /invoices

```json
// Request
GET /api/v1/invoices?page=1&limit=10
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqJkl012

{
  "status": "success",
  "data": [
    {
      "id": "invAbc001",
      "invoiceNumber": "INV-2024-001234",
      "amount": 2550,
      "currency": "INR",
      "status": "paid",
      "issuedAt": "2024-01-15T10:35:00.000Z",
      "project": {
        "id": "projAbc123",
        "title": "E-commerce Website Development"
      }
    },
    {
      "id": "invAbc002",
      "invoiceNumber": "INV-2024-001235",
      "amount": 2975,
      "currency": "INR",
      "status": "pending",
      "issuedAt": "2024-02-20T12:00:00.000Z",
      "project": {
        "id": "projAbc123",
        "title": "E-commerce Website Development"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  },
  "metadata": {
    "timestamp": "2024-02-25T11:00:00.000Z",
    "requestId": "reqJkl012",
    "version": "v1"
  }
}
```

#### GET /invoices/{id}

```json
// Request
GET /api/v1/invoices/invAbc001
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqMno345

{
  "status": "success",
  "data": {
    "id": "invAbc001",
    "invoiceNumber": "INV-2024-001234",
    "status": "paid",
    "issuedAt": "2024-01-15T10:35:00.000Z",
    "paidAt": "2024-01-15T10:35:00.000Z",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "currency": "INR",
    "lineItems": [
      {
        "description": "Advance payment — E-commerce Website Development",
        "quantity": 1,
        "unitPrice": 2550,
        "amount": 2550
      }
    ],
    "subtotal": 2550,
    "tax": 0,
    "total": 2550,
    "project": {
      "id": "projAbc123",
      "title": "E-commerce Website Development"
    },
    "billedTo": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "metadata": {
    "timestamp": "2024-02-25T11:00:00.000Z",
    "requestId": "reqMno345",
    "version": "v1"
  }
}
```

#### GET /invoices/{id}/download

```json
// Request
GET /api/v1/invoices/invAbc001/download
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqPqr678

{
  "status": "success",
  "data": {
    "downloadUrl": "https://cdn.yourdomain.com/invoices/invAbc001.pdf?token=signedTokenXyz",
    "expiresAt": "2024-02-25T12:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-25T11:00:00.000Z",
    "requestId": "reqPqr678",
    "version": "v1"
  }
}
```

#### POST /manual (Admin)

```json
// Request
POST /api/v1/admin/payments/manual
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "userXyz456",
  "projectId": "projAbc123",
  "amount": 5000,
  "method": "bank_transfer",
  "reference": "NEFT-REF-20240120-001"
}

// Response (201 Created)
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqStu901

{
  "status": "success",
  "data": {
    "id": "pmtManual001",
    "userId": "userXyz456",
    "projectId": "projAbc123",
    "amount": 5000,
    "currency": "INR",
    "method": "bank_transfer",
    "reference": "NEFT-REF-20240120-001",
    "status": "completed",
    "createdBy": "adminUser001",
    "createdAt": "2024-01-20T14:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-20T14:00:00.000Z",
    "requestId": "reqStu901",
    "version": "v1"
  }
}
```

#### GET /revenue/report (Admin)

```json
// Request
GET /api/v1/admin/payments/revenue/report?from=2024-01-01&to=2024-03-31&groupBy=month
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqVwx234

{
  "status": "success",
  "data": {
    "from": "2024-01-01",
    "to": "2024-03-31",
    "groupBy": "month",
    "currency": "INR",
    "periods": [
      {
        "period": "2024-01",
        "revenue": 125000,
        "transactionCount": 42,
        "refunds": 3500
      },
      {
        "period": "2024-02",
        "revenue": 98000,
        "transactionCount": 35,
        "refunds": 0
      },
      {
        "period": "2024-03",
        "revenue": 156000,
        "transactionCount": 51,
        "refunds": 7800
      }
    ],
    "totals": {
      "revenue": 379000,
      "transactionCount": 128,
      "refunds": 11300,
      "netRevenue": 367700
    }
  },
  "metadata": {
    "timestamp": "2024-04-01T09:00:00.000Z",
    "requestId": "reqVwx234",
    "version": "v1"
  }
}
```

#### GET /revenue/export (Admin)

```json
// Request
GET /api/v1/admin/payments/revenue/export?from=2024-01-01&to=2024-03-31&format=csv
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqYza567

{
  "status": "success",
  "data": {
    "exportId": "expAbc123",
    "status": "processing",
    "format": "csv",
    "from": "2024-01-01",
    "to": "2024-03-31",
    "estimatedCompletionAt": "2024-04-01T09:05:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-04-01T09:00:00.000Z",
    "requestId": "reqYza567",
    "version": "v1"
  }
}
```

#### GET /{id}/transactions (Admin)

```json
// Request
GET /api/v1/admin/payments/pmtAbc123/transactions
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqBcd890

{
  "status": "success",
  "data": {
    "paymentId": "pmtAbc123",
    "transactions": [
      {
        "id": "txnAttempt001",
        "type": "attempt",
        "amount": 2550,
        "currency": "INR",
        "status": "success",
        "method": "card",
        "razorpayPaymentId": "payRazorpayXyz789",
        "timestamp": "2024-01-15T10:31:00.000Z"
      },
      {
        "id": "txnCapture001",
        "type": "capture",
        "amount": 2550,
        "currency": "INR",
        "status": "success",
        "razorpayPaymentId": "payRazorpayXyz789",
        "timestamp": "2024-01-15T10:35:00.000Z"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-02-01T10:00:00.000Z",
    "requestId": "reqBcd890",
    "version": "v1"
  }
}
```

#### GET /{id}/timeline (Admin)

```json
// Request
GET /api/v1/admin/payments/pmtAbc123/timeline
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqEfg123

{
  "status": "success",
  "data": {
    "paymentId": "pmtAbc123",
    "timeline": [
      {
        "status": "created",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "actor": "userXyz456"
      },
      {
        "status": "pending",
        "timestamp": "2024-01-15T10:30:05.000Z",
        "details": "Payment intent created with Razorpay"
      },
      {
        "status": "processing",
        "timestamp": "2024-01-15T10:31:00.000Z",
        "details": "Payment initiated via card"
      },
      {
        "status": "completed",
        "timestamp": "2024-01-15T10:35:00.000Z",
        "details": "Payment captured successfully"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-02-01T10:00:00.000Z",
    "requestId": "reqEfg123",
    "version": "v1"
  }
}
```

#### GET /methods/supported (Admin)

```json
// Request
GET /api/v1/admin/payments/methods/supported
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqHij456

{
  "status": "success",
  "data": [
    {
      "method": "card",
      "provider": "razorpay",
      "currencies": ["INR", "EUR", "GBP"],
      "enabled": true
    },
    {
      "method": "upi",
      "provider": "razorpay",
      "currencies": ["INR"],
      "enabled": true
    },
    {
      "method": "netbanking",
      "provider": "razorpay",
      "currencies": ["INR"],
      "enabled": true
    },
    {
      "method": "wallet",
      "provider": "razorpay",
      "currencies": ["INR"],
      "enabled": false
    },
    {
      "method": "bank_transfer",
      "provider": "manual",
      "currencies": ["INR"],
      "enabled": true
    }
  ],
  "metadata": {
    "timestamp": "2024-02-01T10:00:00.000Z",
    "requestId": "reqHij456",
    "version": "v1"
  }
}
```

#### PATCH /settings (Admin)

```json
// Request
PATCH /api/v1/admin/payments/settings
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currency": "INR",
  "minAmount": 500,
  "maxAmount": 500000,
  "gatewaySettings": {
    "razorpay": {
      "autoCapture": true,
      "captureDelayMinutes": 0
    }
  }
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqKlm789

{
  "status": "success",
  "data": {
    "currency": "INR",
    "minAmount": 500,
    "maxAmount": 500000,
    "gatewaySettings": {
      "razorpay": {
        "autoCapture": true,
        "captureDelayMinutes": 0
      }
    },
    "updatedAt": "2024-02-01T10:05:00.000Z",
    "updatedBy": "adminUser001"
  },
  "metadata": {
    "timestamp": "2024-02-01T10:05:00.000Z",
    "requestId": "reqKlm789",
    "version": "v1"
  }
}
```

#### POST /reconcile (Admin)

```json
// Request
POST /api/v1/admin/payments/reconcile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "from": "2024-01-01",
  "to": "2024-01-31",
  "provider": "razorpay"
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: reqNop012

{
  "status": "success",
  "data": {
    "reconciliationId": "recAbc123",
    "from": "2024-01-01",
    "to": "2024-01-31",
    "provider": "razorpay",
    "matched": 120,
    "unmatched": 3,
    "totalProcessed": 123,
    "unmatchedDetails": [
      {
        "razorpayPaymentId": "payOrphan001",
        "amount": 1500,
        "reason": "noMatchingRecord"
      },
      {
        "razorpayPaymentId": "payOrphan002",
        "amount": 3200,
        "reason": "amountMismatch"
      },
      {
        "localPaymentId": "pmtOrphan001",
        "amount": 800,
        "reason": "noRazorpayRecord"
      }
    ],
    "completedAt": "2024-02-01T10:10:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-01T10:10:00.000Z",
    "requestId": "reqNop012",
    "version": "v1"
  }
}
```

### 9.8 Error Codes

| Code          | HTTP Status | Description                    | Retryable  |
| :------------ | :---------- | :----------------------------- | :--------- |
| `PAYMENT_001` | 404         | Payment not found              | No         |
| `PAYMENT_002` | 403         | Unauthorized access to payment | No         |
| `PAYMENT_003` | 409         | Payment already completed      | No         |
| `PAYMENT_004` | 400         | Payment failed                 | No         |
| `PAYMENT_005` | 422         | Invalid payment amount         | No         |
| `PAYMENT_006` | 404         | Milestone not found            | No         |
| `PAYMENT_007` | 502         | Razorpay service error         | Yes        |
| `PAYMENT_008` | 401         | Signature verification failed  | No         |
| `PAYMENT_009` | 400         | Insufficient funds             | No         |
| `PAYMENT_010` | 400         | Refund not allowed             | No         |
| `PAYMENT_011` | 400         | Refund amount exceeds payment  | No         |
| `PAYMENT_012` | 409         | Dispute already exists         | No         |
| `PAYMENT_013` | 410         | Payment intent expired         | No         |
| `PAYMENT_014` | 400         | Payment method declined        | No         |
| `PAYMENT_015` | 429         | Too many payment attempts      | Yes (wait) |

---
