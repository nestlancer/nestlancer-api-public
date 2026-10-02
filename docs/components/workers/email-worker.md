<div align="center">

# Email Worker

### Renders Handlebars templates and sends mail via ZeptoMail (transactional) or SES (bulk).

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [Processors / jobs](#processors-jobs)
- [Message flow](#message-flow)
- [📎 Dependencies](#dependencies)
- [💻 Local development](#local-development)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|             |                            |
| :---------- | :------------------------- |
| **Package** | `@nestlancer/email-worker` |
| **Source**  | `workers/email-worker/`    |
| **Queue**   | `email.queue`              |
| **Routing** | email.#                    |

---

## Processors / jobs

- `verification-email`
- `password-reset`
- `welcome`
- `quote-sent/accepted`
- `payment-received/reminder/failed`
- `project-update/completed`
- `contact-auto-reply/response`
- `announcement`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Email Worker consumes from email.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/queue`
- `@nestlancer/mail`

---

## Environment (production)

| Variable                   | Notes                                                       |
| :------------------------- | :---------------------------------------------------------- |
| `EMAIL_PROVIDER`           | `zeptomail`                                                 |
| `ZEPTOMAIL_TOKEN`          | Agent → SMTP/API → Send Mail Token                          |
| `ZEPTOMAIL_SMTP_HOST`      | Must match account region, e.g. `smtp.zeptomail.in` (India) |
| `ZEPTOMAIL_DC`             | Optional shorthand: `in`, `us`, `eu`, …                     |
| `FROM_EMAIL` / `FROM_NAME` | Verified sender in ZeptoMail                                |
| `REPLY_TO`                 | Reply-To header + template support link                     |
| `FRONTEND_URL`             | Used in template links and logo URL                         |
| `RABBITMQ_URL`             | Consumes `email.queue`                                      |

See [environment variables guide](../../guides/environment-variables.md#email).

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/email-worker dev
pnpm --filter @nestlancer/email-worker test
```

Ensure RabbitMQ and PostgreSQL are running (`make dev-services`). Local dev uses `EMAIL_PROVIDER=smtp` and Mailpit (see `.env.test`).

---

## 📚 Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../guides/adding-new-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)

---

<div align="center">

**Email Worker** — Nestlancer backend component documentation

</div>
