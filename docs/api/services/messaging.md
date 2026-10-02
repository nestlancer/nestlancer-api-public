<div align="center">

# Messaging Service Endpoints

</div>

---

## 10. Messaging Service

**Base Path**: `/api/v1/messages`
**Admin Path**: `/api/v1/admin/messages`
**WebSocket**: `wss://api.yourdomain.com/ws/messages`

### 10.1 Overview

Real-time messaging system for project communication between clients and admin. Supports text messages, file attachments, message threading, and real-time notifications via WebSocket.

### 10.2 Message Types

| Type           | Description              | Attachments |
| :------------- | :----------------------- | :---------- |
| `text`         | Plain text message       | Optional    |
| `file`         | File-only message        | Required    |
| `system`       | System-generated message | No          |
| `notification` | Auto-notification        | No          |

### 10.3 User Endpoints (JWT Required)

| Method   | Endpoint                            | Description                             | Rate Limit | Idempotent |
| :------- | :---------------------------------- | :-------------------------------------- | :--------- | :--------- |
| `GET`    | `/health`                           | Health check (Simplified response)      | 1000/hour  | Yes        |
| `GET`    | `/conversations`                    | List all conversations                  | 1000/hour  | Yes        |
| `GET`    | `/projects/{projectId}`             | Get project messages                    | 1000/hour  | Yes        |
| `POST`   | `/projects/{projectId}`             | Send message                            | 500/hour   | No         |
| `PATCH`  | `/{messageId}`                      | Edit message (15 min window)            | 200/hour   | No         |
| `DELETE` | `/{messageId}`                      | Delete message                          | 200/hour   | Yes (soft) |
| `POST`   | `/{messageId}/read`                 | Mark as read                            | 2000/hour  | Yes        |
| `POST`   | `/projects/{projectId}/read-all`    | Mark all as read                        | 100/hour   | Yes        |
| `POST`   | `/{messageId}/react`                | Add reaction                            | 500/hour   | Yes        |
| `DELETE` | `/{messageId}/react`                | Remove reaction                         | 500/hour   | Yes        |
| `GET`    | `/search`                           | Search messages                         | 500/hour   | Yes        |
| `GET`    | `/unread-count`                     | Get unread message count                | 2000/hour  | Yes        |
| `GET`    | `/{messageId}/thread`               | Get message thread                      | 500/hour   | Yes        |
| `POST`   | `/{messageId}/thread`               | Reply in thread                         | 500/hour   | No         |
| `POST`   | `/{messageId}/pin`                  | Pin a message in project chat           | 200/hour   | No         |
| `POST`   | `/{messageId}/unpin`                | Unpin a message                         | 200/hour   | No         |
| `GET`    | `/projects/{projectId}/attachments` | List all shared files in a project chat | 500/hour   | Yes        |

### 10.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint                       | Description               | Rate Limit | Idempotent |     | Role |
| :------- | :----------------------------- | :------------------------ | :--------- | :--------- | :-- | :--- |
| `GET`    | `/conversations`               | All project conversations | 2000/hour  | Yes        |
| `GET`    | `/analytics`                   | Messaging analytics       | 1000/hour  | Yes        |
| `POST`   | `/projects/{projectId}/system` | Send system message       | 500/hour   | No         |
| `DELETE` | `/{messageId}`                 | Delete any message        | 500/hour   | Yes        |
| `GET`    | `/flagged`                     | Get flagged messages      | 1000/hour  | Yes        |
| `POST`   | `/{messageId}/flag`            | Flag message              | 200/hour   | No         |

### 10.5 WebSocket Connection

#### Connection

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/ws/messages');

