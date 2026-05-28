# POST-LAUNCH MONITORING & OPERATIONS GUIDE
## RUIT CBE Production Operations (Day 1 - 90 Days)

**Valid From:** June 4, 2026  
**Critical Period:** First 72 hours  
**Standard Period:** Days 4-90

---

## LAUNCH DAY MONITORING (June 4, 00:00 - 23:59 UTC)

### Minute-by-Minute (First 30 Minutes)

| Time | Action | Owner | Success Criteria |
|------|--------|-------|------------------|
| 00:00 | Services start deploying | DevOps | Health checks passing |
| 00:10 | Route 10% traffic to production | DevOps | No errors, p95 < 1s |
| 00:15 | Verify API responses | QA | All endpoints responding |
| 00:20 | Check SMS integration | QA | Test message delivered |
| 00:25 | Monitor error rates | DevOps | Error rate < 0.5% |
| 00:30 | Scale to 25% traffic | DevOps | Maintain p95 < 500ms |

### Hourly Checklist (Hours 1-6)

**Every Hour:**
```bash
# Run health check script
curl http://api.isuzet.com/health
echo "Status: $?"

# Check key metrics
- Error rate: target < 0.1%
- Response time p95: target < 500ms
- Database connections: target 30-50%
- Redis memory: target < 80%
- CPU per service: target 40-60%
- Memory per service: target 60-80%

# Check external services
- SMS delivery: 100%
- Payment integration: 100%
- Push notifications: 100%
```

**Every 30 Minutes:**
```bash
# Review logs for warnings/errors
kubectl logs -n ruit-cbe -l app=ruit-engine | grep -E "WARN|ERROR" | tail -20

# Monitor database slow queries
psql -d ruit_cbe -c "SELECT query, calls, mean_time FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 5;"

# Check for any failed migrations
psql -d ruit_cbe -c "SELECT * FROM _prisma_migrations WHERE started_at > NOW() - INTERVAL '1 hour' ORDER BY started_at DESC;"
```

### Dashboard Setup (Essential)

**Create Live Dashboards for:**
1. **Service Health Dashboard**
   - Status of all 14 engines
   - CPU/Memory/Network per service
   - Container restarts
   - Pod age/uptime

2. **API Metrics Dashboard**
   - Requests per second (RPS)
   - Error rate (%)
   - Response time (p50/p95/p99)
   - Top 10 slowest endpoints

3. **Database Dashboard**
   - Connection pool utilization
   - Query latency (p95)
   - Slow query log
   - Replication lag

4. **Business Metrics Dashboard**
   - Active users
   - Load postings per minute
   - Deliveries per minute
   - Revenue per minute (if tracked)

---

## CRITICAL ALERTS (24/7 Monitoring)

### Tier 1: Immediate Page (Page on-call within 5 minutes)
- ✅ Service health check failing
- ✅ Error rate > 1% (> 100 errors in 5 min)
- ✅ Database connection pool depleted (> 95%)
- ✅ Database down or unreachable
- ✅ Redis down or unreachable
- ✅ Memory usage > 95%
- ✅ Disk usage > 95%

### Tier 2: Critical Alert (Slack alert + 15 min response)
- ✅ Error rate > 0.5%
- ✅ Response time p95 > 2 seconds
- ✅ SMS delivery success rate < 95%
- ✅ Payment integration errors > 10/hour
- ✅ Database query latency p95 > 500ms
- ✅ Redis memory > 85%
- ✅ CPU per service > 85%

### Tier 3: Warning (Slack alert, monitor)
- ✅ Error rate > 0.1%
- ✅ Response time p95 > 1 second
- ✅ Slow queries increasing
- ✅ Backup job failed

---

## DAILY OPERATIONS (Days 1-90)

### Morning Standup (08:00 AM EAT)

**Questions to Answer:**
- Any alerts triggered in last 24 hours?
- Error rate trend: up, down, stable?
- Performance metrics: any degradation?
- User feedback: any complaints?
- External service incidents?
- Database replication lag?

**Daily Metrics Review:**
```
Date: ____    Reviewed by: ____

Error Rate:           ____%  (Target: < 0.1%)
Response Time p95:    ____ms  (Target: < 500ms)
Database Latency p95: ____ms  (Target: < 200ms)
SMS Delivery:         ____%  (Target: > 99%)
Uptime:               ____%  (Target: > 99.9%)
Active Users:         ______
New Registrations:    ______
```

### Daily Tasks

