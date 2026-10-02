<div align="center">

# Audit Worker

### Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries.

</div>

---

## 📚 Documentation

> **Full documentation:** [../../docs/components/workers/audit-worker.md](../../docs/components/workers/audit-worker.md)

---

## 🚀 Quick start

```bash
pnpm --filter @nestlancer/audit-worker dev
pnpm --filter @nestlancer/audit-worker test
```

Requires RabbitMQ (and PostgreSQL for processors that write). See linked doc for queue name and processors.

---

<div align="center">

**Audit Worker** — Nestlancer backend worker

</div>
