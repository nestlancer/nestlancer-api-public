# Nestlancer — Admin ↔ Client Complete Flow

> **Canonical reference** for the full studio pipeline: catalog → request → quote → project → milestones → payments → completion.  
> **Last verified:** 2026-06-17 — independent audit of controllers, services, state machines, Prisma schemas, webhook worker, and gateway proxies.  
> Gateway: `/api/v1` · Amounts in **paise** · Async: **outbox → RabbitMQ**  
> Roles: `USER` (client) · `ADMIN` (studio operator)

---

## Legend

| Symbol | Meaning                                        |
| ------ | ---------------------------------------------- |
| 🟦     | Client action                                  |
| 🟧     | Admin action                                   |
| ⚙️     | System (scheduler, consumer, outbox)           |
| ✅     | `assertValidTransition` wired on this endpoint |
| ⚠️     | Partial, alternate, or broken path             |
| 🚫     | Work or chat blocked                           |

**Deposit vs work milestones:** Deposit (lowest `order`) is paid in phase ③ with **no** approve step — unlocks `IN_PROGRESS` + chat. Work milestones: admin **complete** → client **approve** → client **pay**.

**Payments:** Primary path is `POST /payments/confirm` → `PaymentCompletionService.finalizeExistingPayment`. Razorpay `payment.captured` webhook uses the same `finalizeExistingPayment` path (fallback when client confirm is delayed).

**Work blocking:** `assertProjectWorkAllowed` blocks deliverables + milestone complete when project is `SUSPENDED`, `DISPUTED`, or `PAYMENT_OVERDUE`.

**Messaging (send + read):** Allowed in `IN_PROGRESS`, `REVIEW`, `REVISION_REQUESTED`, `ON_HOLD`, `COMPLETED`. Blocked in `PENDING_CONTRACT`, `PENDING_PAYMENT`, `CREATED`, `CANCELLED`, `ARCHIVED`, `PAYMENT_OVERDUE`, `SUSPENDED`, `DISPUTED`.

---

## Backend mental model

Nestlancer is a **single-studio** platform: one `ADMIN` serves many `USER` clients. HTTP at the gateway (`/api/v1`) drives synchronous state changes; **async side-effects** flow through transactional outbox → RabbitMQ consumers.

| Layer      | Path                 | Port | Role in pipeline                                       |
| ---------- | -------------------- | ---- | ------------------------------------------------------ |
| Gateway    | `gateway/`           | 3000 | JWT + roles; proxies to microservices                  |
| Requests   | `services/requests`  | 3002 | Catalog, draft/submit, capacity, admin review          |
| Quotes     | `services/quotes`    | 3003 | Create/send/accept/decline/expiry                      |
| Projects   | `services/projects`  | 3004 | Auto-create from quote, contract sign, approve/archive |
| Progress   | `services/progress`  | 3005 | Milestones, deliverables, deemed acceptance            |
| Payments   | `services/payments`  | 3006 | Intent/confirm, gating, enforcement, disputes          |
| Messaging  | `services/messaging` | 3007 | Project chat + direct threads                          |
| WS Gateway | `ws-gateway/`        | 3100 | Real-time via Redis pub/sub from `MESSAGE_SENT`        |

**Entity chain:** `ProjectRequest` (1) → `Quote` (1 per request) → `Project` (1 per quote) → `Milestone[]` + `Payment[]` per milestone.

**Who owns state changes:**

| Transition                         | Owner               | Mechanism                                                             |
| ---------------------------------- | ------------------- | --------------------------------------------------------------------- |
| Request `DRAFT` → `SUBMITTED`      | requests            | Sync `submitRequest` + `REQUEST_SUBMITTED` outbox                     |
| Quote `SENT` → `ACCEPTED`          | quotes              | Sync `acceptQuote` + `QUOTE_ACCEPTED` outbox                          |
| Quote accept → Project create      | projects            | Async `project-lifecycle.consumer` → `project-from-quote.service`     |
| Deposit pay → `IN_PROGRESS`        | payments + projects | Sync `confirm` → `finalizeExistingPayment` + `PROJECT_STATUS_CHANGED` |
| Milestone `COMPLETED` → `APPROVED` | progress            | Sync `approve` → `scheduleMilestonePayment`                           |
| Overdue → `SUSPENDED`              | payments            | Cron `PaymentEnforcementService` (independent of payment flow)        |
| Project `REVIEW` → `COMPLETED`     | projects            | Sync client `approveProject`                                          |

