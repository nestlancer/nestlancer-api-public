<div align="center">

# Projects Service Endpoints

</div>

---

## 7. Projects Service

**Base Path**: `/api/v1/projects`
**Admin Path**: `/api/v1/admin/projects`

### 7.1 Overview

Manages active projects from initiation through completion. Projects are created when quotes are accepted and contain milestones, deliverables, and payment tracking.

### 7.2 Project Status Flow

```
CREATED → PENDING_PAYMENT → IN_PROGRESS → REVIEW → COMPLETED → ARCHIVED
             ↓                    ↓            ↓
        CANCELLED          REVISION_REQUESTED  |
                                ↓              |
                            ON_HOLD ←----------
```

### 7.3 Public Endpoints (No Auth)

| Method | Endpoint       | Description                        | Rate Limit  | Cache  |
| :----- | :------------- | :--------------------------------- | :---------- | :----- |
| `GET`  | `/health`      | Health check (Simplified response) | 1000/hour   | Yes    |
| `GET`  | `/public`      | List public projects (portfolio)   | 500/hour/IP | 1 hour |
| `GET`  | `/public/{id}` | View public project details        | 500/hour/IP | 1 hour |

### 7.4 User Endpoints (JWT Required)

| Method | Endpoint                 | Description               | Rate Limit | Idempotent |
| :----- | :----------------------- | :------------------------ | :--------- | :--------- |
| `GET`  | `/`                      | List own projects         | 1000/hour  | Yes        |
| `GET`  | `/{id}`                  | Get project details       | 1000/hour  | Yes        |
| `GET`  | `/{id}/timeline`         | Get project timeline      | 500/hour   | Yes        |
| `GET`  | `/{id}/milestones`       | Get project milestones    | 500/hour   | Yes        |
| `GET`  | `/{id}/deliverables`     | Get deliverables          | 500/hour   | Yes        |
| `GET`  | `/{id}/payments`         | Get payment history       | 500/hour   | Yes        |
| `POST` | `/{id}/approve`          | Approve completed project | 20/hour    | Yes        |
| `POST` | `/{id}/request-revision` | Request changes           | 20/hour    | No         |
| `POST` | `/{id}/feedback`         | Submit project feedback   | 20/hour    | No         |
| `GET`  | `/{id}/messages`         | Get project messages      | 1000/hour  | Yes        |
| `POST` | `/{id}/messages`         | Send message              | 200/hour   | No         |
| `GET`  | `/stats`                 | User project statistics   | 100/hour   | Yes        |

### 7.5 Admin Endpoints (Admin JWT Required)

| Method  | Endpoint          | Description                | Rate Limit | Soft Delete |     | Role |
| :------ | :---------------- | :------------------------- | :--------- | :---------- | :-- | :--- |
| `GET`   | `/`               | List all projects          | 2000/hour  | N/A         |
| `GET`   | `/{id}`           | Get project (admin view)   | 2000/hour  | N/A         |
| `PATCH` | `/{id}`           | Update project             | 500/hour   | N/A         |
| `PATCH` | `/{id}/status`    | Update project status      | 500/hour   | N/A         |
| `POST`  | `/{id}/archive`   | Archive project            | 200/hour   | No          |
| `POST`  | `/{id}/unarchive` | Unarchive project          | 200/hour   | N/A         |
| `GET`   | `/{id}/analytics` | Project analytics          | 1000/hour  | N/A         |
| `POST`  | `/{id}/duplicate` | Duplicate as template      | 50/hour    | N/A         |
| `POST`  | `/{id}/export`    | Export project data        | 100/hour   | N/A         |
| `GET`   | `/stats`          | Overall project statistics | 500/hour   | N/A         |
| `GET`   | `/templates`      | List project templates     | 200/hour   | N/A         |
| `POST`  | `/templates`      | Create template            | 50/hour    | N/A         |

### 7.6 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET /{id}

