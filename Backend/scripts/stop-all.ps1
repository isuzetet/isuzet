# ===================================================================
# RUIT CBE LaaS Platform — Stop All Services
# ===================================================================
# Stops all running Node processes and Docker infrastructure
# Run from any directory - uses $PSScriptRoot
# ===================================================================

param(
    [switch]$SkipDocker = $false
)

# Get the repository root (parent of scripts directory)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  RUIT CBE LaaS Platform — Stopping All Services" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# 1. Kill all Node processes
# ─────────────────────────────────────────────────────────────────
Write-Host "[1/2] Stopping all Node processes..." -ForegroundColor Yellow

try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $count = $nodeProcesses.Count
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Write-Host "      ✓ Stopped $count Node process(es)" -ForegroundColor Green
    } else {
        Write-Host "      ✓ No Node processes running" -ForegroundColor Green
    }
}
catch {
    Write-Host "      ✓ No Node processes to stop" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# ─────────────────────────────────────────────────────────────────
# 2. Stop Docker infrastructure (unless skipped)
# ─────────────────────────────────────────────────────────────────
if (-not $SkipDocker) {
    Write-Host ""
    Write-Host "[2/2] Stopping Docker infrastructure..." -ForegroundColor Yellow
    
    try {
        docker compose -f $root\infra\docker-compose.yml stop 2>&1 | Out-Null
        Write-Host "      ✓ Infrastructure services stopped" -ForegroundColor Green
    }
    catch {
        Write-Host "      ⚠ Docker infrastructure not running or already stopped" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[2/2] Skipping Docker shutdown (-SkipDocker flag set)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  All services stopped" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""