**Cross-feature triggers (minimum set):**

| From     | To            | Event / call                                                                           |
| -------- | ------------- | -------------------------------------------------------------------------------------- |
| Quotes   | Projects      | `QUOTE_ACCEPTED` → `ProjectFromQuoteService.createFromAcceptedQuote`                   |
| Projects | Payments      | `project-payment-schedule.service` creates milestones + `Payment` rows                 |
| Progress | Payments      | `MILESTONE_APPROVED` → `scheduleMilestonePayment` sets `dueDate` + `PAYMENT_REQUESTED` |
| Payments | Projects      | `finalizeExistingPayment` → `PROJECT_STATUS_CHANGED` / `PROJECT_RESUMED`               |
| Payments | Progress      | Revision overflow pay → `REVISION_REQUESTED` on milestone                              |
| Any      | Notifications | Outbox types consumed by email/notification workers                                    |

---

## Admin ↔ Client handoffs

| Phase     | Who starts           | Other party                 | Client API                              | Admin API                                                                                         |
| --------- | -------------------- | --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Catalog   | Client (optional)    | —                           | `GET /services`                         | —                                                                                                 |
| Request   | Client submits       | Admin reviews               | `POST /requests/:id/submit`             | `PATCH /admin/requests/:id/status`                                                                |
| Quote     | Admin sends          | Client accepts / negotiates | `POST /quotes/:id/accept`               | `POST /admin/requests/:id/quotes` · `POST /admin/quotes/:id/send` · reuse: §3.14 in endpoints doc |
| Contract  | System               | Client signs (if required)  | `POST /projects/:id/sign-contract`      | —                                                                                                 |
| Deposit   | Client pays          | Admin may record manually   | `POST /payments/confirm`                | `POST /admin/payments/manual`                                                                     |
| Delivery  | Admin completes work | Client approves             | `POST /progress/milestones/:id/approve` | `POST /admin/milestones/:id/complete`                                                             |
| Later pay | Client pays          | Admin may nudge             | `POST /payments/confirm`                | `POST /admin/payments/milestones/:id/request-payment`                                             |
| Sign-off  | Admin → REVIEW       | Client approves project     | `POST /projects/:id/approve`            | `PATCH /admin/projects/:id/status`                                                                |
| Dispute   | Client disputes      | Admin responds / resolves   | `POST /payments/:id/dispute`            | `POST /admin/payments/disputes/:id/respond`, `.../resolve`                                        |

---

## Complete flow diagram

