<div align="center">

# WebSocket Protocol Specification

</div>

---

## 📖 Table of Contents

- [Connection](#connection)
- [Room Model](#room-model)
- [Events](#events)
- [Heartbeat](#heartbeat)
- [Reconnection Strategy](#reconnection-strategy)
- [Multi-Instance Scaling](#multi-instance-scaling)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Connection

### Endpoints

| Path                                        | Description             |
| :------------------------------------------ | :---------------------- |
| `wss://api.nestlancer.com/ws/messages`      | Real-time messaging     |
| `wss://api.nestlancer.com/ws/notifications` | Real-time notifications |

### Authentication

JWT token provided via:

1. **Query parameter**: `wss://api.nestlancer.com/ws/messages?token=<JWT>`
2. **First message**: `{ type: "auth", token: "<JWT>" }`

The server validates the JWT and associates the connection with the authenticated user. Unauthenticated connections are rejected with close code `4401`.

### Connection Lifecycle

```
Client                              WS Gateway
  │                                     │
  │ WebSocket handshake + JWT token     │
  │────────────────────────────────────>│
  │                                     │ Validate JWT
  │                                     │ Join user room
  │       connection:established        │
  │<────────────────────────────────────│
  │                                     │
  │        ping (every 30s)             │
  │<────────────────────────────────────│
  │          pong                       │
  │────────────────────────────────────>│
  │                                     │
```

---

## Room Model

Rooms are scoped by project for messaging isolation:

| Room         | Format                | Description                    |
| :----------- | :-------------------- | :----------------------------- |
| User Room    | `user:<userId>`       | Private notifications for user |
| Project Room | `project:<projectId>` | Project-specific messaging     |

Users are auto-joined to project rooms based on their project participation.

---

## Events

### Messaging Events

| Event                | Direction       | Payload                                                                        |
| :------------------- | :-------------- | :----------------------------------------------------------------------------- |
| `message:send`       | Client → Server | **Deprecated.** Any payload → server responds with `message:deprecated`.       |
| `message:deprecated` | Server → Client | `{ deprecated: true, use: 'POST /api/v1/messages' }` — send messages via REST. |
| `message:new`        | Server → Client | `{ id, conversationId, senderId, content, type, createdAt }`                   |
| `message:edited`     | Server → Client | `{ id, conversationId, content, editedAt }`                                    |
| `message:deleted`    | Server → Client | `{ id, conversationId, deletedAt }`                                            |

### Typing Events

| Event          | Direction       | Payload                                 |
| :------------- | :-------------- | :-------------------------------------- |
| `typing:start` | Client → Server | `{ conversationId }`                    |
| `typing:stop`  | Client → Server | `{ conversationId }`                    |
| `typing:start` | Server → Client | `{ conversationId, userId, firstName }` |
| `typing:stop`  | Server → Client | `{ conversationId, userId }`            |

### Presence Events

| Event              | Direction       | Payload                 |
| :----------------- | :-------------- | :---------------------- |
| `presence:online`  | Server → Client | `{ userId, onlineAt }`  |
| `presence:offline` | Server → Client | `{ userId, offlineAt }` |

### Notification Events

| Event               | Direction       | Payload                                        |
| :------------------ | :-------------- | :--------------------------------------------- |
| `notification:new`  | Server → Client | `{ id, type, category, title, message, data }` |
| `notification:read` | Client → Server | `{ notificationId }`                           |

---

## Heartbeat

- Server sends `ping` frames every **30 seconds**
- Client must respond with `pong` within **10 seconds**
- 3 missed pongs → connection terminated

---

## Reconnection Strategy

Client-side reconnection with exponential backoff:

```
Attempt 1: 1 second delay
Attempt 2: 2 seconds delay
Attempt 3: 4 seconds delay
Attempt 4: 8 seconds delay
Attempt 5: 16 seconds delay
Max delay: 30 seconds
Max attempts: unlimited (with max delay cap)
```

On reconnect, client sends last received message timestamp to receive missed messages.

---

## Multi-Instance Scaling

The WebSocket Gateway uses a **Redis Pub/Sub adapter** for cross-instance message delivery:

```
WS Gateway (Instance A) ──┐
                           ├── Redis Pub/Sub (:6380)
WS Gateway (Instance B) ──┘
```

Messages published to Redis Pub/Sub are received by all WS Gateway instances, ensuring delivery regardless of which instance the recipient is connected to.

---

## Error Codes

| Close Code | Description                           |
| :--------- | :------------------------------------ |
| `4401`     | Authentication failed                 |
| `4403`     | Forbidden (not a project participant) |
| `4429`     | Rate limited                          |
| `4500`     | Internal server error                 |

---

## Rate Limiting

| Action              | Limit                     |
| :------------------ | :------------------------ |
| Messages sent       | 30 per minute per user    |
| Typing events       | 5 per 10 seconds per user |
| Connection attempts | 5 per minute per IP       |
