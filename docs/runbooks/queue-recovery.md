<div align="center">

# RabbitMQ Queue Recovery

</div>

---

## Diagnosis

### Check queue depths

```bash
# Via management API
curl -u admin:password http://rabbitmq:15672/api/queues/nestlancer | jq '.[] | {name, messages, consumers}'

# Via kubectl
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues name messages consumers
```

---

## Recovery Procedures

### Consumers Down

```bash
# Restart worker deployments
kubectl rollout restart deployment -l tier=worker

# Verify consumers reconnected
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_consumers
```

### Queue Backed Up

```bash
# Scale workers horizontally
kubectl scale deployment/email-worker --replicas=5
kubectl scale deployment/notification-worker --replicas=5

# Monitor queue depth decreasing
watch -n 5 'kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues name messages'
```

### RabbitMQ Node Down

```bash
# Check node status
kubectl exec -it rabbitmq-0 -- rabbitmqctl cluster_status

# If pod crashed, K8s will auto-restart
kubectl get pods -l app=rabbitmq

# Force restart
kubectl delete pod rabbitmq-0
```

### Verify No Messages Lost

Check outbox table for unpublished events:

```sql
SELECT COUNT(*) FROM outbox_events WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '5 minutes';
```

If count > 0, the outbox poller will automatically publish them when RabbitMQ recovers.

---

<div align="center">

**RabbitMQ Queue Recovery** — Nestlancer guide

</div>
