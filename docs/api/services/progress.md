<div align="center">

# Progress Service Endpoints

</div>

---

## 8. Progress Service

**Base Path**: `/api/v1/projects/{projectId}/progress`
**Admin Path**: `/api/v1/admin/progress`

### 8.1 Overview

Tracks project progress through timeline entries, milestone updates, and deliverable management. Provides transparency to clients on project status.

### 8.2 Progress Entry Types

| Type                  | Description                    | Client Visible |
| :-------------------- | :----------------------------- | :------------- |
| `statusChange`        | Project status updated         | Yes            |
| `milestoneStart`      | Milestone began                | Yes            |
| `milestoneProgress`   | Milestone progress update      | Yes            |
| `milestoneComplete`   | Milestone finished             | Yes            |
| `deliverableUpload`   | File uploaded                  | Yes            |
| `deliverableApproved` | Client approved deliverable    | Yes            |
| `deliverableRejected` | Client rejected deliverable    | Yes            |
| `feedbackRequest`     | Feedback requested from client | Yes            |
| `revisionRequest`     | Changes requested by client    | Yes            |
| `revisionComplete`    | Revisions completed            | Yes            |
| `note`                | General update note            | Yes            |
| `internalNote`        | Internal admin note            | No             |
| `meeting`             | Meeting held                   | Yes            |
| `delay`               | Delay notification             | Yes            |

### 8.3 User Endpoints (JWT Required)

| Method | Endpoint                                     | Description                        | Rate Limit | Idempotent |
| :----- | :------------------------------------------- | :--------------------------------- | :--------- | :--------- |
| `GET`  | `/health`                                    | Health check (Simplified response) | 1000/hour  | Yes        |
| `GET`  | `/`                                          | Get progress timeline              | 1000/hour  | Yes        |
| `GET`  | `/{entryId}`                                 | Get progress entry details         | 500/hour   | Yes        |
| `GET`  | `/status`                                    | Get current status summary         | 1000/hour  | Yes        |
| `GET`  | `/milestones`                                | Get milestone progress             | 500/hour   | Yes        |
| `POST` | `/request-changes`                           | Request revisions                  | 50/hour    | No         |
| `POST` | `/milestones/{milestoneId}/approve`          | Approve milestone                  | 20/hour    | Yes        |
| `POST` | `/milestones/{milestoneId}/request-revision` | Request milestone revision         | 20/hour    | No         |
| `POST` | `/deliverables/{deliverableId}/approve`      | Approve deliverable                | 20/hour    | Yes        |
| `POST` | `/deliverables/{deliverableId}/reject`       | Reject deliverable                 | 20/hour    | No         |

### 8.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint                             | Description              | Rate Limit | Idempotent |     | Role |
| :------- | :----------------------------------- | :----------------------- | :--------- | :--------- | :-- | :--- |
| `POST`   | `/projects/{projectId}/progress`     | Create progress entry    | 500/hour   | No         |
| `GET`    | `/projects/{projectId}/progress`     | Get all progress (admin) | 2000/hour  | Yes        |
| `PATCH`  | `/progress/{entryId}`                | Update progress entry    | 500/hour   | No         |
| `DELETE` | `/progress/{entryId}`                | Delete progress entry    | 200/hour   | Yes        |
| `PATCH`  | `/projects/{projectId}/status`       | Update project status    | 500/hour   | No         |
| `POST`   | `/projects/{projectId}/milestones`   | Create milestone         | 200/hour   | No         |
| `PATCH`  | `/milestones/{milestoneId}`          | Update milestone         | 200/hour   | No         |
| `POST`   | `/milestones/{milestoneId}/complete` | Mark milestone complete  | 200/hour   | Yes        |
| `POST`   | `/projects/{projectId}/deliverables` | Upload deliverable       | 200/hour   | No         |
| `GET`    | `/projects/{projectId}/deliverables` | Get deliverables         | 2000/hour  | Yes        |
| `PATCH`  | `/deliverables/{deliverableId}`      | Update deliverable       | 200/hour   | No         |
| `DELETE` | `/deliverables/{deliverableId}`      | Delete deliverable       | 100/hour   | Yes        |
| `POST`   | `/projects/{projectId}/complete`     | Mark project complete    | 100/hour   | Yes        |

### 8.5 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /projects/{projectId}/progress (Admin)

