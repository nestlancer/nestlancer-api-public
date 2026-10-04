<div align="center">

# Runbooks

### Step-by-step procedures for specific operational situations. For planned work, see the deployment guides one level up instead.

</div>

| Runbook | When to use it |
| :-- | :-- |
| [Deployment checklist](deployment-checklist.md) | Pre-deploy checklist to run through before any production deploy |
| [Incident response](incident-response.md) | An incident is happening right now — triage and response steps |
| [Database failover](database-failover.md) | Postgres primary is down or failing over |
| [Queue recovery](queue-recovery.md) | RabbitMQ queues are stuck, growing unbounded, or need manual recovery |
| [DLQ processing](dlq-processing.md) | Messages have landed in a dead-letter queue and need triage/replay |
| [Scaling guide](scaling-guide.md) | Horizontal scaling procedure for services/workers under load |

Back to [Operations](../README.md).