```mermaid
flowchart TB
    subgraph LEGEND["📖 LEGEND"]
        direction LR
        L1["✅ assertValidTransition"]
        L2["⚠️ Partial / broken path"]
        L3["🚫 Blocked"]
    end

    subgraph P0["⓪ CATALOG — optional"]
        C0["🟦 GET /services"]
        C0 -.-> C1
    end

    subgraph P1["① REQUEST — services/requests"]
        C1["🟦 POST /requests<br/>+ optional servicePackageId"]
        C1 --> PKG_CHK["⚙️ Validate package · prefill title, budget"]
        PKG_CHK --> R_DRAFT["Request DRAFT"]
        PKG_CHK -.-> PKG_ERROR["❌ REQUEST_011"]
        R_DRAFT --> C4["🟦 POST .../submit<br/>requires budget + deadline"]
        C4 --> CAP_CHK["⚙️ assertCanAcceptRequest"]
        CAP_CHK -.-> CAP_BLOCK["❌ CAPACITY_001/002 — stays DRAFT"]
        CAP_CHK --> R_SUBMITTED["Request SUBMITTED"]
        R_SUBMITTED --> E_REQ_SUB["⚙️ REQUEST_SUBMITTED"]
        R_SUBMITTED --> A2["🟧 PATCH /admin/requests/:id/status ✅"]
        A2 --> R_REVIEW["UNDER_REVIEW"]
        R_REVIEW -.-> A_REJECT["🟧 → REJECTED"]
        R_REVIEW -.-> A_CHANGES["🟧 → CHANGES_REQUESTED"]
        A_CHANGES --> C_EDIT["🟦 Edit + resubmit"] --> C4
    end

    subgraph P2["② QUOTE — services/quotes + requests"]
        A_QCREATE["🟧 POST /admin/requests/:id/quotes<br/>prefillFromPackage · tier discount"]
        A_QPREFILL["🟧 POST .../quotes/prefill<br/>suggestions from past quote"]
        A_QLIB["🟧 GET /admin/quotes/line-item-library<br/>reusable blocks"]
        A_QCREATE --> Q_DRAFT["Quote PENDING · Request QUOTED"]
        Q_DRAFT --> A_QSEND["🟧 POST .../send ✅"]
        A_QSEND --> Q_SENT["Quote SENT"]
        Q_SENT --> C_VIEW["🟦 GET /quotes/:id"] --> Q_VIEWED["VIEWED"]
        Q_SENT --> C_QDECIDE{Client}
        Q_VIEWED --> C_QDECIDE
        C_QDECIDE -->|Accept| C_ACCEPT["🟦 POST .../accept"] --> Q_ACCEPTED["ACCEPTED"]
        C_QDECIDE -->|Decline| C_DECLINE["🟦 POST .../decline"]
        C_QDECIDE -->|Changes| C_QCHANGES["🟦 request-changes"] --> A_QREVISE["🟧 Revise quote"] --> A_QSEND
        C_DECLINE -.->|requestRevision| R_CHG["Request CHANGES_REQUESTED"]
        Q_ACCEPTED --> E_QACC["⚙️ QUOTE_ACCEPTED"]
        Q_SENT -.-> E_EXPIRE["⚙️ Scheduler: EXPIRED"] --> R_EXP["Request EXPIRED_QUOTE"]
        R_EXP --> A_EXTEND["🟧 POST .../extend ✅"] --> Q_SENT
        A_EXTEND -.-> R_RESTORE["Request → QUOTED"]
        R_EXP -.-> E_STALE["⚙️ 30d stale → REJECTED"]
    end

    subgraph P3["③ PROJECT + DEPOSIT — no approve step"]
        E_QACC --> E_PROJ_CREATE["⚙️ project-lifecycle.consumer"]
        E_PROJ_CREATE --> PRJ_BRANCH{requiresContract?}
        PRJ_BRANCH -->|Yes| PRJ_PC["PENDING_CONTRACT"] --> C_SIGN["🟦 sign-contract"] --> PRJ_PP
        PRJ_BRANCH -->|No| PRJ_PP["PENDING_PAYMENT"]
        E_PROJ_CREATE --> M_CREATE["⚙️ Deposit + work milestones PENDING"]
        PRJ_PP --> C_DEP["🟦 create-intent"] --> PAY_PEND["Payment PENDING"]
        PAY_PEND --> C_CONFIRM["🟦 ✅ POST /payments/confirm PRIMARY<br/>finalizeExistingPayment"]
        C_CONFIRM --> PAY_DEP_DONE["COMPLETED"]
        PAY_PEND -.-> E_WEBHOOK["⚙️ webhook payment.captured<br/>finalizeExistingPayment · intentId fallback"]
        PAY_PEND -.-> A_MANUAL["🟧 manual payment"] --> PAY_DEP_DONE
        PAY_DEP_DONE --> PRJ_IP["Project IN_PROGRESS"]
        PRJ_IP --> MSG_OK["✅ Chat unlocked"]
        PRJ_PP --> MSG_BLOCK["🚫 Chat blocked"]
    end

    subgraph P4["④ WORK MILESTONES — complete then approve"]
        PRJ_IP --> A_WORK["🟧 Deliver work"]
        A_WORK --> WORK_GATE["⚙️ assertProjectWorkAllowed"]
        WORK_GATE --> A_DELIV["🟧 Upload deliverables"]
        WORK_GATE -.-> BLOCKING
        A_DELIV --> A_MCOMPLETE["🟧 POST .../complete ✅"]
        A_MCOMPLETE -.-> BLOCKING
        A_MCOMPLETE --> M_COMP["Milestone COMPLETED<br/>reviewDeadlineAt +7d"]
        M_COMP --> C_MDECIDE{Client review}
        C_MDECIDE -->|Approve| C_MAPPROVE["🟦 approve milestone"] --> M_APPROVED["APPROVED"]
        C_MDECIDE -->|Revision| C_MREV["🟦 request-revision"]
        C_MDECIDE -->|Silent 7d| E_DEEMED["⚙️ deemedAcceptedAt → APPROVED"]
        C_MREV --> REV_CHK{Within revision limit?}
        REV_CHK -->|Yes| M_REVREQ["REVISION_REQUESTED"] --> A_REDO["🟧 Rework"] --> A_MCOMPLETE
        REV_CHK -->|No + cost| REV_PAY["🟦 Pay overflow fee"] --> M_REVREQ
        M_APPROVED --> SCHED_PAY["⚙️ dueDate +3d · PAYMENT_REQUESTED"]
        E_DEEMED --> M_APPROVED
    end

    subgraph P5["⑤ LATER MILESTONE PAYMENT"]
        SCHED_PAY --> C_PAY["🟦 create-intent + confirm<br/>requires APPROVED"]
        SCHED_PAY -.-> A_PAY_NUDGE["🟧 request-payment optional"]
        C_PAY --> PAY_DONE["COMPLETED"]
        PAY_DONE --> E_RESTORE["⚙️ Restore if SUSPENDED/OVERDUE"] --> PRJ_IP
        PAY_DONE -.-> C_DISPUTE["🟦 dispute"] -.-> BLOCKING
        C_DISPUTE --> A_RESPOND["🟧 respond — dispute id only"]
        C_DISPUTE --> A_RESOLVE["🟧 resolve — dispute or payment id"]
        A_RESOLVE --> DISP_OUT{Refund?}
        DISP_OUT -->|Full| PRJ_CANCEL["CANCELLED"]
        DISP_OUT -->|None/Partial| PRJ_IP
        PAY_DONE --> MORE{More milestones?}
        MORE -->|Yes| A_WORK
    end

    subgraph P5_5["⑤.⑤ ENFORCEMENT — daily cron, NOT payment-triggered"]
        NOTE_ENF["⚙️ Monitors PENDING past dueDate<br/>milestone must be APPROVED"]
        NOTE_ENF --> ENF_D1["Day 1–2: reminder"]
        NOTE_ENF --> ENF_D3["Day 3–6: PAYMENT_OVERDUE"] -.-> BLOCKING
        NOTE_ENF --> ENF_D7["Day 7–13: late fee 5%"]
        NOTE_ENF --> ENF_D14["Day ≥14: SUSPENDED"] -.-> BLOCKING
    end

    subgraph BLOCKING_SG["🚫 WORK BLOCKED"]
        BLOCKING["SUSPENDED · DISPUTED · PAYMENT_OVERDUE"]
    end

    SCHED_PAY -.->|sets dueDate only| NOTE_ENF

    subgraph P6["⑥ PROJECT COMPLETION"]
        MORE -->|All done| A_REVIEW["🟧 status → REVIEW ✅"]
        A_REVIEW --> PRJ_REVIEW["REVIEW"]
        PRJ_REVIEW --> C_PAPPROVE["🟦 POST /projects/:id/approve"] --> PRJ_DONE["COMPLETED"]
        PRJ_REVIEW -.-> C_PREV["🟦 request-revision"] --> A_RESUME["🟧 → IN_PROGRESS"]
        PRJ_DONE --> A_ARCHIVE["🟧 archive"]
    end

    subgraph P7["⑦ MESSAGING — parallel"]
        MSG_OK --> C_MSG["🟦 POST /messages/project/:id"]
        MSG_OK --> A_MSG["🟧 POST /messages/project/:id"]
        MSG_BLOCK -.-> C_THREAD["🟦 POST /messages/threads/direct<br/>no project status gate"]
    end

    P0 -.-> P1 --> P2 --> P3 --> P4 --> P5 --> P6
    P5 -.-> P5_5
    PRJ_IP -.-> P7
    PRJ_REVIEW -.-> P7
    PRJ_DONE -.-> P7

    classDef client fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef admin fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f3f4f6,stroke:#6b7280,color:#374151
    classDef status fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef blocked fill:#fee2e2,stroke:#dc2626,color:#7f1d1d

    class C0,C1,C4,C_EDIT,C_VIEW,C_ACCEPT,C_DECLINE,C_QCHANGES,C_SIGN,C_DEP,C_CONFIRM,C_MAPPROVE,C_MREV,REV_PAY,C_PAY,C_DISPUTE,C_PAPPROVE,C_PREV,C_MSG,C_THREAD client
    class A2,A_REJECT,A_CHANGES,A_QCREATE,A_QSEND,A_QREVISE,A_EXTEND,A_MANUAL,A_WORK,A_DELIV,A_MCOMPLETE,A_REDO,A_PAY_NUDGE,A_RESPOND,A_RESOLVE,A_REVIEW,A_RESUME,A_ARCHIVE,A_MSG admin
    class PKG_CHK,CAP_CHK,E_REQ_SUB,E_QACC,E_PROJ_CREATE,M_CREATE,E_WEBHOOK,E_RESTORE,SCHED_PAY,NOTE_ENF,ENF_D1,ENF_D3,ENF_D7,ENF_D14,WORK_GATE,E_DEEMED,E_STALE system
    class R_DRAFT,R_SUBMITTED,R_REVIEW,R_EXP,R_CHG,Q_DRAFT,Q_SENT,Q_VIEWED,Q_ACCEPTED,PRJ_PC,PRJ_PP,PRJ_IP,M_COMP,M_APPROVED,M_REVREQ,PAY_PEND,PAY_DEP_DONE,PAY_DONE,PRJ_REVIEW,PRJ_DONE,PRJ_CANCEL status
    class PKG_ERROR,CAP_BLOCK,MSG_BLOCK,BLOCKING,BLOCKING_SG blocked
```

