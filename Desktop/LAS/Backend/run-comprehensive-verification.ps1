
#Requires -Version 5.0
# Comprehensive Backend Verification Suite
# Saves all results to files for later reporting

$reportDir = "c:\Users\ygebr\Desktop\LAS\Backend\verification-report"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = "$reportDir\final-verification-$timestamp.txt"

function Log {
    param([string]$message)
    Write-Host $message
    Add-Content -Path $reportFile -Value $message
}

Log "=========================================="
Log "RUIT CBE BACKEND VERIFICATION REPORT"
Log "Started: $(Get-Date)"
Log "=========================================="
Log ""

# ===== ENGINE HEALTH CHECKS =====
Log "ENGINE HEALTH CHECKS:"
Log "-" * 50

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
$engineResults = @()

foreach ($port in $ports.Keys) {
    $name = $ports[$port]
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/api/v1/health" -TimeoutSec 2 -ErrorAction Stop
        Log "✅ $($name.PadRight(20)) (port $port): UP"
        $upCount++
        $engineResults += @{name=$name; port=$port; status="UP"}
    } catch {
        Log "❌ $($name.PadRight(20)) (port $port): DOWN"
        $downEngines += $name
        $engineResults += @{name=$name; port=$port; status="DOWN"}
    }
    
    Start-Sleep -Milliseconds 100
}

Log ""
Log "ENGINES RESPONDING: $upCount/13"
Log ""

# ===== AUTHENTICATION FLOW TEST =====
Log "AUTHENTICATION FLOW TEST:"
Log "-" * 50

$testPhone = "+251922999001"
$testPhoneShort = "0922999001"
$headers = @{"Content-Type"="application/json"}

try {
    # Clean test user
    docker exec ruit_postgres psql -U ruit -d ruit_cbe -c "DELETE FROM users WHERE phone = '$testPhone';" 2>$null
    Log "Cleaned test user from database"
    
    # Register
    $regBody = @{phone=$testPhoneShort; fullName="Verification Test"; role="FLEET_OWNER"} | ConvertTo-Json
    $regResult = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/register" -Method POST -Headers $headers -Body $regBody
    Log "Register: success=$($regResult.success)"
    
    # Get OTP
    $otp_raw = docker exec ruit_redis redis-cli GET "otp:$testPhone" 2>$null
    $otp = $otp_raw -replace '`r`n'
    Log "OTP retrieved from Redis: ${otp.Substring(0, 2)}**** (length: $($otp.Length))"
    
    # Verify OTP
    $verifyBody = @{phone=$testPhone; otp=$otp} | ConvertTo-Json
    $authResult = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/verify-otp" -Method POST -Headers $headers -Body $verifyBody
    $token = $authResult.data.access_token
    Log "Verify OTP: success=$($authResult.success), token_length=$($token.Length)"
    
    # Get profile
    $headers["Authorization"] = "Bearer $token"
    $profile = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/identity/me" -Headers $headers
    Log "Profile: role=$($profile.data.role), kycTier=$($profile.data.kycTier)"
    Log "Referral code: $(if($profile.data.referralCode){'✅ PRESENT'} else {'❌ MISSING'})"
    
    Log "AUTH FLOW: ✅ PASS"
} catch {
    Log "AUTH FLOW: ❌ FAIL - $($_.Exception.Message)"
}

Log ""
Log "=========================================="
Log "Verification Report saved to: $reportFile"
Log "=========================================="

Write-Host "Report saved to $reportFile"
