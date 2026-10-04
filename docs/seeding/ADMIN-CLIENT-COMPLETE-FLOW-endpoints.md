# Nestlancer API Flow Guide

> **Purpose:** The endpoint sequence the seed runner follows. The automated run is `bash seed/seed.sh --env=dev`. This page is the same flow called by hand.  
> **Canonical flow:** [`ADMIN-CLIENT-COMPLETE-FLOW.md`](./ADMIN-CLIENT-COMPLETE-FLOW.md)  
> **Runner:** [`seed/README.md`](../../seed/README.md)  
> **Base URL:** `https://dev-api.nestlancer.com/api/v1` (use your environment URL in production)

---

## How to use this guide

1. **Login** as client (`USER`) and admin (`ADMIN`) — save both `accessToken` values.
2. Run endpoints **in phase order** (request → quote → project → deposit → work → pay → complete).
3. Replace placeholder UUIDs (`{{REQUEST_ID}}`, etc.) with IDs from previous responses.
4. All **amounts in API bodies are in paise** (₹1 = `100` paise). Quote create uses **rupees** in line items; server converts to paise.
5. **Media / files:** upload via `POST /media/upload/request` → PUT file to presigned URL → `POST /media/upload/confirm` → use returned `mediaId` on deliverables/messages.

### Standard headers

```http
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
```

### Standard success envelope

```json
{
  "status": "success",
  "data": {},
  "metadata": {
    "timestamp": "2026-06-18T01:00:00.000Z",
    "requestId": "019ed83f-a0ca-75db-8fc9-d23a2aa00a60",
    "version": "v1",
    "path": "/api/v1/..."
  }
}
```

### Placeholders used below

| Placeholder          | Description                            |
| -------------------- | -------------------------------------- |
| `{{CLIENT_TOKEN}}`   | JWT from client login                  |
| `{{ADMIN_TOKEN}}`    | JWT from admin login                   |
| `{{REQUEST_ID}}`     | Project request UUID                   |
| `{{QUOTE_ID}}`       | Quote UUID                             |
| `{{PROJECT_ID}}`     | Project UUID                           |
| `{{MILESTONE_ID}}`   | Milestone UUID                         |
| `{{PAYMENT_ID}}`     | Payment UUID                           |
| `{{DELIVERABLE_ID}}` | Deliverable UUID                       |
| `{{MEDIA_ID}}`       | Media file UUID (after upload confirm) |
| `{{DISPUTE_ID}}`     | Dispute UUID                           |

---

## Endpoint index (complete audit)

Cross-check against [`ADMIN-CLIENT-COMPLETE-FLOW.md`](./ADMIN-CLIENT-COMPLETE-FLOW.md). Every diagram / handoff / happy-path node is listed here. **§** = detailed example in this guide.

