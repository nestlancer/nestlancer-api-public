<div align="center">

# Outbox Poller

### Polls `OutboxEvent` rows (PENDING), publishes to RabbitMQ with confirms, marks PROCESSED or retries.

</div>

---

## 📚 Documentation

> **Full documentation:** [../../docs/components/workers/outbox-poller.md](../../docs/components/workers/outbox-poller.md)

---

## 🚀 Quick start

```bash
pnpm --filter @nestlancer/outbox-poller dev
pnpm --filter @nestlancer/outbox-poller test
```

Requires RabbitMQ (and PostgreSQL for processors that write). See linked doc for queue name and processors.

---

<div align="center">

**Outbox Poller** — Nestlancer backend worker

</div>
