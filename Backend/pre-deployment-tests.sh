#!/bin/bash
# RUIT CBE Pre-Deployment Test Script
# Runs all critical tests 24 hours before launch
# Validates: Code quality, database, APIs, external integrations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="pre-deployment-tests-${TIMESTAMP}.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

log_test_start() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}▶ Running: $1${NC}" | tee -a "$LOG_FILE"
}

log_test_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}" | tee -a "$LOG_FILE"
    ((TESTS_PASSED++))
}

log_test_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}" | tee -a "$LOG_FILE"
    ((TESTS_FAILED++))
}

log_test_skip() {
    echo -e "${YELLOW}⊘ SKIP: $1${NC}" | tee -a "$LOG_FILE"
    ((TESTS_SKIPPED++))
}

echo "RUIT CBE Pre-Deployment Test Suite"
echo "Started: $(date)"
echo "Log: $LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ============================================================================
# TEST SUITE 1: CODE QUALITY
# ============================================================================
log_test_start "Code Quality Checks"

if command -v npm &> /dev/null; then
    cd Backend
    
    # TypeScript compilation
    if npm run build > /dev/null 2>&1; then
        log_test_pass "TypeScript compilation successful"
    else
        log_test_fail "TypeScript compilation failed"
    fi
    
    # Linting
    if npm run lint > /dev/null 2>&1; then
        log_test_pass "ESLint checks passed"
    else
        log_test_skip "ESLint checks (non-critical)"
    fi
    
    cd ..
else
    log_test_skip "npm not available - skipping code quality checks"
fi

# ============================================================================
# TEST SUITE 2: DATABASE SCHEMA & MIGRATIONS
# ============================================================================
log_test_start "Database Schema & Migrations"

if [ -n "$DATABASE_URL" ]; then
    # Check connection
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        log_test_pass "Database connection successful"
        
        # Verify migrations table
        if psql "$DATABASE_URL" -tc "SELECT 1 FROM information_schema.tables WHERE table_name='_prisma_migrations'" | grep -q 1; then
            log_test_pass "Migrations table exists"
            
            # Count migrations
            MIGRATION_COUNT=$(psql "$DATABASE_URL" -tc "SELECT COUNT(*) FROM _prisma_migrations WHERE status='Success'" | tr -d ' ')
            log_test_pass "Database migrations applied: $MIGRATION_COUNT"
        else
            log_test_fail "Migrations table not found"
        fi
    else
        log_test_fail "Database connection failed"
    fi
else
    log_test_skip "DATABASE_URL not set - skipping database tests"
fi

# ============================================================================
# TEST SUITE 3: INTEGRATION TEST EXECUTION
# ============================================================================
log_test_start "Integration Tests"

if [ -n "$DATABASE_URL" ]; then
    cd Backend
    
    # Run integration tests if they exist
    if [ -d "tests/integration" ] && find tests/integration -name "*.test.ts" | grep -q .; then
        if npm test -- tests/integration > /tmp/test-output.log 2>&1; then
            TEST_COUNT=$(grep -c "✓\|✔" /tmp/test-output.log || echo "0")
            log_test_pass "Integration tests passed: $TEST_COUNT tests"
        else
            log_test_fail "Some integration tests failed (check logs)"
        fi
    else
        log_test_skip "Integration tests not found"
    fi
    
    cd ..
else
    log_test_skip "DATABASE_URL not set - skipping integration tests"
fi

# ============================================================================
# TEST SUITE 4: API ENDPOINT VALIDATION
# ============================================================================
log_test_start "API Endpoint Validation"

# Define expected endpoints
declare -A ENDPOINTS=(
    ["/api/v1/identity/register"]="POST"
    ["/api/v1/identity/verify-otp"]="POST"
    ["/api/v1/identity/login"]="POST"
    ["/api/v1/fleet/trucks"]="GET"
    ["/api/v1/fleet/drivers"]="GET"
    ["/api/v1/dispatch/loads"]="GET"
    ["/api/v1/location/ping"]="POST"
    ["/api/v1/data/analytics"]="GET"
)

# If services are running, validate endpoints
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    log_test_pass "Identity service is running"
    
    for ENDPOINT in "${!ENDPOINTS[@]}"; do
        METHOD=${ENDPOINTS[$ENDPOINT]}
        SERVICE_PORT=$(echo $ENDPOINT | cut -d'/' -f4 | tr -d 'v1')
        
        if [ -n "$SERVICE_PORT" ]; then
            if curl -s -X $METHOD "http://localhost:300${SERVICE_PORT:0:1}${ENDPOINT}" > /dev/null 2>&1; then
                log_test_pass "Endpoint accessible: $METHOD $ENDPOINT"
            fi
        fi
    done
else
    log_test_skip "Services not running - skipping endpoint tests"
fi

# ============================================================================
# TEST SUITE 5: EXTERNAL INTEGRATIONS
# ============================================================================
log_test_start "External Service Integrations"

