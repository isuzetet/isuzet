
# Store health check results
$results = @()

Write-Host "STEP 3 & 4: ENGINE STARTUP AND HEALTH CHECK" -ForegroundColor Cyan
Write-Host "=" * 60

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
$downEngines = @()

# Test using curl (more reliable)
foreach ($port in $ports.Keys) {
    $name = $ports[$port]
    
    # Try curl first
    $curlOutput = & curl -s -m 2 "http://localhost:$port/api/v1/health" 2>&1
    
    if ($curlOutput -match '"success".*true' -or $curlOutput -match '"status"' -or $curlOutput -match '"data"') {
        Write-Host "✅ $($name.PadRight(20)) (port $port): UP" -ForegroundColor Green
        $upCount++
        $results += @{name=$name; port=$port; status="UP"}
    } else {
        Write-Host "❌ $($name.PadRight(20)) (port $port): DOWN" -ForegroundColor Red  
        $downEngines += $name
        $results += @{name=$name; port=$port; status="DOWN"}
    }
}

Write-Host ""
Write-Host "=" * 60
Write-Host "ENGINES RESPONDING: $upCount/13" -ForegroundColor Yellow
if ($downEngines.Count -gt 0) {
    Write-Host "OFFLINE: $($downEngines -join ', ')" -ForegroundColor Red
} else {
    Write-Host "ALL ENGINES ONLINE" -ForegroundColor Green
}

# Store results for later report
$results | ConvertTo-Json | Out-File "c:\Users\ygebr\Desktop\LAS\Backend\.engine-health-results.json"