---

## Happy path (17 steps)

| #   | Actor  | Action                      | Endpoint                                      | Entity status after                                                               |
| --- | ------ | --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| 0   | Client | Browse catalog (optional)   | `GET /services`                               | —                                                                                 |
| 1   | Client | Create request              | `POST /requests`                              | Request `DRAFT`                                                                   |
| 2   | Client | Submit request              | `POST /requests/:id/submit`                   | Request `SUBMITTED` (capacity checked)                                            |
| 3   | Admin  | Review (optional)           | `PATCH /admin/requests/:id/status`            | `UNDER_REVIEW`                                                                    |
| 4   | Admin  | Create quote                | `POST /admin/requests/:id/quotes`             | Quote `PENDING`, Request `QUOTED`                                                 |
| 5   | Admin  | Send quote                  | `POST /admin/quotes/:id/send`                 | Quote `SENT`                                                                      |
| 6   | Client | View quote                  | `GET /quotes/:id`                             | Quote `VIEWED`, `viewHistory` updated                                             |
| 7   | Client | Accept quote                | `POST /quotes/:id/accept`                     | Quote `ACCEPTED`                                                                  |
| 8   | System | Create project              | `QUOTE_ACCEPTED` consumer                     | Project `PENDING_PAYMENT` (or `PENDING_CONTRACT`), Request `CONVERTED_TO_PROJECT` |
| 8b  | Client | Sign contract (if required) | `POST /projects/:id/sign-contract`            | Project `PENDING_PAYMENT`                                                         |
| 9   | System | Payment schedule            | `project-payment-schedule.service`            | Milestones `PENDING`, Payments `CREATED`                                          |
| 10  | Client | Pay deposit                 | `POST /payments/create-intent` + `confirm`    | Payment `COMPLETED`, deposit milestone `IN_PROGRESS`                              |
| 11  | System | Start project               | `finalizeExistingPayment` sync                | Project `IN_PROGRESS`, chat unlocked                                              |
| 12  | Admin  | Complete milestone          | `POST /admin/milestones/:id/complete`         | Milestone `COMPLETED`                                                             |
| 13  | Client | Approve milestone           | `POST /progress/milestones/:id/approve`       | Milestone `APPROVED`, `dueDate` +3d                                               |
| 14  | Client | Pay later milestone         | `POST /payments/confirm`                      | Payment `COMPLETED`                                                               |
| 15  | Admin  | Mark for sign-off           | `PATCH /admin/projects/:id/status` → `REVIEW` | Project `REVIEW`                                                                  |
| 16  | Client | Approve project             | `POST /projects/:id/approve`                  | Project `COMPLETED`                                                               |