```json
// Request
GET /api/v1/projects/projAbc123
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
    "id": "projAbc123",
    "title": "E-commerce Website Development",
    "description": "Full-featured online store with modern tech stack",
    "status": "inProgress",
    "progress": {
      "overall": 45,
      "design": 100,
      "development": 60,
      "testing": 0,
      "deployment": 0
    },
    "client": {
      "id": "usrXyz789",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+14155552671",
      "avatar": "https://cdn.example.com/avatars/usrXyz789.jpg"
    },
    "quote": {
      "id": "quoteAbc123",
      "totalAmount": 8500,
      "currency": "INR",
      "acceptedAt": "2024-01-16T16:30:00.000Z"
    },
    "timeline": {
      "startDate": "2024-02-01",
      "estimatedEndDate": "2024-04-01",
      "actualStartDate": "2024-02-01",
      "currentPhase": "Development Phase 1",
      "totalDuration": "8 weeks",
      "elapsedDays": 15,
      "remainingDays": 41
    },
    "currentMilestone": {
      "id": "msDev1",
      "name": "Development Phase 1",
      "progress": 60,
      "startDate": "2024-02-15",
      "endDate": "2024-03-14",
      "status": "inProgress"
    },
    "payments": {
      "total": 8500,
      "paid": 2550,
      "pending": 5950,
      "nextPayment": {
        "milestone": "Design and frontend development",
        "amount": 2975,
        "dueDate": "2024-02-20",
        "status": "pending"
      },
      "history": [
        {
          "id": "pmtAdv123",
          "type": "advance",
          "amount": 2550,
          "status": "completed",
          "paidAt": "2024-01-20T10:00:00.000Z"
        }
      ]
    },
    "admin": {
      "id": "usrAdmin789",
      "name": "Jane Doe",
      "role": "admin"
    },
    "milestones": [
      {
        "id": "msDesign",
        "name": "Design Phase",
        "status": "completed",
        "progress": 100,
        "startDate": "2024-02-01",
        "endDate": "2024-02-14",
        "completedAt": "2024-02-14T18:00:00.000Z"
      },
      {
        "id": "msDev1",
        "name": "Development Phase 1",
        "status": "inProgress",
        "progress": 60,
        "startDate": "2024-02-15",
        "endDate": "2024-03-14"
      }
    ],
    "deliverables": {
      "total": 12,
      "completed": 5,
      "pending": 7,
      "items": [
        {
          "id": "delWireframes",
          "name": "Wireframes and mockups",
          "status": "approved",
          "deliveredAt": "2024-02-08T15:00:00.000Z"
        },
        {
          "id": "delDesign",
          "name": "UI/UX design system",
          "status": "approved",
          "deliveredAt": "2024-02-12T14:00:00.000Z"
        }
      ]
    },
    "recentActivity": [
      {
        "type": "milestoneProgress",
        "description": "Development Phase 1 is 60% complete",
        "timestamp": "2024-02-16T10:00:00.000Z"
      },
      {
        "type": "message",
        "description": "New message from Sarah Johnson",
        "timestamp": "2024-02-15T14:30:00.000Z"
      }
    ],
    "tags": ["ecommerce", "react", "nodejs"],
    "createdAt": "2024-01-16T16:30:00.000Z",
    "updatedAt": "2024-02-16T10:00:00.000Z",
    "startedAt": "2024-02-01T09:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-16T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{id}/timeline

```json
// Request
GET /api/v1/projects/projAbc123/timeline
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
    "events": [
      {
        "id": "evt1",
        "type": "projectCreated",
        "title": "Project Created",
        "description": "Project created from accepted quote",
        "timestamp": "2024-01-16T16:30:00.000Z",
        "actor": {
          "id": "usrXyz789",
          "name": "John Doe",
          "role": "user"
        }
      },
      {
        "id": "evt2",
        "type": "paymentReceived",
        "title": "Advance Payment Received",
        "description": "Advance payment of ₹2,550.00 received",
        "amount": 2550,
        "currency": "INR",
        "timestamp": "2024-01-20T10:00:00.000Z"
      },
      {
        "id": "evt3",
        "type": "statusChange",
        "title": "Project Started",
        "description": "Status changed to In Progress",
        "previousStatus": "pendingPayment",
        "newStatus": "inProgress",
        "timestamp": "2024-02-01T09:00:00.000Z"
      },
      {
        "id": "evt4",
        "type": "milestoneStart",
        "title": "Design Phase Started",
        "milestone": "Design Phase",
        "timestamp": "2024-02-01T09:00:00.000Z"
      },
      {
        "id": "evt5",
        "type": "deliverableUpload",
        "title": "Wireframes Delivered",
        "deliverable": "Wireframes and mockups",
        "files": ["mediaWire1", "mediaWire2"],
        "timestamp": "2024-02-08T15:00:00.000Z"
      },
      {
        "id": "evt6",
        "type": "deliverableApproved",
        "title": "Wireframes Approved",
        "deliverable": "Wireframes and mockups",
        "timestamp": "2024-02-09T10:30:00.000Z",
        "actor": {
          "id": "usrXyz789",
          "name": "John Doe",
          "role": "user"
        }
      },
      {
        "id": "evt7",
        "type": "milestoneComplete",
        "title": "Design Phase Completed",
        "milestone": "Design Phase",
        "timestamp": "2024-02-14T18:00:00.000Z"
      },
      {
        "id": "evt8",
        "type": "milestoneStart",
        "title": "Development Phase 1 Started",
        "milestone": "Development Phase 1",
        "timestamp": "2024-02-15T09:00:00.000Z"
      },
      {
        "id": "evt9",
        "type": "progressUpdate",
        "title": "Progress Update",
        "description": "Development Phase 1 is 60% complete",
        "progress": 60,
        "timestamp": "2024-02-16T10:00:00.000Z"
      }
    ],
    "upcomingEvents": [
      {
        "type": "paymentDue",
        "title": "Milestone Payment Due",
        "description": "Design completion payment of ₹2,975.00 due",
        "amount": 2975,
        "dueDate": "2024-02-20"
      },
      {
        "type": "milestoneEnd",
        "title": "Development Phase 1 Deadline",
        "milestone": "Development Phase 1",
        "dueDate": "2024-03-14"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-02-16T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/approve

```json
// Request
POST /api/v1/projects/projAbc123/approve
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "rating": 5,
  "feedback": {
    "quality": 5,
    "communication": 5,
    "timeliness": 4,
    "professionalism": 5,
    "overallSatisfaction": 5
  },
  "testimonial": {
    "text": "Excellent work! They delivered a high-quality product on time and within budget. Highly recommend!",
    "allowPublicUse": true
  },
  "comments": "Minor delay in the final phase, but the quality made up for it. Will definitely work together again."
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
  "message": "Project approved successfully. Thank you for your feedback!",
  "data": {
    "projectId": "projAbc123",
    "status": "completed",
    "approvedAt": "2024-04-02T14:30:00.000Z",
    "rating": 5,
    "completionDate": "2024-04-01T18:00:00.000Z",
    "nextSteps": {
      "action": "finalPayment",
      "description": "Please complete the final payment to receive full project deliverables",
      "amount": 2975,
      "paymentLink": "https://yourdomain.com/payments/projAbc123/final"
    }
  },
  "metadata": {
    "timestamp": "2024-04-02T14:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Project not ready for approval)
HTTP/1.1 400 Bad Request - Project not ready for approval
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "PROJECT_008",
    "message": "Cannot approve incomplete project",
    "details": {
      "projectStatus": "inProgress",
      "completionPercentage": 85,
      "pendingMilestones": ["Development Phase 2"],
      "pendingDeliverables": ["Final testing report", "Documentation"]
    }
  },
  "metadata": {
    "timestamp": "2024-04-02T14:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/request-revision

```json
// Request
POST /api/v1/projects/projAbc123/request-revision
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "area": "design",
  "priority": "high",
  "description": "The homepage color scheme doesn't match our brand guidelines",
  "details": [
    "Primary color should be #FF6B35 (brand orange) instead of #FF0000",
    "Need more whitespace between sections",
    "Footer links should be reorganized"
  ],
  "attachments": ["mediaRef1", "mediaRef2"],
  "dueDate": "2024-02-20"
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
  "message": "Revision request submitted successfully",
  "data": {
    "projectId": "projAbc123",
    "revisionId": "revAbc123",
    "status": "revisionRequested",
    "requestedAt": "2024-02-17T10:00:00.000Z",
    "estimatedCompletionDate": "2024-02-20",
    "notificationSent": true
  },
  "metadata": {
    "timestamp": "2024-02-17T10:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /{id}/status (Admin)

```json
// Request
PATCH /api/v1/admin/projects/projAbc123/status
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "inProgress",
  "reason": "Advance payment received, starting work",
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
  "message": "Project status updated successfully",
  "data": {
    "projectId": "projAbc123",
    "previousStatus": "pendingPayment",
    "newStatus": "inProgress",
    "updatedAt": "2024-02-01T09:00:00.000Z",
    "updatedBy": {
      "id": "usrAdmin123",
      "name": "Admin User"
    }
  },
  "metadata": {
    "timestamp": "2024-02-01T09:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 7.7 Error Codes

| Code          | HTTP Status | Description                                  | Retryable |
| :------------ | :---------- | :------------------------------------------- | :-------- |
| `PROJECT_001` | 404         | Project not found                            | No        |
| `PROJECT_002` | 403         | Unauthorized access to project               | No        |
| `PROJECT_003` | 400         | Invalid status transition                    | No        |
| `PROJECT_004` | 402         | Payment required to proceed                  | No        |
| `PROJECT_005` | 400         | Cannot modify completed project              | No        |
| `PROJECT_006` | 410         | Project already archived                     | No        |
| `PROJECT_007` | 404         | Milestone not found                          | No        |
| `PROJECT_008` | 400         | Cannot approve incomplete project            | No        |
| `PROJECT_009` | 409         | Feedback already submitted                   | No        |
| `PROJECT_010` | 400         | Invalid rating value (1-5)                   | No        |
| `PROJECT_011` | 400         | Deliverable not found                        | No        |
| `PROJECT_012` | 400         | Cannot request revision on completed project | No        |

---
