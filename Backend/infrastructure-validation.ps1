# Infrastructure validation (PowerShell)
# Run from repository root: PowerShell -ExecutionPolicy Bypass -File Backend\infrastructure-validation.ps1

param()

$now = Get-Date -Format "yyyyMMdd_HHmmss"
$log = "infrastructure-validation-$now.log"

function Log-Info($m) { "$((Get-Date).ToString()) [INFO] $m" | Tee-Object -FilePath $log -Append; Write-Host $m -ForegroundColor Cyan }
function Log-Success($m) { "$((Get-Date).ToString()) [OK] $m" | Tee-Object -FilePath $log -Append; Write-Host "✔ $m" -ForegroundColor Green }
function Log-Warning($m) { "$((Get-Date).ToString()) [WARN] $m" | Tee-Object -FilePath $log -Append; Write-Host "⚠ $m" -ForegroundColor Yellow }
function Log-Error($m) { "$((Get-Date).ToString()) [ERR] $m" | Tee-Object -FilePath $log -Append; Write-Host "✖ $m" -ForegroundColor Red }

$success=0; $warnings=0; $errors=0

Log-Info "Starting infrastructure validation"
Log-Info "Log file: $log"

# 1. Environment variables
Log-Info "Checking environment variables"
$envVars = @('DATABASE_URL','TIMESCALE_URL','JWT_SECRET','WEBHOOK_SECRET','INTERNAL_SECRET','FIREBASE_SERVICE_ACCOUNT_PATH','AFRICAS_TALKING_API_KEY','REDIS_URL')
foreach ($v in $envVars) {
    if ([string]::IsNullOrEmpty($env:$v)) { Log-Warning "Missing env var: $v"; $warnings++ } else { Log-Success "Env var set: $v"; $success++ }
}

# 2. PostgreSQL (psql)
Log-Info "Checking PostgreSQL (psql)"
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($null -ne $psql) {
    try {
        if (-not [string]::IsNullOrEmpty($env:DATABASE_URL)) {
            & psql $env:DATABASE_URL -c "SELECT 1;" > $null 2>&1; if ($LASTEXITCODE -eq 0) { Log-Success "PostgreSQL reachable"; $success++ } else { Log-Warning "psql present but could not connect to DATABASE_URL"; $warnings++ }
        } else { Log-Warning "DATABASE_URL not set, skipping direct psql test"; $warnings++ }
    } catch { Log-Warning "psql test failed: $_"; $warnings++ }
} else { Log-Warning "psql not installed or not in PATH"; $warnings++ }

# 3. TimescaleDB extension check (best-effort)
if (-not [string]::IsNullOrEmpty($env:TIMESCALE_URL) -and $psql) {
    try {
        $res = & psql $env:TIMESCALE_URL -Atc "SELECT extname FROM pg_extension WHERE extname='timescaledb';" 2>$null
        if ($res -eq 'timescaledb') { Log-Success "TimescaleDB extension installed"; $success++ } else { Log-Warning "TimescaleDB extension not detected"; $warnings++ }
    } catch { Log-Warning "TimescaleDB check failed: $_"; $warnings++ }
}

# 4. Redis
Log-Info "Checking redis-cli"
$redis = Get-Command redis-cli -ErrorAction SilentlyContinue
if ($null -ne $redis) {
    try {
        if (-not [string]::IsNullOrEmpty($env:REDIS_URL)) {
            $ping = & redis-cli -u $env:REDIS_URL PING 2>$null
            if ($ping -match "PONG") { Log-Success "Redis reachable"; $success++ } else { Log-Warning "redis-cli present but PING failed"; $warnings++ }
        } else { Log-Warning "REDIS_URL not set, skipping redis-cli test"; $warnings++ }
    } catch { Log-Warning "redis-cli test failed: $_"; $warnings++ }
} else { Log-Warning "redis-cli not installed or not in PATH"; $warnings++ }

# 5. kubectl
Log-Info "Checking kubectl"
$k = Get-Command kubectl -ErrorAction SilentlyContinue
if ($null -ne $k) {
    try {
        & kubectl version --client > $null 2>&1; if ($LASTEXITCODE -eq 0) { Log-Success "kubectl available"; $success++ } else { Log-Warning "kubectl available but client command failed"; $warnings++ }
        # cluster-info may require kubeconfig; try best effort
        & kubectl cluster-info > $null 2>&1; if ($LASTEXITCODE -eq 0) { Log-Success "Kubernetes cluster accessible"; $success++ } else { Log-Warning "kubectl present but cluster not accessible"; $warnings++ }
    } catch { Log-Warning "kubectl check failed: $_"; $warnings++ }
} else { Log-Warning "kubectl not installed or not in PATH"; $warnings++ }

