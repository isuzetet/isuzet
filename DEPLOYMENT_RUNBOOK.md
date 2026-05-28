# RUIT CBE DEPLOYMENT RUNBOOK
## Production Deployment & Operations Guide

**Version:** 1.0  
**Last Updated:** May 29, 2026  
**Target Launch:** June 4, 2026

---

## QUICK START DEPLOYMENT

### Prerequisites
```bash
- Docker 20.10+ installed
- Kubernetes 1.24+ cluster running
- kubectl configured for production cluster
- Access to GitHub: https://github.com/isuzetet/isuzet.git
- Access to production database credentials
- Access to Firebase, SMS, and payment provider keys
```

### 1-Minute Deployment (All Services)

```bash
#!/bin/bash
set -e

# Set variables
COMMIT="d066ebe"  # Latest production commit
NAMESPACE="ruit-cbe"
REGISTRY="ghcr.io/isuzetet"

# 1. Pull latest code
git clone https://github.com/isuzetet/isuzet.git ruit-cbe
cd ruit-cbe
git checkout $COMMIT

# 2. Build Docker images for all services
docker-compose -f Backend/docker-compose.prod.yml build

# 3. Push to registry
docker-compose -f Backend/docker-compose.prod.yml push

# 4. Deploy to Kubernetes
kubectl apply -f Backend/k8s/namespace.yaml
kubectl create configmap ruit-config --from-file=.env.production -n $NAMESPACE
kubectl apply -f Backend/k8s/services/ -n $NAMESPACE
kubectl apply -f Backend/k8s/deployments/ -n $NAMESPACE

# 5. Wait for rollout
kubectl rollout status deployment -l app=ruit-engine -n $NAMESPACE

# 6. Verify health
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

echo "✅ Deployment complete! All services running."
```

---

## DETAILED DEPLOYMENT STEPS

### Step 1: Environment Setup

```bash
# 1. Copy environment template
cp .env.production.template .env.production

# 2. Fill in actual values (use secure vault/secrets manager)
nano .env.production

# Required variables (MUST be set):
- DATABASE_URL
- TIMESCALE_URL
- JWT_SECRET
- WEBHOOK_SECRET
- INTERNAL_SECRET
- FIREBASE_SERVICE_ACCOUNT_PATH
- AFRICAS_TALKING_API_KEY
- AFRICAS_TALKING_USERNAME

# 3. Validate environment
source .env.production
echo $DATABASE_URL  # Should not be empty
echo $FIREBASE_SERVICE_ACCOUNT_PATH  # Should exist
```

### Step 2: Database Preparation

```bash
# 1. Create databases
psql -h $DB_HOST -U postgres -c "CREATE DATABASE ruit_cbe;"
psql -h $DB_HOST -U postgres -c "CREATE DATABASE ruit_timescale;"

# 2. Install TimescaleDB extension
psql -h $DB_HOST -d ruit_timescale -c "CREATE EXTENSION timescaledb;"

# 3. Run Prisma migrations
cd Backend/packages/shared-db
npx prisma migrate deploy --schema ./prisma/schema.prisma

# 4. Seed default data (optional)
npx prisma db seed

# 5. Verify migrations
psql -h $DB_HOST -d ruit_cbe -c "SELECT name FROM _prisma_migrations ORDER BY finished_at;"
```

### Step 3: Container Building

```bash
# Build all 14 engines + workers + notification service
cd Backend

# Option A: Docker Compose (development/staging)
docker-compose -f docker-compose.prod.yml build

# Option B: Individual services
for SERVICE in identity dispatch fleet data location optimizer \
               liquidity notification incident behavior corridor \
               strategy health shock twin workers; do
  docker build -f apps/$SERVICE/Dockerfile -t ruit-$SERVICE:latest .
done

# Option C: Kubernetes (production)
kubectl build --push --registry ghcr.io/isuzetet \
  $(find . -name Dockerfile | xargs)
```

### Step 4: Service Deployment

#### Docker Compose Deployment (Staging)
```bash
# Start all services
docker-compose -f Backend/docker-compose.prod.yml up -d

# Wait for services to be ready
sleep 30

# Check all services healthy
docker-compose ps
curl http://localhost:3001/health  # Identity service
curl http://localhost:3002/health  # Dispatch service
curl http://localhost:3005/health  # Location service
```