// Authenticate
ws.send(
  JSON.stringify({
    event: 'authenticate',
    data: {
      token: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  }),
);
```

#### Server Response

```json
{
  "event": "authenticated",
  "data": {
    "userId": "usrAbc123",
    "sessionId": "wsSessXyz789",
    "expiresAt": "2024-01-15T11:30:00.000Z"
  }
}
```

#### WebSocket Events

##### Client → Server Events

| Event               | Description             | Data                                             |
| :------------------ | :---------------------- | :----------------------------------------------- |
| `authenticate`      | Authenticate connection | `{ token: string }`                              |
| `joinConversation`  | Join project chat       | `{ projectId: string }`                          |
| `leaveConversation` | Leave project chat      | `{ projectId: string }`                          |
| `sendMessage`       | Send message            | `{ projectId, content, attachments?, replyTo? }` |
| `typingStart`       | Start typing indicator  | `{ projectId: string }`                          |
| `typingStop`        | Stop typing indicator   | `{ projectId: string }`                          |
| `markRead`          | Mark message as read    | `{ messageId: string }`                          |

##### Server → Client Events

| Event                 | Description              | Data                               |
| :-------------------- | :----------------------- | :--------------------------------- |
| `authenticated`       | Authentication success   | `{ userId, sessionId, expiresAt }` |
| `authError`           | Authentication failed    | `{ code, message }`                |
| `message.new`         | New message received     | `{ message: Message }`             |
| `message.updated`     | Message edited           | `{ message: Message }`             |
| `message.deleted`     | Message deleted          | `{ messageId: string }`            |
| `message.read`        | Message read receipt     | `{ messageId, readBy }`            |
| `user.typing`         | User typing indicator    | `{ userId, projectId }`            |
| `user.online`         | User came online         | `{ userId }`                       |
| `user.offline`        | User went offline        | `{ userId }`                       |
| `conversation.joined` | User joined conversation | `{ userId, projectId }`            |
| `conversation.left`   | User left conversation   | `{ userId, projectId }`            |
| `error`               | Error occurred           | `{ code, message }`                |

#### WebSocket Examples

##### Send Message

```javascript
// Client sends
ws.send(JSON.stringify({
  event: 'sendMessage',
  data: {
    projectId: 'projAbc123',
    content: 'The wireframes look great!',
    replyTo: 'msgXyz789'  // Optional: reply to specific message
  }
}));

// Server broadcasts to all conversation participants
{
  "event": "message.new",
  "data": {
    "message": {
      "id": "msgNew123",
      "projectId": "projAbc123",
      "content": "The wireframes look great!",
      "sender": {
        "id": "usrAbc123",
        "name": "John Doe",
        "avatar": "https://..."
      },
      "replyTo": {
        "id": "msgXyz789",
        "content": "Here are the wireframes",
        "sender": {
          "name": "Sarah Johnson"
        }
      },
      "createdAt": "2024-02-16T14:30:00.000Z"
    }
  }
}
```

##### Typing Indicator

```javascript
// Client starts typing
ws.send(JSON.stringify({
  event: 'typingStart',
  data: {
    projectId: 'projAbc123'
  }
}));

// Server broadcasts to others in conversation
{
  "event": "user.typing",
  "data": {
    "userId": "usrAbc123",
    "userName": "John Doe",
    "projectId": "projAbc123"
  }
}

// Client stops typing (after 3 seconds of inactivity or message sent)
ws.send(JSON.stringify({
  "event": "typingStop",
  "data": {
    "projectId": "projAbc123"
  }
}));
```

### 10.6 REST API Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /projects/{projectId}

```json
// Request
POST /api/v1/messages/projects/projAbc123
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "Here are the design mockups for your review",
  "attachments": ["mediaDesign1", "mediaDesign2", "mediaDesign3"],
  "replyTo": "msgPrevious123"
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
  "message": "Message sent successfully",
  "data": {
    "id": "msgNew456",
    "projectId": "projAbc123",
    "type": "text",
    "content": "Here are the design mockups for your review",
    "sender": {
      "id": "usrPm123",
      "name": "Sarah Johnson",
      "role": "admin",
      "avatar": "https://cdn.example.com/avatars/usrPm123.jpg"
    },
    "attachments": [
      {
        "id": "mediaDesign1",
        "type": "image",
        "filename": "homepage-design.png",
        "url": "https://cdn.example.com/messages/mediaDesign1.png",
        "thumbnail": "https://cdn.example.com/thumbnails/mediaDesign1Thumb.png",
        "size": 524288
      },
      {
        "id": "mediaDesign2",
        "type": "image",
        "filename": "product-page-design.png",
        "url": "https://cdn.example.com/messages/mediaDesign2.png",
        "thumbnail": "https://cdn.example.com/thumbnails/mediaDesign2Thumb.png",
        "size": 612000
      }
    ],
    "replyTo": {
      "id": "msgPrevious123",
      "content": "Can you share the latest designs?",
      "sender": {
        "name": "John Doe"
      }
    },
    "readBy": [],
    "reactions": [],
    "createdAt": "2024-02-16T14:30:00.000Z",
    "updatedAt": "2024-02-16T14:30:00.000Z",
    "canEdit": true,
    "canDelete": true,
    "editableUntil": "2024-02-16T14:45:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-16T14:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /projects/{projectId}

```json
// Request
GET /api/v1/messages/projects/projAbc123?page=1&limit=50&before=msgXyz789
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
      "id": "msg1",
      "projectId": "projAbc123",
      "type": "system",
      "content": "Project started. Welcome to your project workspace!",
      "sender": {
        "id": "system",
        "name": "System",
        "type": "system"
      },
      "createdAt": "2024-02-01T09:00:00.000Z",
      "systemMessage": true
    },
    {
      "id": "msg2",
      "type": "text",
      "content": "Hi! Looking forward to working with you on this project.",
      "sender": {
        "id": "usrPm123",
        "name": "Sarah Johnson",
        "role": "admin",
        "avatar": "https://..."
      },
      "readBy": [
        {
          "userId": "usrAbc123",
          "readAt": "2024-02-01T09:15:00.000Z"
        }
      ],
      "reactions": [
        {
          "emoji": "👍",
          "users": ["usrAbc123"],
          "count": 1
        }
      ],
      "createdAt": "2024-02-01T09:05:00.000Z",
      "canEdit": false,
      "canDelete": false
    },
    {
      "id": "msg3",
      "type": "text",
      "content": "When can we schedule the kickoff meeting?",
      "sender": {
        "id": "usrAbc123",
        "name": "John Doe",
        "role": "Client",
        "avatar": "https://..."
      },
      "readBy": [
        {
          "userId": "usrPm123",
          "readAt": "2024-02-01T10:00:00.000Z"
        }
      ],
      "createdAt": "2024-02-01T09:30:00.000Z",
      "updatedAt": "2024-02-01T09:31:00.000Z",
      "edited": true,
      "canEdit": false,
      "canDelete": true
    },
    {
      "id": "msg4",
      "type": "file",
      "content": null,
      "sender": {
        "id": "usrPm123",
        "name": "Sarah Johnson",
        "avatar": "https://..."
      },
      "attachments": [
        {
          "id": "mediaBrief1",
          "type": "document",
          "filename": "project-brief.pdf",
          "url": "https://cdn.example.com/messages/mediaBrief1.pdf",
          "size": 1048576
        }
      ],
      "readBy": [],
      "createdAt": "2024-02-01T14:00:00.000Z"
    }
  ],
  "pagination": {
    "cursor": {
      "before": "msgXyz789",
      "after": "msg1"
    },
    "hasMore": true,
    "limit": 50
  },
  "metadata": {
    "timestamp": "2024-02-16T15:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /{messageId}

```json
// Request
PATCH /api/v1/messages/msgAbc123
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "When can we schedule the kickoff meeting? Preferably early next week."
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
  "message": "Message updated successfully",
  "data": {
    "id": "msgAbc123",
    "content": "When can we schedule the kickoff meeting? Preferably early next week.",
    "edited": true,
    "updatedAt": "2024-02-01T09:31:00.000Z",
    "editableUntil": "2024-02-01T09:46:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-01T09:31:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 Bad Request - Edit window expired)
HTTP/1.1 400 Bad Request - Edit window expired
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "MESSAGE_003",
    "message": "Edit time limit exceeded (15 minutes)",
    "details": {
      "messageId": "msgAbc123",
      "createdAt": "2024-02-01T09:00:00.000Z",
      "editableUntil": "2024-02-01T09:15:00.000Z",
      "currentTime": "2024-02-01T09:20:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-02-01T09:20:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{messageId}/react

```json
// Request
POST /api/v1/messages/msgAbc123/react
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "emoji": "👍"
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
  "message": "Reaction added successfully",
  "data": {
    "messageId": "msgAbc123",
    "reactions": [
      {
        "emoji": "👍",
        "users": [
          {
            "id": "usrAbc123",
            "name": "John Doe"
          }
        ],
        "count": 1
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-02-01T09:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{messageId}/pin

```json
// Request
POST /api/v1/messages/msgAbc123/pin
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
    "id": "msgAbc123",
    "pinned": true
  },
  "metadata": {
    "timestamp": "2024-02-01T09:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{messageId}/unpin

```json
// Request
POST /api/v1/messages/msgAbc123/unpin
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
    "id": "msgAbc123",
    "pinned": false
  },
  "metadata": {
    "timestamp": "2024-02-01T09:36:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /projects/{projectId}/attachments

```json
// Request
GET /api/v1/messages/projects/projAbc123/attachments?page=1&limit=20&type=all
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
      "id": "mediaDesign1",
      "type": "image",
      "filename": "homepage-design.png",
      "url": "https://cdn.example.com/messages/mediaDesign1.png",
      "thumbnail": "https://cdn.example.com/thumbnails/mediaDesign1Thumb.png",
      "size": 524288,
      "sender": {
        "id": "usrPm123",
        "name": "Sarah Johnson"
      },
      "messageId": "msgNew456",
      "createdAt": "2024-02-16T14:30:00.000Z"
    },
    {
      "id": "mediaBrief1",
      "type": "document",
      "filename": "project-brief.pdf",
      "url": "https://cdn.example.com/messages/mediaBrief1.pdf",
      "size": 1048576,
      "sender": {
        "id": "usrPm123",
        "name": "Sarah Johnson"
      },
      "messageId": "msg4",
      "createdAt": "2024-02-01T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-02-16T15:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /search

```json
// Request
GET /api/v1/messages/search?q=design&projectId=projAbc123&from=2024-02-01&to=2024-02-16
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
    "results": [
      {
        "id": "msg123",
        "projectId": "projAbc123",
        "content": "Here are the <mark>design</mark> mockups for your review",
        "sender": {
          "id": "usrPm123",
          "name": "Sarah Johnson"
        },
        "createdAt": "2024-02-16T14:30:00.000Z",
        "relevance": 0.95
      },
      {
        "id": "msg456",
        "content": "The <mark>design</mark> looks great! Just minor adjustments needed.",
        "sender": {
          "id": "usrAbc123",
          "name": "John Doe"
        },
        "createdAt": "2024-02-14T10:00:00.000Z",
        "relevance": 0.87
      }
    ],
    "total": 12,
    "query": "design",
    "filters": {
      "projectId": "projAbc123",
      "from": "2024-02-01",
      "to": "2024-02-16"
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  },
  "metadata": {
    "timestamp": "2024-02-16T15:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 10.7 Error Codes

| Code          | HTTP Status | Description                               | Retryable  |
| :------------ | :---------- | :---------------------------------------- | :--------- |
| `MESSAGE_001` | 404         | Message not found                         | No         |
| `MESSAGE_002` | 403         | Unauthorized access to message            | No         |
| `MESSAGE_003` | 400         | Edit time limit exceeded (15 min)         | No         |
| `MESSAGE_004` | 403         | Cannot delete message                     | No         |
| `MESSAGE_005` | 422         | Invalid message content                   | No         |
| `MESSAGE_006` | 404         | Attachment not found                      | No         |
| `MESSAGE_007` | 404         | Conversation not found                    | No         |
| `MESSAGE_008` | 403         | Not a conversation participant            | No         |
| `MESSAGE_009` | 413         | Message content too long (max 5000 chars) | No         |
| `MESSAGE_010` | 400         | Cannot edit system messages               | No         |
| `MESSAGE_011` | 429         | Too many messages sent                    | Yes (wait) |

---