```json
// Request
POST /api/v1/admin/progress/projects/projAbc123/progress
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "type": "milestoneComplete",
  "title": "Design Phase Completed",
  "description": "All design mockups have been finalized and approved",
  "milestone": {
    "id": "msDesign",
    "name": "Design Phase",
    "progress": 100
  },
  "deliverables": [
    {
      "name": "UI/UX Design System",
      "description": "Complete design system with components",
      "files": ["mediaDesign1", "mediaDesign2", "mediaDesign3"]
    },
    {
      "name": "Wireframes",
      "description": "All page wireframes",
      "files": ["mediaWire1", "mediaWire2"]
    }
  ],
  "attachments": ["mediaAbc123"],
  "notifyClient": true,
  "visibility": "client"
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
  "message": "Progress entry created successfully",
  "data": {
    "id": "progXyz789",
    "projectId": "projAbc123",
    "type": "milestoneComplete",
    "title": "Design Phase Completed",
    "milestone": {
      "id": "msDesign",
      "name": "Design Phase",
      "progress": 100,
      "status": "completed"
    },
    "overall Progress": 35,
    "createdAt": "2024-02-14T18:00:00.000Z",
    "clientNotified": true
  },
  "metadata": {
    "timestamp": "2024-02-14T18:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /

```json
// Request
GET /api/v1/projects/projAbc123/progress?page=1&limit=20
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
      "id": "prog1",
      "type": "statusChange",
      "title": "Project Started",
      "description": "Project work has begun",
      "previousStatus": "pendingPayment",
      "newStatus": "inProgress",
      "timestamp": "2024-02-01T09:00:00.000Z",
      "actor": {
        "id": "usrAdmin123",
        "name": "Admin User",
        "role": "admin"
      }
    },
    {
      "id": "prog2",
      "type": "milestoneStart",
      "title": "Design Phase Started",
      "milestone": {
        "id": "msDesign",
        "name": "Design Phase",
        "startDate": "2024-02-01",
        "endDate": "2024-02-14"
      },
      "timestamp": "2024-02-01T09:00:00.000Z"
    },
    {
      "id": "prog3",
      "type": "deliverableUpload",
      "title": "Wireframes Delivered",
      "description": "Initial wireframes for all main pages",
      "deliverable": {
        "id": "delWire1",
        "name": "Wireframes and mockups",
        "files": [
          {
            "id": "mediaWire1",
            "filename": "homepage-wireframe.png",
            "url": "https://cdn.example.com/deliverables/..."
          },
          {
            "id": "mediaWire2",
            "filename": "product-page-wireframe.png",
            "url": "https://cdn.example.com/deliverables/..."
          }
        ]
      },
      "timestamp": "2024-02-08T15:00:00.000Z",
      "requiresApproval": true,
      "approvalStatus": "pending"
    },
    {
      "id": "prog4",
      "type": "deliverableApproved",
      "title": "Wireframes Approved",
      "deliverable": {
        "id": "delWire1",
        "name": "Wireframes and mockups"
      },
      "timestamp": "2024-02-09T10:30:00.000Z",
      "actor": {
        "id": "usrXyz789",
        "name": "John Doe",
        "role": "user"
      },
      "feedback": "Looks great! Just minor adjustment to the footer layout."
    },
    {
      "id": "prog5",
      "type": "milestoneComplete",
      "title": "Design Phase Completed",
      "milestone": {
        "id": "msDesign",
        "name": "Design Phase",
        "progress": 100,
        "completedAt": "2024-02-14T18:00:00.000Z"
      },
      "deliverables": [
        {
          "id": "delWire1",
          "name": "Wireframes and mockups",
          "status": "approved"
        },
        {
          "id": "delDesign1",
          "name": "UI/UX design system",
          "status": "approved"
        }
      ],
      "timestamp": "2024-02-14T18:00:00.000Z"
    },
    {
      "id": "prog6",
      "type": "milestoneStart",
      "title": "Development Phase 1 Started",
      "milestone": {
        "id": "msDev1",
        "name": "Development Phase 1",
        "startDate": "2024-02-15",
        "endDate": "2024-03-14"
      },
      "timestamp": "2024-02-15T09:00:00.000Z"
    },
    {
      "id": "prog7",
      "type": "milestoneProgress",
      "title": "Development Progress Update",
      "description": "Frontend components are 60% complete",
      "milestone": {
        "id": "msDev1",
        "name": "Development Phase 1",
        "progress": 60
      },
      "details": {
        "tasksCompleted": 12,
        "tasksTotal": 20,
        "currentFocus": "Product listing page implementation"
      },
      "timestamp": "2024-02-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 7,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-02-16T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /deliverables/{deliverableId}/approve

```json
// Request
POST /api/v1/projects/projAbc123/progress/deliverables/delWire1/approve
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "rating": 5,
  "feedback": "Excellent work! The wireframes capture exactly what we discussed.",
  "notes": "Minor adjustment needed to footer layout (as discussed in meeting)"
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
  "message": "Deliverable approved successfully",
  "data": {
    "deliverableId": "delWire1",
    "status": "approved",
    "approvedAt": "2024-02-09T10:30:00.000Z",
    "rating": 5,
    "progressEntryCreated": {
      "id": "prog4",
      "type": "deliverableApproved"
    }
  },
  "metadata": {
    "timestamp": "2024-02-09T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /deliverables/{deliverableId}/reject

```json
// Request
POST /api/v1/projects/projAbc123/progress/deliverables/delDesign2/reject
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "designMismatch",
  "feedback": "The color scheme doesn't match our brand guidelines",
  "details": [
    "Primary color should be #FF6B35 (brand orange) not #FF0000",
    "Font should be Roboto, not Arial",
    "Logo placement needs to be adjusted"
  ],
  "requestedChanges": "Please update the design to match our brand guide (attached)",
  "attachments": ["mediaBrandguide123"]
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
  "message": "Deliverable rejected. Revision request sent to admin.",
  "data": {
    "deliverableId": "delDesign2",
    "status": "revisionRequested",
    "rejectedAt": "2024-02-12T14:00:00.000Z",
    "revisionRequest": {
      "id": "revAbc123",
      "estimatedCompletionDate": "2024-02-15"
    },
    "progressEntryCreated": {
      "id": "prog5",
      "type": "deliverableRejected"
    }
  },
  "metadata": {
    "timestamp": "2024-02-12T14:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /status

```json
// Request
GET /api/v1/projects/projAbc123/progress/status
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
    "overall": {
      "status": "inProgress",
      "progress": 45,
      "onTrack": true,
      "daysElapsed": 15,
      "daysRemaining": 41
    },
    "currentPhase": {
      "id": "msDev1",
      "name": "Development Phase 1",
      "progress": 60,
      "status": "inProgress",
      "startDate": "2024-02-15",
      "endDate": "2024-03-14",
      "daysRemaining": 26
    },
    "phases": [
      {
        "id": "msDesign",
        "name": "Design Phase",
        "progress": 100,
        "status": "completed",
        "completedAt": "2024-02-14T18:00:00.000Z"
      },
      {
        "id": "msDev1",
        "name": "Development Phase 1",
        "progress": 60,
        "status": "inProgress"
      },
      {
        "id": "msDev2",
        "name": "Development Phase 2",
        "progress": 0,
        "status": "pending"
      },
      {
        "id": "msDeploy",
        "name": "Deployment & Launch",
        "progress": 0,
        "status": "pending"
      }
    ],
    "deliverables": {
      "total": 12,
      "completed": 5,
      "pending": 7,
      "awaitingApproval": 2
    },
    "upcomingMilestones": [
      {
        "id": "msDev1",
        "name": "Development Phase 1",
        "dueDate": "2024-03-14",
        "daysUntilDue": 26
      }
    ],
    "blockers": [],
    "recentActivity": [
      {
        "type": "milestoneProgress",
        "description": "Development Phase 1 is 60% complete",
        "timestamp": "2024-02-16T10:00:00.000Z"
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

### 8.6 Error Codes

| Code           | HTTP Status | Description                           | Retryable |
| :------------- | :---------- | :------------------------------------ | :-------- |
| `PROGRESS_001` | 404         | Progress entry not found              | No        |
| `PROGRESS_002` | 403         | Unauthorized access                   | No        |
| `PROGRESS_003` | 422         | Invalid percentage (must be 0-100)    | No        |
| `PROGRESS_004` | 400         | Cannot decrease progress              | No        |
| `PROGRESS_005` | 404         | Milestone not found                   | No        |
| `PROGRESS_006` | 409         | Milestone already completed           | No        |
| `PROGRESS_007` | 400         | Cannot modify completed milestone     | No        |
| `PROGRESS_008` | 404         | Deliverable not found                 | No        |
| `PROGRESS_009` | 422         | Invalid progress type                 | No        |
| `PROGRESS_010` | 409         | Deliverable already approved/rejected | No        |
| `PROGRESS_011` | 400         | Cannot approve own deliverable        | No        |

---