#### Kubernetes Deployment (Production)
```bash
# 1. Create namespace
kubectl create namespace ruit-cbe

# 2. Create secrets
kubectl create secret generic firebase-secrets \
  --from-file=service-account.json=/path/to/firebase-creds.json \
  -n ruit-cbe

kubectl create secret generic db-credentials \
  --from-literal=DATABASE_URL=$DATABASE_URL \
  --from-literal=TIMESCALE_URL=$TIMESCALE_URL \
  -n ruit-cbe

# 3. Apply ConfigMaps
kubectl create configmap ruit-config \
  --from-literal=NODE_ENV=production \
  --from-literal=LOG_LEVEL=info \
  --from-literal=JWT_EXPIRE=15m \
  -n ruit-cbe

# 4. Deploy services (one at a time, monitor health)
for SERVICE in identity dispatch fleet data location optimizer \
               liquidity notification incident behavior corridor \
               strategy health shock twin workers; do
  kubectl apply -f Backend/k8s/deployments/$SERVICE.yaml -n ruit-cbe
  kubectl rollout status deployment ruit-$SERVICE -n ruit-cbe
  echo "✅ $SERVICE deployed successfully"
done

# 5. Verify all services
kubectl get pods -n ruit-cbe -o wide
kubectl get svc -n ruit-cbe
```

### Step 5: Health Verification

```bash
#!/bin/bash
# Verify all services are healthy

SERVICES=(
  "http://localhost:3001"   # identity
  "http://localhost:3002"   # dispatch
  "http://localhost:3003"   # fleet
  "http://localhost:3004"   # data
  "http://localhost:3005"   # location
  "http://localhost:3006"   # optimizer
  "http://localhost:3007"   # liquidity
  "http://localhost:3008"   # strategy
  "http://localhost:3009"   # corridor
  "http://localhost:3010"   # behavior
  "http://localhost:3011"   # incident
  "http://localhost:3012"   # health
  "http://localhost:3013"   # notification
  "http://localhost:3014"   # shock
  "http://localhost:3015"   # twin
)

for SERVICE in "${SERVICES[@]}"; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE/health)
  if [ $RESPONSE -eq 200 ]; then
    echo "✅ $SERVICE - Healthy"
  else
    echo "❌ $SERVICE - Unhealthy (HTTP $RESPONSE)"
    exit 1
  fi
done

echo "✅ All services healthy!"
```

### Step 6: Integration Testing

```bash
# Run E2E test suite
cd Backend
npm test -- e2e-test.js

# Expected: 57 assertions all passing
# Output: "✅ All 57 tests passed!"

# Run integration test suites
npm test -- tests/integration/*.test.ts

# Expected: 80+ tests passing
# Output: "PASS: 80/80 tests passed (X.XXs)"
```

### Step 7: Load Testing (Optional but Recommended)

```bash
# Simple load test with Apache Bench
ab -n 1000 -c 100 http://localhost:3001/health

# More detailed load test with wrk
wrk -t4 -c100 -d30s \
  -s Backend/scripts/load-test.lua \
  http://localhost:3001/api/v1/identity/profile

# Watch metrics during load test
# - CPU usage: should stay < 80%
# - Memory: should stay < 85%
# - Response time p95: should stay < 500ms
# - Error rate: should stay < 0.1%
```

---

## COMMON OPERATIONS

### Restart a Service
```bash
# Docker Compose
docker-compose restart identity

# Kubernetes
kubectl rollout restart deployment ruit-identity -n ruit-cbe
```

### View Service Logs
```bash
# Docker Compose
docker logs -f ruit-cbe-identity-1

# Kubernetes
kubectl logs -f deployment/ruit-identity -n ruit-cbe
kubectl logs -f deployment/ruit-identity -n ruit-cbe --tail=100

# Search logs for errors
kubectl logs -n ruit-cbe -l app=ruit-engine | grep ERROR
```