| Phase | Method                  | Path                                                                             | Actor  | §                                  |
| ----- | ----------------------- | -------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| Auth  | `POST`                  | `/auth/login`                                                                    | Public | §0.1–0.2                           |
| Auth  | `POST`                  | `/auth/refresh`                                                                  | Public | §0.3                               |
| ⓪     | `GET`                   | `/services`                                                                      | Client | §1.1                               |
| ⓪     | `GET`                   | `/services/:slug`                                                                | Client | §1.2                               |
| ①     | `POST`                  | `/requests`                                                                      | Client | §2.1                               |
| ①     | `PATCH`                 | `/requests/:id`                                                                  | Client | §2.2                               |
| ①     | `GET`                   | `/requests`                                                                      | Client | §2.3                               |
| ①     | `GET`                   | `/requests/:id`                                                                  | Client | §2.4                               |
| ①     | `DELETE`                | `/requests/:id`                                                                  | Client | §2.9                               |
| ①     | `POST`                  | `/requests/:id/submit`                                                           | Client | §2.5                               |
| ①     | `GET`                   | `/requests/stats`                                                                | Client | §2.10                              |
| ①     | `GET`                   | `/requests/:id/status`                                                           | Client | §2.11                              |
| ①     | `GET`                   | `/requests/:id/quotes`                                                           | Client | §2.12                              |
| ①     | `GET/POST/DELETE`       | `/requests/:id/attachments…`                                                     | Client | §2.8                               |
| ①     | `GET`                   | `/admin/requests`                                                                | Admin  | §2.6                               |
| ①     | `GET`                   | `/admin/requests/stats`                                                          | Admin  | §2.13                              |
| ①     | `GET`                   | `/admin/requests/:id`                                                            | Admin  | §2.14                              |
| ①     | `PATCH`                 | `/admin/requests/:id/status`                                                     | Admin  | §2.7                               |
| ①     | `PATCH`                 | `/admin/requests/:id`                                                            | Admin  | §2.15                              |
| ①     | `POST`                  | `/admin/requests/:id/notes`                                                      | Admin  | §2.16                              |
| ①     | `GET`                   | `/admin/requests/:id/notes`                                                      | Admin  | §2.16                              |
| ①     | `POST`                  | `/admin/requests/:id/assign`                                                     | Admin  | §2.17                              |
| ①     | `DELETE`                | `/admin/requests/:id`                                                            | Admin  | §2.18                              |
| ①     | `GET`                   | `/admin/requests/capacity/dashboard`                                             | Admin  | §2.19                              |
| ①     | `PATCH`                 | `/admin/requests/settings/capacity`                                              | Admin  | §2.19                              |
| ②     | `POST`                  | `/admin/requests/:id/quotes`                                                     | Admin  | §3.1                               |
| ②     | `POST`                  | `/admin/quotes`                                                                  | Admin  | §3.9                               |
| ②     | `GET`                   | `/quotes`                                                                        | Client | §3.10                              |
| ②     | `GET`                   | `/quotes/stats`                                                                  | Client | §3.10                              |
| ②     | `GET`                   | `/quotes/:id`                                                                    | Client | §3.3                               |
| ②     | `POST`                  | `/quotes/:id/accept`                                                             | Client | §3.4                               |
| ②     | `POST`                  | `/quotes/:id/decline`                                                            | Client | §3.5                               |
| ②     | `POST`                  | `/quotes/:id/request-changes`                                                    | Client | §3.6                               |
| ②     | `GET`                   | `/quotes/:id/pdf`                                                                | Client | §3.11                              |
| ②     | `GET`                   | `/quotes/:id/contract`                                                           | Client | §3.11                              |
| ②     | `GET`                   | `/quotes/:id/documents/versions`                                                 | Client | §3.11                              |
| ②     | `GET`                   | `/admin/quotes`                                                                  | Admin  | §3.12                              |
| ②     | `GET`                   | `/admin/quotes/stats`                                                            | Admin  | §3.12                              |
| ②     | `GET`                   | `/admin/quotes/:id`                                                              | Admin  | §3.12                              |
| ②     | `PATCH`                 | `/admin/quotes/:id`                                                              | Admin  | §3.7                               |
| ②     | `DELETE`                | `/admin/quotes/:id`                                                              | Admin  | §3.12                              |
| ②     | `POST`                  | `/admin/quotes/:id/send`                                                         | Admin  | §3.2                               |
| ②     | `POST`                  | `/admin/quotes/:id/revise`                                                       | Admin  | §3.7                               |
| ②     | `POST`                  | `/admin/quotes/:id/extend`                                                       | Admin  | §3.7                               |
| ②     | `POST`                  | `/admin/quotes/:id/duplicate`                                                    | Admin  | §3.12                              |
| ②     | `POST`                  | `/admin/quotes/:id/resend`                                                       | Admin  | §3.12                              |
| ②     | `GET`                   | `/admin/quotes/:id/history`                                                      | Admin  | §3.12                              |
| ②     | `GET`                   | `/admin/quotes/:id/pdf`                                                          | Admin  | §3.11                              |
| ②     | `GET`                   | `/admin/quotes/:id/documents/versions`                                           | Admin  | §3.11                              |
| ②     | `POST`                  | `/admin/requests/:id/quotes/prefill`                                             | Admin  | §3.14                              |
| ②     | `GET`                   | `/admin/quotes/line-item-library`                                                | Admin  | §3.13                              |
| ②     | `POST`                  | `/admin/quotes/line-item-library`                                                | Admin  | §3.13                              |
| ②     | `PATCH`                 | `/admin/quotes/line-item-library/:id`                                            | Admin  | §3.13                              |
| ②     | `DELETE`                | `/admin/quotes/line-item-library/:id`                                            | Admin  | §3.13                              |
| ②     | `GET`                   | `/admin/quotes/templates`                                                        | Admin  | §3.13 ⚠️ deprecated                |
| ②     | `POST`                  | `/admin/quotes/templates`                                                        | Admin  | §3.13 ❌ 410 Gone                  |
| ②     | `GET`                   | `/admin/quotes/payment-schedule-presets`                                         | Admin  | §3.13                              |
| ③     | `GET`                   | `/projects/by-quote/:quoteId`                                                    | Client | §3.8                               |
| ③     | `POST`                  | `/projects/:id/sign-contract`                                                    | Client | §4.1                               |
| ③     | `GET`                   | `/projects`, `/projects/:id`                                                     | Client | §4.2                               |
| ③     | `GET`                   | `/projects/:id/timeline\|progress\|payments\|messages\|milestones\|deliverables` | Client | §4.2                               |
| ③     | `POST`                  | `/payments/create-intent`                                                        | Client | §4.3                               |
| ③     | `POST`                  | `/payments/initiate`                                                             | Client | §4.8                               |
| ③     | `POST`                  | `/payments/confirm`                                                              | Client | §4.4                               |
| ③     | `POST`                  | `/admin/payments/manual`                                                         | Admin  | §4.5                               |
| ③     | `POST`                  | `/payments/:id/cancel`                                                           | Client | §4.6                               |
| ③     | `GET/POST/PATCH/DELETE` | `/payments/methods…`                                                             | Client | §4.9                               |
| ③     | `GET`                   | `/payments`, `/payments/stats`, `/payments/:id…`                                 | Client | §4.7                               |
| ③     | `GET`                   | `/admin/payments…`                                                               | Admin  | §4.7, §6.7                         |
| ④     | `POST`                  | `/media/upload/request` → confirm                                                | Both   | §5.1                               |
| ④     | `POST`                  | `/admin/projects/:id/deliverables`                                               | Admin  | §5.2                               |
| ④     | `PATCH`                 | `/admin/deliverables/:id`                                                        | Admin  | §5.12                              |
| ④     | `DELETE`                | `/admin/deliverables/:id`                                                        | Admin  | §5.12                              |
| ④     | `POST`                  | `/progress/deliverables/:id/approve\|reject`                                     | Client | §5.4                               |
| ④     | `POST`                  | `/admin/projects/:id/milestones`                                                 | Admin  | §5.5                               |
| ④     | `PATCH`                 | `/admin/milestones/:id`                                                          | Admin  | §5.6                               |
| ④     | `POST`                  | `/admin/milestones/:id/complete`                                                 | Admin  | §5.7                               |
| ④     | `POST`                  | `/progress/milestones/:id/approve`                                               | Client | §5.8                               |
| ④     | `POST`                  | `/progress/milestones/:id/request-revision`                                      | Client | §5.9                               |
| ④     | `POST`                  | `/progress/projects/:id/request-changes`                                         | Client | §5.13                              |
| ④     | `POST`                  | `/admin/progress/projects/:id`                                                   | Admin  | §5.10                              |
| ④     | `GET`                   | `/admin/progress/projects/:id/timeline\|analytics`                               | Admin  | §5.10                              |
| ④     | `PATCH`                 | `/admin/progress/projects/:id/status`                                            | Admin  | §5.10                              |
| ④     | `POST`                  | `/admin/progress/projects/:id/complete`                                          | Admin  | §5.10                              |
| ④     | `PATCH`                 | `/admin/progress/:entryId`                                                       | Admin  | §5.14                              |
| ④     | `DELETE`                | `/admin/progress/:entryId`                                                       | Admin  | §5.14                              |
| ④     | `GET`                   | `/progress/projects/:id/:entryId`                                                | Client | §5.14                              |
| ④     | `POST`                  | `/admin/time-entries`                                                            | Admin  | §5.11                              |
| ⑤     | `POST`                  | `/payments/create-intent` + `confirm`                                            | Client | §6.1                               |
| ⑤     | `POST`                  | `/admin/payments/milestones/:id/request-payment`                                 | Admin  | §6.2                               |
| ⑤     | `POST`                  | `/admin/payments/milestones/:id/release`                                         | Admin  | §6.6                               |
| ⑤     | `POST`                  | `/admin/payments/milestones/:id/mark-complete`                                   | Admin  | §6.6 · deprecated alias → progress |
| ⑤     | `PATCH`                 | `/admin/payments/milestones/:id`                                                 | Admin  | §6.7                               |
| ⑤     | `POST`                  | `/payments/:id/dispute`                                                          | Client | §6.3                               |
| ⑤     | `GET/POST/PATCH`        | `/admin/payments/disputes…`                                                      | Admin  | §6.4                               |
| ⑤     | `POST`                  | `/admin/payments/:id/refund`                                                     | Admin  | §6.5                               |
| ⑤     | `POST`                  | `/admin/payments/:id/verify`                                                     | Admin  | §6.7                               |
| ⑤     | `POST`                  | `/admin/payments/reconcile`                                                      | Admin  | §6.7                               |
| ⑤     | `PATCH`                 | `/admin/payments/settings`                                                       | Admin  | §6.7                               |
| ⑥     | `PATCH`                 | `/admin/projects/:id/status`                                                     | Admin  | §7.1                               |
| ⑥     | `POST`                  | `/projects/:id/approve`                                                          | Client | §7.2                               |
| ⑥     | `POST`                  | `/projects/:id/request-revision`                                                 | Client | §7.3                               |
| ⑥     | `POST`                  | `/projects/:id/feedback`                                                         | Client | §7.5                               |
| ⑥     | `GET`                   | `/projects/:id/feedback`                                                         | Client | §7.5                               |
| ⑥     | `POST`                  | `/admin/projects/:id/archive`                                                    | Admin  | §7.4                               |
| ⑥     | `POST`                  | `/admin/projects/:id/unarchive`                                                  | Admin  | §7.6                               |
| ⑥     | `POST`                  | `/admin/projects/:id/extend`                                                     | Admin  | §7.6                               |
| ⑥     | `PATCH`                 | `/admin/projects/:id`                                                            | Admin  | §7.6                               |
| ⑥     | `GET`                   | `/admin/projects`, `/admin/projects/:id`                                         | Admin  | §7.6                               |
| ⑦     | `POST`                  | `/messages/threads/direct`                                                       | Both   | §8.1                               |
| ⑦     | `POST`                  | `/messages/project/:id` (+ aliases)                                              | Both   | §8.2                               |
| ⑦     | `GET/POST`              | `/messages…` (reads, threads, search)                                            | Both   | §8.3                               |
| ⑦     | `PATCH/DELETE/POST`     | `/messages/:id` (edit, react, read)                                              | Both   | §8.4                               |
| ⑦     | `POST`                  | `/messages/threads/group`                                                        | Both   | §8.5                               |
| ⑦     | `POST`                  | `/admin/messages/projects/:id/system`                                            | Admin  | §8.6                               |
| ⑦     | `GET/POST/DELETE`       | `/admin/messages/flagged…`                                                       | Admin  | §8.6                               |

**Diagram path note:** Legacy docs may show `/chat-threads/direct`; the gateway route is **`POST /messages/threads/direct`** (see `ADMIN-CLIENT-COMPLETE-FLOW.md` diagram).

---

## 0. Authentication

### 0.1 Client login

`POST /auth/login` · **Client** · Public

**Request**

```json
{
  "email": "client@example.com",
  "password": "YourPassword1!",
  "rememberMe": true
}
```

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "019e9f7b-8405-74da-b4fb-54e13f696a31",
      "email": "client@example.com",
      "role": "USER",
      "emailVerified": true
    }
  }
}
```

### 0.2 Admin login

`POST /auth/login` · **Admin** · Public

Same body shape as client; user `role` is `ADMIN`.

### 0.3 Refresh access token

`POST /auth/refresh` · **Public**

**Request**

```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

---

## 1. Phase ⓪ — Catalog (optional)

### 1.1 List service packages

`GET /services` · **Client** · Optional before creating a request

**Response `200`**

```json
{
  "status": "success",
  "data": [
    {
      "id": "019e0000-0000-7000-8000-000000000001",
      "name": "Web Application MVP",
      "slug": "web-application-mvp",
      "category": "webDevelopment",
      "basePricePaise": 5900000,
      "estimatedDays": 30,
      "revisionsIncluded": 2
    }
  ]
}
```