---

## Payment rules

| Milestone                    | Approve work first? | Admin `request-payment`?  | When paid                             | Overdue enforcement                                                                   | Restore on pay                                                    |
| ---------------------------- | ------------------- | ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Deposit** (lowest `order`) | **No**              | Not required              | Phase ③ — unlocks project + messaging | N/A (pre-work)                                                                        | N/A                                                               |
| **Later milestones**         | **Yes**             | Optional after `APPROVED` | Phase ⑤                               | `dueDate` +3d → reminder d1 → `PAYMENT_OVERDUE` d3 → late fee 5% d7 → `SUSPENDED` d14 | `SUSPENDED`/`PAYMENT_OVERDUE` → `IN_PROGRESS` + `PROJECT_RESUMED` |

**Sources:** `payment-gating.service.ts`, `milestone-approval.service.ts` (`scheduleMilestonePayment`), `payment-enforcement.service.ts`, `payment-completion.service.ts` (`restoreProjectIfOverduePayment`), `payment-terms.util.ts` (`milestonePaymentDueDays: 3`, `suspensionAfterDays: 14`, `lateFeePercent: 5`)

---

## `assertValidTransition` call sites (11)

Wired on **11** call sites — **not** every mutation. Client milestone approve, client project approve, and payment status changes use business-rule validation instead.

