# Nestlancer Backend Feature Inventory

> Generated: 2026-06-10 | Re-audited: 2026-06-10 | **Post-remediation: 2026-06-10**  
> Method: code + OpenAPI + schema audit (95 controllers, 52 Prisma models)  
> Gateway base URL: `/api/v1` (`libs/common/src/constants/app.constants.ts`)  
> Global gateway guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` (`gateway/src/app.module.ts`)
>
> **⚠️ Staleness notice (added 2026-10-03):** this inventory was captured on 2026-06-10 and has not
> been re-verified against the current codebase. Treat controller/model counts and per-endpoint
> details below as a point-in-time snapshot, not a live contract. For the current, verified API
> surface use the generated [OpenAPI merged spec](../api/openapi-merged.json) and
> [`docs/api/`](../api/README.md); for current per-service docs use
> [`docs/components/services/`](../components/services/). This file has no automated regenerate
> command — re-auditing it is a manual, code-reading exercise, not a script run.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Auth Service](#1-auth-service)
3. [Users Service](#2-users-service)
4. [Requests Service](#3-requests-service)
5. [Quotes Service](#4-quotes-service)
6. [Projects Service](#5-projects-service)
7. [Progress Service](#6-progress-service)
8. [Payments Service](#7-payments-service)
9. [Messaging Service](#8-messaging-service)
10. [Notifications Service](#9-notifications-service)
11. [Media Service](#10-media-service)
12. [Portfolio Service](#11-portfolio-service)
13. [Blog Service](#12-blog-service)
14. [Contact Service](#13-contact-service)
15. [Admin Service](#14-admin-service)
16. [Webhooks Service](#15-webhooks-service)
17. [Health Service](#16-health-service)
18. [Workers & In-Service Consumers](#workers)
19. [WebSocket Gateway](#websocket-gateway)
20. [Shared Libraries](#shared-libraries)
21. [Prisma Data Model](#prisma-data-model)
22. [Gateway Route Registration](#gateway-route-registration)
23. [Gateway Gaps & Path Mismatches](#gateway-gaps--path-mismatches)
24. [Controller File Index](#controller-file-index)
25. [API Documentation](#api-documentation)
26. [Implementation Status Summary](#implementation-status-summary)

---

## Architecture Overview

| Layer         | Path                | Role                                                 |
| ------------- | ------------------- | ---------------------------------------------------- |
| API Gateway   | `:3000/api/v1/*`    | Auth, routing, proxy to 16 microservices             |
| WS Gateway    | `:3100` (Socket.IO) | Real-time messaging, notifications, project progress |
| Microservices | `:3001–3016`        | Domain logic                                         |
| Workers       | Background          | RabbitMQ consumers, crons, outbox poller             |
| Prisma        | PostgreSQL          | 21 schema files, **52 models**                       |

**Service registry:** `gateway/src/proxy/service-registry.ts`

---

## 1. Auth Service

**Service prefix:** `/api/v1/auth` | **Port:** 3001  
**Evidence:** `services/auth/src/main.ts`, `services/auth/src/controllers/auth.public.controller.ts`

### 1.1 User Registration

- **ID:** BE-AUTH-001
- **Description:** Create account with email/password; emits `USER_REGISTERED` outbox event
- **Subfeatures:**
  - Email/password registration
  - Turnstile CAPTCHA validation
  - Duplicate email rejection
- **Endpoints:** `POST /api/v1/auth/register`
- **Roles:** Public
- **Workers/Events:** `USER_REGISTERED` → email-worker
- **Files:** `services/auth/src/controllers/auth.public.controller.ts`, `gateway/src/modules/auth/auth.controller.ts`
- **Status:** ✅ Implemented

### 1.2 Login

- **ID:** BE-AUTH-002
- **Description:** Authenticate user, issue JWT access + refresh tokens; supports 2FA challenge
- **Subfeatures:**
  - Email/password login
  - 2FA challenge redirect
  - Session creation
- **Endpoints:** `POST /api/v1/auth/login`
- **Roles:** Public
- **Dependencies:** JWT, sessions, auth-lib
- **Files:** `services/auth/src/controllers/auth.public.controller.ts`
- **Status:** ✅ Implemented

### 1.3 Token Refresh

- **ID:** BE-AUTH-003
- **Endpoints:** `POST /api/v1/auth/refresh`
- **Roles:** Public (refresh token)
- **Status:** ✅ Implemented

### 1.4 Logout

- **ID:** BE-AUTH-004
- **Endpoints:** `POST /api/v1/auth/logout`
- **Roles:** Authenticated
- **Status:** ✅ Implemented

### 1.5 Logout All Sessions

- **ID:** BE-AUTH-005
- **Endpoints:** `POST /api/v1/auth/logout-all`
- **Roles:** Authenticated
- **Status:** ✅ Implemented

### 1.6 Two-Factor Verification (Login)

- **ID:** BE-AUTH-006
- **Endpoints:** `POST /api/v1/auth/verify-2fa`
- **Roles:** Public (pre-auth challenge)
- **Status:** ✅ Implemented

### 1.7 Email Verification

- **ID:** BE-AUTH-007
- **Endpoints:** `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/resend-verification`
- **Roles:** Public
- **Workers/Events:** email-worker
- **Status:** ✅ Implemented

### 1.8 Password Reset

- **ID:** BE-AUTH-008
- **Endpoints:** `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- **Roles:** Public
- **Workers/Events:** email-worker
- **Status:** ✅ Implemented

### 1.9 Email Availability Check

- **ID:** BE-AUTH-009
- **Endpoints:** `POST /api/v1/auth/check-email`, `GET /api/v1/auth/check-email`
- **Roles:** Public
- **Status:** ✅ Implemented

### 1.10 Auth Health

- **ID:** BE-AUTH-010
- **Endpoints:** `GET /api/v1/auth/health`
- **Roles:** Public
- **Status:** ✅ Implemented

---

## 2. Users Service

**Service prefix:** `/api/v1/users` | **Port:** 3002

### 2.1 Profile CRUD

- **ID:** BE-USERS-001
- **Endpoints:** `GET /api/v1/users/profile`, `PATCH /api/v1/users/profile`
- **Roles:** USER — `users:read:own`, `users:update:own`
- **Files:** `services/users/src/controllers/users.controller.ts`
- **Status:** ✅ Implemented

### 2.2 Avatar Management

- **ID:** BE-USERS-002
- **Endpoints:** `POST /api/v1/users/avatar`, `DELETE /api/v1/users/avatar`
- **Roles:** Authenticated USER
- **Dependencies:** media, storage
- **Status:** ✅ Implemented

### 2.3 User Preferences

- **ID:** BE-USERS-003
- **Endpoints:** `GET /api/v1/users/preferences`, `PATCH /api/v1/users/preferences`
- **Roles:** Authenticated USER
- **Status:** ✅ Implemented

### 2.4 Password Change

- **ID:** BE-USERS-004
- **Endpoints:** `PATCH /api/v1/users/password`, `POST /api/v1/users/change-password`
- **Roles:** Authenticated USER
- **Status:** ✅ Implemented

### 2.5 Two-Factor Management

- **ID:** BE-USERS-005
- **Endpoints:** `POST /api/v1/users/2fa/enable`, `verify`, `disable`; `GET /api/v1/users/2fa/status`, `backup-codes`; `POST /api/v1/users/2fa/regenerate-codes`
- **Roles:** Authenticated USER
- **Status:** ✅ Implemented
- **Note:** Gateway exposes `POST /api/v1/users/2fa/setup` and `verify-setup` (`gateway/src/modules/users/users.controller.ts`) — **no matching routes in users service** (gateway-only stub)

### 2.6 Session Management

- **ID:** BE-USERS-006
- **Endpoints:** `GET /api/v1/users/sessions`, `GET/DELETE /api/v1/users/sessions/:sessionId`, `POST /api/v1/users/sessions/terminate-others`
- **Roles:** Authenticated USER
- **Status:** ✅ Implemented

### 2.7 Account Deletion (GDPR)

- **ID:** BE-USERS-007
- **Endpoints:** `POST /api/v1/users/delete-account`, `POST /api/v1/users/cancel-deletion`
- **Roles:** Authenticated USER
- **Workers/Events:** outbox
- **Status:** ✅ Implemented

### 2.8 Activity Log

- **ID:** BE-USERS-008
- **Endpoints:** `GET /api/v1/users/activity`
- **Roles:** Authenticated USER
- **Dependencies:** audit
- **Status:** ✅ Implemented

### 2.9 Data Export (GDPR)

- **ID:** BE-USERS-009
- **Endpoints:** `GET /api/v1/users/export`, `data-export`, `export/:id`
- **Roles:** Authenticated USER
- **Workers/Events:** export-worker
- **Status:** ✅ Implemented

### 2.10 Dashboard Summary

- **ID:** BE-USERS-010
- **Endpoints:** `GET /api/v1/users/dashboard-summary`
- **Roles:** Authenticated USER
- **Files:** `gateway/src/modules/users/users.controller.ts`
- **Status:** ✅ Implemented (gateway aggregation)

### 2.11 Admin User Management

- **ID:** BE-USERS-011
- **Endpoints:** `GET/POST/PATCH/DELETE /api/v1/admin/users/*`
- **Roles:** ADMIN `*:manage`
- **Files:** `services/users/src/controllers/users.admin.controller.ts`
- **Status:** ✅ Implemented

### 2.12 Admin Security Operations

- **ID:** BE-USERS-012
- **Endpoints:** `POST .../force-password-reset`, `reset-password`, `terminate-all-sessions`; `GET .../security-stats`
- **Roles:** ADMIN
- **Status:** ✅ Implemented

### 2.13 Admin Audit Logs

- **ID:** BE-USERS-013
- **Endpoints:** `GET /api/v1/admin/logs`, `GET /api/v1/admin/logs/security-stats`
- **Roles:** ADMIN
- **Files:** `services/users/src/controllers/audit-logs.admin.controller.ts`
- **Status:** ✅ Implemented

### 2.14 Users Health

- **ID:** BE-USERS-014
- **Endpoints:** `GET /api/v1/users/health`
- **Status:** ✅ Implemented

---

## 3. Requests Service

**Service prefix:** `/api/v1/requests` | **Port:** 3006

| ID         | Feature             | Endpoints                                                                  | Roles                      | Status                            |
| ---------- | ------------------- | -------------------------------------------------------------------------- | -------------------------- | --------------------------------- |
| BE-REQ-001 | Create Request      | `POST /api/v1/requests`                                                    | USER `requests:create`     | ✅ `requests.controller.ts`       |
| BE-REQ-002 | List/Read/Stats     | `GET /api/v1/requests`, `stats`, `:id`                                     | USER `requests:read:own`   | ✅                                |
| BE-REQ-003 | Update/Delete Draft | `PATCH/DELETE /api/v1/requests/:id`                                        | USER `requests:update:own` | ✅                                |
| BE-REQ-004 | Submit Request      | `POST /api/v1/requests/:id/submit`                                         | USER                       | ✅ outbox `REQUEST_SUBMITTED`     |
| BE-REQ-005 | Status Tracking     | `GET /api/v1/requests/:id/status`                                          | USER                       | ✅                                |
| BE-REQ-006 | Attachments         | `GET/POST .../attachments`, `DELETE .../:attachmentId`, `GET .../download` | USER                       | ✅ media                          |
| BE-REQ-007 | Linked Quotes       | `GET /api/v1/requests/:id/quotes`                                          | USER                       | ✅                                |
| BE-REQ-008 | Admin Request Ops   | `GET/PATCH/DELETE /api/v1/admin/requests/*`, assign, notes, create quote   | ADMIN                      | ✅ `requests.admin.controller.ts` |
| BE-REQ-009 | Health              | `GET /api/v1/requests/health`                                              | Public                     | ✅                                |

---

## 4. Quotes Service

**Service prefix:** `/api/v1/quotes` | **Port:** 3007

| ID           | Feature                      | Endpoints                                                      | Roles  | Status                                  |
| ------------ | ---------------------------- | -------------------------------------------------------------- | ------ | --------------------------------------- |
| BE-QUOTE-001 | Client Quote View            | `GET /api/v1/quotes`, `:id`, `stats`                           | USER   | ✅ `quotes.controller.ts`               |
| BE-QUOTE-002 | Quote Actions                | `POST .../accept`, `decline`, `request-changes`                | USER   | ✅ outbox events                        |
| BE-QUOTE-003 | Quote PDF                    | `GET /api/v1/quotes/:id/pdf`                                   | USER   | ✅ document-worker                      |
| BE-QUOTE-004 | Quote Documents              | `GET .../documents/versions`, `.../contract`                   | USER   | ✅ `documents.controller.ts`            |
| BE-QUOTE-005 | Admin Quote CRUD             | `GET/POST/PATCH/DELETE /api/v1/admin/quotes/*`                 | ADMIN  | ✅ `quotes.admin.controller.ts`         |
| BE-QUOTE-006 | Admin Quote Workflow         | `POST .../send`, `resend`; `GET .../history`                   | ADMIN  | ✅ email-worker                         |
| BE-QUOTE-007 | Quote Templates (deprecated) | `GET/POST /api/v1/admin/quotes/templates`                      | ADMIN  | ⚠️ Deprecated — use line-item library   |
| BE-QUOTE-009 | Line Item Library            | `GET/POST/PATCH/DELETE /api/v1/admin/quotes/line-item-library` | ADMIN  | ✅ `quote-line-item-library.service.ts` |
| BE-QUOTE-010 | Quote Prefill                | `POST /api/v1/admin/requests/:id/quotes/prefill`               | ADMIN  | ✅ `quotes.admin.service.ts` (requests) |
| BE-QUOTE-008 | Health                       | `GET /api/v1/quotes/health`                                    | Public | ✅                                      |

---

## 5. Projects Service

**Service prefix:** `/api/v1/projects` | **Port:** 3008

| ID          | Feature               | Endpoints                                                               | Roles                    | Status                             |
| ----------- | --------------------- | ----------------------------------------------------------------------- | ------------------------ | ---------------------------------- |
| BE-PROJ-001 | Client Projects       | `GET /api/v1/projects`, `:id`, `stats`, `by-quote/:quoteId`             | USER `projects:read:own` | ✅ `projects.controller.ts`        |
| BE-PROJ-002 | Project Sub-resources | `GET .../{timeline,deliverables,payments,progress,milestones,messages}` | USER                     | ✅ cross-service reads             |
| BE-PROJ-003 | Client Actions        | `POST .../approve`, `request-revision`, `feedback`; `GET .../feedback`  | USER                     | ✅                                 |
| BE-PROJ-004 | Project Messaging     | `POST /api/v1/projects/:id/messages`                                    | USER `messages:create`   | ✅                                 |
| BE-PROJ-005 | Public Showcase       | `GET /api/v1/projects/public`, `public/:id`                             | Public                   | ✅ `projects.public.controller.ts` |
| BE-PROJ-006 | Admin Project CRUD    | `GET/POST/PATCH/DELETE /api/v1/admin/projects/*`                        | ADMIN                    | ✅ `projects.admin.controller.ts`  |
| BE-PROJ-007 | Admin Team            | `POST/DELETE .../team/:memberId`                                        | ADMIN                    | ✅                                 |
| BE-PROJ-008 | Admin Lifecycle       | `POST .../archive`, `unarchive`, `extend`, `duplicate`, `export`        | ADMIN                    | ✅ export-worker                   |
| BE-PROJ-009 | Admin Analytics       | `GET /api/v1/admin/projects/:id/analytics`                              | ADMIN                    | ✅ analytics-worker                |
| BE-PROJ-010 | Admin Milestones      | `POST /api/v1/admin/projects/:id/milestones`                            | ADMIN                    | ✅                                 |
| BE-PROJ-011 | Health                | `GET /api/v1/projects/health`                                           | Public                   | ✅                                 |

**Partial:** Gateway registers `GET/POST /api/v1/projects/templates` — **no templates controller in projects service** (gateway-only stub).

---

## 6. Progress Service

**Service prefix:** `/api/v1` | **Port:** 3009

| ID          | Feature             | Endpoints                                                                                                   | Roles | Status                                 |
| ----------- | ------------------- | ----------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------- |
| BE-PROG-001 | Progress Timeline   | `GET/POST /api/v1/projects/:projectId/progress`, `status`, `milestones`                                     | USER  | ✅ `progress.controller.ts`            |
| BE-PROG-002 | Progress Entry      | `GET .../progress/:entryId`, `POST .../request-changes`                                                     | USER  | ✅                                     |
| BE-PROG-003 | Milestone Approvals | `POST /api/v1/milestones/:id/approve`, `request-revision`                                                   | USER  | ✅ `milestone-approvals.controller.ts` |
| BE-PROG-004 | Deliverable Reviews | `POST /api/v1/deliverables/:id/approve`, `reject`                                                           | USER  | ✅ `deliverable-reviews.controller.ts` |
| BE-PROG-005 | Admin Progress      | `POST/GET/PATCH/DELETE /api/v1/admin/progress/*`                                                            | ADMIN | ✅ `progress.admin.controller.ts`      |
| BE-PROG-006 | Admin Deliverables  | `POST/GET /api/v1/admin/projects/:projectId/deliverables`, `PATCH/DELETE /api/v1/admin/deliverables/:id`    | ADMIN | ✅ `deliverables.admin.controller.ts`  |
| BE-PROG-007 | Admin Milestones    | `POST /api/v1/admin/projects/:projectId/milestones`, `PATCH/DELETE .../milestones/:id`, `POST .../complete` | ADMIN | ✅ `milestones.admin.controller.ts`    |

---

## 7. Payments Service

**Service prefix:** `/api/v1/payments`, `/api/v1/invoices` | **Port:** 3003

| ID         | Feature                  | Endpoints                                                                                                          | Roles           | Status                                    |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------- |
| BE-PAY-001 | Payment Intent           | `POST /api/v1/payments/create-intent`, `initiate`, `confirm`                                                       | USER            | ✅ Razorpay                               |
| BE-PAY-002 | Payment Queries          | `GET /api/v1/payments`, `:id`, `status`, `stats`, `projects/:projectId`                                            | USER            | ✅                                        |
| BE-PAY-003 | Payment Milestones       | `GET /api/v1/payments/projects/:projectId/milestones`                                                              | USER            | ✅                                        |
| BE-PAY-004 | Payment Documents        | `GET .../receipt`, `invoice`, `documents/versions`                                                                 | USER            | ✅ pdf-lib                                |
| BE-PAY-005 | Disputes (user)          | `POST /api/v1/payments/:id/dispute`                                                                                | USER            | ✅                                        |
| BE-PAY-006 | Cancel Payment           | `POST /api/v1/payments/:id/cancel`                                                                                 | USER            | ✅                                        |
| BE-PAY-007 | Payment Methods          | `GET/POST /api/v1/payments/methods`, `DELETE/PATCH .../default`, `nickname`                                        | USER            | ✅ `payment-methods.controller.ts`        |
| BE-PAY-008 | Invoices                 | `GET /api/v1/invoices`, `:id`, `:id/download`                                                                      | USER            | ✅ `invoices.controller.ts`               |
| BE-PAY-009 | Razorpay Webhook         | `POST /api/v1/payments/webhooks/razorpay`                                                                          | Public (signed) | ✅                                        |
| BE-PAY-010 | Admin Payments           | `GET/POST/PATCH /api/v1/admin/payments/*`                                                                          | ADMIN           | ✅ `payments.admin.controller.ts`         |
| BE-PAY-011 | Admin Milestone Payments | `GET /api/v1/admin/milestones/:id/payments`, `mark-complete`, `request-payment`; `POST .../milestones/:id/release` | ADMIN           | ✅                                        |
| BE-PAY-012 | Admin Disputes           | `GET/POST/PATCH /api/v1/admin/payments/disputes/*`, `reconcile`                                                    | ADMIN           | ✅ `payment-disputes.admin.controller.ts` |
| BE-PAY-013 | Admin Revenue            | `GET /api/v1/admin/payments/revenue/report`, `revenue/export`                                                      | ADMIN           | ✅ analytics-worker                       |
| BE-PAY-014 | Health                   | `GET /api/v1/payments/health`                                                                                      | Public          | ✅                                        |

---

## 8. Messaging Service

**Service prefix:** `/api/v1/messages`, `/api/v1/conversations` | **Port:** 3010

| ID         | Feature                | Endpoints                                               | Roles                    | Status                             |
| ---------- | ---------------------- | ------------------------------------------------------- | ------------------------ | ---------------------------------- |
| BE-MSG-001 | Send Messages          | `POST /api/v1/messages`, `POST .../project/:projectId`  | USER `messages:create`   | ✅ `messages.controller.ts`        |
| BE-MSG-002 | Read Messages          | `GET .../project/:projectId`, `GET .../search`          | USER `messages:read:own` | ✅                                 |
| BE-MSG-003 | Message CRUD           | `PATCH/DELETE /api/v1/messages/:id`                     | USER (author)            | ✅                                 |
| BE-MSG-004 | Reactions              | `POST /api/v1/messages/:id/reactions`                   | USER                     | ✅                                 |
| BE-MSG-005 | Read Receipts          | `POST .../:id/read`, `POST .../project/:projectId/read` | USER                     | ✅                                 |
| BE-MSG-006 | Pin/Unpin              | `POST .../:id/pin`, `unpin`                             | USER                     | ✅                                 |
| BE-MSG-007 | Attachments            | `GET .../project/:projectId/attachments`                | USER                     | ✅                                 |
| BE-MSG-008 | Thread Replies         | `GET/POST /api/v1/messages/:messageId/thread`           | USER                     | ✅                                 |
| BE-MSG-009 | Conversations          | `GET /api/v1/conversations`, `unread-count`             | USER                     | ✅ `conversations.controller.ts`   |
| BE-MSG-010 | Chat Threads           | `GET/POST /api/v1/messages/threads/*`                   | USER/ADMIN               | ✅ `chat-threads.controller.ts`    |
| BE-MSG-011 | Message Threads        | `GET/POST /api/v1/messages/:messageId/threads`          | USER                     | ✅ `message-threads.controller.ts` |
| BE-MSG-012 | Admin Messaging        | `GET/DELETE /api/v1/admin/messages/*`, `flag`, `system` | ADMIN                    | ✅ `messages.admin.controller.ts`  |
| BE-MSG-013 | Admin Flagged Messages | `GET .../flagged`, `dismiss`, `escalate`                | ADMIN                    | ✅                                 |
| BE-MSG-014 | Health                 | `GET /api/v1/messages/health`                           | Public                   | ✅                                 |

**WS:** REST send → Redis `MESSAGING_CHAT_REDIS_CHANNEL` → `message:new` emit (`ws-gateway/src/gateways/messaging.gateway.ts`)

---

## 9. Notifications Service

**Service prefix:** `/api/v1/notifications`, `/api/v1/push`, `/api/v1/push-subscription` | **Port:** 3011

| ID           | Feature                | Endpoints                                                                                                     | Roles                         | Status                                                                              |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| BE-NOTIF-001 | In-App Notifications   | `GET /api/v1/notifications`, `unread-count`, `history`                                                        | USER `notifications:read:own` | ✅                                                                                  |
| BE-NOTIF-002 | Notification Actions   | `PATCH .../:id/read`, `unread`; `POST read-all`, `read-selected`; `DELETE clear-read`, `:id`                  | USER                          | ✅                                                                                  |
| BE-NOTIF-003 | Preferences            | `GET/PATCH /api/v1/notifications/preferences`, `channels`, `preferences/channel/:channel`                     | USER                          | ✅                                                                                  |
| BE-NOTIF-004 | Push (FCM-style)       | `POST /api/v1/push/register`, `DELETE .../unregister/:deviceId`                                               | USER                          | ⚠️ Partial — acknowledges without persisting; expects `{token, deviceId, platform}` |
| BE-NOTIF-005 | Web Push Subscriptions | `POST/DELETE /api/v1/push-subscription`                                                                       | USER                          | ⚠️ Partial — **service-only; no gateway route** (`subscriptions.controller.ts`)     |
| BE-NOTIF-011 | Notification Channels  | `GET /notifications/channels`, `GET/PATCH .../preferences/channels`, `PATCH .../preferences/channel/:channel` | USER                          | ⚠️ Partial — **service-only; no gateway routes**                                    |
| BE-NOTIF-006 | Internal Trigger       | `POST /api/v1/internal/notifications/trigger`                                                                 | JWT (internal)                | ✅                                                                                  |
| BE-NOTIF-007 | Test Notification      | `POST /api/v1/notifications/test`                                                                             | USER                          | ✅                                                                                  |
| BE-NOTIF-008 | Admin Notifications    | `GET/POST/DELETE /api/v1/admin/notifications/*`                                                               | ADMIN                         | ✅ send, broadcast, segment                                                         |
| BE-NOTIF-009 | Admin Templates        | `GET/POST/PATCH/DELETE /api/v1/admin/notifications/templates`                                                 | ADMIN                         | ✅                                                                                  |
| BE-NOTIF-010 | Health                 | `GET /api/v1/notifications/health`                                                                            | Public                        | ✅                                                                                  |

**Worker:** `notification-worker` → in-app/email/push + Redis WS publish

---

## 10. Media Service

**Service prefix:** `/api/v1/media`, `/api/v1/share` | **Port:** 3012

| ID           | Feature             | Endpoints                                                                    | Roles       | Status                            |
| ------------ | ------------------- | ---------------------------------------------------------------------------- | ----------- | --------------------------------- |
| BE-MEDIA-001 | Media Library       | `GET /api/v1/media`, `:id`, `status`, `PATCH :id`                            | USER        | ✅ `media.controller.ts`          |
| BE-MEDIA-002 | Upload Flows        | `POST .../upload/{request,confirm,direct}`, chunked init/part/complete/abort | USER        | ✅ `chunked-upload.controller.ts` |
| BE-MEDIA-003 | Download            | `GET .../:id/download`, `download-url`                                       | USER        | ✅                                |
| BE-MEDIA-004 | File Ops            | `POST .../{copy,move,regenerate-thumbnail}`, `GET .../versions`              | USER        | ✅ media-worker                   |
| BE-MEDIA-005 | Sharing             | `GET/POST/DELETE /api/v1/media/:id/share`, `GET /api/v1/media/shared`        | USER        | ✅ `share.controller.ts`          |
| BE-MEDIA-006 | Public Share Access | `GET/POST /api/v1/share/:token`                                              | Public      | ✅ `public-share.controller.ts`   |
| BE-MEDIA-007 | Storage Stats       | `GET /api/v1/media/storage-usage`, `storage/stats`                           | USER        | ✅                                |
| BE-MEDIA-008 | Admin Media         | `GET/POST/PATCH/DELETE /api/v1/admin/media/*`                                | ADMIN       | ✅ quarantine, analytics, cleanup |
| BE-MEDIA-009 | Health/Stats        | `GET /api/v1/media/health`, `GET /api/v1/stats`                              | Public/Auth | ✅                                |

---

## 11. Portfolio Service

**Service prefix:** `/api/v1/portfolio` | **Port:** 3013

| ID          | Feature              | Endpoints                                                    | Roles                      | Status                              |
| ----------- | -------------------- | ------------------------------------------------------------ | -------------------------- | ----------------------------------- |
| BE-PORT-001 | Public Portfolio     | `GET /api/v1/portfolio/*`, `POST .../:id/like`               | Public (read), Auth (like) | ✅ `portfolio.public.controller.ts` |
| BE-PORT-002 | Admin Portfolio CRUD | `GET/POST/PATCH/DELETE /api/v1/admin/portfolio/*`            | ADMIN                      | ✅ publish, feature, archive        |
| BE-PORT-003 | Admin Media on Items | `POST/DELETE/PATCH .../:id/media/*`                          | ADMIN                      | ✅                                  |
| BE-PORT-004 | Admin Bulk/Reorder   | `POST .../reorder`, `bulk-update`                            | ADMIN                      | ✅                                  |
| BE-PORT-005 | Admin Analytics      | `GET /api/v1/admin/portfolio/analytics`                      | ADMIN                      | ✅ analytics-worker                 |
| BE-PORT-006 | Admin Categories     | `GET/POST/PATCH/DELETE /api/v1/admin/portfolio/categories/*` | ADMIN                      | ✅                                  |
| BE-PORT-007 | Health               | `GET /api/v1/portfolio/health`                               | Public                     | ✅                                  |

---

## 12. Blog Service

**Service prefix:** `/api/v1/posts` (gateway: `/api/v1/blog/*`) | **Port:** 3014

| ID          | Feature           | Endpoints                                                                         | Roles     | Status                                                 |
| ----------- | ----------------- | --------------------------------------------------------------------------------- | --------- | ------------------------------------------------------ |
| BE-BLOG-001 | Public Posts      | `GET /api/v1/blog/posts`, `search`, `:slug`, `related`, `POST .../view`           | Public    | ✅ `posts.public.controller.ts`                        |
| BE-BLOG-002 | Public Taxonomy   | `GET /api/v1/blog/categories/*`, `tags/*`, `authors/*`                            | Public    | ✅ `taxonomy.public.controller.ts`                     |
| BE-BLOG-003 | RSS Feed          | `GET /api/v1/blog/feed/rss`                                                       | Public    | ✅ `feed.public.controller.ts`                         |
| BE-BLOG-011 | Atom Feed         | `GET /api/v1/feed/atom` (service path)                                            | Public    | ⚠️ Partial — **service-only; not proxied via gateway** |
| BE-BLOG-004 | Comments (user)   | `POST/PUT/PATCH/DELETE /api/v1/blog/posts/:slug/comments/*`                       | Auth USER | ✅ `comments.controller.ts`                            |
| BE-BLOG-005 | Post Interactions | `POST/DELETE .../{like,bookmark}`, `GET engagement`, `GET /api/v1/blog/bookmarks` | Auth USER | ✅                                                     |
| BE-BLOG-006 | Admin Posts CMS   | `GET/POST/PATCH/DELETE /api/v1/admin/posts/*`                                     | ADMIN     | ✅ publish, schedule, revisions                        |
| BE-BLOG-007 | Admin Comments    | moderate pending, reported, approve, reject, spam                                 | ADMIN     | ✅ `comments.admin.controller.ts`                      |
| BE-BLOG-008 | Admin Taxonomy    | categories, tags (merge), authors                                                 | ADMIN     | ✅ `taxonomy.admin.controller.ts`                      |
| BE-BLOG-009 | Admin Analytics   | `GET /api/v1/admin/blog/analytics`                                                | ADMIN     | ⚠️ Partial — `avgTimeOnPage` placeholder               |
| BE-BLOG-010 | Health            | `GET /api/v1/blog/posts/health`                                                   | Public    | ✅                                                     |

---

## 13. Contact Service

**Service prefix:** `/api/v1/contact` | **Port:** 3015

| ID             | Feature           | Endpoints                                       | Roles                   | Status                            |
| -------------- | ----------------- | ----------------------------------------------- | ----------------------- | --------------------------------- |
| BE-CONTACT-001 | Public Submission | `POST /api/v1/contact`                          | Public `contact:create` | ✅ `contact.public.controller.ts` |
| BE-CONTACT-002 | Admin Inbox       | `GET/PATCH/POST/DELETE /api/v1/admin/contact/*` | ADMIN                   | ✅ `contact.admin.controller.ts`  |
| BE-CONTACT-003 | Health            | `GET /api/v1/contact/health`                    | Public                  | ✅                                |

**Partial:** Gateway contact controller uses `/api/v1/contact/inquiries/*` for admin ops — service admin uses `/api/v1/admin/contact/*`. Use `/api/v1/admin/contact/*` (mega-admin proxy) for reliable admin inbox access.

---

## 14. Admin Service

**Service prefix:** `/api` (gateway rewrites `/api/v1/admin/*` → `/api/*`) | **Port:** 3005

| ID           | Feature               | Gateway Surface                                     | Status                                                                                        |
| ------------ | --------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| BE-ADMIN-001 | Dashboard             | `GET /api/v1/admin/dashboard/*`                     | ✅ `dashboard.admin.controller.ts`                                                            |
| BE-ADMIN-002 | System Config         | config, feature flags, maintenance                  | ✅ `system.admin.controller.ts`                                                               |
| BE-ADMIN-003 | Cache Management      | `POST /api/system/cache/clear`, `/cache/clear/:key` | ⚠️ Partial — **service-only** (`system.admin.controller.ts`); not in gateway admin controller |
| BE-ADMIN-004 | Background Jobs       | list, retry, delete                                 | ✅                                                                                            |
| BE-ADMIN-005 | System Logs           | view, download                                      | ⚠️ Partial — `GET /api/system/logs/download` is **service-only**                              |
| BE-ADMIN-006 | Announcements         | `POST /api/system/announcements`                    | ⚠️ Partial — **service-only**; not exposed via gateway                                        |
| BE-ADMIN-013 | Maintenance Mode      | `POST /api/system/maintenance`                      | ⚠️ Partial — **service-only**                                                                 |
| BE-ADMIN-014 | Admin Audit API       | `GET/POST /api/audit/*` (export)                    | ⚠️ Partial — full audit API in service; gateway uses users-service `/admin/logs` proxy        |
| BE-ADMIN-007 | Email Templates       | list, update, preview, test                         | ✅ `email-templates.admin.controller.ts`                                                      |
| BE-ADMIN-008 | Audit Trail           | list, stats, export                                 | ✅ `audit.admin.controller.ts`                                                                |
| BE-ADMIN-009 | Impersonation         | start, end, list sessions                           | ✅ `impersonation.admin.controller.ts`                                                        |
| BE-ADMIN-010 | Outgoing Webhooks     | CRUD, test, deliveries                              | ✅ `webhooks.admin.controller.ts`                                                             |
| BE-ADMIN-011 | Document Verification | `GET /api/v1/documents/verify/:documentNumber`      | ✅ `documents.admin.controller.ts`                                                            |
| BE-ADMIN-012 | Health                | `GET /api/v1/admin/health`                          | ✅                                                                                            |

---

## 15. Webhooks Service

**Service prefix:** `/api/v1/webhooks` | **Port:** 3004

| ID        | Feature            | Endpoints                          | Status                                                                                       |
| --------- | ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| BE-WH-001 | Inbound Razorpay   | `POST /api/v1/webhooks/razorpay`   | ✅                                                                                           |
| BE-WH-002 | Inbound Cloudflare | `POST /api/v1/webhooks/cloudflare` | ✅                                                                                           |
| BE-WH-003 | Inbound GitHub     | `POST /api/v1/webhooks/github`     | ✅                                                                                           |
| BE-WH-004 | Inbound Stripe     | `POST /api/v1/webhooks/stripe`     | ⚠️ Partial — endpoint exists; ingestion returns **"provider not supported"** (scaffold only) |
| BE-WH-005 | Inbound Generic    | `POST /api/v1/webhooks/:provider`  | ✅                                                                                           |
| BE-WH-006 | Health             | `GET /api/v1/webhooks/health`      | ✅                                                                                           |

**Stub:** Gateway `/api/v1/webhooks` management routes — use admin service (`/api/v1/admin/webhooks/*`) instead.

---

## 16. Health Service

**Service prefix:** `/api/v1/health` | **Port:** 3016

| ID            | Feature                  | Endpoints                                                                    | Status   |
| ------------- | ------------------------ | ---------------------------------------------------------------------------- | -------- |
| BE-HEALTH-001 | Basic Health             | `GET /api/v1/health`                                                         | ✅       |
| BE-HEALTH-002 | K8s Probes               | `GET .../detailed`, `ready`, `live`                                          | ✅       |
| BE-HEALTH-003 | Dependency Checks        | database, cache, queue, storage, microservices, external, workers, websocket | ✅       |
| BE-HEALTH-004 | System/Features/Registry | `GET .../system`, `features`, `registry`                                     | ✅       |
| BE-HEALTH-005 | Admin Debug              | `GET /api/v1/health/debug`                                                   | ✅ ADMIN |

---

## Workers

| Worker                  | Triggers                   | Processors                                  | Status           |
| ----------------------- | -------------------------- | ------------------------------------------- | ---------------- |
| **outbox-poller**       | Outbox `PENDING` rows      | `OutboxPollerService` → RabbitMQ            | ✅ `libs/outbox` |
| **notification-worker** | `notification.queue`       | In-app, email, push; Redis WS publish       | ✅               |
| **email-worker**        | `email.queue`              | Template dispatch                           | ✅               |
| **webhook-worker**      | Incoming + outgoing queues | Razorpay, GitHub, HTTP delivery             | ✅               |
| **media-worker**        | `media.queue` + crons      | Virus scan, thumbnail, metadata             | ✅               |
| **document-worker**     | `document.queue`           | PDF generation (quotes, invoices, receipts) | ✅               |
| **export-worker**       | `export.queue`             | User data, project, revenue exports         | ✅               |
| **analytics-worker**    | `analytics.queue` + crons  | Aggregations, reports                       | ✅               |
| **audit-worker**        | `audit.queue`              | Batch audit log insert                      | ✅               |
| **cdn-worker**          | CDN invalidation jobs      | Cloudflare path invalidation                | ✅               |

**In-service consumers (not workers):**

| Consumer          | Location                                                        | Triggers                                                                        |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| project-lifecycle | `services/projects/src/consumers/project-lifecycle.consumer.ts` | `quote.quote.accepted`, `payment.payment.completed`, project duplication events |

**Outbox event catalog:** 70+ event types in `libs/outbox/src/outbox-routing.ts`

---

## WebSocket Gateway

**Port:** 3100 (`ws-gateway/`)

| Namespace        | Client Events (in)                                            | Server Events (out)                           | Auth                | Status                       |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------- | ------------------- | ---------------------------- |
| `/messages`      | `join:room`, `typing:start/stop`, `message:send` (deprecated) | `message:new`, `typing:indicator`, `joined`   | `WsAuthGuard`       | ✅ `messaging.gateway.ts`    |
| `/notifications` | auto-join on connect                                          | `notification:new`, `presence:online/offline` | `WsAuthGuard`       | ✅ `notification.gateway.ts` |
| `/projects`      | `subscribe:project`, `progress:update`                        | `progress:updated`, `subscribed`              | `WsAuthGuard` + ACL | ✅ `project.gateway.ts`      |

**Redis fan-out:** `ws-gateway/src/services/redis-subscriber.service.ts`

**Note:** `message:send` WS handler is deprecated — clients must use `POST /api/v1/messages`.

---

## Shared Libraries

| Library                   | Purpose                  | Key Exports                                              |
| ------------------------- | ------------------------ | -------------------------------------------------------- |
| `auth-lib`                | JWT, guards, permissions | `JwtAuthGuard`, `RolesGuard`, `DEFAULT_ROLE_PERMISSIONS` |
| `common`                  | API constants, DTOs      | `API_PREFIX`, `API_VERSION`                              |
| `database`                | Prisma read/write        | `PrismaReadService`, `PrismaWriteService`                |
| `outbox`                  | Transactional outbox     | `resolveOutboxRouting`, `OutboxRepository`               |
| `queue`                   | RabbitMQ                 | `QueuePublisherService`, `QueueConsumerService`          |
| `storage`                 | S3/local                 | `StorageService`                                         |
| `pdf` / `documents`       | Document generation      | invoice, quote, receipt templates                        |
| `email` / `notifications` | Async dispatch           | job mapping, preference utils                            |
| `websocket`               | WS guards/adapters       | `WsAuthGuard`, Redis adapter                             |
| `turnstile`               | CAPTCHA                  | `TurnstileGuard`                                         |
| `search`                  | Full-text search         | Blog/portfolio search helpers                            |
| `cache`                   | Redis caching            | Query result caching                                     |
| `idempotency`             | Duplicate prevention     | `IdempotencyGuard` (auth service)                        |
| `tracing`                 | Request correlation      | `CorrelationIdMiddleware`                                |
| `circuit-breaker`         | Gateway resilience       | Downstream failure isolation                             |

**Default USER permissions** (`libs/auth-lib/src/permissions/default-permissions.config.ts`): `users:read:own`, `requests:create`, `projects:read:own`, `messages:create`, `notifications:read:own`, `media:create`, `portfolio:read`, `blog:read`, `contact:create`

---

## Prisma Data Model

**Location:** `prisma/schema/*.prisma` (20 files)

| Domain         | Models                                                                           |
| -------------- | -------------------------------------------------------------------------------- |
| Auth/Users     | User, AuthConfig, UserPreference, Session, **AuthSession**, VerificationToken    |
| Requests       | ProjectRequest, RequestAttachment, RequestStatusHistory, AdminNote               |
| Quotes         | Quote                                                                            |
| Projects       | Project                                                                          |
| Progress       | Milestone, Deliverable, ProgressEntry                                            |
| Payments       | Payment, Refund, SavedPaymentMethod, Dispute                                     |
| Documents      | DocumentSequence, GeneratedDocument                                              |
| Messaging      | Message, ChatThread, ChatThreadMember                                            |
| Notifications  | Notification, NotificationTemplate, NotificationPreference, UserPushSubscription |
| Media          | Media, MediaShareLink                                                            |
| Portfolio      | PortfolioItem, PortfolioImage, PortfolioCategory                                 |
| Blog           | BlogPost, BlogCategory, BlogTag, BlogComment, PostLike, PostBookmark             |
| Contact        | ContactMessage, ContactResponseLog                                               |
| Admin          | SystemConfig, FeatureFlag, EmailTemplate, ImpersonationSession, **ReportExport** |
| Webhooks       | Webhook, WebhookDelivery, WebhookLog                                             |
| Infrastructure | Outbox, IdempotencyKey, AuditLog                                                 |

---

## Gateway Route Registration

**Module imports** (`gateway/src/app.module.ts`): Auth, Users, Requests, Quotes, Projects, Progress, Payments, Messages, Notifications, Media, Portfolio, Blog, Contact, Admin, Documents, Invoices, Health, Webhooks, SwaggerDocs (includes `docs-specs`)

**Proxy path rewriting** (`gateway/src/proxy/http-proxy.service.ts`):

| Service   | Gateway → Downstream                                                          |
| --------- | ----------------------------------------------------------------------------- |
| admin     | `/api/v1/admin/*` → `/api/*`                                                  |
| blog      | `/api/v1/blog/*` → `/api/v1/{posts,categories,tags,authors,feed,bookmarks}/*` |
| messaging | `/api/v1/messages/conversations` → `/api/v1/conversations`                    |
| default   | `/api/v1/{service}/*` → same path                                             |

---

## Gateway Gaps & Path Mismatches

Gateway contract vs downstream services. **Remediation 2026-06-10** closed GW-001–007, GW-009–012, GW-014; GW-015 documented.

| ID     | Issue                      | Gateway                                       | Service / Correct Path                   | Status                                   |
| ------ | -------------------------- | --------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| GW-001 | Web Push subscriptions     | `POST/DELETE /push-subscription`              | notifications service                    | ✅ Fixed                                 |
| GW-002 | Notification channel prefs | `/notifications/channels`, preferences routes | notifications service                    | ✅ Fixed                                 |
| GW-003 | Blog Atom feed             | `GET /blog/feed/atom`                         | blog `/feed/atom`                        | ✅ Fixed                                 |
| GW-004 | Admin cache clear          | `POST /admin/system/cache/clear`              | admin service                            | ✅ Fixed                                 |
| GW-005 | Admin announcements        | `POST /admin/system/announcements`            | admin service                            | ✅ Proxied — UI open                     |
| GW-006 | Admin maintenance          | `POST /admin/system/maintenance`              | admin service                            | ✅ Proxied — UI open                     |
| GW-007 | Admin log download         | `GET /admin/system/logs/download`             | admin service                            | ✅ Fixed                                 |
| GW-008 | Admin audit export         | partial                                       | `GET/POST /api/audit/*` vs `/admin/logs` | ✅ Fixed — full `/admin/audit/*` proxied |
| GW-009 | 2FA setup aliases          | `POST /users/2fa/setup` → `/2fa/enable`       | users service                            | ✅ Aliased                               |
| GW-010 | Project templates stub     | _(removed)_                                   | no service controller                    | ✅ Removed from gateway                  |
| GW-011 | Contact admin path         | `/contact/inquiries/*` → `/admin/contact/*`   | contact service                          | ✅ Fixed (pathOverride)                  |
| GW-012 | Webhook management orphan  | inbound only at `/webhooks`                   | Use `/admin/webhooks/*`                  | ✅ CRUD removed                          |
| GW-013 | Cloudflare inbound webhook | `POST /webhooks/cloudflare`                   | `POST /webhooks/cloudflare`              | ✅ Fixed                                 |
| GW-014 | Stripe inbound webhook     | returns **501** with message                  | Razorpay active                          | ✅ Documented disabled                   |
| GW-015 | Messaging reactions path   | `POST /messages/:id/react`                    | service also has `/reactions`            | ✅ Gateway canonical                     |

**Additional admin proxy routes added (2026-06-10):** `POST/DELETE /admin/projects/:id/team`, `GET /admin/projects/:id/analytics`, `POST /admin/portfolio/reorder`, `GET/POST/PATCH/DELETE /admin/portfolio/categories`, `GET /admin/portfolio/analytics[/:id]`, `GET /admin/progress/projects/:id/analytics`, `GET /health/debug`.

**Additional admin proxy routes added (2026-06-15):** Full `/admin/audit/*` read API, messaging browse (`GET /admin/messages`, `/stats`, `/analytics`, `/conversations`, `/project/:id`), `DELETE/POST /admin/messages/:id`, payments manual/reconcile/revenue-report/settings, blog categories/import/schedule, portfolio bulk-update/media ops, `DELETE /admin/projects/:id`, `POST /webhooks/cloudflare`.

---

## API Documentation

**Gateway prefix:** `/api/v1/docs-specs` | **Evidence:** `gateway/src/swagger/docs-specs.controller.ts`

| ID          | Feature             | Endpoints                                                       | Roles            | Status                        |
| ----------- | ------------------- | --------------------------------------------------------------- | ---------------- | ----------------------------- |
| BE-DOCS-001 | OpenAPI Aggregation | `GET /docs-specs`, `/docs-specs/all`, `/docs-specs/:serviceKey` | Public (no auth) | ✅ Merged + per-service specs |

Swagger UI: `/docs/` (gateway). Per-service specs proxied from each microservice `/docs-json`.

---

## Controller File Index

### Service Controllers

| Service       | Controller                                                                 | Prefix                         |
| ------------- | -------------------------------------------------------------------------- | ------------------------------ |
| auth          | `services/auth/src/controllers/auth.public.controller.ts`                  | `/api/v1/auth/`                |
| users         | `services/users/src/controllers/users.controller.ts`                       | `users`                        |
| users         | `services/users/src/controllers/users.admin.controller.ts`                 | `admin/users`                  |
| requests      | `services/requests/src/controllers/requests.controller.ts`                 | `requests`                     |
| quotes        | `services/quotes/src/controllers/quotes.controller.ts`                     | `quotes`                       |
| projects      | `services/projects/src/controllers/projects.controller.ts`                 | `projects`                     |
| progress      | `services/progress/src/controllers/user/progress.controller.ts`            | `projects/:projectId/progress` |
| payments      | `services/payments/src/controllers/user/payments.controller.ts`            | `payments`                     |
| messaging     | `services/messaging/src/controllers/user/messages.controller.ts`           | `messages`                     |
| notifications | `services/notifications/src/notifications/notifications.controller.ts`     | `notifications`                |
| media         | `services/media/src/media/media.controller.ts`                             | `media`                        |
| portfolio     | `services/portfolio/src/controllers/public/portfolio.public.controller.ts` | `portfolio`                    |
| blog          | `services/blog/src/controllers/public/posts.public.controller.ts`          | `posts`                        |
| contact       | `services/contact/src/controllers/public/contact.public.controller.ts`     | `contact`                      |
| admin         | `services/admin/src/controllers/admin/dashboard.admin.controller.ts`       | `dashboard`                    |
| webhooks      | `services/webhooks/src/controllers/webhook/webhook-receiver.controller.ts` | `()`                           |
| health        | `services/health/src/controllers/public/health.public.controller.ts`       | `()`                           |

### Gateway Controllers

| File                                                                        | Prefix              | Proxies To              |
| --------------------------------------------------------------------------- | ------------------- | ----------------------- |
| `gateway/src/modules/auth/auth.controller.ts`                               | `auth`              | auth                    |
| `gateway/src/modules/users/users.controller.ts`                             | `users`             | users                   |
| `gateway/src/modules/requests/requests.controller.ts`                       | `requests`          | requests                |
| `gateway/src/modules/quotes/quotes.controller.ts`                           | `quotes`            | quotes                  |
| `gateway/src/modules/projects/projects.controller.ts`                       | `projects`          | projects                |
| `gateway/src/modules/payments/payments.controller.ts`                       | `payments`          | payments                |
| `gateway/src/modules/messages/messages.controller.ts`                       | `messages`          | messaging               |
| `gateway/src/modules/notifications/notifications.controller.ts`             | `notifications`     | notifications           |
| `gateway/src/modules/media/media.controller.ts`                             | `media`             | media                   |
| `gateway/src/modules/blog/blog.controller.ts`                               | `blog`              | blog (path rewrite)     |
| `gateway/src/modules/admin/admin.controller.ts`                             | `admin`             | admin + cross-service   |
| `gateway/src/modules/notifications/push-subscription-gateway.controller.ts` | `push-subscription` | notifications           |
| `gateway/src/modules/health/health.controller.ts`                           | `health`            | health                  |
| `gateway/src/modules/webhooks/webhooks.controller.ts`                       | `webhooks`          | webhooks (inbound only) |
| `gateway/src/modules/contact/contact.controller.ts`                         | `contact`           | contact                 |

### WebSocket Gateways

| File                                              | Namespace        |
| ------------------------------------------------- | ---------------- |
| `ws-gateway/src/gateways/messaging.gateway.ts`    | `/messages`      |
| `ws-gateway/src/gateways/notification.gateway.ts` | `/notifications` |
| `ws-gateway/src/gateways/project.gateway.ts`      | `/projects`      |

---

## Implementation Status Summary

| Status          | Count          | Examples                                                                                                                                |
| --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | ~92% (133/144) | Core CRUD, payments (Razorpay), messaging, blog CMS, admin dashboard, web push gateway                                                  |
| **Partial**     | 8              | FCM native push stub; blog `avgTimeOnPage` placeholder; GW-008 audit export; Cloudflare inbound; announcements/maintenance UI not built |
| **Stub/Orphan** | 1              | Deprecated WS `message:send` (use REST `POST /messages`)                                                                                |

**Total feature IDs:** 144

**Gateway remediation (2026-06-10):** 12 of 15 GW items resolved. Web push, notification channels, Atom feed, admin system ops, contact inquiries, portfolio/project admin routes, health debug — all proxied. Stripe returns 501; project templates route removed; webhook CRUD removed from public `/webhooks`.

**Third-party integrations:** Razorpay (active payments), ZeptoMail/SMTP (email), Cloudflare Turnstile + CDN, ClamAV (media scan), Web Push VAPID (worker), RabbitMQ, Redis, S3/local storage. Stripe webhook explicitly disabled at gateway (501).

---

_End of FEATURE-INVENTORY.md_
