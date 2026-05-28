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

Write-Host "STEP 4: ENGINE HEALTH CHECKS" -ForegroundColor Cyan
Write-Host "=" * 50

$upCount = 0
$downEngines = @()

foreach ($port in $ports.Keys) {
    $name = $ports[$port]
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/api/v1/health" -TimeoutSec 2
        Write-Host "✅ $($name.PadRight(20)) (port $port): UP"
        $upCount++
    } catch {
        Write-Host "❌ $($name.PadRight(20)) (port $port): DOWN"
        $downEngines += $name
    }
}

Write-Host ""
Write-Host "ENGINES RESPONDING: $upCount/13" -ForegroundColor Yellow
if ($downEngines.Count -gt 0) {
    Write-Host "DOWN: $($downEngines -join ', ')" -ForegroundColor Red
}