### Scale a Service
```bash
# Kubernetes - increase replicas
kubectl scale deployment ruit-identity --replicas=3 -n ruit-cbe

# Watch scaling
kubectl get deployment ruit-identity -n ruit-cbe -w
```

### Database Backup
```bash
# Full backup
pg_dump -h $DB_HOST -U postgres ruit_cbe > ruit_cbe_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h $DB_HOST -U postgres < ruit_cbe_backup_20260604_000000.sql

# Scheduled backups (cron)
0 2 * * * /usr/local/bin/backup-database.sh  # Daily at 2 AM
```

### Monitor Metrics
```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus -n ruit-cbe 9090:9090

# Port-forward Grafana
kubectl port-forward svc/grafana -n ruit-cbe 3000:3000

# View key metrics
curl http://localhost:9090/api/v1/query?query='rate(http_requests_total[5m])'
```

---

## TROUBLESHOOTING

### Service Won't Start
```bash
# 1. Check logs for errors
kubectl logs deployment/ruit-identity -n ruit-cbe

# 2. Check environment variables
kubectl exec -it pod/ruit-identity-xxxxx -n ruit-cbe -- env | grep DATABASE_URL

# 3. Check database connectivity
kubectl exec -it pod/ruit-identity-xxxxx -n ruit-cbe -- psql $DATABASE_URL -c "SELECT 1"

# 4. Check port availability
kubectl describe pod ruit-identity-xxxxx -n ruit-cbe
```

### High Latency
```bash
# 1. Check database slow queries
psql -h $DB_HOST -d ruit_cbe -c "\d pg_stat_statements" 
SELECT query, calls, mean_time FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 10;

# 2. Check Redis memory usage
redis-cli --host $REDIS_HOST INFO memory

# 3. Check network connectivity between services
kubectl exec -it pod/ruit-identity-xxxxx -n ruit-cbe -- \
  curl http://ruit-location:3005/health
```

### Database Disk Space
```bash
# Check disk usage
psql -h $DB_HOST -U postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"

# Clean up logs/temporary data
VACUUM FULL;
REINDEX DATABASE ruit_cbe;
```

---

## ROLLBACK PROCEDURES

### Quick Rollback (Last Commit)
```bash
# Revert to previous stable commit (f7540e2)
git revert d066ebe --no-edit
git push origin main

# Redeploy
kubectl rollout undo deployment/ruit-identity -n ruit-cbe
kubectl rollout undo deployment/ruit-dispatch -n ruit-cbe
# ... repeat for all services

# Restore database from backup
psql -h $DB_HOST -U postgres < ruit_cbe_backup_prestable.sql
```

### Database Rollback
```bash
# List recent migrations
psql -d ruit_cbe -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# Rollback to specific migration
# (Note: Prisma doesn't support automatic rollback; use manual SQL)
psql -d ruit_cbe -f rollback_migration_20260604.sql
```

---

## MONITORING & ALERTS

### Key Metrics to Monitor
- **Uptime:** All services should have 99.9%+ uptime
- **Latency:** p95 response time < 500ms
- **Error Rate:** < 0.1% (< 1 error per 1000 requests)
- **Database:** Query latency p95 < 200ms
- **Cache:** Hit rate > 80%
- **Throughput:** Sustained 1000+ requests/second

### Alert Thresholds
```yaml
alerts:
  - error_rate > 1%: Page on-call immediately
  - response_time_p95 > 2s: Alert in Slack
  - database_connections > 90: Alert and scale
  - redis_memory > 90%: Alert and clean up
  - disk_usage > 85%: Alert and archive logs
  - service_down: Page on-call immediately
```

---

## MAINTENANCE WINDOWS

### Weekly (Sunday 2:00-2:30 AM UTC)
- [ ] Database VACUUM
- [ ] Backup verification
- [ ] Log rotation

### Monthly (First Saturday, 2:00-3:00 AM UTC)
- [ ] Database REINDEX
- [ ] Full backup test restore
- [ ] Dependency security scan
- [ ] Performance baseline analysis

### Quarterly (End of quarter)
- [ ] Major version updates
- [ ] Database optimization
- [ ] Architecture review

---

**For questions or issues, contact:** devops@ruit.com.et
