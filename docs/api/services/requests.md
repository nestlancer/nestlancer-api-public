<div align="center">

# Requests Service Endpoints

</div>

---

## 5. Requests Service

**Base Path**: `/api/v1/requests`
**Admin Path**: `/api/v1/admin/requests`

### 5.1 Overview

Manages project requests from clients. Requests go through a workflow from draft to submission, review, and eventually conversion to quotes/projects.

### 5.2 Request Status Flow

```
DRAFT → SUBMITTED → UNDER_REVIEW → QUOTED → ACCEPTED/REJECTED → CONVERTED_TO_PROJECT
                                      ↓
                              CHANGES_REQUESTED → DRAFT
```

### 5.3 User Endpoints (JWT Required)

| Method   | Endpoint                           | Description                        | Rate Limit | Idempotent |
| :------- | :--------------------------------- | :--------------------------------- | :--------- | :--------- |
| `GET`    | `/health`                          | Health check (Simplified response) | 1000/hour  | Yes        |
| `POST`   | `/`                                | Create request (DRAFT)             | 50/hour    | No         |
| `GET`    | `/`                                | List own requests                  | 1000/hour  | Yes        |
| `GET`    | `/{id}`                            | Get request details                | 1000/hour  | Yes        |
| `PATCH`  | `/{id}`                            | Update request (DRAFT only)        | 100/hour   | No         |
| `POST`   | `/{id}/submit`                     | Submit for review                  | 20/hour    | Yes        |
| `DELETE` | `/{id}`                            | Delete request (DRAFT only)        | 20/hour    | Yes (soft) |
| `GET`    | `/{id}/quotes`                     | Get quotes for request             | 500/hour   | Yes        |
| `GET`    | `/{id}/status`                     | Get status timeline                | 500/hour   | Yes        |
| `GET`    | `/{id}/attachments`                | List attachments                   | 500/hour   | Yes        |
| `POST`   | `/{id}/attachments`                | Add attachment                     | 50/hour    | No         |
| `DELETE` | `/{id}/attachments/{attachmentId}` | Remove attachment                  | 50/hour    | Yes        |
| `GET`    | `/stats`                           | User request statistics            | 100/hour   | Yes        |

### 5.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint       | Description                | Rate Limit | Idempotent |     | Role |
| :------- | :------------- | :------------------------- | :--------- | :--------- | :-- | :--- |
| `GET`    | `/`            | List all requests          | 2000/hour  | Yes        |
| `GET`    | `/{id}`        | Get request (admin view)   | 2000/hour  | Yes        |
| `PATCH`  | `/{id}`        | Update request             | 500/hour   | No         |
| `PATCH`  | `/{id}/status` | Update request status      | 500/hour   | No         |
| `POST`   | `/{id}/quotes` | Create quote for request   | 200/hour   | No         |
| `POST`   | `/{id}/notes`  | Add internal note          | 500/hour   | No         |
| `GET`    | `/{id}/notes`  | Get internal notes         | 1000/hour  | Yes        |
| `DELETE` | `/{id}`        | Delete request             | 200/hour   | Yes (soft) |
| `GET`    | `/stats`       | Overall request statistics | 500/hour   | Yes        |

### 5.5 Request Categories

| Category         | Description                           |
| :--------------- | :------------------------------------ |
| `webDevelopment` | Website & web application development |
| `mobileApp`      | iOS & Android app development         |
| `ecommerce`      | E-commerce solutions                  |
| `design`         | UI/UX design services                 |
| `branding`       | Logo & brand identity                 |
| `marketing`      | Digital marketing services            |
| `seo`            | SEO & content optimization            |
| `consulting`     | Technical consulting                  |
| `maintenance`    | Website/app maintenance               |
| `custom`         | Custom requirements                   |

### 5.6 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /

```json
// Request
POST /api/v1/requests
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "E-commerce Website",
  "description": "Need a full-featured online store with payment integration",
  "category": "ecommerce",
  "budget": {
    "min": 5000,
    "max": 10000,
    "currency": "INR",
    "flexible": true
  },
  "timeline": {
    "preferredStartDate": "2024-02-01",
    "deadline": "2024-04-01",
    "flexible": false
  },
  "requirements": [
    "Shopping cart functionality",
    "Payment gateway integration (Stripe/PayPal)",
    "Admin dashboard for inventory management",
    "Product search and filtering",
    "User account management",
    "Order tracking",
    "Email notifications",
    "Mobile responsive design"
  ],
  "technicalRequirements": {
    "preferredTechnologies": ["React", "Node.js", "PostgreSQL"],
    "hosting": "AWS or similar cloud provider",
    "integrations": ["Stripe", "SendGrid", "AWS S3"]
  },
  "attachments": ["mediaAbc123", "mediaDef456"],
  "additionalInfo": "Looking for a scalable solution that can handle 10,000+ products"
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
  "message": "Request created successfully in draft status",
  "data": {
    "id": "reqXyz789",
    "title": "E-commerce Website",
    "status": "draft",
    "category": "ecommerce",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": null
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{id}

```json
// Request
GET /api/v1/requests/reqXyz789
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
    "id": "reqXyz789",
    "title": "E-commerce Website",
    "description": "Need a full-featured online store with payment integration",
    "category": "ecommerce",
    "status": "underReview",
    "budget": {
      "min": 5000,
      "max": 10000,
      "currency": "INR",
      "flexible": true
    },
    "timeline": {
      "preferredStartDate": "2024-02-01",
      "deadline": "2024-04-01",
      "flexible": false
    },
    "requirements": [
      "Shopping cart functionality",
      "Payment gateway integration (Stripe/PayPal)",
      "Admin dashboard for inventory management"
    ],
    "technicalRequirements": {
      "preferredTechnologies": ["React", "Node.js", "PostgreSQL"],
      "hosting": "AWS or similar cloud provider",
      "integrations": ["Stripe", "SendGrid", "AWS S3"]
    },
    "attachments": [
      {
        "id": "mediaAbc123",
        "filename": "requirements.pdf",
        "url": "https://cdn.example.com/requests/reqXyz789/requirements.pdf",
        "type": "application/pdf",
        "size": 245760
      },
      {
        "id": "mediaDef456",
        "filename": "wireframes.png",
        "url": "https://cdn.example.com/requests/reqXyz789/wireframes.png",
        "type": "image/png",
        "size": 512000
      }
    ],
    "quotes": [
      {
        "id": "quoteAbc123",
        "status": "pending",
        "totalAmount": 8500,
        "createdAt": "2024-01-16T14:00:00.000Z"
      }
    ],
    "statusHistory": [
      {
        "status": "draft",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "note": "Request created"
      },
      {
        "status": "submitted",
        "timestamp": "2024-01-15T11:00:00.000Z",
        "note": "Submitted for review"
      },
      {
        "status": "underReview",
        "timestamp": "2024-01-16T09:00:00.000Z",
        "note": "Review in progress"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:00:00.000Z",
    "submittedAt": "2024-01-15T11:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/submit

```json
// Request
POST /api/v1/requests/reqXyz789/submit
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "confirmComplete": true
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
  "message": "Request submitted successfully. You will receive a quote within 24-48 hours.",
  "data": {
    "id": "reqXyz789",
    "status": "submitted",
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "estimatedQuoteDate": "2024-01-17T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Missing required fields)
HTTP/1.1 400 Bad Request - Missing required fields
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "REQUEST_009",
    "message": "Cannot submit incomplete request",
    "details": {
      "missingFields": ["budget", "timeline"],
      "validationErrors": [
        {
          "field": "budget.min",
          "message": "Minimum budget is required"
        },
        {
          "field": "timeline.deadline",
          "message": "Deadline is required"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /{id}/status (Admin)

```json
// Request
PATCH /api/v1/admin/requests/reqXyz789/status
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "underReview",
  "notes": "Reviewing technical requirements and preparing quote"
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
  "message": "Request status updated successfully",
  "data": {
    "id": "reqXyz789",
    "status": "underReview",
    "previousStatus": "submitted",
    "statusHistory": [
      {
        "status": "draft",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "note": "Request created"
      },
      {
        "status": "submitted",
        "timestamp": "2024-01-15T11:00:00.000Z",
        "note": "Submitted for review"
      },
      {
        "status": "underReview",
        "timestamp": "2024-01-16T09:00:00.000Z",
        "note": "Reviewing technical requirements and preparing quote",
        "updatedBy": {
          "id": "usrAdmin123",
          "name": "Admin User"
        }
      }
    ],
    "updatedAt": "2024-01-16T09:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-16T09:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Invalid status transition)
HTTP/1.1 400 Bad Request - Invalid status transition
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "REQUEST_005",
    "message": "Invalid status transition",
    "details": {
      "currentStatus": "quoted",
      "requestedStatus": "submitted",
      "allowedTransitions": ["accepted", "rejected", "changesRequested"]
    }
  },
  "metadata": {
    "timestamp": "2024-01-16T09:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /stats

```json
// Request
GET /api/v1/requests/stats
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
    "total": 12,
    "byStatus": {
      "draft": 2,
      "submitted": 1,
      "underReview": 3,
      "quoted": 4,
      "accepted": 1,
      "rejected": 0,
      "converted": 1
    },
    "averageResponseTime": "18 hours",
    "pendingQuotes": 4,
    "acceptanceRate": 0.75
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 5.7 Error Codes

| Code          | HTTP Status | Description                              | Retryable |
| :------------ | :---------- | :--------------------------------------- | :-------- |
| `REQUEST_001` | 404         | Request not found                        | No        |
| `REQUEST_002` | 403         | Unauthorized access to request           | No        |
| `REQUEST_003` | 400         | Cannot modify submitted request          | No        |
| `REQUEST_004` | 400         | Cannot delete non-draft request          | No        |
| `REQUEST_005` | 400         | Invalid status transition                | No        |
| `REQUEST_006` | 409         | Request already has active quote         | No        |
| `REQUEST_007` | 422         | Invalid budget range (min > max)         | No        |
| `REQUEST_008` | 422         | Invalid timeline (deadline before start) | No        |
| `REQUEST_009` | 422         | Missing required fields                  | No        |
| `REQUEST_010` | 422         | Invalid category                         | No        |
| `REQUEST_011` | 413         | Too many attachments (max 10)            | No        |
| `REQUEST_012` | 400         | Attachment not found                     | No        |

---
