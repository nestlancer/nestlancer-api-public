<div align="center">

# Notifications Service Endpoints

</div>

---

## 11. Notifications Service

**Base Path**: `/api/v1/notifications`
**Admin Path**: `/api/v1/admin/notifications`
**WebSocket**: `wss://api.yourdomain.com/ws/notifications`

### 11.1 Overview

Manages user notifications across multiple channels (in-app, email, push). Supports real-time delivery via WebSocket, customizable preferences, and notification grouping.

### 11.2 Notification Types

| Type                       | Description               | Channels            | Priority |
| :------------------------- | :------------------------ | :------------------ | :------- |
| `project.created`          | New project created       | in-app, email       | normal   |
| `project.statusChanged`    | Project status updated    | in-app, email, push | normal   |
| `project.completed`        | Project completed         | in-app, email, push | high     |
| `quote.received`           | New quote available       | in-app, email, push | high     |
| `quote.expiring`           | Quote expiring soon (24h) | in-app, email, push | high     |
| `quote.expired`            | Quote has expired         | in-app, email       | normal   |
| `payment.received`         | Payment confirmed         | in-app, email       | high     |
| `payment.due`              | Payment reminder          | in-app, email, push | high     |
| `payment.failed`           | Payment failed            | in-app, email, push | critical |
| `payment.refunded`         | Refund processed          | in-app, email       | normal   |
| `message.new`              | New message received      | in-app, push        | normal   |
| `message.mention`          | Mentioned in message      | in-app, push        | high     |
| `milestone.started`        | Milestone work began      | in-app, email       | normal   |
| `milestone.completed`      | Milestone finished        | in-app, email, push | high     |
| `milestone.paymentDue`     | Milestone payment due     | in-app, email, push | high     |
| `deliverable.ready`        | New deliverable ready     | in-app, email, push | high     |
| `deliverable.approved`     | Deliverable approved      | in-app, email       | normal   |
| `revision.requested`       | Revision requested        | in-app, email, push | high     |
| `revision.completed`       | Revision completed        | in-app, email       | normal   |
| `system.announcement`      | System announcement       | in-app, email       | varies   |
| `system.maintenance`       | Scheduled maintenance     | in-app, email, push | high     |
| `security.login`           | New login detected        | in-app, email, push | high     |
| `security.passwordChanged` | Password changed          | in-app, email       | high     |
| `security.2faEnabled`      | 2FA enabled               | in-app, email       | normal   |

### 11.3 Notification Priority Levels

| Priority   | Description                       | Delivery                | Retention |
| :--------- | :-------------------------------- | :---------------------- | :-------- |
| `critical` | Urgent, requires immediate action | All channels, immediate | 90 days   |
| `high`     | Important, time-sensitive         | All enabled channels    | 60 days   |
| `normal`   | Standard notifications            | Based on preferences    | 30 days   |
| `low`      | Informational                     | In-app only             | 14 days   |

### 11.4 User Endpoints (JWT Required)

| Method   | Endpoint                      | Description                        | Rate Limit | Idempotent |
| :------- | :---------------------------- | :--------------------------------- | :--------- | :--------- |
| `GET`    | `/health`                     | Health check (Simplified response) | 1000/hour  | Yes        |
| `GET`    | `/`                           | List notifications                 | 1000/hour  | Yes        |
| `GET`    | `/{id}`                       | Get notification details           | 1000/hour  | Yes        |
| `PATCH`  | `/{id}/read`                  | Mark as read                       | 2000/hour  | Yes        |
| `PATCH`  | `/{id}/unread`                | Mark as unread                     | 500/hour   | Yes        |
| `POST`   | `/read-all`                   | Mark all as read                   | 100/hour   | Yes        |
| `POST`   | `/read-selected`              | Mark selected as read              | 200/hour   | Yes        |
| `GET`    | `/unread-count`               | Get unread count                   | 5000/hour  | Yes        |
| `DELETE` | `/{id}`                       | Delete notification                | 500/hour   | Yes        |
| `DELETE` | `/clear-read`                 | Delete all read                    | 50/hour    | Yes        |
| `GET`    | `/preferences`                | Get notification preferences       | 500/hour   | Yes        |
| `PATCH`  | `/preferences`                | Update preferences                 | 100/hour   | No         |
| `GET`    | `/channels`                   | List notification channels         | 200/hour   | Yes        |
| `POST`   | `/push-subscription`          | Register push subscription         | 100/hour   | No         |
| `DELETE` | `/push-subscription`          | Remove push subscription           | 100/hour   | Yes        |
| `POST`   | `/push/register`              | Register push notification device  | 100/hour   | No         |
| `DELETE` | `/push/unregister/{deviceId}` | Unregister push device             | 100/hour   | Yes        |
| `POST`   | `/test`                       | Send test notification             | 10/hour    | No         |
| `GET`    | `/history`                    | Get notification history           | 200/hour   | Yes        |

