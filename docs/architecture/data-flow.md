<div align="center">

# Data Flow Documentation

</div>

---

## 📖 Table of Contents

- [📦 Overview](#overview)
- [1. Client Registration Flow](#1-client-registration-flow)
- [2. Project Lifecycle Flow](#2-project-lifecycle-flow)
- [3. Payment Flow](#3-payment-flow)
- [4. Real-time Messaging Flow](#4-real-time-messaging-flow)

---

## 📦 Overview

This document describes the end-to-end data flows for key business processes in Nestlancer. Each flow shows how data moves from client request through services, databases, queues, and workers.

---

## 1. Client Registration Flow

```
Client                  Gateway     Auth Service    PostgreSQL    RabbitMQ    Email Worker    SMTP
  │                       │              │              │            │            │            │
  │ POST /auth/register   │              │              │            │            │            │
  │──────────────────────>│              │              │            │            │            │
  │                       │ validate DTO │              │            │            │            │
  │                       │─────────────>│              │            │            │            │
  │                       │              │ hash password│            │            │            │
  │                       │              │ create User  │            │            │            │
  │                       │              │─────────────>│            │            │            │
  │                       │              │ create token │            │            │            │
  │                       │              │─────────────>│            │            │            │
  │                       │              │ outbox event │            │            │            │
  │                       │              │─────────────>│            │            │            │
  │                       │              │              │            │            │            │
  │ 201 { user, tokens }  │              │              │            │            │            │
  │<──────────────────────│              │              │            │            │            │
  │                       │              │              │            │            │            │
  │                       │              │    outbox-poller polls    │            │            │
  │                       │              │              │───────────>│            │            │
  │                       │              │              │            │ email.queue │            │
  │                       │              │              │            │───────────>│            │
  │                       │              │              │            │            │ send email │
  │                       │              │              │            │            │───────────>│
```

1. Client sends `POST /api/v1/auth/register` with `{ email, password, firstName, lastName }`
2. Gateway validates DTO (email format, password strength)
3. Auth service hashes password with bcrypt (12 rounds)
4. Creates `User` record with `emailVerified: false`
5. Generates `EmailVerificationToken` (24h expiry)
6. Creates `OutboxEvent` for `user.registered` in same transaction
7. Returns JWT access token + refresh token
8. Outbox poller picks up event → publishes to `email.queue`
9. Email worker sends verification email with token link

---

## 2. Project Lifecycle Flow

### 2.1 Request → Quote → Project

```
1. POST /api/v1/requests (Client submits service request)
   └─ Status: SUBMITTED → OutboxEvent: request.submitted

2. PATCH /api/v1/requests/:id/status (Admin reviews)
   └─ Status: UNDER_REVIEW → OutboxEvent: request.status_changed
   └─ Notification: "Your request is being reviewed"

3. POST /api/v1/quotes (Admin creates quote)
   └─ Quote status: SENT → OutboxEvent: quote.sent
   └─ Notification: "You received a new proposal"
   └─ Email: Quote details to client

4. POST /api/v1/quotes/:id/accept (Client accepts, requires Idempotency-Key)
   └─ Quote status: ACCEPTED → OutboxEvent: quote.accepted
   └─ Auto-creates: Project + Milestones + PaymentMilestones
   └─ Project status: ACTIVE → OutboxEvent: project.created
   └─ Notification: "Project started!"
```

### 2.2 Progress Tracking

```
5. POST /api/v1/progress/:projectId/entries (Admin posts update)
   └─ Creates ProgressEntry → OutboxEvent: progress.updated
   └─ Notification if notifyClient: true

6. POST /api/v1/progress/:projectId/deliverables (Admin uploads deliverable)
   └─ Media uploaded to S3 → media.queue → Media Worker (resize/scan)
   └─ Deliverable status: UPLOADED → OutboxEvent: deliverable.uploaded
   └─ Notification: "New deliverable ready for review"

7. POST /api/v1/progress/:projectId/milestones/:id/approve (Client approves)
   └─ Milestone status: APPROVED → OutboxEvent: milestone.completed
   └─ Updates project completionPercentage
   └─ Notification: "Milestone approved"
```

### 2.3 Completion

```
8. PATCH /api/v1/projects/:id/status (Admin marks complete)
   └─ Project status: COMPLETED → OutboxEvent: project.completed
   └─ Notification: "Your project is complete!"
   └─ Email: Project summary + feedback request
```

---

## 3. Payment Flow

```
Client              Gateway     Payments Service    Razorpay     PostgreSQL    Webhook Worker
  │                   │              │                  │            │              │
  │ POST /payments/   │              │                  │            │              │
  │   intents         │              │                  │            │              │
  │ (Idempotency-Key) │              │                  │            │              │
  │──────────────────>│              │                  │            │              │
  │                   │─────────────>│                  │            │              │
  │                   │              │ create order     │            │              │
  │                   │              │─────────────────>│            │              │
  │                   │              │ razorpayOrderId  │            │              │
  │                   │              │<─────────────────│            │              │
  │                   │              │ save intent      │            │              │
  │                   │              │────────────────────────────>│              │
  │ { orderId, key }  │              │                  │            │              │
  │<──────────────────│              │                  │            │              │
  │                   │              │                  │            │              │
  │ Client pays via   │              │                  │            │              │
  │ Razorpay checkout │              │                  │            │              │
  │──────────────────────────────────────────────────>│            │              │
  │                   │              │                  │            │              │
  │                   │   Webhook: payment.captured     │            │              │
  │                   │              │<─────────────────│            │              │
  │                   │              │ verify signature │            │              │
  │                   │              │ update payment   │            │              │
  │                   │              │────────────────────────────>│              │
  │                   │              │ outbox event     │            │              │
  │                   │              │────────────────────────────>│              │
  │                   │              │                  │            │              │
  │                   │              │              outbox-poller → RabbitMQ       │
  │                   │              │                  │            │──────────────>│
  │                   │              │                  │            │  email.queue  │
  │                   │              │                  │            │  (receipt)    │
```

- All amounts in **paise** (INR smallest unit: ₹100 = 10000 paise)
- `Idempotency-Key` header required for payment intents
- Webhook signature verified with `RAZORPAY_WEBHOOK_SECRET` using HMAC SHA256
- Payment status transitions: `PENDING → PROCESSING → COMPLETED / FAILED`

---

## 4. Real-time Messaging Flow

```
Sender              WS Gateway       Messaging Service    PostgreSQL    Redis Pub/Sub    WS Gateway (N)    Receiver
  │                    │                    │                  │              │               │              │
  │ message:send       │                    │                  │              │               │              │
  │───────────────────>│                    │                  │              │               │              │
  │                    │ REST POST          │                  │              │               │              │
  │                    │───────────────────>│                  │              │               │              │
  │                    │                    │ save message     │              │               │              │
  │                    │                    │─────────────────>│              │               │              │
  │                    │                    │ outbox event     │              │               │              │
  │                    │                    │─────────────────>│              │               │              │
  │                    │                    │ publish          │              │               │              │
  │                    │                    │─────────────────────────────>│               │              │
  │                    │                    │                  │              │ subscribe     │              │
  │                    │                    │                  │              │──────────────>│              │
  │                    │                    │                  │              │               │ message:new  │
  │                    │                    │                  │              │               │─────────────>│
```

- WebSocket connection at `wss://api.nestlancer.com/ws/messages`
- JWT auth via connection query params or first message
- Rooms scoped by project: `project:<projectId>`
- Redis Pub/Sub enables multi-instance WS gateway scaling
- Events: `message:new`, `message:edited`, `message:deleted`, `typing:start`, `typing:stop`
- Heartbeat: ping/pong every 30s with exponential backoff reconnection