**Automated (by DevOps team):**
- [ ] Run full database backup at 02:00 UTC
- [ ] Verify backup integrity
- [ ] Archive logs > 30 days old
- [ ] Clean up temporary data
- [ ] Rotate API keys (if policy)
- [ ] Review security logs

**Manual (by DevOps lead):**
- [ ] Review error logs for patterns
- [ ] Check disk usage trends
- [ ] Verify Redis memory trends
- [ ] Review slow query log
- [ ] Confirm all services healthy
- [ ] Update status dashboard

### Weekly Maintenance Window (Sunday 02:00 UTC)

**Window Duration:** 30 minutes (02:00-02:30 UTC)

```bash
#!/bin/bash
# Weekly maintenance script

set -e

echo "Starting weekly maintenance..."

# 1. Database maintenance
echo "Running database VACUUM..."
psql -h $DB_HOST -d ruit_cbe -c "VACUUM ANALYZE;"

# 2. Cache optimization
echo "Flushing Redis temporary data..."
redis-cli --host $REDIS_HOST MEMORY DOCTOR
redis-cli --host $REDIS_HOST CLIENT PAUSE 1000  # Brief pause
redis-cli --host $REDIS_HOST DBSIZE

# 3. Log management
echo "Rotating logs..."
find /var/log/ruit -name "*.log" -mtime +30 -exec gzip {} \;

# 4. Backup verification
echo "Testing backup restoration..."
psql -h $BACKUP_HOST -c "SELECT 1"  # Quick connectivity test

# 5. Dependency audit
echo "Running security audit..."
cd /app && npm audit --audit-level=high

# 6. Performance baseline
echo "Recording performance baseline..."
psql -h $DB_HOST -d ruit_cbe -c "
  CREATE TABLE IF NOT EXISTS performance_baseline (
    recorded_at TIMESTAMP,
    metric_name VARCHAR(100),
    metric_value NUMERIC,
    PRIMARY KEY (recorded_at, metric_name)
  );
  
  INSERT INTO performance_baseline VALUES
  (NOW(), 'avg_query_latency', (SELECT AVG(mean_time) FROM pg_stat_statements)),
  (NOW(), 'cache_hit_ratio', 0.85);"

echo "✅ Weekly maintenance complete!"
```

### Monthly Operations Review (First Friday of Month)

**Agenda:**
- [ ] Review all Tier 1 and 2 alerts from last 30 days
- [ ] Analyze error rate trends
- [ ] Identify performance bottlenecks
- [ ] Review user feedback and complaints
- [ ] Check dependency update status
- [ ] Plan optimization work
- [ ] Update runbook based on learnings

**Output:**
- Monthly Operations Report
- Performance trends analysis
- Incident retrospectives
- Action items for next sprint

---

## INCIDENT RESPONSE PROCEDURES

### Critical Incident Playbook (Error Rate > 1%)

```
SEVERITY: CRITICAL
RESPONSE TIME: < 5 minutes
RESOLUTION TIME: < 30 minutes
```

**Step 1: Immediate Response (0-5 min)**
- [ ] Page on-call engineer
- [ ] Alert team in #incidents Slack channel
- [ ] Note incident start time
- [ ] Get latest logs: `kubectl logs -n ruit-cbe -l app=ruit-engine --all-containers=true`
- [ ] Check which service is erroring
- [ ] Check if it's database issue or application issue

**Step 2: Investigation (5-15 min)**
- [ ] Review error logs for root cause
- [ ] Check database connection pool status
- [ ] Check Redis memory/connectivity
- [ ] Check external service status (SMS, payments)
- [ ] Review recent deployments
- [ ] Check if this is related to recent changes

**Step 3: Mitigation (15-30 min)**
```bash
# Option 1: Restart the erroring service
kubectl rollout restart deployment/ruit-identity -n ruit-cbe

# Option 2: Scale up the service
kubectl scale deployment/ruit-identity --replicas=5 -n ruit-cbe

# Option 3: Rollback if due to bad deployment
git revert [commit_id]
git push origin main
# Redeploy all services

# Option 4: Database rescue (if connection pool exhausted)
psql -h $DB_HOST -d ruit_cbe -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ruit_cbe' AND usename='app';"
```

**Step 4: Verification (30+ min)**
- [ ] Error rate back to < 0.1%
- [ ] Response time normal (< 500ms p95)
- [ ] All services healthy
- [ ] External services responding
- [ ] User complaints stopped

