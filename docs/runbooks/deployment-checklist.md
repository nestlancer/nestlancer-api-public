<div align="center">

# Pre-Deployment Checklist

</div>

---

## 📖 Table of Contents

- [Before Deployment](#before-deployment)
- [During Deployment](#during-deployment)
- [After Deployment](#after-deployment)
- [Rollback Triggers](#rollback-triggers)

---

## Before Deployment

- [ ] All CI checks pass (lint, test, build)
- [ ] Database migrations reviewed and tested on staging
- [ ] Environment variables updated in production environment (Vault/K8s/etc.)
- [ ] Feature flags configured for gradual rollout (if applicable)
- [ ] Rollback plan documented
- [ ] Monitoring dashboards open (Grafana)
- [ ] On-call engineer notified
- [ ] Changelog updated
- [ ] API version compatibility verified (no breaking changes in v1)
- [ ] Load testing completed for performance-sensitive changes

---

## During Deployment

- [ ] Watch rolling update progress in Kubernetes dashboard
- [ ] Monitor error rates in Grafana
- [ ] Check service health endpoints after deployment
- [ ] Verify database migrations applied successfully
- [ ] Check RabbitMQ consumer connections restored

---

## After Deployment

- [ ] Smoke tests pass (health, auth, critical endpoints)
- [ ] Error rates normal (< baseline + 1%)
- [ ] Response latency normal (p99 < 2s)
- [ ] Queue depths stable
- [ ] No alerts triggered
- [ ] Notify team of successful deployment

---

## Rollback Triggers

Roll back immediately if:

- Error rate > 5% for 5 minutes
- Health check failures
- Payment processing errors
- Auth service unreachable

```bash
# Docker Compose VPS rollback
./scripts/deploy/rollback.sh

# K3s rollout undo
kubectl rollout undo deployment/gateway -n nestlancer
```

See [production-vps-deploy.md](../guides/production-vps-deploy.md) and [deploy/README.md](../../deploy/README.md) (K3s + Terraform).

---

<div align="center">

**Pre-Deployment Checklist** — Nestlancer guide

</div>
