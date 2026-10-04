<div align="center">

# WebSocket Gateway

### Realtime transport for **messaging** and **notifications** using **Socket.IO** with a **Redis adapter** so multiple gateway instances share rooms.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [Event flow](#event-flow)
- [Gateways (Socket.IO namespaces / gateways)](#gateways-socketio-namespaces-gateways)
- [Core services](#core-services)
- [Client configuration (frontend)](#client-configuration-frontend)
- [💻 Local development](#local-development)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|             |                                      |
| :---------- | :----------------------------------- |
| **Package** | `@nestlancer/ws-gateway`             |
| **Port**    | 3001                                 |
| **Path**    | `/ws/socket.io` (configurable)       |
| **Auth**    | JWT on handshake (same keys as REST) |

---

## Event flow

```
notification-worker / messaging service
        → Redis PUBLISH (pub/sub instance)
        → ws-gateway Redis subscriber
        → Socket.IO emit to room (user:{id}, conversation:{id})
        → Browser (@nestlancer/websocket)
```

---

## Gateways (Socket.IO namespaces / gateways)

| File                       | Events                                                  |
| :------------------------- | :------------------------------------------------------ |
| `messages.gateway.ts`      | `message:new`, `message:updated`, typing, read receipts |
| `notifications.gateway.ts` | `notification:new`, unread count updates                |

Exact payloads: [WebSocket protocol](../architecture/websocket-protocol.md).

---

## Core services

| Service                       | Role                                   |
| :---------------------------- | :------------------------------------- |
| `ws-auth.service.ts`          | Validate JWT from handshake auth       |
| `room-manager.service.ts`     | Join/leave conversation and user rooms |
| `presence.service.ts`         | Online/offline broadcast               |
| `redis-subscriber.service.ts` | Bridge Redis → Socket.IO               |
| `redis-io.adapter.ts`         | Horizontal scale across pods           |

---

## Client configuration (frontend)

```env
NEXT_PUBLIC_WS_URL=https://dev.nestlancer.com
NEXT_PUBLIC_SOCKET_IO_PATH=/ws/socket.io
```

If connections fail behind Nginx, verify `proxy_set_header Upgrade` and WebSocket timeout — [nginx guide](../operations/nginx.md).

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/ws-gateway dev
# Requires Redis pub/sub URL
```

---

## 📚 Related documentation

- [Messaging service](./services/messaging.md)
- [Notifications service](./services/notifications.md)
- [`@nestlancer/websocket` library](./libs/websocket.md)
- [Notification worker](./workers/notification-worker.md)

---

<div align="center">

**WebSocket Gateway** — Nestlancer backend component documentation

</div>