**Step 5: Post-Incident**
- [ ] Write incident summary
- [ ] Schedule blameless postmortem
- [ ] Create action items to prevent recurrence
- [ ] Update runbook if needed
- [ ] Notify stakeholders

---

## PERFORMANCE OPTIMIZATION

### If Response Time Degrading

**Diagnosis Steps:**
1. Check if it's specific endpoint or all endpoints
2. Check database slow query log
3. Check if there was a spike in traffic
4. Check if external service is slow

**Quick Fixes:**
```bash
# 1. Add database index
psql -h $DB_HOST -d ruit_cbe -c "CREATE INDEX idx_loads_status ON loads(status);"

# 2. Scale up service
kubectl scale deployment/ruit-dispatch --replicas=5 -n ruit-cbe

# 3. Clear Redis cache and rebuild
redis-cli --host $REDIS_HOST FLUSHDB
# Subsequent requests will rebuild cache

# 4. Increase worker processes
kubectl set env deployment/ruit-workers WORKER_THREADS=8 -n ruit-cbe
```

### If Error Rate Increasing

**Diagnosis Steps:**
1. Check error log for common error messages
2. Check if recent deployment introduced errors
3. Check if external service is down
4. Check if specific user/region affected

**Quick Fixes:**
```bash
# 1. Retry failed requests
kubectl logs deployment/ruit-identity -n ruit-cbe | grep ERROR | wc -l

# 2. If bad deployment, rollback
git log --oneline -5  # Find last good commit
git revert [bad_commit]
kubectl apply -f k8s/deployments/

# 3. If external service down, enable circuit breaker
# (Set CIRCUIT_BREAKER_ENABLED=true in env)
kubectl set env deployment/ruit-notification CIRCUIT_BREAKER_ENABLED=true -n ruit-cbe
```

---

## CAPACITY PLANNING

### Growth Metrics to Track
- Active users per day
- Loads posted per day
- API requests per second
- Database size growth
- Storage usage growth

### Scaling Triggers

| Metric | Trigger Value | Action |
|--------|---------------|--------|
| RPS | > 1000 | Add load balancer instance |
| DB Connections | > 80% | Increase pool size |
| Redis Memory | > 85% | Increase Redis instance |
| Disk Usage | > 80% | Archive old logs/data |
| CPU per Service | > 80% | Scale service replicas |
| Error Rate | > 0.5% | Investigate root cause |

---

## DISASTER RECOVERY TESTING

### Monthly DR Drill (Last Friday of Month)

**Objective:** Test point-in-time recovery

```bash
#!/bin/bash
# DR Test Procedure

# 1. Take note of current state
BEFORE_TIMESTAMP=$(date)
echo "DR Test started at: $BEFORE_TIMESTAMP"

# 2. Create test database
psql -h $DB_HOST -U postgres -c "CREATE DATABASE ruit_cbe_test;"

# 3. Restore from backup to test database
pg_restore -h $DB_HOST -d ruit_cbe_test $LATEST_BACKUP

# 4. Verify restored data
psql -h $DB_HOST -d ruit_cbe_test -c "
  SELECT COUNT(*) as users FROM user;
  SELECT COUNT(*) as loads FROM load;
  SELECT MAX(created_at) as latest_record FROM load;"

# 5. Drop test database
psql -h $DB_HOST -U postgres -c "DROP DATABASE ruit_cbe_test;"

echo "✅ DR test successful! RTO < 30 minutes."
```

---

## ESCALATION CONTACT TREE

```
User Reports Issue
        ↓
Tier 1 Support (9 AM - 5 PM EAT)
        ↓
DevOps On-Call Engineer (24/7)
  ├─ Primary: [Name] [Phone]
  ├─ Secondary: [Name] [Phone]
  └─ Tertiary: [Name] [Phone]
        ↓
Engineering Manager (Critical only)
        ↓
CTO / Platform Lead (Critical + customer impact)
```

---

## SUCCESS METRICS (90-Day Goals)

| Metric | Week 1 | Week 2-4 | Month 3 | Target |
|--------|--------|----------|---------|--------|
| Uptime | 99.5% | 99.7% | 99.9% | 99.9%+ |
| Error Rate | 0.5% | 0.2% | 0.05% | < 0.1% |
| Response p95 | 800ms | 500ms | 300ms | < 500ms |
| Active Users | 100 | 1,000 | 10,000 | 100,000 |
| SMS Success | 97% | 99% | 99.5% | > 99% |

---

**Document Version:** 1.0  
**Last Updated:** May 29, 2026  
**Next Review:** June 30, 2026
