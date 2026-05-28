#!/bin/bash
# Test engine health endpoints

echo "Testing Engine Health..."

# Define health check function
checkHealth() {
    local port=$1
    local name=$2
    local timeout=2
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -m $timeout "http://localhost:$port/api/v1/health" 2>/dev/null)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "✅ $name (port $port): UP"
        echo "1"
    else
        echo "❌ $name (port $port): DOWN (HTTP $http_code)"
        echo "0"
    fi
}

# Array of engines
declare -A engines=(
    [3001]="identity"
    [3002]="optimizer"
    [3003]="corridor"
    [3004]="liquidity"
    [3005]="shock"
    [3006]="incident"
    [3007]="behavior"
    [3008]="data"
    [3009]="fraud"
    [3010]="strategy"
    [3011]="health"
    [3012]="twin"
    [3013]="notifications"
)

upCount=0

for port in "${!engines[@]}"; do
    result=$(checkHealth "$port" "${engines[$port]}")
    if echo "$result" | tail -1 | grep -q "1"; then
        ((upCount++))
    fi
done

echo ""
echo "ENGINES RESPONDING: $upCount/13"
