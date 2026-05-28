
# RUIT CBE Backend - Comprehensive Verification Script
# Runs all verification steps and saves results to a detailed report file

#Requires -Version 5.0
$ErrorActionPreference = "SilentlyContinue"

$reportDir = "C:\Users\ygebr\Desktop\LAS\Backend\verification-results"
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }

$reportFile = "$reportDir\verification-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$jsonFile = "$reportDir\verification-results.json"

# Initialize report
@"
╔══════════════════════════════════════════════════════════════╗
║         RUIT CBE BACKEND — VERIFICATION REPORT              ║
║                    Generated: $(Get-Date)                   ║
╚══════════════════════════════════════════════════════════════╝

"@ | Out-File -FilePath $reportFile

$allResults = @{
    build = $null
    infrastructure = @{}
    engines = @{}
    auth = $null
    features = @()
    workers = @()
}

# ==================
# STEP 1: BUILD
# ==================
"STEP 1: BUILD INTEGRITY" | Out-File -FilePath $reportFile -Append
"=" * 60 | Out-File -FilePath $reportFile -Append

try {
    Set-Location "C:\Users\ygebr\Desktop\LAS\Backend"
    $buildOutput = (pnpm -r build 2>&1 | Out-String)
    
    if ($buildOutput -match "Done in" -and -not ($buildOutput -match "error|Error|ERROR")) {
        Add-Content -Path $reportFile -Value "✅ BUILD PASSED - Zero TypeScript errors"
        $allResults.build = "PASS"
    } else {
        Add-Content -Path $reportFile -Value "❌ BUILD FAILED"
        Add-Content -Path $reportFile -Value $buildOutput
        $allResults.build = "FAIL"
    }
} catch {
    Add-Content -Path $reportFile -Value "❌ BUILD ERROR: $_"
    $allResults.build = "FAIL"
}

Add-Content -Path $reportFile -Value ""

# ==================
# STEP 2: DATABASE CHECKS
# ==================
"STEP 2: INFRASTRUCTURE" | Out-File -FilePath $reportFile -Append
"=" * 60 | Out-File -FilePath $reportFile -Append

# Docker containers
$docker_output = docker ps --format "table {{.Names}}\t{{.Status}}"
$containers = @("ruit_postgres", "ruit_redis", "ruit_timescaledb", "ruit_minio")
$running_containers = 0

foreach ($container in $containers) {
    if ($docker_output -match $container) {
        Add-Content -Path $reportFile -Value "✅ $container running"
        $running_containers++
    } else {
        Add-Content -Path $reportFile -Value "❌ $container NOT running"
    }
}

$allResults.infrastructure.containers = "$running_containers/4"
Add-Content -Path $reportFile -Value "Docker Containers: $running_containers/4"
Add-Content -Path $reportFile -Value ""

# Database checks
Add-Content -Path $reportFile -Value "Database Tables:"
$tableCount = (docker exec ruit_postgres psql -U ruit -d ruit_cbe -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null).Trim()
Add-Content -Path $reportFile -Value "  Total tables: $tableCount"
$allResults.infrastructure.tables = $tableCount

# Redis check
$redis_result = (docker exec ruit_redis redis-cli PING 2>/dev/null)
if ($redis_result -eq "PONG") {
    Add-Content -Path $reportFile -Value "✅ Redis responding"
    $allResults.infrastructure.redis = "UP"
} else {
    Add-Content -Path $reportFile -Value "❌ Redis not responding"
    $allResults.infrastructure.redis = "DOWN"
}

# RSA Keys
$private_key = Test-Path "apps\engine-identity\keys\private.pem"
$public_key = Test-Path "apps\engine-identity\keys\public.pem"
Add-Content -Path $reportFile -Value "RSA Keys: $(if($private_key -and $public_key){'✅'} else {'❌'})"
$allResults.infrastructure.rsa_keys = ($private_key -and $public_key)

Add-Content -Path $reportFile -Value ""

# ==================
# STEP 3: ENGINE HEALTH
# ==================
"STEP 3: ENGINE HEALTH CHECKS" | Out-File -FilePath $reportFile -Append
"=" * 60 | Out-File -FilePath $reportFile -Append

$ports = @{
    3001 = "identity"
    3002 = "optimizer"
    3003 = "corridor"
    3004 = "liquidity"
    3005 = "shock"
    3006 = "incident"
    3007 = "behavior"
    3008 = "data"
    3009 = "fraud"
    3010 = "strategy"
    3011 = "health"
    3012 = "twin"
    3013 = "notifications"
}

$upCount = 0

foreach ($port in $ports.Keys) {
    $name = $ports[$port]
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/api/v1/health" -TimeoutSec 2
        Add-Content -Path $reportFile -Value "✅ $($name.PadRight(20)) (port $port)"
        $allResults.engines[$name] = "UP"
        $upCount++
    } catch {
        Add-Content -Path $reportFile -Value "❌ $($name.PadRight(20)) (port $port)"
        $allResults.engines[$name] = "DOWN"
    }
}

Add-Content -Path $reportFile -Value ""
Add-Content -Path $reportFile -Value "ENGINES RESPONDING: $upCount/13"
Add-Content -Path $reportFile -Value ""

# ==================
# FINAL SUMMARY
# ==================
"FINAL SUMMARY" | Out-File -FilePath $reportFile -Append
"=" * 60 | Out-File -FilePath $reportFile -Append

Add-Content -Path $reportFile -Value "Build Status: $($allResults.build)"
Add-Content -Path $reportFile -Value "Docker Containers: $($allResults.infrastructure.containers)"
Add-Content -Path $reportFile -Value "Database Tables: $($allResults.infrastructure.tables)"
Add-Content -Path $reportFile -Value "Engines Online: $upCount/13"
Add-Content -Path $reportFile -Value ""

# Save JSON results
$allResults | ConvertTo-Json | Out-File -FilePath $jsonFile

Write-Host "✅ Verification report saved to:"
Write-Host "   $reportFile"
Write-Host "   $jsonFile"

# Display report
Get-Content $reportFile
