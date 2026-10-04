<div align="center">

# Dead-Letter Queue Processing Guide

</div>

---

## 📖 Table of Contents

- [Monitoring](#monitoring)
- [Inspection](#inspection)
- [Classification](#classification)
- [Replay](#replay)
- [Prevention](#prevention)

---

## Monitoring

- Grafana dashboard: [Queue Metrics](http://grafana:3200/d/queue-metrics)
- Alert: `QueueBacklog` triggers when DLQ depth > 100 for 10 minutes

---

## Inspection

### View DLQ Messages

```bash
# List DLQ depths
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues name messages | grep dlq

# Peek at messages
kubectl exec -it rabbitmq-0 -- rabbitmqadmin get queue=email.queue.dlq count=5
```

---

## Classification

| Category      | Action                | Example                                  |
| :------------ | :-------------------- | :--------------------------------------- |
| **Transient** | Retry                 | SMTP timeout, temporary S3 error         |
| **Permanent** | Log and discard       | Invalid email address, malformed payload |
| **Bug**       | Fix code, then replay | Missing handler, serialization error     |

---

## Replay

### Single Message

```bash
# Via admin API
curl -X POST https://api.nestlancer.com/api/v1/admin/queues/dlq/replay \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"messageId": "uuid-here"}'
```

### Bulk Replay

```bash
# Replay all messages in a DLQ
scripts/db/replay-dlq.sh --queue=email.queue.dlq --count=100
```

### Discard

```bash
# Discard specific message
curl -X DELETE https://api.nestlancer.com/api/v1/admin/queues/dlq/messages/uuid-here \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Prevention

- Set up alerts when DLQ depth exceeds threshold
- Review DLQ daily during active development
- Ensure all consumers handle errors gracefully

---

<div align="center">

**Dead-Letter Queue Processing Guide** — Nestlancer guide

</div>