### 11.5 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint           | Description                  | Rate Limit | Idempotent |     | Role |
| :------- | :----------------- | :--------------------------- | :--------- | :--------- | :-- | :--- |
| `GET`    | `/`                | List all notifications       | 2000/hour  | Yes        |
| `POST`   | `/send`            | Send to specific user(s)     | 500/hour   | No         |
| `POST`   | `/broadcast`       | Send to all users            | 50/hour    | No         |
| `POST`   | `/segment`         | Send to user segment         | 100/hour   | No         |
| `GET`    | `/stats`           | Notification analytics       | 1000/hour  | Yes        |
| `GET`    | `/delivery-report` | Delivery statistics          | 500/hour   | Yes        |
| `DELETE` | `/user/{userId}`   | Delete user's notifications  | 100/hour   | Yes        |
| `GET`    | `/templates`       | List notification templates  | 200/hour   | Yes        |
| `POST`   | `/templates`       | Create template              | 50/hour    | No         |
| `PATCH`  | `/templates/{id}`  | Update template              | 100/hour   | No         |
| `DELETE` | `/templates/{id}`  | Delete template              | 50/hour    | Yes        |
| `POST`   | `/{id}/resend`     | Resend a failed notification | 100/hour   | No         |

### 11.6 WebSocket Connection

#### Connection

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/ws/notifications');

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

#### WebSocket Events

##### Server → Client Events

| Event                  | Description              | Data                             |
| :--------------------- | :----------------------- | :------------------------------- |
| `authenticated`        | Auth successful          | `{ userId, sessionId }`          |
| `authError`            | Auth failed              | `{ code, message }`              |
| `notification.new`     | New notification         | `{ notification: Notification }` |
| `notification.read`    | Notification marked read | `{ notificationId }`             |
| `notification.deleted` | Notification deleted     | `{ notificationId }`             |
| `unreadCount.updated`  | Unread count changed     | `{ count, byType }`              |
| `preferences.updated`  | Preferences changed      | `{ preferences }`                |

##### Client → Server Events

| Event          | Description            | Data                         |
| :------------- | :--------------------- | :--------------------------- |
| `authenticate` | Send auth token        | `{ token: string }`          |
| `markRead`     | Mark as read           | `{ notificationId: string }` |
| `markAllRead`  | Mark all as read       | `{}`                         |
| `subscribe`    | Subscribe to types     | `{ types: string[] }`        |
| `unsubscribe`  | Unsubscribe from types | `{ types: string[] }`        |

#### WebSocket Example

```javascript
// Server sends new notification
{
  "event": "notification.new",
  "data": {
    "notification": {
      "id": "notifXyz789",
      "type": "quote.received",
      "title": "New Quote Received",
      "message": "You have received a new quote for your E-commerce project",
      "priority": "high",
      "data": {
        "quoteId": "quoteAbc123",
        "projectTitle": "E-commerce Website",
        "amount": 8500,
        "currency": "INR"
      },
      "actionUrl": "/quotes/quoteAbc123",
      "createdAt": "2024-02-16T14:30:00.000Z",
      "read": false
    }
  }
}

// Unread count update
{
  "event": "unreadCount.updated",
  "data": {
    "count": 5,
    "byType": {
      "project": 2,
      "quote": 1,
      "message": 2
    }
  }
}
```

