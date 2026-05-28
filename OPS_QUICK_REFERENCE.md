# RUIT CBE OPS QUICK REFERENCE CARD
## Emergency Commands & Critical Information

**Laminate This! Keep on your desk during launch.**

---

## EMERGENCY CONTACTS

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Platform Lead | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Backend Lead | [Name] | [Phone] | [Email] |
| DBA | [Name] | [Phone] | [Email] |
| Incident Commander | [Name] | [Phone] | [Email] |

**Escalation:** Error Rate > 1% → Page On-Call  
**Dashboard:** https://grafana.ruit.internal:3000

---

## SERVICE PORTS & HEALTH CHECKS

```
3001: Identity       → curl http://localhost:3001/health
3002: Dispatch       → curl http://localhost:3002/health
3003: Fleet          → curl http://localhost:3003/health
3004: Data           → curl http://localhost:3004/health
3005: Location       → curl http://localhost:3005/health
3006: Optimizer      → curl http://localhost:3006/health
3007: Liquidity      → curl http://localhost:3007/health
3008: Strategy       → curl http://localhost:3008/health
3009: Corridor       → curl http://localhost:3009/health
3010: Behavior       → curl http://localhost:3010/health
3011: Incident       → curl http://localhost:3011/health
3012: Health         → curl http://localhost:3012/health
3013: Notification   → curl http://localhost:3013/health
3014: Shock          → curl http://localhost:3014/health
3015: Twin           → curl http://localhost:3015/health
```

---

## CRITICAL METRICS TARGETS

- **Uptime:** > 99.9%
- **Error Rate:** < 0.1%
- **Response p95:** < 500ms
- **Database Latency p95:** < 200ms
- **SMS Delivery:** > 99%
- **Payment Success:** > 99%

---

## CRITICAL COMMANDS

### Check All Services Health
```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015; do
  curl -s http://localhost:$port/health | jq '.status' || echo "PORT $port DOWN"
done
```

### Restart All Services
```bash
# Docker Compose
docker-compose restart

# Kubernetes
kubectl rollout restart deployment -n ruit-cbe
```

### Restart Single Service
```bash
# Docker Compose
docker-compose restart identity

# Kubernetes
kubectl rollout restart deployment/ruit-identity -n ruit-cbe
```

### View Service Logs (Last 100 Lines)
```bash
# Docker Compose
docker logs -f --tail=100 ruit-cbe-identity-1

# Kubernetes
kubectl logs -f deployment/ruit-identity -n ruit-cbe --tail=100
```

### Check Database Connection
```bash
psql -h $DB_HOST -U postgres -d ruit_cbe -c "SELECT 1"
# Should return "1" if connected
```

### Check Redis Connection
```bash
redis-cli -h $REDIS_HOST ping
# Should return "PONG"
```

### Monitor CPU/Memory per Service
```bash
# Docker
docker stats

# Kubernetes
kubectl top pods -n ruit-cbe
```

### Scale Service to N Replicas
```bash
kubectl scale deployment/ruit-identity --replicas=5 -n ruit-cbe
```

### View Database Slow Queries
```bash
psql -d ruit_cbe -c "SELECT query, calls, mean_time 
  FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## ALERT RESPONSE PROCEDURES

### IF Error Rate > 1% (CRITICAL)
```
1. Page on-call engineer IMMEDIATELY
2. Identify which service is erroring:
   for service in identity dispatch fleet data location optimizer liquidity; do
     ERROR_COUNT=$(kubectl logs deployment/ruit-$service -n ruit-cbe | grep -c ERROR)
     echo "$service: $ERROR_COUNT errors"
   done
3. Restart the erroring service:
   kubectl rollout restart deployment/ruit-[SERVICE] -n ruit-cbe
4. Monitor error rate for 5 minutes
5. If still high, escalate to Engineering Lead
```

### IF Database Connection Pool Exhausted (CRITICAL)
```
1. Check connections:
   psql -d ruit_cbe -c "SELECT count(*) FROM pg_stat_activity;"
2. Kill idle connections:
   psql -d ruit_cbe -c "SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity WHERE state='idle';"
3. Increase pool size temporarily:
   kubectl set env deployment/ruit-identity \
     DATABASE_POOL_SIZE=100 -n ruit-cbe
4. Investigate root cause (usually a service leak)
```

### IF Redis Memory > 85% (HIGH)
```
1. Check memory:
   redis-cli -h $REDIS_HOST info memory
2. Clear old session data:
   redis-cli -h $REDIS_HOST MEMORY PURGE
3. Clear specific keys by pattern:
   redis-cli -h $REDIS_HOST EVAL "return redis.call('DEL', unpack(redis.call('KEYS', 'session:*')))" 0
4. Monitor trend for growth pattern
```

### IF Response Time p95 > 2 seconds (HIGH)
```
1. Check if specific endpoint:
   kubectl logs -n ruit-cbe -l app=ruit-engine | grep "duration:" | sort | tail -20
2. Check database latency:
   psql -d ruit_cbe -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
3. If database slow:
   - Run VACUUM: psql -d ruit_cbe -c "VACUUM ANALYZE;"
   - Add index if needed
4. If service slow:
   - Scale up replicas: kubectl scale deployment/ruit-[SERVICE] --replicas=5 -n ruit-cbe
   - Check for memory leaks
