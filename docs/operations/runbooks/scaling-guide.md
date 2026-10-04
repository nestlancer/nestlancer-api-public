<div align="center">

# Horizontal Scaling Guide

</div>

---

## 📖 Table of Contents

- [Services](#services)
- [Workers](#workers)
- [Database](#database)
- [Redis](#redis)
- [Identifying Bottlenecks](#identifying-bottlenecks)

---

## Services

### Kubernetes HPA

Services scale via HPA based on CPU utilization:

```yaml
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        targetAverageUtilization: 70
```

### Per-Service Recommendations

| Service        | Min | Max | Scale Trigger         |
| :------------- | :-- | :-- | :-------------------- |
| Gateway        | 2   | 8   | CPU 70%, >200 RPS/pod |
| WS Gateway     | 2   | 6   | Active connections    |
| Auth           | 2   | 6   | CPU 70%               |
| Payments       | 2   | 6   | CPU 70%               |
| Messaging      | 2   | 6   | CPU 70%               |
| Media          | 1   | 4   | CPU 70%               |
| Portfolio/Blog | 1   | 4   | CPU 70%               |
| Others         | 1   | 4   | CPU 70%               |

---

## Workers

Scale based on RabbitMQ queue depth:

```yaml
spec:
  metrics:
    - type: External
      external:
        metric:
          name: rabbitmq_queue_messages
          selector:
            matchLabels:
              queue: email.queue
        target:
          type: AverageValue
          averageValue: '100'
```

---

## Database

- **Read-heavy**: Add read replicas
- **Write-heavy**: Upgrade instance class (RDS)
- **Connection pooling**: Increase `connection_limit` in DATABASE_URL

---

## Redis

- **Cache**: Increase `maxmemory`, consider Redis Cluster for >64GB
- **Pub/Sub**: Minimal scaling needed (lightweight)

---

## Identifying Bottlenecks

Use Prometheus metrics and Grafana dashboards:

- High CPU → Scale pods horizontally
- High memory → Increase limits or optimize queries
- High latency → Check DB query duration, Redis hit ratio
- Queue backlog → Scale workers

---

<div align="center">

**Horizontal Scaling Guide** — Nestlancer guide

</div>