### 11.7 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET /

```json
// Request
GET /api/v1/notifications?page=1&limit=20&type=quote,payment&unreadOnly=true
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
      "id": "notif1",
      "type": "quote.received",
      "title": "New Quote Received",
      "message": "You have received a new quote for your E-commerce project",
      "priority": "high",
      "data": {
        "quoteId": "quoteAbc123",
        "requestId": "reqXyz789",
        "projectTitle": "E-commerce Website",
        "amount": 8500,
        "currency": "INR",
        "validUntil": "2024-02-28T23:59:59.999Z"
      },
      "actionUrl": "/quotes/quoteAbc123",
      "actionText": "View Quote",
      "icon": "quote",
      "image": null,
      "read": false,
      "readAt": null,
      "channels": {
        "inApp": { "delivered": true, "deliveredAt": "2024-02-16T14:30:00.000Z" },
        "email": { "delivered": true, "deliveredAt": "2024-02-16T14:30:05.000Z" },
        "push": { "delivered": true, "deliveredAt": "2024-02-16T14:30:02.000Z" }
      },
      "createdAt": "2024-02-16T14:30:00.000Z",
      "expiresAt": "2024-03-17T14:30:00.000Z"
    },
    {
      "id": "notif2",
      "type": "payment.due",
      "title": "Payment Reminder",
      "message": "Milestone payment of ₹2,975.00 is due on February 20",
      "priority": "high",
      "data": {
        "projectId": "projAbc123",
        "milestoneId": "msDesign",
        "amount": 2975,
        "currency": "INR",
        "dueDate": "2024-02-20"
      },
      "actionUrl": "/projects/projAbc123/payments",
      "actionText": "Pay Now",
      "icon": "payment",
      "read": false,
      "createdAt": "2024-02-18T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "summary": {
    "unreadCount": 5,
    "totalCount": 28,
    "byType": {
      "quote": 2,
      "payment": 1,
      "project": 1,
      "message": 1
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /unread-count

```json
// Request
GET /api/v1/notifications/unread-count
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
    "total": 5,
    "byType": {
      "project": 2,
      "quote": 1,
      "payment": 1,
      "message": 1,
      "system": 0
    },
    "byPriority": {
      "critical": 0,
      "high": 3,
      "normal": 2,
      "low": 0
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /preferences

```json
// Request
PATCH /api/v1/notifications/preferences
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "channels": {
    "email": {
      "enabled": true,
      "types": {
        "project.created": true,
        "project.statusChanged": true,
        "project.completed": true,
        "quote.received": true,
        "quote.expiring": true,
        "payment.received": true,
        "payment.due": true,
        "payment.failed": true,
        "message.new": false,
        "milestone.completed": true,
        "deliverable.ready": true,
        "system.announcement": true,
        "system.maintenance": true,
        "security.login": true,
        "security.passwordChanged": true
      },
      "digest": {
        "enabled": true,
        "frequency": "daily",
        "time": "09:00",
        "timezone": "America/New_York"
      }
    },
    "push": {
      "enabled": true,
      "types": {
        "quote.received": true,
        "quote.expiring": true,
        "payment.due": true,
        "payment.failed": true,
        "message.new": true,
        "message.mention": true,
        "milestone.completed": true,
        "deliverable.ready": true,
        "system.maintenance": true,
        "security.login": true
      },
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00",
        "timezone": "America/New_York",
        "exceptCritical": true
      }
    },
    "inApp": {
      "enabled": true,
      "sound": true,
      "vibration": true
    }
  },
  "marketing": {
    "productUpdates": true,
    "newsletter": false,
    "promotions": false
  }
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
  "message": "Notification preferences updated successfully",
  "data": {
    "channels": {
      "email": {
        "enabled": true,
        "digest": {
          "enabled": true,
          "frequency": "daily",
          "time": "09:00",
          "timezone": "America/New_York",
          "nextDigestAt": "2024-02-19T14:00:00.000Z"
        }
      },
      "push": {
        "enabled": true,
        "quietHours": {
          "enabled": true,
          "start": "22:00",
          "end": "08:00"
        }
      },
      "inApp": {
        "enabled": true
      }
    },
    "updatedAt": "2024-02-18T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /push-subscription

```json
// Request
POST /api/v1/notifications/push-subscription
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "endpoint": "https://updates.push.services.mozilla.com/wpush/v2/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA...",
    "auth": "tBHItJI5svbpez7KI4CCXg=="
  },
  "deviceInfo": {
    "type": "web",
    "browser": "Chrome",
    "browserVersion": "121.0.0",
    "os": "macOS",
    "osVersion": "14.0",
    "deviceName": "John's MacBook Pro"
  }
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
  "message": "Push subscription registered successfully",
  "data": {
    "subscriptionId": "pushSubAbc123",
    "deviceName": "John's MacBook Pro",
    "registeredAt": "2024-02-18T10:30:00.000Z",
    "active": true
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /send (Admin)

```json
// Request
POST /api/v1/admin/notifications/send
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "recipients": {
    "userIds": ["usrAbc123", "usrDef456"],
    "roles": [],
    "segments": []
  },
  "notification": {
    "type": "system.announcement",
    "title": "New Feature: Real-time Progress Tracking",
    "message": "We've added real-time progress tracking to your project dashboard. Check it out!",
    "priority": "normal",
    "data": {
      "featureId": "progressTracking",
      "releaseVersion": "1.5.0"
    },
    "actionUrl": "/dashboard?feature=progress",
    "actionText": "See What's New",
    "icon": "announcement",
    "image": "https://cdn.example.com/announcements/progress-tracking.png"
  },
  "channels": ["inApp", "email"],
  "scheduledFor": null
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
  "message": "Notifications queued for delivery",
  "data": {
    "notificationId": "notifBatchXyz789",
    "recipientCount": 2,
    "channels": ["inApp", "email"],
    "estimatedDelivery": "2024-02-18T10:35:00.000Z",
    "status": "queued"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /broadcast (Admin)

```json
// Request
POST /api/v1/admin/notifications/broadcast
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "notification": {
    "type": "system.maintenance",
    "title": "Scheduled Maintenance",
    "message": "We'll be performing scheduled maintenance on Saturday, Feb 24 from 2:00 AM to 4:00 AM EST. The service may be temporarily unavailable.",
    "priority": "high",
    "data": {
      "maintenanceStart": "2024-02-24T07:00:00.000Z",
      "maintenanceEnd": "2024-02-24T09:00:00.000Z",
      "affectedServices": ["payments", "media-upload"]
    },
    "actionUrl": "/status",
    "actionText": "Check Status"
  },
  "channels": ["inApp", "email", "push"],
  "excludeUserIds": [],
  "scheduledFor": "2024-02-22T14:00:00.000Z"
}