| #   | Entity    | Transition                                | File                                                                    |
| --- | --------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| 1   | REQUEST   | \* → admin status                         | `services/requests/src/services/requests.admin.service.ts`              |
| 2–3 | QUOTE     | → SENT (send, extend)                     | `services/quotes/src/services/quotes.admin.service.ts`                  |
| 4–5 | QUOTE     | → REVISED                                 | `services/quotes/src/controllers/quotes.admin.controller.ts` (×2 paths) |
| 6–8 | QUOTE     | → ACCEPTED / DECLINED / CHANGES_REQUESTED | `services/quotes/src/services/quote-status.service.ts`                  |
| 9   | PROJECT   | admin status patch                        | `services/projects/src/services/projects.admin.service.ts`              |
| 10  | PROJECT   | admin status via progress controller      | `services/progress/src/controllers/admin/progress.admin.controller.ts`  |
| 11  | MILESTONE | → COMPLETED                               | `services/progress/src/services/milestones.service.ts`                  |

State machine definitions: `libs/common/src/state-machines/status-transitions.ts`

---

## Phase-by-phase verification log

Independent audit of every diagram node against live backend code (**2026-06-17**).

| Phase | Diagram node                                    | Status    | Source file(s)                                                                         |
| ----- | ----------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| ⓪     | `GET /services`                                 | ✅        | `services/requests/.../services.public.controller.ts`                                  |
| ⓪     | `servicePackageId` prefill                      | ✅        | `requests.service.ts` L33–76 — `REQUEST_011` if invalid                                |
| ①     | Submit capacity `CAPACITY_001/002`              | ✅        | `admin-capacity.service.ts` `assertCanAcceptRequest`; called from `submitRequest` L251 |
| ①     | Submit requires budget + deadline               | ✅        | `requests.service.ts` `REQUEST_009`                                                    |
| ①     | `PATCH /admin/requests/:id/status` ✅           | ✅        | `requests.admin.service.ts` L83                                                        |
| ①     | `REQUEST_SUBMITTED` async                       | ✅        | `requests.service.ts` outbox on submit                                                 |
| ②     | Tier discount NEW/RETURNING/VIP                 | ✅        | `libs/common/.../client-tier.util.ts`; `quotes.admin.service.ts` (requests)            |
| ②     | Package prefill on quote create                 | ✅        | `prefillFromPackage` · `requests/.../quotes.admin.service.ts`                          |
| ②     | Quote prefill suggestions (past quote)          | ✅        | `POST /admin/requests/:id/quotes/prefill`                                              |
| ②     | Line-item library blocks                        | ✅        | `QuoteLineItemBlock` · `GET/POST/PATCH/DELETE /admin/quotes/line-item-library`         |
| ②     | Static quote templates                          | ❌ Closed | `POST /admin/quotes/templates` → 410 Gone (`CODE-GAP-003`)                             |
| ②     | Send quote ✅                                   | ✅        | `quotes.admin.service.ts` L130                                                         |
| ②     | View → `VIEWED`                                 | ✅        | `quotes.service.ts` L154–175                                                           |
| ②     | Accept → `QUOTE_ACCEPTED`                       | ✅        | `quote-status.service.ts` L31–58                                                       |
| ②     | Decline → `REJECTED` or `CHANGES_REQUESTED`     | ✅        | `quote-status.service.ts` L86–105 `requestRevision` flag                               |
| ②     | Quote expiry scheduler                          | ✅        | `quote-expiry-scheduler.service.ts`                                                    |
| ②     | Extend ✅                                       | ✅        | `quotes.admin.service.ts` L191 `EXPIRED → SENT`                                        |
| ③     | Project from quote async                        | ✅        | `project-lifecycle.consumer.ts` → `project-from-quote.service.ts`                      |
| ③     | `PENDING_CONTRACT` vs `PENDING_PAYMENT`         | ✅        | `project-from-quote.service.ts` L89 `requiresContract`                                 |
| ③     | Request → `CONVERTED_TO_PROJECT`                | ✅        | `project-from-quote.service.ts` L110–112                                               |
| ③     | Payment schedule + milestones                   | ✅        | `project-payment-schedule.service.ts`                                                  |
| ③     | Sign contract → `PENDING_PAYMENT`               | ✅        | `projects.service.ts` `signContract` · gateway `projects.controller.ts`                |
| ③     | Deposit: no approve required                    | ✅        | `payment-gating.service.ts` L117–118 `isDeposit` bypass                                |
| ③     | `confirm` PRIMARY path                          | ✅        | `payment-confirmation.service.ts` L68–80                                               |
| ③     | Manual payment full side-effects                | ✅        | `payments.admin.controller.ts` L420–434                                                |
| ③     | Webhook lifecycle via `finalizeExistingPayment` | ✅        | `payment-captured.handler.ts` + `@nestlancer/common` `PaymentCompletionService`        |
| ③     | Chat blocked until `IN_PROGRESS`                | ✅        | `project-messaging.constants.ts`; `messaging-access.service.ts`                        |
| ④     | `assertProjectWorkAllowed` on deliverables      | ✅        | `deliverables.service.ts` L24                                                          |
| ④     | Milestone complete ✅                           | ✅        | `milestones.service.ts` L90 + `reviewDeadlineAt` +7d                                   |
| ④     | Milestone approve → schedule payment            | ✅        | `milestone-approval.service.ts` `scheduleMilestonePayment`                             |
| ④     | Deemed acceptance 7d                            | ✅        | `milestone-review-scheduler.service.ts` → `processDeemedAcceptance`                    |
| ④     | Revision overflow payment                       | ✅        | `milestone-approval.service.ts` L155–182 + `payment-completion` overflow handler       |
| ⑤     | Pay gated on `APPROVED`                         | ✅        | `payment-gating.service.ts` L121–146                                                   |
| ⑤     | Admin `request-payment` requires `APPROVED`     | ✅        | `payment-gating.service.ts` `assertCanRequestPayment`                                  |
| ⑤     | Restore on pay when overdue/suspended           | ✅        | `payment-completion.service.ts` `restoreProjectIfOverduePayment`                       |
| ⑤     | Client dispute → `DISPUTED`                     | ✅        | `payments.service.ts` L187–208                                                         |
| ⑤     | Admin respond (dispute id only)                 | ✅        | `admin-tasks.service.ts` `respondToDispute` L271–313                                   |
| ⑤     | Admin resolve (dispute or payment id)           | ✅        | `admin-tasks.service.ts` `resolveDispute` L93–98                                       |
| ⑤.⑤   | Enforcement independent cron                    | ✅        | `payment-enforcement.service.ts` — not called from payment flow                        |
| ⑤.⑤   | Day thresholds d1/d3/d7/d14                     | ✅        | L86–99 + `payment-terms.util.ts` defaults                                              |
| ⑥     | Admin → `REVIEW` ✅                             | ✅        | `projects.admin.service.ts` L119                                                       |
| ⑥     | Client approve → `COMPLETED`                    | ✅        | `projects.service.ts` `approveProject`                                                 |
| ⑥     | Client request-revision → admin resume          | ✅        | `projects.service.ts` + admin status patch                                             |
| ⑦     | Messaging send + read gated                     | ✅        | `messaging.service.ts` L88, L163 `requireProjectMessagingAllowed`                      |
| ⑦     | Direct threads pre-project                      | ✅        | `requireThreadMember` — no project status gate                                         |