**Condition:** Pass `servicePackageId` on request create to prefill title/budget. Invalid package → `REQUEST_011`.

### 1.2 Get service package by slug

`GET /services/{{SLUG}}` · **Client** · e.g. `GET /services/web-application-mvp`

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "id": "019e0000-0000-7000-8000-000000000001",
    "name": "Web Application MVP",
    "slug": "web-application-mvp",
    "category": "webDevelopment",
    "basePricePaise": 5900000,
    "estimatedDays": 30,
    "revisionsIncluded": 2,
    "description": "Full MVP scope…"
  }
}
```

---

## 2. Phase ① — Request

### 2.1 Create request (draft)

`POST /requests` · **Client**

**Request**

```json
{
  "title": "Custom Marketplace Application",
  "description": "We need a Flipkart-style marketplace with seller onboarding, product catalog, cart, checkout, and admin dashboard with at least twenty characters.",
  "category": "webDevelopment",
  "budget": {
    "min": 50000,
    "max": 150000,
    "currency": "INR",
    "flexible": true
  },
  "timeline": {
    "preferredStartDate": "2026-07-01T00:00:00Z",
    "deadline": "2026-12-31T23:59:59Z",
    "flexible": false
  },
  "requirements": ["User authentication", "Payment gateway", "Admin dashboard"],
  "servicePackageId": "019e0000-0000-7000-8000-000000000001"
}
```

**Response `201`**

```json
{
  "status": "success",
  "data": {
    "id": "019eb877-0d53-726a-a841-6e1b3093559e",
    "title": "Custom Marketplace Application",
    "status": "draft",
    "category": "webDevelopment",
    "createdAt": "2026-06-11T20:54:30.483Z"
  }
}
```

**After:** Request `DRAFT`.

---

### 2.2 Update request (draft / changes requested)

`PATCH /requests/{{REQUEST_ID}}` · **Client**

**Request** (partial)

```json
{
  "title": "Custom Marketplace Application v2",
  "budget": { "min": 60000, "max": 180000, "currency": "INR", "flexible": true }
}
```

**Condition:** Only while status is `draft` or `changesRequested`.

---

### 2.3 List my requests

`GET /requests` · **Client**

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "019eb877-0d53-726a-a841-6e1b3093559e",
        "title": "Custom Marketplace Application",
        "status": "draft",
        "category": "webDevelopment"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
}
```

---

### 2.4 Get request detail

`GET /requests/{{REQUEST_ID}}` · **Client**

---

### 2.5 Submit request

`POST /requests/{{REQUEST_ID}}/submit` · **Client**

**Request**

```json
{
  "confirmComplete": true
}
```

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "id": "019eb877-0d53-726a-a841-6e1b3093559e",
    "status": "submitted",
    "submittedAt": "2026-06-11T20:55:00.000Z",
    "estimatedQuoteDate": "2026-06-13T20:55:00.000Z"
  }
}
```

**Conditions:**

- Requires budget + deadline (`REQUEST_009` if missing).
- Capacity check (`CAPACITY_001` studio unavailable, `CAPACITY_002` at capacity).

**After:** Request `SUBMITTED` · async `REQUEST_SUBMITTED` outbox.

---

### 2.6 Admin — list requests

`GET /admin/requests?status=submitted` · **Admin**

---

### 2.7 Admin — update request status

`PATCH /admin/requests/{{REQUEST_ID}}/status` · **Admin** ✅

**Request**

```json
{
  "status": "underReview",
  "note": "Reviewing scope and timeline before quoting."
}
```

**Valid statuses:** `draft`, `submitted`, `underReview`, `quoted`, `accepted`, `rejected`, `convertedToProject`, `changesRequested`

**After:** e.g. `UNDER_REVIEW`.

---

### 2.8 Request attachments (optional)

| Method   | Path                                                              | Actor                                       |
| -------- | ----------------------------------------------------------------- | ------------------------------------------- |
| `GET`    | `/requests/{{REQUEST_ID}}/attachments`                            | Client                                      |
| `POST`   | `/requests/{{REQUEST_ID}}/attachments`                            | Client · `multipart/form-data` field `file` |
| `DELETE` | `/requests/{{REQUEST_ID}}/attachments/{{ATTACHMENT_ID}}`          | Client                                      |
| `GET`    | `/requests/{{REQUEST_ID}}/attachments/{{ATTACHMENT_ID}}/download` | Client                                      |

### 2.9 Delete draft request

`DELETE /requests/{{REQUEST_ID}}` · **Client**

**Condition:** Only while status is `draft`.

---

### 2.10 Client request stats

`GET /requests/stats` · **Client**

**Response `200`** — counts by status for the authenticated client.

---

### 2.11 Request status timeline

`GET /requests/{{REQUEST_ID}}/status` · **Client**

**Response `200`** — status history / timeline entries for the request.

---

### 2.12 Quotes linked to request

`GET /requests/{{REQUEST_ID}}/quotes` · **Client**

**Response `200`** — list of quotes for this request (empty until admin creates one).

---

### 2.13 Admin request stats

`GET /admin/requests/stats` · **Admin**

---

### 2.14 Admin get request detail

`GET /admin/requests/{{REQUEST_ID}}` · **Admin**

---

### 2.15 Admin edit request metadata

`PATCH /admin/requests/{{REQUEST_ID}}` · **Admin**

```json
{
  "priority": "high",
  "internalNotes": "VIP client — prioritize quote"
}
```

---

### 2.16 Admin request notes

`POST /admin/requests/{{REQUEST_ID}}/notes` · **Admin**

```json
{
  "content": "Client called — prefers 30-70 payment split.",
  "visibility": "INTERNAL"
}
```

`GET /admin/requests/{{REQUEST_ID}}/notes` · **Admin**

---

### 2.17 Admin assign request

`POST /admin/requests/{{REQUEST_ID}}/assign` · **Admin**

```json
{
  "assigneeId": "019e9632-2ded-72c7-85f3-b9f4352f15b0"
}
```

---

### 2.18 Admin delete request

`DELETE /admin/requests/{{REQUEST_ID}}` · **Admin**

**Condition:** Typically only for draft/cancelled requests per admin policy.

---

### 2.19 Admin capacity

`GET /admin/requests/capacity/dashboard` · **Admin** — current load vs limits.

`PATCH /admin/requests/settings/capacity` · **Admin**

```json
{
  "maxConcurrentProjects": 10,
  "acceptingNewRequests": true
}
```

**Related:** Capacity enforced on client `POST /requests/:id/submit` (`CAPACITY_001`, `CAPACITY_002`).

---

## 3. Phase ② — Quote

### 3.1 Admin — create quote for request

`POST /admin/requests/{{REQUEST_ID}}/quotes` · **Admin**

**Request**

```json
{
  "items": [
    {
      "description": "Discovery & architecture",
      "quantity": 1,
      "unitPrice": 15000
    },
    {
      "description": "MVP development (seller + buyer flows)",
      "quantity": 1,
      "unitPrice": 44000
    }
  ],
  "schedulePreset": "50-50",
  "currency": "INR",
  "taxPercentage": 0,
  "validUntil": "2026-07-15T23:59:59Z",
  "requiresContract": false,
  "notes": "Tier discount applied automatically (NEW 0%, RETURNING 5%, VIP 10%)."
}
```

**Alternative:** custom `paymentSchedule` instead of `schedulePreset`:

```json
{
  "paymentSchedule": [
    { "label": "Deposit", "percentage": 50, "dueTrigger": "on_accept" },
    { "label": "Final", "percentage": 50, "dueTrigger": "on_prior_approved" }
  ]
}
```

**Response `201`**

```json
{
  "status": "success",
  "data": {
    "id": "019eb879-8c23-74e4-9445-4379da22213a",
    "requestId": "019eb879-8c0a-74ca-a4c4-60e4a41d9cd0",
    "status": "pending",
    "totalAmount": 590000,
    "currency": "INR"
  }
}
```

**After:** Quote `PENDING` · Request `QUOTED`.

**Package prefill** (when request has `servicePackageId`):

```json
{
  "prefillFromPackage": true,
  "includePackageAddOns": false,
  "taxPercentage": 0,
  "currency": "INR",
  "validUntil": "2026-07-15T23:59:59Z",
  "schedulePreset": "30-70",
  "requiresContract": false,
  "revisionsIncluded": 2
}
```

Omit `items[]` when `prefillFromPackage: true` — deliverables are loaded from `ServicePackage.deliverables`.

---

### 3.2 Admin — send quote

`POST /admin/quotes/{{QUOTE_ID}}/send` · **Admin** ✅

**Request:** empty body `{}`

**After:** Quote `SENT`.

---

### 3.3 Client — view quote

`GET /quotes/{{QUOTE_ID}}` · **Client**

**Response `200`** (excerpt)

```json
{
  "status": "success",
  "data": {
    "id": "019eb879-8c23-74e4-9445-4379da22213a",
    "status": "viewed",
    "totalAmount": 590000,
    "currency": "INR",
    "validUntil": "2026-06-25T23:59:59.000Z",
    "viewCount": 1
  }
}
```

**After:** Quote `VIEWED` (first client GET).

---

### 3.4 Client — accept quote

`POST /quotes/{{QUOTE_ID}}/accept` · **Client**

**Request**

```json
{
  "acceptTerms": true,
  "signatureName": "Braj Wave",
  "signatureDate": "2026-06-11T20:57:37.340Z",
  "notes": "Ready to proceed."
}
```

**After:** Quote `ACCEPTED` · async `QUOTE_ACCEPTED` → project created.

---

### 3.5 Client — decline quote

`POST /quotes/{{QUOTE_ID}}/decline` · **Client**

**Request**

```json
{
  "reason": "budgetConstraints",
  "feedback": "Above our current allocation.",
  "requestRevision": true
}
```

**After:** Quote `DECLINED` · if `requestRevision: true` → Request `CHANGES_REQUESTED`.

---

### 3.6 Client — request quote changes

`POST /quotes/{{QUOTE_ID}}/request-changes` · **Client**

**Request**

```json
{
  "reason": "Need lower deposit percentage and longer timeline.",
  "details": "Can we do 30-70 split instead of 50-50?"
}
```

---

### 3.7 Admin — revise & resend

| Method  | Path                                | Notes                   |
| ------- | ----------------------------------- | ----------------------- |
| `PATCH` | `/admin/quotes/{{QUOTE_ID}}`        | Edit quote fields       |
| `POST`  | `/admin/quotes/{{QUOTE_ID}}/revise` | New revision            |
| `POST`  | `/admin/quotes/{{QUOTE_ID}}/send`   | Send (or resend)        |
| `POST`  | `/admin/quotes/{{QUOTE_ID}}/extend` | Extend expired quote ✅ |

---

### 3.8 Poll project after accept

`GET /projects/by-quote/{{QUOTE_ID}}` · **Client**

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "id": "019eb879-f187-7614-8190-826cae859c07",
    "title": "Custom Marketplace Application",
    "status": "pendingPayment"
  }
}
```

