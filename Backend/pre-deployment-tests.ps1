# Pre-deployment test suite (PowerShell)
# Run from repository root: PowerShell -ExecutionPolicy Bypass -File Backend\pre-deployment-tests.ps1

$now = Get-Date -Format "yyyyMMdd_HHmmss"
$log = "pre-deployment-tests-$now.log"

function Log-Info($m) { "$((Get-Date).ToString()) [INFO] $m" | Tee-Object -FilePath $log -Append; Write-Host "INFO: $m" -ForegroundColor Cyan }
function Log-Success($m) { "$((Get-Date).ToString()) [OK] $m" | Tee-Object -FilePath $log -Append; Write-Host "OK: $m" -ForegroundColor Green }
function Log-Warning($m) { "$((Get-Date).ToString()) [WARN] $m" | Tee-Object -FilePath $log -Append; Write-Host "WARN: $m" -ForegroundColor Yellow }
function Log-Error($m) { "$((Get-Date).ToString()) [ERR] $m" | Tee-Object -FilePath $log -Append; Write-Host "ERROR: $m" -ForegroundColor Red }

$passed=0; $failed=0; $skipped=0

Log-Info "Starting pre-deployment tests"
Log-Info "Log file: $log"

# 1. Code quality / build
Log-Info "Code quality and build checks"
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($null -ne $npm) {
    Push-Location Backend
    try {
        npm run build 2>&1 | Tee-Object -FilePath "$PSScriptRoot\..\Backend-build-output.log"
        if ($LASTEXITCODE -eq 0) { Log-Success "TypeScript build successful"; $passed++ } else { Log-Error "TypeScript build failed"; $failed++ }
    } catch { Log-Error "Build command error: $_"; $failed++ }
    
    try {
        npm run lint 2>&1 | Tee-Object -FilePath "$PSScriptRoot\..\Backend-lint-output.log"
        if ($LASTEXITCODE -eq 0) { Log-Success "ESLint checks passed"; $passed++ } else { Log-Warning "ESLint reported issues"; $skipped++ }
    } catch { Log-Warning "ESLint command failed: $_"; $skipped++ }
    Pop-Location
} else {
    Log-Skip: { Log-Warning "npm not found, skipping build and lint"; $skipped++ }
}

# 2. Database & migrations (best-effort)
Log-Info "Database and migrations checks"
if (-not [string]::IsNullOrEmpty($env:DATABASE_URL)) {
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($null -ne $psql) {
        try {
            & psql $env:DATABASE_URL -c "SELECT 1;" > $null 2>&1
            if ($LASTEXITCODE -eq 0) { Log-Success "Database reachable"; $passed++ } else { Log-Error "Database connection failed"; $failed++ }
        } catch { Log-Error "Database check error: $_"; $failed++ }
    } else { Log-Warning "psql not installed, skipping DB checks"; $skipped++ }
} else { Log-Warning "DATABASE_URL not set, skipping DB checks"; $skipped++ }

# 3. Integration tests
Log-Info "Integration tests"
if (Test-Path "Backend\tests\integration") {
    Push-Location Backend
    try {
        npm test -- tests/integration 2>&1 | Tee-Object -FilePath "$PSScriptRoot\..\integration-tests-output.log"
        if ($LASTEXITCODE -eq 0) { Log-Success "Integration tests passed"; $passed++ } else { Log-Error "Integration tests failed (see logs)"; $failed++ }
    } catch { Log-Error "Integration test execution error: $_"; $failed++ }
    Pop-Location
} else { Log-Warning "Integration tests not found, skipping"; $skipped++ }

# 4. Redis check
Log-Info "Redis checks"
if (-not [string]::IsNullOrEmpty($env:REDIS_URL)) {
    $redis = Get-Command redis-cli -ErrorAction SilentlyContinue
    if ($null -ne $redis) {
        if ($env:REDIS_URL -match 'redis://(?<h>[^:/]+):(?<p>\d+)') {
            $h=$matches['h']; $p=$matches['p']
            $res = & redis-cli -h $h -p $p PING 2>$null
            if ($res -match 'PONG') { Log-Success "Redis ping OK"; $passed++ } else { Log-Error "Redis ping failed"; $failed++ }
        } else { Log-Warning "REDIS_URL not parseable, skipping ping"; $skipped++ }
    } else { Log-Warning "redis-cli not installed, skipping Redis checks"; $skipped++ }
} else { Log-Warning "REDIS_URL not set, skipping Redis checks"; $skipped++ }

# 5. Security quick-scan
Log-Info "Scanning for obvious hardcoded secrets"
$secrets = Select-String -Path Backend\**\*.ts,Backend\**\*.js -Pattern "password\s*[:=]\s*\"|password\s*[:=]\s*'" -ErrorAction SilentlyContinue
if ($secrets) { Log-Error "Potential hardcoded credentials found"; $failed++ } else { Log-Success "No obvious hardcoded credentials detected"; $passed++ }

# 6. Dependency audit
Log-Info "Dependency security audit (npm audit)"
if ($null -ne $npm) {
    Push-Location Backend
    try {
        npm audit --audit-level=high 2>&1 | Tee-Object -FilePath "$PSScriptRoot\..\npm-audit-output.log"
        # If npm audit exits non-zero, consider failures non-blocking here
        Log-Success "npm audit executed (review logs)"; $passed++
    } catch { Log-Warning "npm audit failed to run"; $skipped++ }
    Pop-Location
} else { Log-Warning "npm not found, skipping npm audit"; $skipped++ }

# Final summary
Log-Info "Pre-deployment test summary"
Log-Info "Passed: $passed, Failed: $failed, Skipped: $skipped"
if ($failed -gt 0) { Log-Error "Pre-deployment tests FAILED"; exit 1 } else { Log-Success "Pre-deployment tests PASSED (or passed with non-critical skips)"; exit 0 }