---

## Known code gaps (documented — not diagram errors)

| ID           | Severity | Issue                                       | Impact                                                                               | Fix location                                                                      |
| ------------ | -------- | ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| CODE-GAP-003 | Closed   | ~~Quote templates admin endpoints stubbed~~ | Resolved 2026-06-18 — static template CRUD rejected; use line-item library + prefill | `GET /admin/quotes/line-item-library` · `POST /admin/requests/:id/quotes/prefill` |

**Resolved (2026-06-18):** `POST /admin/payments/milestones/:id/mark-complete` now delegates to progress `POST /admin/milestones/:id/complete` (gateway + payments proxy). Prefer the progress path for new integrations.

---

## Verification summary

| Area                                      | Status      | Notes                                                                                      |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| All core pipeline phases ⓪–⑦              | ✅ Verified | Every diagram node traced to source                                                        |
| Deposit vs work milestone orthogonality   | ✅          | Matches `docs/adr/001-milestone-lifecycle.md`                                              |
| Messaging read + send gate                | ✅          | `requireProjectMessagingAllowed` on POST and GET                                           |
| Dispute resolve dual id                   | ✅          | Dispute id OR payment id                                                                   |
| Dispute respond dispute id only           | ✅          | `respondToDispute` requires dispute record id                                              |
| Enforcement independence + day thresholds | ✅          | Cron separate from payment schedule                                                        |
| Razorpay webhook                          | ✅ Fixed    | Uses `finalizeExistingPayment`; lookup by `externalId` or Razorpay `order_id` → `intentId` |
| `assertValidTransition` count             | ✅          | 11 call sites confirmed                                                                    |
| Demo scenario walkthroughs                | Deferred    | Payloads in `seed/payloads/demo/`. Run with `bash seed/seed.sh --env=dev --phase=demo` |

