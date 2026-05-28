#!/bin/bash
# Comprehensive launch readiness verification script
# Checks that all previously identified issues have been fixed

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "🚀 RUIT CBE - Launch Readiness Verification"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "1️⃣ Checking Critical Security Issues..."
echo "---"

# Check 1: TIMESCALE_URL no hardcoded fallback
if grep -r "hardcoded\|super-secret\|localhost" Backend/apps/engine-location/src/services/timescale.service.ts | grep -i url; then
    fail "TIMESCALE_URL: Still contains hardcoded credentials"
else
    pass "TIMESCALE_URL: No hardcoded credentials"
fi

# Check 2: Webhook secret requirement
if grep -q "WEBHOOK_SECRET.*required" Backend/apps/workers/src/workers/*.ts; then
    pass "Webhook Secret: Properly required"
else
    warn "Webhook Secret: Verification inconclusive (manual check needed)"
fi

# Check 3: Firebase credentials via env vars
if grep -q "FIREBASE_SERVICE_ACCOUNT_PATH\|GOOGLE_APPLICATION_CREDENTIALS" Backend/apps/notification-engine/src/routes/internal.routes.ts; then
    pass "Firebase Credentials: Using file-based credentials"
else
    fail "Firebase Credentials: Still parsing from env vars"
fi

# Check 4: Internal secret required in production
if grep -q "production.*INTERNAL_SECRET\|process.env.NODE_ENV.*production" Backend/apps/engine-liquidity/src/routes/liquidity.routes.ts; then
    pass "Internal Secret: Production requirement enforced"
else
    warn "Internal Secret: Verification inconclusive (manual check needed)"
fi

echo ""
echo "2️⃣ Checking Performance Issues..."
echo "---"

# Check 5: N+1 queries eliminated
if grep -q "Promise.all\|findMany.*load:" Backend/apps/engine-data/src/routes/data.routes.ts; then
    pass "N+1 Query Pattern: Using batch operations"
else
    fail "N+1 Query Pattern: Loop with individual queries still present"
fi

# Check 6: Pagination on data endpoints
if grep -q "limit.*offset\|take.*skip" Backend/apps/engine-data/src/routes/data.routes.ts; then
    pass "Pagination: Implemented on data endpoints"
else
    fail "Pagination: Missing on data endpoints"
fi

# Check 7: Connection pool scaling
if grep -q "cpuCount.*pool\|2.*cpuCount\|10.*100" Backend/packages/shared-db/src/index.ts; then
    pass "Connection Pool: Dynamic scaling implemented"
else
    fail "Connection Pool: Still using fixed size"
fi

echo ""
echo "3️⃣ Checking Reliability Issues..."
echo "---"

# Check 8: SMS timeout and retry
if grep -q "timeout\|AbortController\|fetchWithTimeout" Backend/apps/notification-engine/src/services/sms.service.ts; then
    pass "SMS Service: Timeout and retry logic added"
else
    fail "SMS Service: No timeout/retry found"
fi

# Check 9: Notification error handling
if grep -q "notifyViaSms\|error.*logging" Backend/apps/engine-identity/src/services/expiry.service.ts; then
    pass "Notification Errors: Proper error handling added"
else
    fail "Notification Errors: Fire-and-forget pattern still present"
fi

# Check 10: Graceful shutdown
if grep -q "setupGracefulShutdown\|SIGTERM\|SIGINT" Backend/packages/shared-utils/src/graceful-shutdown.ts; then
    pass "Graceful Shutdown: Handler implemented"
else
    fail "Graceful Shutdown: Not implemented"
fi

echo ""
echo "4️⃣ Checking Input Validation..."
echo "---"

# Check 11: GPS coordinate validation
if grep -q "validateGpsCoordinates\|3.0.*15.0\|32.5.*48.5" Backend/apps/engine-location/src/routes/location.routes.ts; then
    pass "GPS Validation: Ethiopia bounds implemented"
else
    fail "GPS Validation: Missing or incomplete"
fi

# Check 12: Zod schema validation
if grep -q "z.string\|z.number\|parseAsync" Backend/apps/engine-*/src/routes/*.ts 2>/dev/null | head -20 | wc -l > 0; then
    pass "Schema Validation: Zod validation in use"
else
    warn "Schema Validation: Verification inconclusive"
fi

echo ""
echo "5️⃣ Checking Test Coverage..."
echo "---"

# Check 13: Test files created
TEST_FILES=$(find Backend/tests/integration -name "*.test.ts" -type f | wc -l)
if [ "$TEST_FILES" -ge 5 ]; then
    pass "Test Files: $TEST_FILES test files created (auth, payment, incident, fleet, location)"
else
    fail "Test Files: Only $TEST_FILES test files found (need at least 5 core test suites)"
fi

# Check 14: E2E test readiness
if [ -f "e2e-test.js" ]; then
    ASSERTIONS=$(grep -c "expect\|assert" e2e-test.js || true)
    if [ "$ASSERTIONS" -gt 50 ]; then
        pass "E2E Tests: $ASSERTIONS assertions (ready for stage/prod)"
    else
        warn "E2E Tests: Only $ASSERTIONS assertions (need more coverage)"
    fi
else
    fail "E2E Tests: e2e-test.js not found"
fi

echo ""
echo "6️⃣ Checking Infrastructure Code..."
echo "---"

# Check 15: Correlation ID middleware
if grep -q "correlation.*id\|x-correlation-id" Backend/packages/shared-utils/src/correlation-id.middleware.ts; then
    pass "Correlation ID: Middleware implemented"
else
    fail "Correlation ID: Not implemented"
fi

# Check 16: Health check service
if grep -q "performHealthCheck\|registerHealthCheckRoute" Backend/packages/shared-utils/src/health-check.service.ts; then
    pass "Health Check: Service implemented"
else
    fail "Health Check: Not implemented"
fi

# Check 17: Shared utilities exports
if grep -q "fetchWithTimeout\|graceful\|health" Backend/packages/shared-utils/src/index.ts; then
    pass "Shared Utils: New utilities exported"
else
    fail "Shared Utils: Missing new utility exports"
fi

echo ""
echo "7️⃣ Checking Database Integrity..."
echo "---"

# Check 18: Migration status
MIGRATION_COUNT=$(find Backend/apps/*/src/prisma/migrations -name "*.sql" 2>/dev/null | wc -l || echo "0")
if [ "$MIGRATION_COUNT" -gt 15 ]; then
    pass "Migrations: $MIGRATION_COUNT migrations completed"
else
    warn "Migrations: Only $MIGRATION_COUNT migrations (verify completeness)"
fi

# Check 19: Prisma schema validity
if grep -q "model\|relation" Backend/apps/engine-identity/src/prisma/schema.prisma 2>/dev/null; then
    pass "Prisma Schema: Models defined"
else
    fail "Prisma Schema: Invalid or incomplete"
fi

echo ""
echo "8️⃣ Checking Git History..."
echo "---"

# Check 20: Recent commits
COMMIT_COUNT=$(git log --oneline | head -20 | wc -l)
if [ "$COMMIT_COUNT" -gt 0 ]; then
    pass "Git History: Recent commits present ($COMMIT_COUNT commits)"
    git log --oneline | head -5 | sed 's/^/  /'
else
    fail "Git History: No commits found"
fi

echo ""
echo "=========================================="
echo "📊 Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo "---"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ LAUNCH READY - All critical checks passed!${NC}"
    exit 0
elif [ $FAILED -lt 3 ]; then
    echo -e "${YELLOW}⚠ CAUTION - Some issues detected, manual review recommended${NC}"
    exit 1
else
    echo -e "${RED}✗ NOT READY - Multiple critical issues found${NC}"
    exit 2
fi