**After (system):** Project `PENDING_PAYMENT` or `PENDING_CONTRACT` · Request `CONVERTED_TO_PROJECT`.

---

### 3.9 Admin — create quote (standalone, deprecated)

`POST /admin/quotes` · **Admin** ⚠️ **Deprecated** — legacy path. Prefer `POST /admin/requests/:id/quotes` (canonical request-first quoting with line items, tier discount, and package prefill).

```json
{
  "requestId": "{{REQUEST_ID}}",
  "items": [{ "description": "Discovery", "quantity": 1, "unitPrice": 15000 }],
  "schedulePreset": "50-50",
  "currency": "INR",
  "validUntil": "2026-07-15T23:59:59Z"
}
```

---

### 3.10 Client — list quotes & stats

`GET /quotes` · **Client** — paginated list of quotes for the authenticated client.

`GET /quotes/stats` · **Client** — aggregate counts (sent, accepted, expired, etc.).

---

### 3.11 Quote documents (client & admin)

| Method | Path                                            | Actor  | Notes             |
| ------ | ----------------------------------------------- | ------ | ----------------- |
| `GET`  | `/quotes/{{QUOTE_ID}}/pdf`                      | Client | PDF stream        |
| `GET`  | `/quotes/{{QUOTE_ID}}/contract`                 | Client | Contract document |
| `GET`  | `/quotes/{{QUOTE_ID}}/documents/versions`       | Client | Version history   |
| `GET`  | `/admin/quotes/{{QUOTE_ID}}/pdf`                | Admin  | Same PDF          |
| `GET`  | `/admin/quotes/{{QUOTE_ID}}/documents/versions` | Admin  | Version history   |

---

### 3.12 Admin quote management (reads & ops)

| Method   | Path                                   | Notes                               |
| -------- | -------------------------------------- | ----------------------------------- |
| `GET`    | `/admin/quotes`                        | List all quotes (filters via query) |
| `GET`    | `/admin/quotes/stats`                  | Admin dashboard stats               |
| `GET`    | `/admin/quotes/{{QUOTE_ID}}`           | Full quote detail                   |
| `DELETE` | `/admin/quotes/{{QUOTE_ID}}`           | Delete draft/pending quote          |
| `POST`   | `/admin/quotes/{{QUOTE_ID}}/duplicate` | Clone quote — see below             |
| `POST`   | `/admin/quotes/{{QUOTE_ID}}/resend`    | Resend notification email           |
| `GET`    | `/admin/quotes/{{QUOTE_ID}}/history`   | Status / revision history           |

**`POST .../duplicate` — preferred body (copy onto existing request):**

```json
{ "targetRequestId": "{{TARGET_REQUEST_ID}}" }
```

**Response:** `{ "originalId", "newQuoteId", "targetRequestId", "status": "draft" }`

**Legacy (empty body):** creates orphan `ProjectRequest` (DRAFT) + DRAFT quote — avoid for live pipeline.

---

### 3.13 Admin quote presets & templates

`GET /admin/quotes/payment-schedule-presets` · **Admin**

```json
{
  "status": "success",
  "data": [
    { "id": "50-50", "label": "50% deposit / 50% on completion" },
    { "id": "30-70", "label": "30% deposit / 70% on completion" }
  ]
}
```

`GET /admin/quotes/templates` · **Admin** ⚠️ **Deprecated** — returns empty `templates[]` plus `lineItemLibrary` blocks. Use `GET /admin/quotes/line-item-library` instead (`CODE-GAP-003` closed).

`POST /admin/quotes/templates` · **Admin** ❌ **410 Gone** — static template save removed. Use `POST /admin/quotes/line-item-library` for reusable blocks.

`GET /admin/quotes/line-item-library` · **Admin**

```json
{
  "status": "success",
  "data": {
    "blocks": [
      {
        "id": "019c0001-0001-7000-8000-000000000001",
        "slug": "discovery-scoping",
        "label": "Discovery & Scoping",
        "description": "Requirements workshop, user flows, and technical feasibility",
        "category": "discovery",
        "defaultUnitPrice": 15000,
        "defaultQuantity": 1
      }
    ]
  }
}
```

`POST /admin/requests/{{REQUEST_ID}}/quotes/prefill` · **Admin** — suggestions only (does not create quote)

**Request**

```json
{ "sourceQuoteId": "{{PAST_QUOTE_ID}}" }
```

**Response excerpt**

```json
{
  "status": "success",
  "data": {
    "suggestedItems": [{ "description": "Discovery & scoping", "quantity": 1, "unitPrice": 15000 }],
    "suggestedSchedulePreset": "50-50",
    "suggestedRevisionsIncluded": 2
  }
}
```

`POST /admin/requests/{{REQUEST_ID}}/quotes` · **Admin** — supports `prefillFromPackage: true` when request has `servicePackageId`

```json
{
  "prefillFromPackage": true,
  "taxPercentage": 0,
  "currency": "INR",
  "validUntil": "2026-12-31T23:59:59Z",
  "schedulePreset": "30-70",
  "requiresContract": false,
  "revisionsIncluded": 2
}
```

`POST /admin/quotes/line-item-library` · **Admin**

```json
{
  "slug": "custom-api-integration",
  "label": "Custom API Integration",
  "description": "Third-party API integration and webhook handling",
  "category": "backend",
  "defaultUnitPrice": 25000,
  "defaultQuantity": 1
}
```

`PATCH /admin/quotes/line-item-library/{{BLOCK_ID}}` · **Admin** — update label, price, `isActive`, etc.

`DELETE /admin/quotes/line-item-library/{{BLOCK_ID}}` · **Admin** — soft-deactivate block (`isActive: false`).

---

### 3.14 Quote reuse without static templates

Replaces full-quote template CRUD (`CODE-GAP-003` closed). Use modular paths:

