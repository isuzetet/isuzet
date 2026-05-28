# Start all engines in background processes
$env:DATABASE_URL = 'postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe'
$env:TIMESCALE_URL = 'postgresql://ruit:ruit_dev_password@localhost:5433/ruit_ts'
$env:REDIS_URL = 'redis://localhost:6379'
$env:JWT_SECRET = 'ruit-cbe-jwt-secret-development-key-change-in-prod'
$env:JWT_EXPIRY = '24h'
$env:REFRESH_SECRET = 'ruit-cbe-refresh-secret-development-key'
$env:REFRESH_EXPIRY = '7d'
$env:NODE_ENV = 'development'
$env:MULTI_STOP_LOADS_ENABLED = 'true'

$apps = @(
  "engine-identity", "engine-strategy", "engine-optimizer",
  "engine-liquidity", "engine-corridor", "engine-shock",
  "engine-incident", "engine-behavior", "engine-fraud",
  "engine-data", "engine-health", "engine-twin", 
  "notification-engine", "workers"
)

$basePath = "C:\Users\ygebr\Desktop\LAS\Backend\apps"

foreach ($app in $apps) {
  $appPath = "$basePath\$app"
  if (Test-Path "$appPath\src\index.ts") {
    Write-Host "Starting $app..."
    $process = Start-Process powershell -PassThru -NoNewWindow -ArgumentList "-NoExit", "-Command", "cd '$appPath'; npx tsx src/index.ts"
    Write-Host "  PID: $($process.Id)"
    Start-Sleep -Milliseconds 500
  } else {
    Write-Host "⚠️  Skipping $app - src/index.ts not found"
  }
}

Write-Host ""
Write-Host "Waiting 30 seconds for engines to initialize..."
Start-Sleep -Seconds 30
Write-Host "Engines should be running. Check health endpoints..."
