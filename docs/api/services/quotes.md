<div align="center">

# Quotes Service Endpoints

</div>

---

## 6. Quotes Service

**Base Path**: `/api/v1/quotes`
**Admin Path**: `/api/v1/admin/quotes`

### 6.1 Overview

Manages quotes (proposals) sent to clients in response to project requests. Quotes include pricing breakdown, timeline, milestones, and terms.

### 6.2 Quote Status Flow

```
DRAFT → PENDING → SENT → VIEWED → ACCEPTED/DECLINED/EXPIRED
                    ↓
            CHANGES_REQUESTED → REVISED → SENT
```

### 6.3 User Endpoints (JWT Required)

| Method | Endpoint                | Description                        | Rate Limit | Idempotent |
| :----- | :---------------------- | :--------------------------------- | :--------- | :--------- |
| `GET`  | `/health`               | Health check (Simplified response) | 1000/hour  | Yes        |
| `GET`  | `/`                     | List own quotes                    | 1000/hour  | Yes        |
| `GET`  | `/{id}`                 | Get quote details                  | 1000/hour  | Yes        |
| `POST` | `/{id}/accept`          | Accept quote                       | 20/hour    | Yes        |
| `POST` | `/{id}/decline`         | Decline quote                      | 20/hour    | Yes        |
| `POST` | `/{id}/request-changes` | Request modifications              | 20/hour    | No         |
| `GET`  | `/{id}/pdf`             | Download quote PDF                 | 100/hour   | Yes        |
| `GET`  | `/stats`                | User quote statistics              | 100/hour   | Yes        |

### 6.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint          | Description                  | Rate Limit | Idempotent |     | Role |
| :------- | :---------------- | :--------------------------- | :--------- | :--------- | :-- | :--- |
| `POST`   | `/`               | Create quote                 | 200/hour   | No         |
| `GET`    | `/`               | List all quotes              | 2000/hour  | Yes        |
| `GET`    | `/{id}`           | Get quote (admin view)       | 2000/hour  | Yes        |
| `PATCH`  | `/{id}`           | Update quote (DRAFT/PENDING) | 200/hour   | No         |
| `DELETE` | `/{id}`           | Delete quote (DRAFT/PENDING) | 100/hour   | Yes        |
| `POST`   | `/{id}/send`      | Send quote to client         | 200/hour   | No         |
| `POST`   | `/{id}/resend`    | Resend quote notification    | 50/hour    | No         |
| `POST`   | `/{id}/duplicate` | Duplicate quote              | 100/hour   | No         |
| `GET`    | `/stats`          | Quote statistics             | 500/hour   | Yes        |
| `GET`    | `/templates`      | List quote templates         | 200/hour   | Yes        |
| `POST`   | `/templates`      | Create quote template        | 50/hour    | No         |

### 6.5 Payment Breakdown Types

| Type           | Description            | Typical % |
| :------------- | :--------------------- | :-------- |
| `advance`      | Upfront payment        | 20-40%    |
| `milestone`    | Progress-based payment | 20-40%    |
| `final`        | Completion payment     | 20-40%    |
| `subscription` | Recurring payment      | N/A       |
| `fullPayment`  | 100% upfront           | 100%      |

### 6.6 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST / (Admin - Create Quote)