| Admin goal                        | Endpoint                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Quote a live client request       | `POST /admin/requests/:id/quotes`                                                  |
| Prefill from service package      | Same + `prefillFromPackage: true`                                                  |
| Copy structure from past quote    | `POST /admin/requests/:id/quotes/prefill` → edit → create                          |
| Reusable line-item blocks         | `GET /admin/quotes/line-item-library`                                              |
| Payment split options             | `GET /admin/quotes/payment-schedule-presets`                                       |
| Similar past project (new client) | `GET /admin/projects/:id/duplicate-preview` → `POST /admin/projects/from-template` |
| Duplicate onto existing request   | `POST /admin/quotes/:id/duplicate` + `{ "targetRequestId": "..." }`                |

**Do not use:** `POST /admin/quotes/templates` (410 Gone).

---

## 4. Phase ③ — Project & deposit

### 4.1 Sign contract (if required)

`POST /projects/{{PROJECT_ID}}/sign-contract` · **Client**

**Request**

```json
{
  "signatureName": "Braj Wave"
}
```

**Condition:** Only when project `PENDING_CONTRACT` (`requiresContract: true` on quote).

**After:** Project `PENDING_PAYMENT` (or `IN_PROGRESS` if deposit was already paid).

**Condition:** Project must be `PENDING_CONTRACT`; otherwise `PROJECT_009`.

---

### 4.2 List project / milestones (read)

| Method | Path                                           | Actor  |
| ------ | ---------------------------------------------- | ------ |
| `GET`  | `/projects`                                    | Client |
| `GET`  | `/projects/{{PROJECT_ID}}`                     | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/timeline`            | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/progress`            | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/payments`            | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/messages`            | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/milestones`          | Client |
| `GET`  | `/projects/{{PROJECT_ID}}/deliverables`        | Client |
| `GET`  | `/progress/projects/{{PROJECT_ID}}/milestones` | Client |

**Milestones response excerpt**

```json
{
  "status": "success",
  "data": {
    "projectId": "019eb879-f187-7614-8190-826cae859c07",
    "milestones": [
      {
        "id": "019eb879-f1aa-75ea-8beb-319151b1aa56",
        "name": "Initial Payment",
        "status": "PENDING",
        "order": 1
      },
      {
        "id": "019eb879-f1be-7179-887e-b0776f481e0b",
        "name": "Final Payment",
        "status": "PENDING",
        "order": 2
      }
    ]
  }
}
```

---

### 4.3 Create payment intent (deposit)

`POST /payments/create-intent` · **Client**

**Request**

```json
{
  "projectId": "019eb879-f187-7614-8190-826cae859c07",
  "milestoneId": "019eb879-f1aa-75ea-8beb-319151b1aa56",
  "amount": 295000,
  "currency": "INR"
}
```

**Response `200`**

```json
{
  "status": "success",
  "data": {
    "id": "019eb879-f1b9-72e3-bd63-874870d3a773",
    "projectId": "019eb879-f187-7614-8190-826cae859c07",
    "amount": 295000,
    "currency": "INR",
    "clientSecret": "order_T2uDKJAhWhQUPP",
    "intentId": "order_T2uDKJAhWhQUPP",
    "status": "PENDING"
  }
}
```

**Conditions:**

- Deposit = milestone with **lowest `order`** — no client approve step required.
- Project must not be `PENDING_CONTRACT` (`CONTRACT_REQUIRED`).
- Use `clientSecret` / `intentId` with Razorpay checkout in the client app.

---

### 4.4 Confirm payment (client — primary path)

`POST /payments/confirm` · **Client**

**Request**

```json
{
  "paymentIntentId": "order_T2uDKJAhWhQUPP",
  "externalPaymentId": "pay_T074BOnIlRo1a0",
  "signature": "razorpay_hmac_signature_from_checkout"
}
```

**After:** Payment `COMPLETED` · deposit milestone `IN_PROGRESS` · Project `IN_PROGRESS` · chat unlocked.

**Fallback:** Razorpay `payment.captured` webhook calls same `finalizeExistingPayment`.

---

### 4.5 Admin — manual deposit (offline)

`POST /admin/payments/manual` · **Admin**

**Request**

```json
{
  "projectId": "019eb879-f187-7614-8190-826cae859c07",
  "clientId": "019e9f7b-8405-74da-b4fb-54e13f696a31",
  "milestoneId": "019eb879-f1aa-75ea-8beb-319151b1aa56",
  "amount": 295000,
  "currency": "INR",
  "notes": "Bank transfer received — deposit"
}
```

**Response `201`**

```json
{
  "status": "success",
  "data": {
    "paymentId": "019eb879-f1b9-72e3-bd63-874870d3a773",
    "createdBy": "019e9632-2ded-72c7-85f3-b9f4352f15b0"
  }
}
```

**Note:** Reuses existing `CREATED`/`PENDING` payment row for the milestone when present.

---

### 4.6 Cancel pending payment

`POST /payments/{{PAYMENT_ID}}/cancel` · **Client**

**Condition:** Payment status must be `PENDING`.

---

### 4.7 Payment reads

| Method | Path                                                | Actor                                    |
| ------ | --------------------------------------------------- | ---------------------------------------- |
| `GET`  | `/payments`                                         | Client                                   |
| `GET`  | `/payments/stats`                                   | Client                                   |
| `GET`  | `/payments/{{PAYMENT_ID}}`                          | Client                                   |
| `GET`  | `/payments/{{PAYMENT_ID}}/status`                   | Client                                   |
| `GET`  | `/payments/projects/{{PROJECT_ID}}`                 | Client · response uses top-level `items` |
| `GET`  | `/payments/projects/{{PROJECT_ID}}/milestones`      | Client                                   |
| `GET`  | `/payments/{{PAYMENT_ID}}/receipt`                  | Client · PDF stream                      |
| `GET`  | `/payments/{{PAYMENT_ID}}/invoice`                  | Client · PDF stream                      |
| `GET`  | `/payments/{{PAYMENT_ID}}/documents/versions`       | Client · document version history        |
| `GET`  | `/admin/payments`                                   | Admin                                    |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}`                    | Admin                                    |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}/timeline`           | Admin                                    |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}/transactions`       | Admin                                    |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}/documents/versions` | Admin                                    |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}/receipt`            | Admin · PDF                              |
| `GET`  | `/admin/payments/{{PAYMENT_ID}}/invoice`            | Admin · PDF                              |

---

### 4.8 Initiate payment (alias)

`POST /payments/initiate` · **Client**

**Same body and behavior as** `POST /payments/create-intent` (§4.3). Use either path; gateway proxies both to the payments service.

---

### 4.9 Saved payment methods (client)

| Method   | Path                                       | Notes                             |
| -------- | ------------------------------------------ | --------------------------------- |
| `GET`    | `/payments/methods`                        | List saved methods                |
| `POST`   | `/payments/methods`                        | Add method (token from Razorpay)  |
| `DELETE` | `/payments/methods/{{METHOD_ID}}`          | Remove                            |
| `PATCH`  | `/payments/methods/{{METHOD_ID}}/default`  | Set default                       |
| `PATCH`  | `/payments/methods/{{METHOD_ID}}/nickname` | `{ "nickname": "Business card" }` |

---

## 5. Phase ④ — Work, deliverables, milestones

**Work gate:** Admin deliverables + milestone complete blocked when project is `SUSPENDED`, `DISPUTED`, or `PAYMENT_OVERDUE`.

### 5.1 Upload media (for deliverables & chat)

**Step A — Request presigned URL**

`POST /media/upload/request` · **Admin** (or Client for chat attachments)

```json
{
  "filename": "design-mockup.zip",
  "mimeType": "application/zip",
  "size": 1048576,
  "contextType": "project",
  "contextId": "{{PROJECT_ID}}"
}
```

**Step B —** `PUT` file bytes to returned `uploadUrl`.

**Step C — Confirm upload**

`POST /media/upload/confirm`

```json
{
  "mediaId": "{{MEDIA_ID_FROM_REQUEST}}",
  "etag": "optional-etag-from-storage"
}
```

---

### 5.2 Admin — upload deliverable

`POST /admin/projects/{{PROJECT_ID}}/deliverables` · **Admin**

**Request**

```json
{
  "milestoneId": "019eaf24-2529-7419-a9cc-5e7ec313b905",
  "mediaIds": ["019eb48b-72c1-73cc-821f-ae8cb73fa53d"],
  "description": "UI mockups and component library for review"
}
```

