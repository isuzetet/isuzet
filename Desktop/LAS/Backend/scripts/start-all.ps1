# ===================================================================
# RUIT CBE LaaS Platform — Start All Services (Development Mode)
# ===================================================================
# This script starts all infrastructure services and all 13 engines
# Run from any directory - uses $PSScriptRoot
# ===================================================================

param(
    [switch]$SkipDocker = $false,
    [switch]$SkipHealthCheck = $false
)

# Get the repository root (parent of scripts directory)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  RUIT CBE LaaS Platform — Starting All Services" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Root directory: $root" -ForegroundColor Gray
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 1. Check Docker is running
# ─────────────────────────────────────────────────────────────────
if (-not $SkipDocker) {
    Write-Host "[1/7] Checking Docker..." -ForegroundColor Yellow
    try {
        $null = docker ps 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
            exit 1
        }
        Write-Host "      ✓ Docker is running" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }

    # ─────────────────────────────────────────────────────────────
    # 2. Start infrastructure
    # ─────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "[2/7] Starting infrastructure services (PostgreSQL, Redis, TimescaleDB, MinIO)..." -ForegroundColor Yellow
    docker compose -f $root\infra\docker-compose.yml up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to start infrastructure services" -ForegroundColor Red
        exit 1
    }
    Write-Host "      ✓ Infrastructure services started" -ForegroundColor Green

    Write-Host ""
    Write-Host "      Waiting 5 seconds for services to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}
else {
    Write-Host "[1/2] Skipping Docker infrastructure (use -SkipDocker to skip)" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────────────
# 3. Kill any existing node processes
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/7] Cleaning up existing Node processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "      Stopping $($nodeProcesses.Count) Node process(es)..." -ForegroundColor Gray
        $nodeProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
    Write-Host "      ✓ Node processes cleaned up" -ForegroundColor Green
}
catch {
    Write-Host "      ✓ No Node processes to clean up" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────────
# 4. Start all engines and workers
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/7] Starting all 13 engines + workers..." -ForegroundColor Yellow

$apps = @(
    @{name="engine-identity"; port=3001; prefix="identity"},
    @{name="engine-strategy"; port=3010; prefix="strategy"},
    @{name="engine-optimizer"; port=3002; prefix="optimizer"},
    @{name="engine-liquidity"; port=3004; prefix="liquidity"},
    @{name="engine-corridor"; port=3003; prefix="corridor"},
    @{name="engine-shock"; port=3005; prefix="shock"},
    @{name="engine-incident"; port=3006; prefix="incident"},
    @{name="engine-behavior"; port=3007; prefix="behavior"},
    @{name="engine-fraud"; port=3009; prefix="fraud"},
    @{name="engine-data"; port=3008; prefix="data"},
    @{name="engine-health"; port=3011; prefix="health"},
    @{name="engine-twin"; port=3012; prefix="twin"},
    @{name="engine-dispatch"; port=3015; prefix="dispatch"},
    @{name="notification-engine"; port=3013; prefix="notifications"},
    @{name="workers"; port=0; prefix=""}
)

