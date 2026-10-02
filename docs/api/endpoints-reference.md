<div align="center">

# API Endpoints Reference

</div>

---

## 📖 Table of Contents

- [📦 Overview](#overview)
- [Health](#health)
- [Auth](#auth)
- [Users](#users)
- [Requests](#requests)
- [Quotes](#quotes)
- [Projects](#projects)
- [Progress](#progress)
- [Payments](#payments)
- [Messaging](#messaging)
- [Notifications](#notifications)
- [Media](#media)
- [Portfolio (Public Read)](#portfolio-public-read)
- [Blog (Public Read)](#blog-public-read)
- [Contact](#contact)
- [Admin](#admin)
- [Webhooks](#webhooks)

---

## 📦 Overview

Base URL: `/api/v1`

Auth: Bearer JWT unless marked **Public**.

> All responses wrapped in `{ status, data, metadata }` envelope.

---

## Health

| Method | Endpoint        | Auth   | Description                |
| :----- | :-------------- | :----- | :------------------------- |
| GET    | `/health`       | Public | System health check        |
| GET    | `/health/ready` | Public | Kubernetes readiness probe |
| GET    | `/health/live`  | Public | Kubernetes liveness probe  |

---

## Auth

| Method | Endpoint                    | Auth          | Description                  |
| :----- | :-------------------------- | :------------ | :--------------------------- |
| POST   | `/auth/register`            | Public        | Register new user            |
| POST   | `/auth/login`               | Public        | Login with credentials       |
| POST   | `/auth/refresh`             | Refresh Token | Refresh JWT tokens           |
| POST   | `/auth/logout`              | Bearer        | Revoke current session       |
| POST   | `/auth/logout-all`          | Bearer        | Revoke all sessions          |
| POST   | `/auth/forgot-password`     | Public        | Request password reset email |
| POST   | `/auth/reset-password`      | Public        | Reset password with token    |
| POST   | `/auth/verify-email`        | Public        | Verify email with token      |
| POST   | `/auth/resend-verification` | Bearer        | Resend verification email    |
| POST   | `/auth/2fa/enable`          | Bearer        | Enable two-factor auth       |
| POST   | `/auth/2fa/verify`          | Bearer        | Verify 2FA code              |
| POST   | `/auth/2fa/disable`         | Bearer        | Disable two-factor auth      |

---

## Users

| Method | Endpoint                 | Auth   | Description                  |
| :----- | :----------------------- | :----- | :--------------------------- |
| GET    | `/users/me`              | Bearer | Get current user profile     |
| PATCH  | `/users/me`              | Bearer | Update profile               |
| DELETE | `/users/me`              | Bearer | Delete account (soft-delete) |
| PUT    | `/users/me/avatar`       | Bearer | Upload avatar                |
| GET    | `/users/me/sessions`     | Bearer | List active sessions         |
| DELETE | `/users/me/sessions/:id` | Bearer | Revoke session               |
| GET    | `/users/me/activity`     | Bearer | Get activity log             |
| GET    | `/users/me/preferences`  | Bearer | Get preferences              |
| PATCH  | `/users/me/preferences`  | Bearer | Update preferences           |

---

## Requests

| Method | Endpoint                | Auth   | Description            |
| :----- | :---------------------- | :----- | :--------------------- |
| POST   | `/requests`             | Bearer | Submit service request |
| GET    | `/requests`             | Bearer | List user's requests   |
| GET    | `/requests/:id`         | Bearer | Get request details    |
| PATCH  | `/requests/:id`         | Bearer | Update request         |
| DELETE | `/requests/:id`         | Bearer | Cancel request         |
| PATCH  | `/requests/:id/status`  | Admin  | Update request status  |
| POST   | `/requests/:id/notes`   | Admin  | Add admin note         |
| GET    | `/requests/:id/history` | Bearer | Get status history     |

---

## Quotes

| Method | Endpoint              | Auth   | Description                    |
| :----- | :-------------------- | :----- | :----------------------------- |
| POST   | `/quotes`             | Admin  | Create quote for request       |
| GET    | `/quotes/:id`         | Bearer | Get quote details              |
| PATCH  | `/quotes/:id`         | Admin  | Update quote                   |
| POST   | `/quotes/:id/accept`  | Bearer | Accept quote (Idempotency-Key) |
| POST   | `/quotes/:id/decline` | Bearer | Decline quote                  |
| POST   | `/quotes/:id/revise`  | Admin  | Create revised version         |

---

## Projects

| Method | Endpoint                 | Auth   | Description           |
| :----- | :----------------------- | :----- | :-------------------- |
| GET    | `/projects`              | Bearer | List user's projects  |
| GET    | `/projects/:id`          | Bearer | Get project details   |
| PATCH  | `/projects/:id`          | Admin  | Update project        |
| PATCH  | `/projects/:id/status`   | Admin  | Update project status |
| GET    | `/projects/:id/timeline` | Bearer | Get project timeline  |
| POST   | `/projects/:id/feedback` | Bearer | Submit feedback       |

---

## Progress

| Method | Endpoint                                       | Auth   | Description               |
| :----- | :--------------------------------------------- | :----- | :------------------------ |
| GET    | `/progress/:projectId`                         | Bearer | Get project progress      |
| POST   | `/progress/:projectId/entries`                 | Admin  | Post progress entry       |
| GET    | `/progress/:projectId/milestones`              | Bearer | List milestones           |
| PATCH  | `/progress/:projectId/milestones/:id`          | Admin  | Update milestone          |
| POST   | `/progress/:projectId/milestones/:id/approve`  | Bearer | Approve milestone         |
| POST   | `/progress/:projectId/deliverables`            | Admin  | Upload deliverable        |
| GET    | `/progress/:projectId/deliverables/:id`        | Bearer | Get deliverable           |
| PATCH  | `/progress/:projectId/deliverables/:id/status` | Bearer | Accept/reject deliverable |

---

## Payments

| Method | Endpoint                      | Auth    | Description                             |
| :----- | :---------------------------- | :------ | :-------------------------------------- |
| POST   | `/payments/intents`           | Bearer  | Create payment intent (Idempotency-Key) |
| POST   | `/payments/confirm`           | Bearer  | Confirm payment                         |
| GET    | `/payments`                   | Bearer  | List payments                           |
| GET    | `/payments/:id`               | Bearer  | Get payment details                     |
| POST   | `/payments/:id/refund`        | Admin   | Initiate refund                         |
| POST   | `/payments/webhooks/razorpay` | Webhook | Razorpay webhook handler                |

---

## Messaging

| Method | Endpoint                                | Auth   | Description        |
| :----- | :-------------------------------------- | :----- | :----------------- |
| GET    | `/messaging/conversations`              | Bearer | List conversations |
| GET    | `/messaging/conversations/:id`          | Bearer | Get conversation   |
| GET    | `/messaging/conversations/:id/messages` | Bearer | Get messages       |
| POST   | `/messaging/conversations/:id/messages` | Bearer | Send message       |
| PATCH  | `/messaging/messages/:id`               | Bearer | Edit message       |
| DELETE | `/messaging/messages/:id`               | Bearer | Delete message     |
| POST   | `/messaging/messages/:id/reactions`     | Bearer | Add reaction       |

---

## Notifications

| Method | Endpoint                        | Auth   | Description                  |
| :----- | :------------------------------ | :----- | :--------------------------- |
| GET    | `/notifications`                | Bearer | List notifications           |
| PATCH  | `/notifications/:id/read`       | Bearer | Mark as read                 |
| POST   | `/notifications/read-all`       | Bearer | Mark all as read             |
| GET    | `/notifications/unread-count`   | Bearer | Get unread count             |
| POST   | `/notifications/push/subscribe` | Bearer | Register push subscription   |
| GET    | `/notifications/preferences`    | Bearer | Get notification preferences |
| PATCH  | `/notifications/preferences`    | Bearer | Update preferences           |

---

## Media

| Method | Endpoint                             | Auth   | Description             |
| :----- | :----------------------------------- | :----- | :---------------------- |
| POST   | `/media/upload`                      | Bearer | Upload file             |
| POST   | `/media/upload/chunked/init`         | Bearer | Init chunked upload     |
| PUT    | `/media/upload/chunked/:id`          | Bearer | Upload chunk            |
| POST   | `/media/upload/chunked/:id/complete` | Bearer | Complete chunked upload |
| GET    | `/media/:id`                         | Bearer | Get media metadata      |
| DELETE | `/media/:id`                         | Bearer | Delete media            |
| POST   | `/media/:id/share`                   | Bearer | Create share link       |

---

## Portfolio (Public Read)

| Method | Endpoint           | Auth   | Description           |
| :----- | :----------------- | :----- | :-------------------- |
| GET    | `/portfolio`       | Public | List published items  |
| GET    | `/portfolio/:slug` | Public | Get item by slug      |
| POST   | `/portfolio`       | Admin  | Create portfolio item |
| PATCH  | `/portfolio/:id`   | Admin  | Update item           |
| DELETE | `/portfolio/:id`   | Admin  | Delete item           |

---

## Blog (Public Read)

| Method | Endpoint                   | Auth   | Description          |
| :----- | :------------------------- | :----- | :------------------- |
| GET    | `/blog/posts`              | Public | List published posts |
| GET    | `/blog/posts/:slug`        | Public | Get post by slug     |
| POST   | `/blog/posts`              | Admin  | Create post          |
| PATCH  | `/blog/posts/:id`          | Admin  | Update post          |
| DELETE | `/blog/posts/:id`          | Admin  | Delete post          |
| GET    | `/blog/categories`         | Public | List categories      |
| POST   | `/blog/posts/:id/comments` | Bearer | Add comment          |
| POST   | `/blog/posts/:id/bookmark` | Bearer | Bookmark post        |

---

## Contact

| Method | Endpoint              | Auth   | Description         |
| :----- | :-------------------- | :----- | :------------------ |
| POST   | `/contact`            | Public | Submit contact form |
| GET    | `/contact`            | Admin  | List submissions    |
| GET    | `/contact/:id`        | Admin  | Get submission      |
| PATCH  | `/contact/:id/status` | Admin  | Update status       |

---

## Admin

| Method | Endpoint                  | Auth  | Description           |
| :----- | :------------------------ | :---- | :-------------------- |
| GET    | `/admin/users`            | Admin | List all users        |
| PATCH  | `/admin/users/:id/status` | Admin | Suspend/activate user |
| GET    | `/admin/system/config`    | Admin | Get system configs    |
| POST   | `/admin/system/config`    | Admin | Set system config     |
| GET    | `/admin/feature-flags`    | Admin | List feature flags    |
| POST   | `/admin/feature-flags`    | Admin | Create/update flag    |
| GET    | `/admin/audit-logs`       | Admin | List audit logs       |
| GET    | `/admin/dashboard`        | Admin | Dashboard statistics  |

---

## Webhooks

| Method | Endpoint                   | Auth  | Description          |
| :----- | :------------------------- | :---- | :------------------- |
| GET    | `/webhooks`                | Admin | List webhook configs |
| POST   | `/webhooks`                | Admin | Create webhook       |
| PATCH  | `/webhooks/:id`            | Admin | Update webhook       |
| DELETE | `/webhooks/:id`            | Admin | Delete webhook       |
| GET    | `/webhooks/:id/deliveries` | Admin | List deliveries      |
| POST   | `/webhooks/:id/test`       | Admin | Send test webhook    |