**After:** Deliverable `PENDING` (client can approve/reject).

---

### 5.3 List deliverables

| Method | Path                                          | Actor  |
| ------ | --------------------------------------------- | ------ |
| `GET`  | `/admin/projects/{{PROJECT_ID}}/deliverables` | Admin  |
| `GET`  | `/projects/{{PROJECT_ID}}/deliverables`       | Client |

---

### 5.4 Client — approve / reject deliverable

`POST /progress/deliverables/{{DELIVERABLE_ID}}/approve` · **Client**

```json
{
  "feedback": "Looks good, proceed."
}
```

`POST /progress/deliverables/{{DELIVERABLE_ID}}/reject` · **Client**

```json
{
  "reason": "Colors do not match brand guidelines."
}
```

---

### 5.5 Admin — create extra milestone

`POST /admin/projects/{{PROJECT_ID}}/milestones` · **Admin**

```json
{
  "name": "Post-launch Support",
  "description": "30-day bug fixes after go-live",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "amount": 50000,
  "currency": "INR",
  "order": 3,
  "deliverables": ["Bug fix log", "Support summary"]
}
```

---

### 5.6 Admin — update milestone

`PATCH /admin/milestones/{{MILESTONE_ID}}` · **Admin**

```json
{
  "description": "Extended scope: added seller analytics dashboard",
  "endDate": "2026-08-15"
}
```

---

### 5.7 Admin — complete milestone (submit for client review)

`POST /admin/milestones/{{MILESTONE_ID}}/complete` · **Admin** ✅

**Request:** `{}` or optional notes body

**Conditions:**

- Deposit must be paid before delivery milestones (`DELIVERY_BLOCKED_DEPOSIT`).
- Project work allowed (not suspended/disputed/overdue).

**After:** Milestone `COMPLETED` · `reviewDeadlineAt` = now + 7 days.

---

### 5.8 Client — approve milestone

`POST /progress/milestones/{{MILESTONE_ID}}/approve` · **Client**

```json
{
  "feedback": "Excellent work. Approved for payment."
}
```

**After:** Milestone `APPROVED` · payment `dueDate` scheduled (+3 days) · `PAYMENT_REQUESTED` outbox.

**Silent path:** No action for 7 days → deemed acceptance → `APPROVED`.

---

### 5.9 Client — request milestone revision

`POST /progress/milestones/{{MILESTONE_ID}}/request-revision` · **Client**

```json
{
  "reason": "Checkout flow missing guest checkout option."
}
```

**After:** Within revision limit → `REVISION_REQUESTED` · admin reworks → complete again.  
**Overflow:** When revisions exceed quote `revisionsIncluded`, client must pay overflow fee (`POST /payments/create-intent` + `confirm` for the overflow milestone/payment row) before milestone moves to `REVISION_REQUESTED`.

---

### 5.10 Admin — daily progress update

`POST /admin/progress/projects/{{PROJECT_ID}}` · **Admin only**

```json
{
  "type": "UPDATE",
  "title": "Daily work — seller dashboard",
  "description": "Implemented product filters, fixed cart API integration, added unit tests for checkout.",
  "milestoneId": "019eaf24-2529-7419-a9cc-5e7ec313b905",
  "notifyClient": true,
  "visibility": "CLIENT_VISIBLE"
}
```

**Types:** `UPDATE`, `MILESTONE_COMPLETE`, `DELIVERABLE_UPLOAD`, `STATUS_CHANGE`, `INTERNAL_NOTE`

**Read timeline**

| Method  | Path                                                |
| ------- | --------------------------------------------------- | ----------------------------------- |
| `GET`   | `/progress/projects/{{PROJECT_ID}}`                 |
| `GET`   | `/progress/projects/{{PROJECT_ID}}/status`          |
| `GET`   | `/admin/progress/projects/{{PROJECT_ID}}`           |
| `GET`   | `/admin/progress/projects/{{PROJECT_ID}}/timeline`  |
| `GET`   | `/admin/progress/projects/{{PROJECT_ID}}/analytics` |
| `PATCH` | `/admin/progress/projects/{{PROJECT_ID}}/status`    |
| `POST`  | `/admin/progress/projects/{{PROJECT_ID}}/complete`  | Admin force-complete progress phase |

---

### 5.11 Admin — log time entry

`POST /admin/time-entries` · **Admin**

```json
{
  "milestoneId": "019eaf24-2529-7419-a9cc-5e7ec313b905",
  "durationMinutes": 120,
  "description": "Seller dashboard filters and API wiring",
  "startedAt": "2026-06-18T09:00:00Z",
  "endedAt": "2026-06-18T11:00:00Z"
}
```

`GET /admin/time-entries?projectId={{PROJECT_ID}}` · **Admin**

---

### 5.12 Admin — update / delete deliverable

`PATCH /admin/deliverables/{{DELIVERABLE_ID}}` · **Admin**

```json
{
  "description": "Updated mockups — includes dark mode variants",
  "mediaIds": ["019eb48b-72c1-73cc-821f-ae8cb73fa53d"]
}
```

`DELETE /admin/deliverables/{{DELIVERABLE_ID}}` · **Admin**

---

### 5.13 Client — request project-level changes (progress)

`POST /progress/projects/{{PROJECT_ID}}/request-changes` · **Client**

```json
{
  "reason": "Scope adjustment based on latest feedback",
  "details": [
    { "description": "Add social login options" },
    { "description": "Extend admin reporting module" }
  ]
}
```

**Use when:** Client wants formal change requests outside a single milestone revision.

---

### 5.14 Progress entry detail & admin edit

`GET /progress/projects/{{PROJECT_ID}}/{{ENTRY_ID}}` · **Client** — single progress entry.

`PATCH /admin/progress/{{ENTRY_ID}}` · **Admin** — edit entry title/description/visibility.

`DELETE /admin/progress/{{ENTRY_ID}}` · **Admin** — remove erroneous entry.

---

## 6. Phase ⑤ — Later milestone payment, disputes, refunds

### 6.1 Create intent + confirm (work milestone)

Same as deposit (§4.3–4.4) but:

**Condition:** Milestone must be `APPROVED` (not deposit) — `PAYMENT_GATE_009` if not.

```json
{
  "projectId": "{{PROJECT_ID}}",
  "milestoneId": "{{WORK_MILESTONE_ID}}",
  "amount": 295000,
  "currency": "INR"
}
```

---

### 6.2 Admin — request payment (optional nudge)

`POST /admin/payments/milestones/{{MILESTONE_ID}}/request-payment` · **Admin**

**Request:** `{}`

**Condition:** Milestone `APPROVED` — else `PAYMENT_GATE_009`.

---

### 6.3 Client — file dispute

`POST /payments/{{PAYMENT_ID}}/dispute` · **Client**

```json
{
  "reason": "DELIVERY_ISSUE",
  "description": "Delivered build does not match approved scope for checkout module."
}
```

**Condition:** Payment must be `COMPLETED`.

**After:** Payment & project → `DISPUTED` · work blocked.

---

### 6.4 Admin — dispute management

| Method  | Path                                              | Notes                                  |
| ------- | ------------------------------------------------- | -------------------------------------- |
| `GET`   | `/admin/payments/disputes`                        | List all disputes                      |
| `GET`   | `/admin/payments/disputes/{{DISPUTE_ID}}`         | Detail                                 |
| `POST`  | `/admin/payments/disputes/{{DISPUTE_ID}}/respond` | Admin response · **dispute id only**   |
| `POST`  | `/admin/payments/disputes/{{DISPUTE_ID}}/resolve` | Resolve · dispute id **or** payment id |
| `PATCH` | `/admin/payments/disputes/{{DISPUTE_ID}}`         | Update dispute metadata                |

**Respond example**

```json
{
  "message": "We have reviewed the delivery logs and will provide a patch within 48 hours.",
  "attachments": []
}
```

**Resolve example**

```json
{
  "resolutionType": "partial_refund",
  "resolutionNotes": "Partial refund for delayed milestone.",
  "refundAmount": 50000
}
```

---

### 6.5 Admin — refund payment

`POST /admin/payments/{{PAYMENT_ID}}/refund` · **Admin**

**Full refund**

```json
{
  "reason": "Project cancelled by mutual agreement"
}
```

**Partial refund**

```json
{
  "amount": 10000,
  "reason": "Partial refund for unused support hours"
}
```

