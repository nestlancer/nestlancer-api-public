<div align="center">

# Database Failover Procedure

</div>

---

## Automatic Failover (Patroni)

Patroni handles automatic failover in most cases:

1. **Detection**: Patroni health checks detect primary failure (timeout: 30s)
2. **Promotion**: Patroni auto-promotes the healthiest replica to primary
3. **DNS Update**: Patroni updates the leader endpoint
4. **Services reconnect**: Connection pools automatically reconnect to new primary

---

## Manual Failover

If automatic failover fails:

### Steps

1. **Verify primary is truly down**:

   ```bash
   kubectl exec -it postgresql-primary-0 -- pg_isready
   ```

2. **Check Patroni status**:

   ```bash
   kubectl exec -it postgresql-primary-0 -- patronictl list
   ```

3. **Manual promotion** (if needed):

   ```bash
   kubectl exec -it postgresql-replica-0 -- patronictl failover --leader postgresql-primary-0 --candidate postgresql-replica-0
   ```

4. **Update connection strings** (if not using Patroni DNS):
   - Update `DATABASE_URL` in Kubernetes Secrets / Secrets Manager
   - Restart affected services: `kubectl rollout restart deployment -l app.kubernetes.io/part-of=nestlancer`

5. **Verify write operations**:

   ```bash
   curl -X POST https://api.nestlancer.com/api/v1/health -d '{"write_test": true}'
   ```

6. **Rebuild old primary as replica**:

   ```bash
   kubectl exec -it postgresql-primary-0 -- patronictl reinit nestlancer postgresql-primary-0
   ```

7. **Verify replication lag is zero**:
   ```bash
   kubectl exec -it postgresql-primary-0 -- psql -c "SELECT pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag_bytes;"
   ```

---

<div align="center">

**Database Failover Procedure** — Nestlancer guide

</div>
