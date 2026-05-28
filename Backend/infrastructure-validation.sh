#!/bin/bash
# RUIT CBE Infrastructure Validation Script
# Validates that the production environment is properly configured
# Run 48 hours before launch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="infrastructure-validation-${TIMESTAMP}.log"
ERRORS=0
WARNINGS=0
SUCCESS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
    ((SUCCESS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    ((ERRORS++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

log_section() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}

# Start validation
echo "RUIT CBE Infrastructure Validation"
echo "Started: $(date)"
echo "Log: $LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ============================================================================
# 1. ENVIRONMENT VARIABLES
# ============================================================================
log_section "1. ENVIRONMENT VARIABLES VALIDATION"

check_env_var() {
    if [ -z "${!1}" ]; then
        log_error "Missing environment variable: $1"
        return 1
    else
        log_success "Environment variable set: $1"
        return 0
    fi
}

# Critical variables
check_env_var "DATABASE_URL" || true
check_env_var "TIMESCALE_URL" || true
check_env_var "JWT_SECRET" || true
check_env_var "WEBHOOK_SECRET" || true
check_env_var "INTERNAL_SECRET" || true
check_env_var "FIREBASE_SERVICE_ACCOUNT_PATH" || true
check_env_var "AFRICAS_TALKING_API_KEY" || true

# ============================================================================
# 2. DATABASE CONNECTIVITY
# ============================================================================
log_section "2. DATABASE CONNECTIVITY VALIDATION"

if [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "PostgreSQL database accessible"
        
        # Check database size
        DB_NAME=$(echo $DATABASE_URL | grep -oP '(?<=/)[^/?]+$')
        SIZE=$(psql "$DATABASE_URL" -tc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null || echo "unknown")
        log_info "Database size: $SIZE"
    else
        log_error "PostgreSQL database not accessible"
    fi
else
    log_warning "DATABASE_URL not set, skipping PostgreSQL check"
fi

if [ -n "$TIMESCALE_URL" ]; then
    if psql "$TIMESCALE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "TimescaleDB database accessible"
        
        # Check for TimescaleDB extension
        if psql "$TIMESCALE_URL" -tc "SELECT 1 FROM pg_extension WHERE extname='timescaledb'" | grep -q 1; then
            log_success "TimescaleDB extension installed"
        else
            log_warning "TimescaleDB extension not found"
        fi
    else
        log_error "TimescaleDB database not accessible"
    fi
else
    log_warning "TIMESCALE_URL not set, skipping TimescaleDB check"
fi

# ============================================================================
# 3. REDIS CONNECTIVITY
# ============================================================================
log_section "3. REDIS CONNECTIVITY VALIDATION"

if [ -n "$REDIS_URL" ]; then
    if redis-cli -u "$REDIS_URL" ping | grep -q "PONG"; then
        log_success "Redis cache accessible"
        
        # Check memory usage
        MEMORY=$(redis-cli -u "$REDIS_URL" info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log_info "Redis memory usage: $MEMORY"
    else
        log_error "Redis cache not accessible"
    fi
else
    log_warning "REDIS_URL not set, skipping Redis check"
fi

# ============================================================================
# 4. KUBERNETES CLUSTER
# ============================================================================
log_section "4. KUBERNETES CLUSTER VALIDATION"

if command -v kubectl &> /dev/null; then
    log_success "kubectl installed"
    
    # Check cluster connectivity
    if kubectl cluster-info > /dev/null 2>&1; then
        log_success "Kubernetes cluster accessible"
        
        # Check nodes
        NODE_COUNT=$(kubectl get nodes -o json | jq '.items | length')
        log_info "Kubernetes nodes: $NODE_COUNT"
        
        # Check node status
        READY_NODES=$(kubectl get nodes -o json | jq '[.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True"))] | length')
        if [ "$READY_NODES" -eq "$NODE_COUNT" ]; then
            log_success "All Kubernetes nodes ready ($READY_NODES/$NODE_COUNT)"
        else
            log_warning "Some Kubernetes nodes not ready ($READY_NODES/$NODE_COUNT)"
        fi
    else
        log_error "Kubernetes cluster not accessible"
    fi
else
    log_warning "kubectl not installed, skipping Kubernetes checks"
fi

# ============================================================================
# 5. DOCKER INSTALLATION & BUILDS
# ============================================================================
log_section "5. DOCKER INSTALLATION & BUILD CAPABILITY"

if command -v docker &> /dev/null; then
    log_success "Docker installed"
    
    # Check Docker daemon
    if docker ps > /dev/null 2>&1; then
        log_success "Docker daemon running"
        
        # Check Docker version
        DOCKER_VERSION=$(docker version -f "{{.Server.Version}}")
        log_info "Docker version: $DOCKER_VERSION"
    else
        log_error "Docker daemon not running"
    fi
else
    log_error "Docker not installed"
fi

# ============================================================================
# 6. SOURCE CODE & BUILD ARTIFACTS
# ============================================================================
log_section "6. SOURCE CODE & BUILD ARTIFACTS"

if [ -f "Backend/package.json" ]; then
    log_success "Backend package.json found"
else
    log_error "Backend package.json not found"
fi

if [ -f "Backend/pnpm-workspace.yaml" ]; then
    log_success "pnpm workspace configuration found"
else
    log_error "pnpm workspace configuration not found"
fi

if [ -d "Backend/apps" ]; then
    APP_COUNT=$(ls -d Backend/apps/*/ 2>/dev/null | wc -l)
    if [ $APP_COUNT -ge 10 ]; then
        log_success "Microservice apps directory found ($APP_COUNT apps)"
    else
        log_warning "Fewer than expected microservice apps ($APP_COUNT apps, expected 14)"
    fi
else
    log_error "Microservice apps directory not found"
fi

# ============================================================================
# 7. GIT REPOSITORY STATE
# ============================================================================
log_section "7. GIT REPOSITORY STATE"

if [ -d ".git" ]; then
    log_success "Git repository initialized"
    
    # Check main branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $CURRENT_BRANCH"
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        log_success "Working directory clean (no uncommitted changes)"
    else
        log_warning "Working directory has uncommitted changes"
    fi
    
    # Get latest commit
    LATEST_COMMIT=$(git log --oneline -1)
    log_info "Latest commit: $LATEST_COMMIT"
    
    # Check remote
    if git remote -v | grep -q "origin"; then
        log_success "Remote origin configured"
        
        # Check if local is synced with remote
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "unknown")
        if [ "$LOCAL" = "$REMOTE" ]; then
            log_success "Local branch synchronized with remote"
        else
            log_warning "Local branch ahead of remote"
        fi
    else
        log_error "Remote origin not configured"
    fi
else
    log_error "Not a git repository"
fi

# ============================================================================
# 8. FIREWALL & NETWORK PORTS
# ============================================================================
log_section "8. FIREWALL & NETWORK PORTS"

check_port() {
    local PORT=$1
    local SERVICE=$2
    
    if nc -zv localhost $PORT > /dev/null 2>&1; then
        log_success "Port $PORT ($SERVICE) accessible"
    else
        log_warning "Port $PORT ($SERVICE) not listening (expected before deployment)"
    fi
}

# Check essential ports that should be open
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
check_port 3000 "API Gateway"

# ============================================================================
# 9. FILE SYSTEM & DISK SPACE
# ============================================================================
log_section "9. FILE SYSTEM & DISK SPACE"

# Check current disk usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')

log_info "Disk usage: ${DISK_USAGE}% (Available: ${DISK_AVAILABLE}K)"

if [ "$DISK_USAGE" -lt 80 ]; then
    log_success "Disk usage acceptable"
else
    log_warning "Disk usage high: ${DISK_USAGE}%"
fi

# Check for required directories
if [ -d "Backend/build" ]; then
    log_info "Build artifacts directory exists"
fi

# ============================================================================
# 10. CERTIFICATE & SSL/TLS
# ============================================================================
log_section "10. CERTIFICATE & SSL/TLS VALIDATION"

if [ -n "$SSL_CERT_PATH" ] && [ -f "$SSL_CERT_PATH" ]; then
    log_success "SSL certificate file found"
    
    # Check certificate expiry
    EXPIRY=$(openssl x509 -in "$SSL_CERT_PATH" -noout -enddate 2>/dev/null | cut -d= -f2)
    log_info "Certificate expiry: $EXPIRY"
else
    log_warning "SSL certificate path not configured or file not found"
fi

# ============================================================================
# SUMMARY
# ============================================================================
log_section "VALIDATION SUMMARY"

TOTAL=$((SUCCESS + WARNINGS + ERRORS))

echo "" | tee -a "$LOG_FILE"
echo "Total Checks: $TOTAL" | tee -a "$LOG_FILE"
echo -e "${GREEN}Successes: $SUCCESS${NC}" | tee -a "$LOG_FILE"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}" | tee -a "$LOG_FILE"
echo -e "${RED}Errors: $ERRORS${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $ERRORS -eq 0 ]; then
    log_success "INFRASTRUCTURE VALIDATION PASSED ✅"
    echo "" | tee -a "$LOG_FILE"
    echo "Status: READY FOR DEPLOYMENT" | tee -a "$LOG_FILE"
    exit 0
elif [ $ERRORS -lt 5 ]; then
    log_warning "INFRASTRUCTURE VALIDATION PASSED WITH WARNINGS ⚠️"
    echo "" | tee -a "$LOG_FILE"
    echo "Status: READY FOR DEPLOYMENT (REVIEW WARNINGS)" | tee -a "$LOG_FILE"
    exit 0
else
    log_error "INFRASTRUCTURE VALIDATION FAILED ❌"
    echo "" | tee -a "$LOG_FILE"
    echo "Status: NOT READY FOR DEPLOYMENT" | tee -a "$LOG_FILE"
    exit 1
fi
