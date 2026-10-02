<div align="center">

# Contact Service Endpoints

</div>

---

## 15. Contact Service

**Base Path**: `/api/v1/contact`
**Admin Path**: `/api/v1/admin/contact`

### 15.1 Overview

Handles lightweight contact form submissions for anonymous visitors, such as general questions, bug reports, and partnership inquiries. More complex project discussions or quotes are handled by the Quotes and Projects services, and authenticated user communication is handled by the Messaging service.

### 15.2 Subject Types

| Subject       | Description         |
| :------------ | :------------------ |
| `general`     | General questions   |
| `support`     | Support request     |
| `bugReport`   | Bug or issue report |
| `partnership` | Partnership inquiry |
| `other`       | Other               |

### 15.3 Message Status

| Status      | Description           |
| :---------- | :-------------------- |
| `new`       | Unread new message    |
| `read`      | Message has been read |
| `responded` | Response sent         |
| `archived`  | Archived              |
| `spam`      | Marked as spam        |

### 15.4 Public Endpoint (No Auth)

| Method | Endpoint  | Description                        | Rate Limit | Turnstile |
| :----- | :-------- | :--------------------------------- | :--------- | :-------- |
| `GET`  | `/health` | Health check (Simplified response) | 1000/hour  | No        |
| `POST` | `/`       | Submit contact form                | 5/hour/IP  | Required  |

### 15.5 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint        | Description           | Rate Limit | Idempotent | Role  |
| :------- | :-------------- | :-------------------- | :--------- | :--------- | :---- |
| `GET`    | `/`             | List contact messages | 1000/hour  | Yes        | admin |
| `GET`    | `/{id}`         | Get message details   | 1000/hour  | Yes        | admin |
| `PATCH`  | `/{id}/status`  | Update status         | 500/hour   | No         | admin |
| `POST`   | `/{id}/respond` | Send email response   | 200/hour   | No         | admin |
| `POST`   | `/{id}/spam`    | Mark as spam          | 500/hour   | Yes        | admin |
| `DELETE` | `/{id}`         | Delete message        | 200/hour   | Yes        | admin |

### 15.6 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication.

#### POST / (Public)

```json
// Request
POST /api/v1/contact
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "bugReport",
  "message": "I noticed an issue with the footer on the portfolio page. The layout breaks on mobile devices.",
  "turnstileToken": "03AGdBq25..."
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
  "message": "Your message has been received. We'll be in touch soon.",
  "data": {
    "ticketId": "TKT-2024-001234",
    "subject": "bugReport"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET / (Admin)

```json
// Request
GET /api/v1/admin/contact?page=1&limit=20&status=new,read&sortBy=createdAt&order=desc
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": [
    {
      "id": "contactAbc123",
      "ticketId": "TKT-2024-001234",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "subject": "bugReport",
      "messagePreview": "I noticed an issue with the footer on the portfolio page...",
      "status": "new",
      "ipInfo": { "ip": "192.168.1.100", "country": "US" },
      "createdAt": "2024-02-18T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "total": 156,
    "new": 12,
    "read": 8,
    "responded": 120,
    "archived": 15,
    "spam": 1
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{id} (Admin)

```json
// Request
GET /api/v1/admin/contact/contactAbc123
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "id": "contactAbc123",
    "ticketId": "TKT-2024-001234",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "subject": "bugReport",
    "message": "I noticed an issue with the footer on the portfolio page. The layout breaks on mobile devices.",
    "status": "new",
    "ipInfo": {
      "ip": "192.168.1.100",
      "country": "US",
      "city": "San Francisco"
    },
    "createdAt": "2024-02-18T10:30:00.000Z",
    "updatedAt": "2024-02-18T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/respond (Admin)

```json
// Request
POST /api/v1/admin/contact/contactAbc123/respond
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "subject": "Re: Bug Report",
  "message": "Hi Jane, thanks for letting us know! We've pushed a fix for the footer issue.",
  "markAsResponded": true
}

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "message": "Response sent successfully",
  "data": {
    "responseId": "respXyz789",
    "sentAt": "2024-02-18T15:00:00.000Z",
    "status": "sent",
    "messageStatus": "responded"
  },
  "metadata": {
    "timestamp": "2024-02-18T15:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 15.7 Error Codes

| Code          | HTTP Status | Description                       | Retryable  |
| :------------ | :---------- | :-------------------------------- | :--------- |
| `CONTACT_001` | 404         | Message not found                 | No         |
| `CONTACT_002` | 422         | Invalid email format              | No         |
| `CONTACT_003` | 413         | Message too long (max 2000 chars) | No         |
| `CONTACT_004` | 429         | Rate limit exceeded               | Yes (wait) |
| `CONTACT_005` | 400         | Turnstile verification failed     | Yes        |
| `CONTACT_007` | 422         | Invalid subject type              | No         |
| `CONTACT_011` | 422         | Required field missing            | No         |
| `CONTACT_012` | 502         | Email delivery failed             | Yes        |