```json
// Request
POST /api/v1/admin/quotes
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "requestId": "reqXyz789",
  "title": "E-commerce Website Development - Full Stack Solution",
  "description": "Comprehensive e-commerce platform with modern tech stack and scalable architecture",
  "totalAmount": 8500,
  "currency": "INR",
  "validUntil": "2024-02-15T23:59:59.999Z",
  "validityDays": 30,
  "paymentBreakdown": [
    {
      "type": "advance",
      "description": "Project initiation and setup (30%)",
      "amount": 2550,
      "percentage": 30,
      "dueDate": "2024-02-01",
      "deliverables": [
        "Project kickoff meeting",
        "Requirements finalization",
        "Project plan document",
        "Development environment setup"
      ]
    },
    {
      "type": "milestone",
      "description": "Design and frontend development (35%)",
      "amount": 2975,
      "percentage": 35,
      "dueDate": "2024-02-20",
      "deliverables": [
        "UI/UX design mockups",
        "Frontend implementation",
        "Responsive design",
        "Design review and approval"
      ]
    },
    {
      "type": "final",
      "description": "Backend development and deployment (35%)",
      "amount": 2975,
      "percentage": 35,
      "dueDate": "2024-04-01",
      "deliverables": [
        "Backend API development",
        "Database setup",
        "Payment integration",
        "Testing and QA",
        "Deployment",
        "Documentation"
      ]
    }
  ],
  "timeline": {
    "startDate": "2024-02-01",
    "endDate": "2024-04-01",
    "totalDuration": "8 weeks",
    "milestones": [
      {
        "name": "Design Phase",
        "startDate": "2024-02-01",
        "endDate": "2024-02-14",
        "duration": "2 weeks",
        "deliverables": [
          "Wireframes and mockups",
          "UI/UX design system",
          "Design approval"
        ]
      },
      {
        "name": "Development Phase 1",
        "startDate": "2024-02-15",
        "endDate": "2024-03-14",
        "duration": "4 weeks",
        "deliverables": [
          "Frontend development",
          "Backend API development",
          "Database implementation"
        ]
      },
      {
        "name": "Development Phase 2",
        "startDate": "2024-03-15",
        "endDate": "2024-03-28",
        "duration": "2 weeks",
        "deliverables": [
          "Payment gateway integration",
          "Admin dashboard",
          "Testing and bug fixes"
        ]
      },
      {
        "name": "Deployment & Launch",
        "startDate": "2024-03-29",
        "endDate": "2024-04-01",
        "duration": "3 days",
        "deliverables": [
          "Production deployment",
          "Final testing",
          "Documentation delivery",
          "Training session"
        ]
      }
    ]
  },
  "scope": {
    "included": [
      "Full-stack web application development",
      "Responsive design (mobile, tablet, desktop)",
      "Product catalog management",
      "Shopping cart and checkout",
      "Payment gateway integration (Stripe)",
      "User authentication and authorization",
      "Admin dashboard",
      "Order management system",
      "Email notifications",
      "Basic SEO optimization",
      "Security implementation (HTTPS, CORS, etc.)",
      "Testing and QA",
      "Deployment to production",
      "30 days post-launch support"
    ],
    "excluded": [
      "Content creation and product photography",
      "Ongoing maintenance after 30 days",
      "Additional payment gateway integrations",
      "Advanced analytics and reporting",
      "Mobile app development",
      "Custom integrations beyond scope"
    ]
  },
  "technicalDetails": {
    "technologies": {
      "frontend": ["React 18", "TypeScript", "Tailwind CSS"],
      "backend": ["Node.js", "Express", "TypeScript"],
      "database": ["PostgreSQL"],
      "hosting": ["AWS (EC2, RDS, S3)"],
      "other": ["Redis (caching)", "Stripe API", "SendGrid"]
    },
    "features": [
      "Product search and filtering",
      "Shopping cart with session persistence",
      "Secure checkout process",
      "Payment processing (Stripe)",
      "Order tracking",
      "User account management",
      "Admin inventory management",
      "Email notifications",
      "SSL certificate",
      "Performance optimization"
    ]
  },
  "terms": "Payment terms: Net 15 days from invoice date. All payments are non-refundable once work has commenced. Change requests may incur additional costs. Client will provide all necessary content, credentials, and access. 30 days of post-launch support included. Additional support available at ₹150/hour.",
  "notes": "This quote is valid for 30 days. Pricing assumes scope remains as specified. Any additional requirements will be quoted separately. Project timeline assumes timely client feedback and content provision.",
  "attachments": ["mediaQuoteAbc123"]
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
  "message": "Quote created successfully",
  "data": {
    "id": "quoteAbc123",
    "requestId": "reqXyz789",
    "status": "draft",
    "title": "E-commerce Website Development - Full Stack Solution",
    "totalAmount": 8500,
    "currency": "INR",
    "validUntil": "2024-02-15T23:59:59.999Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (422 Validation Error - Payment breakdown mismatch)
HTTP/1.1 422 Validation Error - Payment breakdown mismatch
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "QUOTE_009",
    "message": "Payment breakdown does not match total amount",
    "details": {
      "totalAmount": 8500,
      "breakdownTotal": 8400,
      "difference": 100,
      "percentageSum": 98.82
    }
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
GET /api/v1/quotes/quoteAbc123
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
    "id": "quoteAbc123",
    "requestId": "reqXyz789",
    "status": "sent",
    "title": "E-commerce Website Development - Full Stack Solution",
    "description": "Comprehensive e-commerce platform with modern tech stack",
    "totalAmount": 8500,
    "currency": "INR",
    "validUntil": "2024-02-15T23:59:59.999Z",
    "daysRemaining": 25,
    "paymentBreakdown": [
      {
        "type": "advance",
        "description": "Project initiation and setup (30%)",
        "amount": 2550,
        "percentage": 30,
        "dueDate": "2024-02-01",
        "deliverables": [
          "Project kickoff meeting",
          "Requirements finalization",
          "Project plan document"
        ]
      },
      {
        "type": "milestone",
        "description": "Design and frontend development (35%)",
        "amount": 2975,
        "percentage": 35,
        "dueDate": "2024-02-20"
      },
      {
        "type": "final",
        "description": "Backend development and deployment (35%)",
        "amount": 2975,
        "percentage": 35,
        "dueDate": "2024-04-01"
      }
    ],
    "timeline": {
      "startDate": "2024-02-01",
      "endDate": "2024-04-01",
      "totalDuration": "8 weeks",
      "milestones": [
        {
          "name": "Design Phase",
          "duration": "2 weeks",
          "deliverables": ["Wireframes", "UI Design"]
        }
      ]
    },
    "scope": {
      "included": [
        "Full-stack web application development",
        "Responsive design",
        "Payment gateway integration"
      ],
      "excluded": [
        "Content creation",
        "Ongoing maintenance"
      ]
    },
    "technicalDetails": {
      "technologies": {
        "frontend": ["React 18", "TypeScript"],
        "backend": ["Node.js", "Express"],
        "database": ["PostgreSQL"]
      }
    },
    "terms": "Payment terms: Net 15 days from invoice date...",
    "attachments": [
      {
        "id": "mediaQuoteAbc123",
        "filename": "technical-proposal.pdf",
        "url": "https://cdn.example.com/quotes/quoteAbc123/proposal.pdf"
      }
    ],
    "request": {
      "id": "reqXyz789",
      "title": "E-commerce Website",
      "submittedAt": "2024-01-15T11:00:00.000Z"
    },
    "statusHistory": [
      {
        "status": "draft",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "status": "pending",
        "timestamp": "2024-01-15T14:00:00.000Z"
      },
      {
        "status": "sent",
        "timestamp": "2024-01-16T09:00:00.000Z"
      },
      {
        "status": "viewed",
        "timestamp": "2024-01-16T15:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:00:00.000Z",
    "sentAt": "2024-01-16T09:00:00.000Z",
    "viewedAt": "2024-01-16T15:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-16T16:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/accept

```json
// Request
POST /api/v1/quotes/quoteAbc123/accept
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "acceptTerms": true,
  "signatureName": "John Doe",
  "signatureDate": "2024-01-16T16:30:00.000Z",
  "notes": "Looking forward to working together!"
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
  "message": "Quote accepted successfully. Project has been created.",
  "data": {
    "quoteId": "quoteAbc123",
    "status": "accepted",
    "acceptedAt": "2024-01-16T16:30:00.000Z",
    "project": {
      "id": "projNew789",
      "title": "E-commerce Website Development",
      "status": "created"
    },
    "nextSteps": {
      "action": "paymentRequired",
      "description": "Please complete the advance payment to begin work",
      "advanceAmount": 2550,
      "currency": "INR",
      "dueDate": "2024-02-01",
      "paymentLink": "https://yourdomain.com/payments/projNew789/advance"
    }
  },
  "metadata": {
    "timestamp": "2024-01-16T16:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Quote expired)
HTTP/1.1 400 Bad Request - Quote expired
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "QUOTE_004",
    "message": "Quote has expired",
    "details": {
      "quoteId": "quoteAbc123",
      "validUntil": "2024-02-15T23:59:59.999Z",
      "expiredAt": "2024-02-15T23:59:59.999Z",
      "canRequestRevision": true
    }
  },
  "metadata": {
    "timestamp": "2024-02-16T10:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (409 Conflict - Quote already accepted)
HTTP/1.1 409 Conflict - Quote already accepted
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "QUOTE_003",
    "message": "Quote has already been accepted",
    "details": {
      "quoteId": "quoteAbc123",
      "status": "accepted",
      "acceptedAt": "2024-01-16T16:30:00.000Z",
      "projectId": "projNew789"
    }
  },
  "metadata": {
    "timestamp": "2024-01-16T17:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/decline

```json
// Request
POST /api/v1/quotes/quoteAbc123/decline
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "budgetConstraints",
  "feedback": "The quote is above our current budget. Can we discuss alternatives?",
  "requestRevision": true
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
  "message": "Quote declined. Your feedback has been sent to our admin.",
  "data": {
    "quoteId": "quoteAbc123",
    "status": "declined",
    "declinedAt": "2024-01-16T17:00:00.000Z",
    "reason": "budgetConstraints",
    "revisionRequested": true
  },
  "metadata": {
    "timestamp": "2024-01-16T17:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/request-changes

```json
// Request
POST /api/v1/quotes/quoteAbc123/request-changes
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "changes": [
    {
      "area": "budget",
      "request": "Can we reduce the scope to fit a ₹6000 budget?"
    },
    {
      "area": "timeline",
      "request": "Need the project completed by March 15th instead of April 1st"
    },
    {
      "area": "features",
      "request": "Can we add integration with Shopify instead of custom backend?"
    }
  ],
  "additionalNotes": "Open to discussing alternative approaches to meet budget"
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
  "message": "Change request submitted. We'll review and send a revised quote within 24 hours.",
  "data": {
    "quoteId": "quoteAbc123",
    "status": "changesRequested",
    "requestedAt": "2024-01-16T17:30:00.000Z",
    "estimatedRevisionDate": "2024-01-17T17:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-16T17:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{id}/pdf

```json
// Request
GET /api/v1/quotes/quoteAbc123/pdf
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="quote-quoteAbc123.pdf"
Content-Length: 245760

[PDF Binary Data]

// Or for browser viewing:
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="quote-quoteAbc123.pdf"

[PDF Binary Data]
```

### 6.7 Error Codes

| Code        | HTTP Status | Description                         | Retryable |
| :---------- | :---------- | :---------------------------------- | :-------- |
| `QUOTE_001` | 404         | Quote not found                     | No        |
| `QUOTE_002` | 403         | Unauthorized access to quote        | No        |
| `QUOTE_003` | 409         | Quote already accepted/declined     | No        |
| `QUOTE_004` | 400         | Quote expired                       | No        |
| `QUOTE_005` | 400         | Invalid quote status for operation  | No        |
| `QUOTE_006` | 400         | Cannot modify accepted quote        | No        |
| `QUOTE_007` | 404         | Associated request not found        | No        |
| `QUOTE_008` | 422         | Invalid payment breakdown structure | No        |
| `QUOTE_009` | 422         | Payment breakdown total mismatch    | No        |
| `QUOTE_010` | 422         | Invalid timeline dates              | No        |
| `QUOTE_011` | 400         | Quote not yet sent to client        | No        |
| `QUOTE_012` | 400         | Cannot delete sent quote            | No        |

---