**Conditions:**

- Payment `COMPLETED` with real Razorpay `externalId`.
- Seeded fake IDs (`pay_test_*`) cannot be refunded via Razorpay.

**After:** Refund record created · payment `REFUNDED` or partial · `PAYMENT_REFUNDED` outbox.

---

### 6.6 Admin — milestone payment ops (offline / legacy)

`POST /admin/payments/milestones/{{MILESTONE_ID}}/release` · **Admin**

**Use when:** Admin confirms offline bank transfer for an **approved** milestone without Razorpay confirm flow.

```json
{
  "amount": 295000,
  "notes": "NEFT reference 1234567890"
}
```

`POST /admin/payments/milestones/{{MILESTONE_ID}}/mark-complete` · **Admin** ⚠️ **Deprecated alias**

Proxies to progress `POST /admin/milestones/:id/complete` (same behavior: work gate, review deadline, deposit check, state machine). **Use the progress path for new integrations.**

`POST /admin/milestones/{{MILESTONE_ID}}/complete` · **Admin** ✅ **Preferred**

---

### 6.7 Admin — payments reporting & settings

| Method  | Path                                                   | Notes                              |
| ------- | ------------------------------------------------------ | ---------------------------------- |
| `GET`   | `/admin/payments/stats`                                | Revenue / volume aggregates        |
| `GET`   | `/admin/payments/milestones`                           | All milestone payment rows         |
| `GET`   | `/admin/payments/milestones/{{MILESTONE_ID}}`          | Milestone payment detail           |
| `GET`   | `/admin/payments/milestones/{{MILESTONE_ID}}/payments` | Payments for milestone             |
| `PATCH` | `/admin/payments/milestones/{{MILESTONE_ID}}`          | Adjust due date, notes             |
| `POST`  | `/admin/payments/projects/{{PROJECT_ID}}/milestones`   | Admin-create milestone payment row |
| `GET`   | `/admin/payments/revenue/report`                       | Revenue report (query date range)  |
| `GET`   | `/admin/payments/revenue/export`                       | CSV export                         |
| `GET`   | `/admin/payments/reconciliation`                       | Reconciliation dashboard           |
| `POST`  | `/admin/payments/reconcile`                            | Run reconciliation job             |
| `POST`  | `/admin/payments/{{PAYMENT_ID}}/verify`                | Verify payment with gateway        |
| `PATCH` | `/admin/payments/settings`                             | Payment terms / late-fee settings  |
| `GET`   | `/admin/payments/methods/supported`                    | Supported payment method types     |

---

### 6.8 Payment enforcement (system — no API call)

Cron monitors `PENDING` payments past `dueDate` (milestone `APPROVED`):

| Day  | Action                                   |
| ---- | ---------------------------------------- |
| 1–2  | Reminder                                 |
| 3–6  | Project `PAYMENT_OVERDUE` · work blocked |
| 7–13 | Late fee 5%                              |
| ≥14  | Project `SUSPENDED`                      |

Paying overdue amount restores `IN_PROGRESS` via `PROJECT_RESUMED`.

---

## 7. Phase ⑥ — Project completion

### 7.1 Admin — move to review

`PATCH /admin/projects/{{PROJECT_ID}}/status` · **Admin** ✅

```json
{
  "status": "review",
  "reason": "All milestones delivered and paid. Ready for client sign-off.",
  "notifyClient": true
}
```

**After:** Project `REVIEW`.

---

### 7.2 Client — approve project

`POST /projects/{{PROJECT_ID}}/approve` · **Client**

```json
{
  "rating": 5,
  "feedback": "Great collaboration throughout the project.",
  "testimonial": "Highly recommend for marketplace builds.",
  "comments": "On time and professional."
}
```

**After:** Project `COMPLETED`.

---

### 7.3 Client — request project revision (from review)

`POST /projects/{{PROJECT_ID}}/request-revision` · **Client**

```json
{
  "reason": "Minor UI polish needed on mobile product cards.",
  "details": "Spacing and image aspect ratio on listing page."
}
```

**After:** Admin resumes → `PATCH /admin/projects/{{PROJECT_ID}}/status` → `inProgress`.

---

### 7.4 Admin — archive project

`POST /admin/projects/{{PROJECT_ID}}/archive` · **Admin**

---

### 7.5 Client — project feedback

`POST /projects/{{PROJECT_ID}}/feedback` · **Client**

```json
{
  "rating": 5,
  "comment": "Smooth delivery and clear communication.",
  "wouldRecommend": true
}
```

`GET /projects/{{PROJECT_ID}}/feedback` · **Client**

---

### 7.6 Admin — project management (reads & ops)

| Method  | Path                                                   | Notes                                         |
| ------- | ------------------------------------------------------ | --------------------------------------------- |
| `GET`   | `/admin/projects`                                      | List all projects                             |
| `GET`   | `/admin/projects/stats`                                | Dashboard stats                               |
| `GET`   | `/admin/projects/{{PROJECT_ID}}`                       | Full project detail                           |
| `PATCH` | `/admin/projects/{{PROJECT_ID}}`                       | Edit title, dates, metadata                   |
| `POST`  | `/admin/projects/{{PROJECT_ID}}/extend`                | Extend deadline                               |
| `POST`  | `/admin/projects/{{PROJECT_ID}}/unarchive`             | Restore archived project                      |
| `POST`  | `/admin/projects/{{PROJECT_ID}}/duplicate`             | Clone project shell                           |
| `PATCH` | `/admin/projects/{{PROJECT_ID}}/status` → `inProgress` | Resume after client `request-revision` (§7.3) |

---

## 8. Phase ⑦ — Messaging

**Project chat allowed when project status ∈** `IN_PROGRESS`, `REVIEW`, `REVISION_REQUESTED`, `ON_HOLD`, `COMPLETED`.

**Blocked when** `PENDING_CONTRACT`, `PENDING_PAYMENT`, `CREATED`, `CANCELLED`, `ARCHIVED`, `PAYMENT_OVERDUE`, `SUSPENDED`, `DISPUTED`.

### 8.1 Direct thread (pre-project)

`POST /messages/threads/direct` · **Client or Admin**

```json
{
  "participantUserId": "019e9632-2ded-72c7-85f3-b9f4352f15b0",
  "initialMessage": "Hi, I have a question before submitting my request."
}
```

No project status gate on direct threads.

---

### 8.2 Project chat

`POST /messages/project/{{PROJECT_ID}}` · **Client or Admin**

```json
{
  "content": "Can you share an ETA for the seller dashboard milestone?",
  "type": "TEXT"
}
```

**With attachment**

```json
{
  "content": "",
  "type": "FILE",
  "mediaId": "{{MEDIA_ID}}"
}
```

**Alternate paths (equivalent)**

- `POST /messages/projects/{{PROJECT_ID}}`
- `POST /projects/{{PROJECT_ID}}/messages`

---

### 8.3 Read messages

| Method | Path                                           | Actor  | Notes                    |
| ------ | ---------------------------------------------- | ------ | ------------------------ |
| `GET`  | `/messages/project/{{PROJECT_ID}}`             | Client | Project thread           |
| `GET`  | `/projects/{{PROJECT_ID}}/messages`            | Client | Same data (alias)        |
| `POST` | `/messages/project/{{PROJECT_ID}}/read`        | Client | Mark project thread read |
| `GET`  | `/messages/conversations`                      | Client | All conversations        |
| `GET`  | `/messages/conversations/unread-count`         | Client | Unread badge count       |
| `GET`  | `/messages`                                    | Client | Message list (filters)   |
| `GET`  | `/messages/unread-count`                       | Client | Global unread            |
| `GET`  | `/messages/search?q=…`                         | Client | Search messages          |
| `GET`  | `/messages/threads`                            | Client | Direct/group threads     |
| `GET`  | `/messages/threads/{{THREAD_ID}}/messages`     | Client | Thread history           |
| `POST` | `/messages/threads/{{THREAD_ID}}/messages`     | Client | Reply in thread          |
| `POST` | `/messages/threads/{{THREAD_ID}}/read`         | Client | Mark thread read         |
| `GET`  | `/messages/project/{{PROJECT_ID}}/attachments` | Client | Project file attachments |
| `GET`  | `/messages/{{MESSAGE_ID}}`                     | Client | Single message           |
| `GET`  | `/admin/messages/project/{{PROJECT_ID}}`       | Admin  | Admin project view       |
| `GET`  | `/admin/messages`                              | Admin  | All messages             |
| `GET`  | `/admin/messages/conversations`                | Admin  | Admin conversation list  |
| `GET`  | `/admin/messages/stats`                        | Admin  | Messaging stats          |