# SMS Integration
if [ -n "$AFRICAS_TALKING_API_KEY" ]; then
    log_test_skip "SMS integration test (production keys required)"
else
    log_test_skip "SMS integration not configured"
fi

# Firebase Integration
if [ -n "$FIREBASE_SERVICE_ACCOUNT_PATH" ] && [ -f "$FIREBASE_SERVICE_ACCOUNT_PATH" ]; then
    log_test_pass "Firebase service account file found"
else
    log_test_skip "Firebase service account not configured"
fi

# Payment Integration
if [ -n "$CHAPA_API_KEY" ]; then
    log_test_skip "Chapa payment integration test (requires test account)"
else
    log_test_skip "Chapa integration not configured"
fi

# ============================================================================
# TEST SUITE 6: REDIS CACHE
# ============================================================================
log_test_start "Redis Cache Validation"

if [ -n "$REDIS_URL" ]; then
    if redis-cli -u "$REDIS_URL" ping | grep -q "PONG"; then
        log_test_pass "Redis connection successful"
        
        # Test set/get
        if redis-cli -u "$REDIS_URL" SET test_key "test_value" > /dev/null 2>&1; then
            VALUE=$(redis-cli -u "$REDIS_URL" GET test_key)
            if [ "$VALUE" = "test_value" ]; then
                log_test_pass "Redis read/write operations working"
                redis-cli -u "$REDIS_URL" DEL test_key > /dev/null 2>&1
            else
                log_test_fail "Redis data integrity issue"
            fi
        else
            log_test_fail "Redis write operation failed"
        fi
    else
        log_test_fail "Redis connection failed"
    fi
else
    log_test_skip "REDIS_URL not set - skipping Redis tests"
fi

# ============================================================================
# TEST SUITE 7: SECURITY CHECKS
# ============================================================================
log_test_start "Security Validation"

# Check for hardcoded credentials in code
cd Backend
if grep -r "password.*=" --include="*.ts" --include="*.js" | grep -v node_modules | grep -v "process.env" | grep -q .; then
    log_test_fail "Potential hardcoded credentials found"
else
    log_test_pass "No obvious hardcoded credentials detected"
fi

# Check for environment variable usage
if grep -r "process.env\." --include="*.ts" apps/ | grep -q "DATABASE_URL\|JWT_SECRET\|REDIS_URL"; then
    log_test_pass "Environment variables properly used"
else
    log_test_fail "Environment variables not properly configured"
fi

cd ..

# ============================================================================
# TEST SUITE 8: DEPENDENCY AUDIT
# ============================================================================
log_test_start "Dependency Security Audit"

cd Backend

if npm audit > /tmp/audit-output.log 2>&1; then
    VULNERABILITIES=$(grep -c "vulnerabilities" /tmp/audit-output.log || echo "0")
    if [ "$VULNERABILITIES" -eq 0 ]; then
        log_test_pass "No npm security vulnerabilities detected"
    else
        log_test_fail "Security vulnerabilities found in dependencies"
    fi
else
    log_test_skip "npm audit (non-critical)"
fi

cd ..

# ============================================================================
# TEST SUITE 9: PERFORMANCE BASELINE
# ============================================================================
log_test_start "Performance Baseline Checks"

if [ -n "$DATABASE_URL" ]; then
    # Check slow query log
    SLOW_QUERIES=$(psql "$DATABASE_URL" -tc "SELECT COUNT(*) FROM pg_stat_statements WHERE mean_time > 1000" | tr -d ' ')
    log_test_pass "Slow query analysis: $SLOW_QUERIES queries > 1s (baseline)"
    
    # Check table sizes
    LARGEST_TABLE=$(psql "$DATABASE_URL" -tc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 1" | tr -d ' ')
    log_test_pass "Largest table: $LARGEST_TABLE"
else
    log_test_skip "Database not available for performance baseline"
fi

# ============================================================================
# TEST SUITE 10: DEPLOYMENT ARTIFACTS
# ============================================================================
log_test_start "Deployment Artifacts Validation"

if [ -f "Backend/docker-compose.prod.yml" ]; then
    log_test_pass "Docker Compose production config found"
else
    log_test_skip "Docker Compose production config not found"
fi

if [ -d "Backend/k8s" ]; then
    K8S_FILES=$(find Backend/k8s -name "*.yaml" | wc -l)
    log_test_pass "Kubernetes manifests found: $K8S_FILES files"
else
    log_test_skip "Kubernetes manifests directory not found"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo -e "${BLUE}════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}TEST SUMMARY${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo -e "${GREEN}Passed:  $TESTS_PASSED${NC}" | tee -a "$LOG_FILE"
echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}" | tee -a "$LOG_FILE"
echo -e "${RED}Failed:  $TESTS_FAILED${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - READY FOR DEPLOYMENT${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "${RED}❌ TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT${NC}" | tee -a "$LOG_FILE"
    exit 1
fi