# 6. Docker
Log-Info "Checking Docker"
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($null -ne $docker) {
    try {
        & docker info > $null 2>&1; if ($LASTEXITCODE -eq 0) { Log-Success "Docker daemon running"; $success++ } else { Log-Warning "Docker installed but daemon not running"; $warnings++ }
    } catch { Log-Warning "Docker check failed: $_"; $warnings++ }
} else { Log-Warning "Docker not installed or not in PATH"; $warnings++ }

# 7. Source code checks
Log-Info "Source code structure"
if (Test-Path "Backend\package.json") { Log-Success "Found Backend\package.json"; $success++ } else { Log-Error "Backend\package.json missing"; $errors++ }
if (Test-Path "Backend\pnpm-workspace.yaml") { Log-Success "Found Backend\pnpm-workspace.yaml"; $success++ } else { Log-Warning "pnpm-workspace.yaml missing"; $warnings++ }
if (Test-Path "Backend\apps") { $count = (Get-ChildItem -Directory Backend\apps -ErrorAction SilentlyContinue).Count; Log-Info "Detected $count apps in Backend\apps" } else { Log-Warning "Backend\apps not found"; $warnings++ }

# 8. Git state
Log-Info "Git repository status"
if (Test-Path ".git") {
    Log-Success "Git repository initialized"; $success++
    $branch = & git rev-parse --abbrev-ref HEAD 2>$null; Log-Info "Current branch: $branch"
    $porcelain = & git status --porcelain
    if ([string]::IsNullOrEmpty($porcelain)) { Log-Success "Working tree clean"; $success++ } else { Log-Warning "Working tree has changes"; $warnings++ }
    try {
        $local = & git rev-parse HEAD
        $remote = & git rev-parse @{u} 2>$null
        if ($local -eq $remote) { Log-Success "Local is synchronized with remote"; $success++ } else { Log-Warning "Local branch differs from remote"; $warnings++ }
    } catch { Log-Warning "Could not determine remote HEAD (no upstream configured)"; $warnings++ }
} else { Log-Error "Not a git repository"; $errors++ }

# 9. Ports (Postgres, Redis, API)
Log-Info "Checking ports on localhost"
$ports = @{5432='PostgreSQL';6379='Redis';3000='API Gateway'}
foreach ($p in $ports.Keys) {
    $res = Test-NetConnection -ComputerName 'localhost' -Port $p -WarningAction SilentlyContinue
    if ($res.TcpTestSucceeded) { Log-Success "Port $p ($($ports[$p])) listening"; $success++ } else { Log-Warning "Port $p ($($ports[$p])) not listening"; $warnings++ }
}

# 10. Disk space
$drive = Get-PSDrive -Name C -ErrorAction SilentlyContinue
if ($drive) {
    $used = [math]::Round((($drive.Used / ($drive.Used + $drive.Free)) * 100),2)
    Log-Info "C: drive usage: $used% (Free: $([math]::Round($drive.Free/1MB,2)) MB)"
    if ($used -lt 80) { Log-Success "Disk usage acceptable"; $success++ } else { Log-Warning "Disk usage high: $used%"; $warnings++ }
} else { Log-Warning "Could not determine disk usage for C:"; $warnings++ }

# 11. SSL certificate
if ($env:SSL_CERT_PATH -and (Test-Path $env:SSL_CERT_PATH)) { Log-Success "SSL certificate file found"; $success++ } else { Log-Warning "SSL certificate path not set or file missing"; $warnings++ }

# Summary
Log-Info "Validation complete"
Log-Info "Successes: $success, Warnings: $warnings, Errors: $errors"

if ($errors -gt 0) { Log-Error "INFRASTRUCTURE VALIDATION FAILED"; exit 1 } elseif ($warnings -gt 0) { Log-Warning "INFRASTRUCTURE VALIDATION PASSED WITH WARNINGS"; exit 0 } else { Log-Success "INFRASTRUCTURE VALIDATION PASSED"; exit 0 }
