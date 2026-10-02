<div align="center">

# Event Catalog

</div>

---

## 📖 Table of Contents

- [📦 Overview](#overview)
- [Exchange](#exchange)
- [Events by Service](#events-by-service)
- [Standard Event Envelope](#standard-event-envelope)

---

## 📦 Overview

All domain events are published to RabbitMQ via the **transactional outbox pattern** (ADR-004). Events are written to the `OutboxEvent` table within the same database transaction as the business operation, then polled and published by the outbox-poller worker.

---

## Exchange

All events are published to `nestlancer.events` (topic exchange).
Routing key format: `<service>.<entity>.<action>`

---

## Events by Service

### Auth Events

| Event                    | Routing Key                     | Payload                                             |
| :----------------------- | :------------------------------ | :-------------------------------------------------- |
| User Registered          | `auth.user.registered`          | `{ userId, email, firstName, lastName }`            |
| Login Success            | `auth.login.success`            | `{ userId, email, ipAddress, userAgent }`           |
| Login Failed             | `auth.login.failed`             | `{ email, ipAddress, failureReason, attemptCount }` |
| Password Changed         | `auth.password.changed`         | `{ userId }`                                        |
| Password Reset Requested | `auth.password.reset_requested` | `{ userId, email, token }`                          |
| Email Verified           | `auth.email.verified`           | `{ userId, email }`                                 |
| 2FA Enabled              | `auth.2fa.enabled`              | `{ userId }`                                        |
| 2FA Disabled             | `auth.2fa.disabled`             | `{ userId }`                                        |
| Account Locked           | `auth.account.locked`           | `{ userId, email, reason }`                         |

### User Events

| Event               | Routing Key                | Payload                           |
| :------------------ | :------------------------- | :-------------------------------- |
| Profile Updated     | `user.profile.updated`     | `{ userId, changes }`             |
| Avatar Updated      | `user.avatar.updated`      | `{ userId, avatarUrl }`           |
| Preferences Updated | `user.preferences.updated` | `{ userId, preferences }`         |
| Account Suspended   | `user.account.suspended`   | `{ userId, reason, suspendedBy }` |
| Account Deleted     | `user.account.deleted`     | `{ userId, deletedAt }`           |

### Request Events

| Event                  | Routing Key                 | Payload                                          |
| :--------------------- | :-------------------------- | :----------------------------------------------- |
| Request Submitted      | `request.request.submitted` | `{ requestId, userId, title, category }`         |
| Request Status Changed | `request.status.changed`    | `{ requestId, fromStatus, toStatus, changedBy }` |

### Quote Events

| Event          | Routing Key            | Payload                                           |
| :------------- | :--------------------- | :------------------------------------------------ |
| Quote Sent     | `quote.quote.sent`     | `{ quoteId, requestId, totalAmount, validUntil }` |
| Quote Viewed   | `quote.quote.viewed`   | `{ quoteId, viewedAt }`                           |
| Quote Accepted | `quote.quote.accepted` | `{ quoteId, requestId, acceptedAt }`              |
| Quote Declined | `quote.quote.declined` | `{ quoteId, reason }`                             |
| Quote Expired  | `quote.quote.expired`  | `{ quoteId, expiredAt }`                          |

### Project Events

| Event                  | Routing Key                 | Payload                                     |
| :--------------------- | :-------------------------- | :------------------------------------------ |
| Project Created        | `project.project.created`   | `{ projectId, userId, title, totalAmount }` |
| Project Status Changed | `project.status.changed`    | `{ projectId, fromStatus, toStatus }`       |
| Project Completed      | `project.project.completed` | `{ projectId, completedAt }`                |

### Progress Events

| Event                | Routing Key                     | Payload                                     |
| :------------------- | :------------------------------ | :------------------------------------------ |
| Milestone Completed  | `progress.milestone.completed`  | `{ milestoneId, projectId, name }`          |
| Milestone Approved   | `progress.milestone.approved`   | `{ milestoneId, projectId }`                |
| Deliverable Uploaded | `progress.deliverable.uploaded` | `{ deliverableId, projectId, milestoneId }` |
| Deliverable Approved | `progress.deliverable.approved` | `{ deliverableId, projectId }`              |

### Payment Events

| Event             | Routing Key                 | Payload                                      |
| :---------------- | :-------------------------- | :------------------------------------------- |
| Payment Initiated | `payment.payment.initiated` | `{ paymentId, projectId, amount, currency }` |
| Payment Completed | `payment.payment.completed` | `{ paymentId, razorpayPaymentId, amount }`   |
| Payment Failed    | `payment.payment.failed`    | `{ paymentId, reason }`                      |
| Payment Refunded  | `payment.payment.refunded`  | `{ paymentId, refundId, amount }`            |
| Dispute Opened    | `payment.dispute.opened`    | `{ disputeId, paymentId, reason }`           |

### Messaging Events

| Event        | Routing Key            | Payload                                         |
| :----------- | :--------------------- | :---------------------------------------------- |
| Message Sent | `message.message.sent` | `{ messageId, conversationId, senderId, type }` |

### Notification Events

| Event                | Routing Key                         | Payload                                      |
| :------------------- | :---------------------------------- | :------------------------------------------- |
| Notification Created | `notification.notification.created` | `{ notificationId, userId, type, category }` |

### Media Events

| Event             | Routing Key               | Payload                                             |
| :---------------- | :------------------------ | :-------------------------------------------------- |
| Media Uploaded    | `media.media.uploaded`    | `{ mediaId, uploaderId, filename, mimeType, size }` |
| Media Processed   | `media.media.processed`   | `{ mediaId, status, thumbnailUrl }`                 |
| Media Quarantined | `media.media.quarantined` | `{ mediaId, reason }`                               |

### Portfolio Events

| Event               | Routing Key                | Payload                            |
| :------------------ | :------------------------- | :--------------------------------- |
| Portfolio Published | `portfolio.item.published` | `{ portfolioItemId, title, slug }` |

### Blog Events

| Event           | Routing Key            | Payload                             |
| :-------------- | :--------------------- | :---------------------------------- |
| Post Published  | `blog.post.published`  | `{ postId, title, slug, authorId }` |
| Comment Created | `blog.comment.created` | `{ commentId, postId, userId }`     |

### Contact Events

| Event            | Routing Key                | Payload                               |
| :--------------- | :------------------------- | :------------------------------------ |
| Contact Received | `contact.message.received` | `{ contactId, name, email, subject }` |

### Webhook Events

| Event                   | Routing Key               | Payload                                      |
| :---------------------- | :------------------------ | :------------------------------------------- |
| Webhook Delivery Failed | `webhook.delivery.failed` | `{ webhookId, deliveryId, error, attempts }` |

---

## Standard Event Envelope

All events are wrapped in a `MessageEnvelope`:

```typescript
interface MessageEnvelope<T> {
  messageId: string; // UUID v4
  correlationId: string; // From request context
  timestamp: string; // ISO 8601
  source: string; // Service name
  eventType: string; // Routing key
  payload: T; // Event-specific data
  metadata?: Record<string, any>;
}
```