// Response (202 Accepted)
HTTP/1.1 202 Accepted
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Broadcast scheduled for delivery",
  "data": {
    "broadcastId": "broadcastXyz789",
    "estimatedRecipients": 1250,
    "scheduledFor": "2024-02-22T14:00:00.000Z",
    "status": "scheduled"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 11.8 Error Codes

| Code               | HTTP Status | Description                   | Retryable  |
| :----------------- | :---------- | :---------------------------- | :--------- |
| `NOTIFICATION_001` | 404         | Notification not found        | No         |
| `NOTIFICATION_002` | 403         | Unauthorized access           | No         |
| `NOTIFICATION_003` | 422         | Invalid notification type     | No         |
| `NOTIFICATION_004` | 422         | Invalid priority level        | No         |
| `NOTIFICATION_005` | 404         | Recipient not found           | No         |
| `NOTIFICATION_006` | 502         | Email delivery failed         | Yes        |
| `NOTIFICATION_007` | 502         | Push delivery failed          | Yes        |
| `NOTIFICATION_008` | 400         | Invalid push subscription     | No         |
| `NOTIFICATION_009` | 422         | Invalid preferences structure | No         |
| `NOTIFICATION_010` | 409         | Notification already read     | No         |
| `NOTIFICATION_011` | 429         | Broadcast rate limit exceeded | Yes (wait) |

---