---

### 8.4 Message actions (edit, react, delete)

| Method   | Path                             | Actor          | Body example                               |
| -------- | -------------------------------- | -------------- | ------------------------------------------ |
| `PATCH`  | `/messages/{{MESSAGE_ID}}`       | Sender         | `{ "content": "Updated text" }`            |
| `DELETE` | `/messages/{{MESSAGE_ID}}`       | Sender / Admin | —                                          |
| `POST`   | `/messages/{{MESSAGE_ID}}/react` | Client         | `{ "emoji": "👍" }`                        |
| `POST`   | `/messages/{{MESSAGE_ID}}/read`  | Client         | Mark single message read                   |
| `POST`   | `/messages`                      | Client         | Generic send — include `projectId` in body |

**Generic send example**

```json
{
  "projectId": "{{PROJECT_ID}}",
  "content": "Following up on yesterday's deliverable.",
  "type": "TEXT"
}
```

---

### 8.5 Group threads & thread-from-message

`POST /messages/threads/group` · **Client or Admin**

```json
{
  "participantUserIds": [
    "019e9f7b-8405-74da-b4fb-54e13f696a31",
    "019e9632-2ded-72c7-85f3-b9f4352f15b0"
  ],
  "name": "Project stakeholders",
  "initialMessage": "Kickoff thread for all parties."
}
```

`GET /messages/{{MESSAGE_ID}}/threads` · **Client** — threads linked to a message.

`POST /messages/{{MESSAGE_ID}}/threads` · **Client** — branch a sub-thread from a message.

---

### 8.6 Admin — system broadcast & moderation

`POST /admin/messages/projects/{{PROJECT_ID}}/system` · **Admin**

```json
{
  "content": "Milestone 2 has been marked complete. Please review within 7 days.",
  "type": "SYSTEM"
}
```

**Admin moderation (optional)**

| Method   | Path                                           | Notes                  |
| -------- | ---------------------------------------------- | ---------------------- |
| `GET`    | `/admin/messages/flagged`                      | Flagged messages queue |
| `POST`   | `/admin/messages/flagged/{{FLAG_ID}}/dismiss`  | Dismiss flag           |
| `POST`   | `/admin/messages/flagged/{{FLAG_ID}}/escalate` | Escalate               |
| `DELETE` | `/admin/messages/flagged/{{FLAG_ID}}`          | Remove flag record     |
| `POST`   | `/admin/messages/{{MESSAGE_ID}}/flag`          | Flag a message         |
| `DELETE` | `/admin/messages/{{MESSAGE_ID}}`               | Admin delete message   |
| `GET`    | `/admin/messages/analytics`                    | Messaging analytics    |

---

## 9. Happy path checklist (17 steps)

Use this sequence to populate a full client↔admin scenario via APIs only:

| #   | Actor  | Endpoint                                                    | Status after                    |
| --- | ------ | ----------------------------------------------------------- | ------------------------------- |
| 0   | Client | `GET /services`                                             | —                               |
| 1   | Client | `POST /requests`                                            | Request `DRAFT`                 |
| 2   | Client | `POST /requests/:id/submit`                                 | `SUBMITTED`                     |
| 3   | Admin  | `PATCH /admin/requests/:id/status` → `underReview`          | `UNDER_REVIEW`                  |
| 4   | Admin  | `POST /admin/requests/:id/quotes`                           | Quote `PENDING`                 |
| 5   | Admin  | `POST /admin/quotes/:id/send`                               | Quote `SENT`                    |
| 6   | Client | `GET /quotes/:id`                                           | Quote `VIEWED`                  |
| 7   | Client | `POST /quotes/:id/accept`                                   | Quote `ACCEPTED`                |
| 8   | System | (async consumer)                                            | Project `PENDING_PAYMENT`       |
| 8b  | Client | `POST /projects/:id/sign-contract`                          | if contract required            |
| 9   | System | (payment schedule)                                          | Milestones + payments `CREATED` |
| 10  | Client | `POST /payments/create-intent` + `confirm`                  | Payment `COMPLETED`             |
| 11  | System | `finalizeExistingPayment`                                   | Project `IN_PROGRESS`           |
| 12  | Admin  | Upload deliverables + `POST /admin/milestones/:id/complete` | Milestone `COMPLETED`           |
| 13  | Client | `POST /progress/milestones/:id/approve`                     | Milestone `APPROVED`            |
| 14  | Client | `POST /payments/create-intent` + `confirm`                  | Later payment `COMPLETED`       |
| 15  | Admin  | `PATCH /admin/projects/:id/status` → `review`               | Project `REVIEW`                |
| 16  | Client | `POST /projects/:id/approve`                                | Project `COMPLETED`             |

**Parallel:** Messaging (§8) once project `IN_PROGRESS`.  
**Daily ops:** Progress entries + time entries (§5.10–5.11) while `IN_PROGRESS`.

---

## 10. Quick curl template

```bash
BASE="https://dev-api.nestlancer.com/api/v1"

# Login
CLIENT_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"YourPassword1!"}' \
  | jq -r '.data.accessToken')

ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nestlancer.com","password":"YourPassword1!"}' \
  | jq -r '.data.accessToken')

# Example: create request
curl -s -X POST "$BASE/requests" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Project",
    "description": "Detailed description with at least twenty characters here.",
    "category": "webDevelopment",
    "budget": { "min": 50000, "max": 150000, "currency": "INR", "flexible": true },
    "timeline": {
      "preferredStartDate": "2026-07-01T00:00:00Z",
      "deadline": "2026-12-31T23:59:59Z",
      "flexible": false
    },
    "requirements": ["Auth", "Payments"]
  }' | jq .
```

---

## 11. Common error codes

| Code                       | Meaning                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `REQUEST_009`              | Cannot submit — missing budget or deadline                 |
| `REQUEST_011`              | Invalid/inactive service package                           |
| `CAPACITY_001`             | Studio unavailable                                         |
| `CAPACITY_002`             | Studio at max concurrent projects                          |
| `PAYMENT_GATE_009`         | Milestone not approved for payment / request-payment       |
| `DELIVERY_BLOCKED_DEPOSIT` | Deposit unpaid — cannot complete work milestone            |
| `AUTH_INSUFFICIENT_ROLE`   | Wrong role (e.g. client posting admin-only progress)       |
| `GATEWAY_003`              | Downstream service timeout — retry or check service health |

---

## 12. Known limitations & workarounds

| Feature                                             | Status                                   | Use instead                                                                         |
| --------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `POST /admin/payments/milestones/:id/mark-complete` | Deprecated alias (delegates to progress) | `POST /admin/milestones/:id/complete`                                               |
| `GET /admin/quotes/templates`                       | Deprecated (`CODE-GAP-003` closed)       | `GET /admin/quotes/line-item-library`                                               |
| `POST /admin/quotes/templates`                      | 410 Gone                                 | `POST /admin/quotes/line-item-library` or `POST /admin/requests/:id/quotes/prefill` |
| Razorpay webhook-only payment                       | Fallback path                            | Always prefer `POST /payments/confirm` as primary                                   |
| Webhook `payment.captured`                          | ✅ Implemented                           | `finalizeExistingPayment` in `payment-captured.handler.ts`                          |

---

## 13. Related docs

- [`ADMIN-CLIENT-COMPLETE-FLOW.md`](./ADMIN-CLIENT-COMPLETE-FLOW.md) — architecture, state machines, diagram (audit source for § index above)
- [`docs/decisions/009-milestone-lifecycle.md`](../decisions/009-milestone-lifecycle.md) — deposit vs work milestone rules
- Gateway OpenAPI: `https://dev-api.nestlancer.com/docs` (when enabled)

**Audit notes (2026-06-18):** Endpoint index at top of this file was cross-checked against `ADMIN-CLIENT-COMPLETE-FLOW.md` diagram nodes, handoffs table, happy path, and gateway controllers under `gateway/src/modules/{requests,quotes,projects,progress,payments,messages}` plus admin payment/progress routes in `gateway/src/modules/admin/admin.controller.ts`. Out-of-scope for this guide: general admin dashboard, users, portfolio, blog, webhooks, notifications (not part of the client↔admin project pipeline).