```

### IF Service Won't Start (DOWN)
```
1. Check logs for startup errors:
   kubectl logs deployment/ruit-identity -n ruit-cbe
2. Check environment variables set:
   kubectl describe pod ruit-identity-xxxxx -n ruit-cbe
3. Check database connectivity:
   kubectl exec pod/ruit-identity-xxxxx -n ruit-cbe -- psql $DATABASE_URL -c "SELECT 1"
4. If env var missing, set it:
   kubectl set env deployment/ruit-identity DATABASE_URL=$DATABASE_URL -n ruit-cbe
5. Restart service:
   kubectl rollout restart deployment/ruit-identity -n ruit-cbe
```

---

## ROLLBACK PROCEDURE (If Bad Deployment)

```bash
# 1. Identify the bad commit
git log --oneline -5
# Find the commit before bad one

# 2. Revert the bad commit
git revert [BAD_COMMIT_ID] --no-edit
git push origin main

# 3. Redeploy all services
kubectl rollout undo deployment -n ruit-cbe
# Or manually redeploy stable version

# 4. Verify services healthy
kubectl get pods -n ruit-cbe
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015; do
  curl -s http://localhost:$port/health
done

# 5. Notify team and schedule postmortem
```

---

## BACKUP & RECOVERY

### Manual Backup
```bash
# Full database backup
pg_dump -h $DB_HOST -U postgres ruit_cbe > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h $DB_HOST -U postgres < backup_20260604_000000.sql
```

### Verify Latest Backup
```bash
# Check backup exists and is recent
ls -lh *.sql | head -1
# Should be < 24 hours old

# Test restore (to test database)
pg_restore -h $DB_HOST -d ruit_cbe_test $LATEST_BACKUP
```

---

## CAPACITY CHECKS

### Check Disk Space
```bash
df -h /data
# Should have > 20% free space
```

### Check Database Size
```bash
psql -h $DB_HOST -d ruit_cbe -c "SELECT pg_size_pretty(pg_database_size('ruit_cbe'));"
```

### Check Redis Memory
```bash
redis-cli -h $REDIS_HOST info memory | grep used_memory_human
```

### Check Table Sizes
```bash
psql -d ruit_cbe -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
  FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

---

## DEBUGGING

### Follow Live Logs with Grep
```bash
# All ERROR logs
kubectl logs -f -n ruit-cbe -l app=ruit-engine | grep ERROR

# Specific service logs
kubectl logs -f deployment/ruit-identity -n ruit-cbe

# Last 50 lines
kubectl logs deployment/ruit-identity -n ruit-cbe --tail=50
```

### Execute Commands in Pod
```bash
# Open shell in pod
kubectl exec -it pod/ruit-identity-xxxxx -n ruit-cbe -- /bin/sh

# Run single command
kubectl exec pod/ruit-identity-xxxxx -n ruit-cbe -- psql $DATABASE_URL -c "SELECT COUNT(*) FROM user;"
```

### Port Forward to Local Machine
```bash
# Forward Prometheus metrics
kubectl port-forward svc/prometheus -n ruit-cbe 9090:9090

# Forward Grafana
kubectl port-forward svc/grafana -n ruit-cbe 3000:3000

# Forward database (for external tools)
kubectl port-forward svc/postgres -n ruit-cbe 5432:5432
```

---

## QUICK HEALTH CHECK SCRIPT

```bash
#!/bin/bash
# Save as: health-check.sh
# Usage: ./health-check.sh

echo "=== RUIT CBE Health Check $(date) ==="
echo ""

# Check services
echo "Service Health:"
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  [ "$STATUS" = "200" ] && echo "✅ Port $port" || echo "❌ Port $port (HTTP $STATUS)"
done

# Check database
echo ""
echo "Database:"
psql -h $DB_HOST -d ruit_cbe -c "SELECT 1" > /dev/null 2>&1 && echo "✅ Connected" || echo "❌ Connection failed"

# Check Redis
echo ""
echo "Redis:"
redis-cli -h $REDIS_HOST ping | grep -q "PONG" && echo "✅ Connected" || echo "❌ Connection failed"

# Check metrics
echo ""
echo "Metrics:"
echo -n "Error Rate: "
kubectl logs -n ruit-cbe -l app=ruit-engine --since=5m | grep -c "ERROR" | awk '{print $1 " errors in 5 min"}'

echo ""
echo "=== Check Complete ==="
```

---

## USEFUL LINKS

- **Grafana Dashboard:** https://grafana.ruit.internal:3000
- **Prometheus Metrics:** http://prometheus.ruit.internal:9090
- **API Documentation:** https://api-docs.ruit.internal
- **Slack #incidents:** https://isuzet.slack.com/channels/incidents
- **GitHub Repo:** https://github.com/isuzetet/isuzet
- **Runbook:** https://wiki.ruit.internal/runbook

---

## KEY DATES

- **Launch Day:** June 4, 2026, 00:00 UTC (6:00 AM EAT)
- **Ramp-up Period:** June 4-6, 2026 (72 hours)
- **First Weekly Maintenance:** June 9, 2026, 02:00 UTC
- **First Monthly Review:** June 28, 2026
- **90-Day Review:** September 2, 2026

---

**Keep this accessible during launch! Laminate and post near workstations.**

**Version:** 1.0 | **Last Updated:** May 29, 2026 | **Next Review:** June 4, 2026