---

## Code references

| Topic                        | Source                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| Payment completion           | `services/payments/src/services/payment-completion.service.ts`          |
| Payment confirm (primary)    | `services/payments/src/services/payment-confirmation.service.ts`        |
| Payment gating               | `services/payments/src/services/payment-gating.service.ts`              |
| Milestone approve + schedule | `services/progress/src/services/milestone-approval.service.ts`          |
| Overdue enforcement          | `services/payments/src/services/payment-enforcement.service.ts`         |
| Project from quote           | `services/projects/src/services/project-from-quote.service.ts`          |
| Lifecycle consumer           | `services/projects/src/consumers/project-lifecycle.consumer.ts`         |
| Messaging access             | `services/messaging/src/services/messaging-access.service.ts`           |
| State machines               | `libs/common/src/state-machines/status-transitions.ts`                  |
| Messaging allowed statuses   | `libs/common/src/constants/project-messaging.constants.ts`              |
| Payment terms defaults       | `libs/common/src/payment/payment-terms.util.ts`                         |
| Milestone lifecycle ADR      | `docs/adr/001-milestone-lifecycle.md`                                   |
| Prisma models                | `prisma/schema/{request,quote,project,payment,progress,message}.prisma` |
| Backend analysis prompt      | _(archived — see git history)_                                          |
