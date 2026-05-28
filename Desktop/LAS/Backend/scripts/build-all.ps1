# ===================================================================
# RUIT CBE LaaS Platform — Production Build Script
# ===================================================================
# Builds all packages and engines with full error reporting
# Run from any directory - uses $PSScriptRoot
# ===================================================================

# Get the repository root (parent of scripts directory)
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  RUIT CBE LaaS Platform — Production Build" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Root directory: $root" -ForegroundColor Gray
Write-Host ""

# ─────────────────────────────────────────────────────────────────
# Run pnpm build
# ─────────────────────────────────────────────────────────────────
Write-Host "Starting build process..." -ForegroundColor Yellow
Write-Host ""

$env:FORCE_COLOR = "0"
$env:NODE_ENV = "production"

$output = & pnpm -r build 2>&1
$exitCode = $LASTEXITCODE

# ─────────────────────────────────────────────────────────────────
# Process results
# ─────────────────────────────────────────────────────────────────
if ($exitCode -eq 0) {
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESS" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status: All packages compiled successfully" -ForegroundColor Green
    Write-Host ""
    
    # Count successful packages
    $successPattern = "Done|success"
    $successMatches = $output | Select-String -Pattern $successPattern
    $count = if ($successMatches) { $successMatches.Count } else { 0 }
    
    Write-Host "Packages built: $count successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Build complete — all packages compiled" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED" -ForegroundColor Red
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host ""
    
    # Filter to show only errors
    $errorLines = $output | Select-String -Pattern "error TS|error:|Error:|✖|failed"
    
    if ($errorLines) {
        Write-Host "----------------------------------------" -ForegroundColor Red
        Write-Host "ERRORS:" -ForegroundColor Red
        Write-Host "----------------------------------------" -ForegroundColor Red
        
        foreach ($line in $errorLines) {
            Write-Host $line -ForegroundColor Red
        }
        
        Write-Host "----------------------------------------" -ForegroundColor Red
        Write-Host ""
    }
    
    # Show full output for diagnostics
    Write-Host "FULL OUTPUT:" -ForegroundColor Gray
    Write-Host "----------------------------------------" -ForegroundColor Gray
    $output | ForEach-Object { Write-Host $_ }
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "BUILD FAILED - Fix errors and try again" -ForegroundColor Red
    exit 1
}