foreach ($app in $apps) {
    $appPath = "$root\apps\$($app.name)"
    $displayName = $app.name -replace "engine-", "" -replace "notification-engine", "notifications"
    
    if ($app.port -eq 0) {
        Write-Host "      Starting workers..." -ForegroundColor Gray -NoNewline
    } else {
        Write-Host "      Starting $displayName (port $($app.port))..." -ForegroundColor Gray -NoNewline
    }
    
    if ($app.name -eq "workers") {
        Start-Process powershell -ArgumentList "-NoExit","-Command", "cd $appPath; `$Host.UI.RawUI.WindowTitle = 'RUIT: Workers'; npx tsx src/index.ts"
    } else {
        Start-Process powershell -ArgumentList "-NoExit","-Command", "cd $appPath; `$Host.UI.RawUI.WindowTitle = 'RUIT: $displayName'; npx tsx src/index.ts"
    }
    
    Write-Host " ✓" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host "      ✓ All engines started in new windows" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────
# 5. Wait for services to initialize
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/7] Waiting 25 seconds for services to initialize..." -ForegroundColor Yellow
for ($i = 25; $i -gt 0; $i--) {
    Write-Host "      $i seconds remaining..." -ForegroundColor Gray -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r      `r" -NoNewline
}
Write-Host ""

if ($SkipHealthCheck) {
    Write-Host ""
    Write-Host "[6/7] Skipping health checks (use -SkipHealthCheck:false to run)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "  RUIT CBE LaaS Platform — Services Started" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "All engines are running. Manual verification needed." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# ─────────────────────────────────────────────────────────────────
# 6. Run health checks on all engines
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/7] Running health checks..." -ForegroundColor Yellow

$healthResults = @()
$healthyCount = 0
$failedCount = 0

foreach ($app in $apps) {
    if ($app.port -eq 0) { continue }  # Skip workers (no HTTP endpoint)
    
    $url = "http://localhost:$($app.port)/api/v1/$($app.prefix)/health"
    $displayName = $app.name -replace "engine-", "" -replace "notification-engine", "notifications"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        
        if ($response.status -eq "UP") {
            $healthResults += [PSCustomObject]@{
                Engine = $displayName
                Port = $app.port
                Status = "UP"
                Color = "Green"
            }
            $healthyCount++
            Write-Host "      ✓ $displayName ($($app.port)) - UP" -ForegroundColor Green
        } else {
            $healthResults += [PSCustomObject]@{
                Engine = $displayName
                Port = $app.port
                Status = "DEGRADED"
                Color = "Yellow"
            }
            $failedCount++
            Write-Host "      ⚠ $displayName ($($app.port)) - DEGRADED" -ForegroundColor Yellow
        }
    }
    catch {
        $healthResults += [PSCustomObject]@{
            Engine = $displayName
            Port = $app.port
            Status = "DOWN"
            Color = "Red"
        }
        $failedCount++
        Write-Host "      ✗ $displayName ($($app.port)) - DOWN" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[7/7] Health check complete: $healthyCount healthy, $failedCount failed" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Yellow" })

# ─────────────────────────────────────────────────────────────────
# 7. Print final status table
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  RUIT CBE LaaS Platform — Final Status" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Print table header
Write-Host "┌─────────────────────┬──────┬─────────┐" -ForegroundColor Cyan
Write-Host "│ Engine              │ Port │ Status  │" -ForegroundColor Cyan
Write-Host "├─────────────────────┼──────┼─────────┤" -ForegroundColor Cyan

# Print table rows
foreach ($result in $healthResults) {
    $enginePadded = $result.Engine.PadRight(19).Substring(0, [Math]::Min(19, $result.Engine.Length))
    $portPadded = $result.Port.ToString().PadRight(4).Substring(0, [Math]::Min(4, $result.Port.ToString().Length))
    $statusPadded = $result.Status.PadRight(7).Substring(0, [Math]::Min(7, $result.Status.Length))
    
    Write-Host "│ $enginePadded │ $portPadded │ " -ForegroundColor Cyan -NoNewline
    Write-Host "$statusPadded" -ForegroundColor $result.Color -NoNewline
    Write-Host " │" -ForegroundColor Cyan
}

Write-Host "└─────────────────────┴──────┴─────────┘" -ForegroundColor Cyan

Write-Host ""
Write-Host "Workers:              Background service (no HTTP)" -ForegroundColor Gray
Write-Host ""

if ($failedCount -eq 0) {
    Write-Host "✓ ALL SYSTEMS OPERATIONAL" -ForegroundColor Green -BackgroundColor Black
} elseif ($failedCount -le 3) {
    Write-Host "⚠ PARTIAL DEGRADATION - Some engines may still be starting" -ForegroundColor Yellow -BackgroundColor Black
} else {
    Write-Host "✗ MULTIPLE FAILURES - Check individual engine windows for errors" -ForegroundColor Red -BackgroundColor Black
}

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Summary return code
if ($failedCount -eq 0) {
    exit 0
} else {
    exit 1
}
