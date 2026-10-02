<div align="center">

# Incident Response Playbook

</div>

---

## Severity Levels

| Severity          | Description            | Response Time     | Examples                                            |
| :---------------- | :--------------------- | :---------------- | :-------------------------------------------------- |
| **P1 – Critical** | System down, data loss | 15 minutes        | Full outage, payment processing failed, data breach |
| **P2 – High**     | Major feature broken   | 30 minutes        | Auth service down, messaging unavailable            |
| **P3 – Medium**   | Degraded performance   | 2 hours           | Slow responses, partial feature failure             |
| **P4 – Low**      | Minor issue            | Next business day | UI glitch, non-critical bug                         |

---

## Response Procedure

### 1. Detection

- Grafana alerts via Alertmanager
- PagerDuty notifications for P1/P2
- Slack `#ops-alerts` channel
- User reports

### 2. Triage

1. Acknowledge the alert (Slack / PagerDuty)
2. Check Grafana dashboards:
   - [API Overview](http://grafana:3200/d/api-overview)
   - [Service Health](http://grafana:3200/d/service-health)
   - [Queue Metrics](http://grafana:3200/d/queue-metrics)
3. Identify affected service(s) and severity
4. Assign incident commander

### 3. Mitigation

- **Enable maintenance mode**: `POST /api/v1/admin/system/config` → `MAINTENANCE_MODE: true`
- **Scale affected services**: `kubectl scale deployment/<service> --replicas=<N>`
- **Disable problematic feature**: Toggle feature flag via admin API
- **Database failover**: Follow `database-failover.md` runbook
- **Queue recovery**: Follow `queue-recovery.md` runbook

### 4. Communication

- Update status page
- Notify affected users via email/in-app notification
- Post updates in `#incidents` Slack channel every 30 minutes

### 5. Resolution

- Deploy fix or rollback: `scripts/deploy/rollback.sh --service=<name>`
- Verify health: `curl https://api.nestlancer.com/api/v1/health`
- Disable maintenance mode
- Confirm service restoration

### 6. Post-Mortem (within 48h)

- Blameless review meeting
- Document: timeline, root cause, contributing factors, action items
- Create follow-up issues for preventive measures
- Update runbooks if needed

---

<div align="center">

**Incident Response Playbook** — Nestlancer guide

</div>
