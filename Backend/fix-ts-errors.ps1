param(
  [string]$RepoRoot = "C:\Users\ygebr\Desktop\LAS\Backend"
)

Set-StrictMode -Version Latest
Push-Location $RepoRoot

$engineTsconfig = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "paths": {
      "@ruit/shared-types": ["../../packages/shared-types/dist/index.d.ts"],
      "@ruit/shared-utils": ["../../packages/shared-utils/dist/index.d.ts"],
      "@ruit/shared-db":    ["../../packages/shared-db/dist/index.d.ts"],
      "@ruit/shared-queue": ["../../packages/shared-queue/dist/index.d.ts"],
      "@ruit/shared-auth":  ["../../packages/shared-auth/dist/index.d.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
'@

$engines = @(
  "engine-identity","engine-strategy","engine-optimizer",
  "engine-liquidity","engine-corridor","engine-shock",
  "engine-incident","engine-behavior","engine-data",
  "engine-fraud","engine-health","engine-twin","notification-engine"
)

Write-Host "STEP 1: Writing engine tsconfig.json files..."
foreach ($e in $engines) {
  $path = Join-Path $RepoRoot "apps\$e\tsconfig.json"
  if (Test-Path $path) {
    $engineTsconfig | Set-Content -Path $path -Encoding UTF8
    Write-Host "Wrote: $path"
  } else {
    Write-Host "Skipped (not found): $path"
  }
}

Write-Host "`nSTEP 1: Running pnpm -r build..."
pnpm -v > $null 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "pnpm not found in PATH. Please install pnpm or run this script from a shell where pnpm is available." -ForegroundColor Red
  Pop-Location
  exit 1
}

pnpm -r build 2>&1 | Tee-Object -FilePath "$RepoRoot/build-step1.log" | Out-Host

$step1Log = Get-Content "$RepoRoot/build-step1.log" -Raw
$tsErrorCount1 = ([regex]::Matches($step1Log, "TS\d{3}")).Count
$otherErrorCount1 = ([regex]::Matches($step1Log, "(?i)\berror\b")).Count
Write-Host "`nSTEP 1 RESULT: Found $tsErrorCount1 TypeScript TS#### errors (regex count)."
Write-Host "Total 'error' keyword occurrences in build log: $otherErrorCount1"
Write-Host "Log: $RepoRoot\build-step1.log"

Write-Host "`nSTEP 2: Applying snake_case -> camelCase replacements across apps/*.ts ..."
$map = [ordered]@{
  'prisma\.strategy_versions\b'       = 'prisma.strategyVersion'
  'prisma\.rate_card_versions\b'      = 'prisma.rateCardVersion'
  'prisma\.commission_configs\b'      = 'prisma.commissionConfig'
  'prisma\.financial_transactions\b'  = 'prisma.financialTransaction'
  'prisma\.decision_traces\b'         = 'prisma.decisionTrace'
  'prisma\.kyc_documents\b'           = 'prisma.kycDocument'
  'prisma\.fleet_owners\b'            = 'prisma.fleetOwner'
  'prisma\.shock_events\b'            = 'prisma.shockEvent'
  'prisma\.fraud_flags\b'             = 'prisma.fraudFlag'
  'prisma\.incident_evidence\b'       = 'prisma.incidentEvidence'
  'prisma\.load_negotiations\b'       = 'prisma.loadNegotiation'
  'prisma\.exposure_caps\b'           = 'prisma.exposureCap'
  'prisma\.orderer_payment_contracts\b' = 'prisma.ordererPaymentContract'
  'prisma\.corridor_checkpoints\b'    = 'prisma.corridorCheckpoint'
  'prisma\.notification_preferences\b' = 'prisma.notificationPreference'
  'prisma\.ethiopian_calendar_events\b' = 'prisma.ethiopianCalendarEvent'
  'prisma\.corridors\b'               = 'prisma.corridor'
  'prisma\.events\b'                  = 'prisma.event'
  'prisma\.loads\b'                   = 'prisma.load'
  'prisma\.assignments\b'             = 'prisma.assignment'
  'prisma\.incidents\b'               = 'prisma.incident'
  'prisma\.drivers\b'                 = 'prisma.driver'
  'prisma\.orderers\b'                = 'prisma.orderer'
  'prisma\.users\b'                   = 'prisma.user'
  'prisma\.trucks\b'                  = 'prisma.truck'
  'prisma\.trips\b'                   = 'prisma.trip'
  '\bcreated_at\b'        = 'createdAt'
  '\bupdated_at\b'        = 'updatedAt'
  '\bevent_type\b'        = 'eventType'
  '\bis_active\b'         = 'isActive'
  '\bhealth_score\b'      = 'healthScore'
  '\bdensity_index\b'     = 'densityIndex'
  '\bshock_type\b'        = 'shockType'
  '\bthreshold_set\b'     = 'thresholdSet'
  '\bweight_set\b'        = 'weightSet'
  '\bpricing_params\b'    = 'pricingParams'
  '\boptimization_mode\b' = 'optimizationMode'
  '\baffected_corridors\b'= 'affectedCorridors'
  '\bincident_id\b'       = 'incidentId'
  '\btrip_id\b'           = 'tripId'
  '\bdriver_id\b'         = 'driverId'
  '\borderer_id\b'        = 'ordererId'
  '\bcorridor_id\b'       = 'corridorId'
  '\bfleet_owner_id\b'    = 'fleetOwnerId'
  '\buser_id\b'           = 'userId'
  '\bload_id\b'           = 'loadId'
  '\bassignment_id\b'     = 'assignmentId'
  '\bstrategy_version_id\b' = 'strategyVersionId'
  '\bsiu_invested\b'      = 'siuInvested'
  '\bexpansion_eligible\b'= 'expansionEligible'
  '\bload_to_truck_ratio\b' = 'loadToTruckRatio'
  '\bbackhaul_pct\b'      = 'backhaulPct'
  '\bpayment_delay_rate\b'= 'paymentDelayRate'
  '\bdemand_fill_rate\b'  = 'demandFillRate'
  '\bon_time_rate\b'      = 'onTimeRate'
  '\btrust_score\b'       = 'trustScore'
  '\btrust_tier\b'        = 'trustTier'
  '\bkyc_tier\b'          = 'kycTier'
  '\bregion_access\b'     = 'regionAccess'
  '\bfull_name\b'         = 'fullName'
  '\bphone_backup\b'      = 'phoneBackup'
  '\bpayout_speed\b'      = 'payoutSpeed'
  '\bcredit_limit_etb\b'  = 'creditLimitEtb'
  '\bis_credit_eligible\b'= 'isCreditEligible'
  '\bpayment_reliability_score\b' = 'paymentReliabilityScore'
  '\bbase_rate_per_km\b'  = 'baseRatePerKm'
  '\bfuel_index_multiplier\b' = 'fuelIndexMultiplier'
  '\brisk_premium_pct\b'  = 'riskPremiumPct'
  '\bmargin_floor_etb\b'  = 'marginFloorEtb'
  '\beffective_from\b'    = 'effectiveFrom'
  '\beffective_to\b'      = 'effectiveTo'
  '\bstarted_at\b'        = 'startedAt'
  '\bended_at\b'          = 'endedAt'
  '\bresolved_at\b'       = 'resolvedAt'
  '\bescalation_reason\b' = 'escalationReason'
  '\bliability_party\b'   = 'liabilityParty'
  '\bliability_breakdown\b' = 'liabilityBreakdown'
  '\bpenalty_etb\b'       = 'penaltyEtb'
  '\bcompensation_etb\b'  = 'compensationEtb'
  '\bresolution_notes\b'  = 'resolutionNotes'
  '\bevidence_deadline\b' = 'evidenceDeadline'
  '\bassigned_to\b'       = 'assignedTo'
  '\breporter_role\b'     = 'reporterRole'
  '\breported_by\b'       = 'reportedBy'
  '\bincident_type\b'     = 'incidentType'
  '\baggregate_id\b'      = 'aggregateId'
  '\baggregate_type\b'    = 'aggregateType'
  '\bactor_id\b'          = 'actorId'
  '\bactor_role\b'        = 'actorRole'
  '\bis_manual_override\b'= 'isManualOverride'
}

$tsFiles = Get-ChildItem -Path (Join-Path $RepoRoot "apps") -Recurse -Filter "*.ts" |
  Where-Object { $_.FullName -notmatch "\\dist\\" -and $_.FullName -notmatch "\\node_modules\\" }

foreach ($file in $tsFiles) {
  $content = Get-Content $file.FullName -Raw
  $orig = $content
  foreach ($k in $map.Keys) {
    $content = [regex]::Replace($content, $k, $map[$k])
  }
  if ($content -ne $orig) {
    Copy-Item -Path $file.FullName -Destination ($file.FullName + ".bak") -Force
    $content | Set-Content -Path $file.FullName -Encoding UTF8
    Write-Host "Updated: $($file.FullName)"
  }
}

Write-Host "`nSTEP 2: Running pnpm -r build (after replacements)..."
pnpm -r build 2>&1 | Tee-Object -FilePath "$RepoRoot/build-step2.log" | Out-Host

$step2Log = Get-Content "$RepoRoot/build-step2.log" -Raw
$tsErrorCount2 = ([regex]::Matches($step2Log, "TS\d{3}")).Count
$otherErrorCount2 = ([regex]::Matches($step2Log, "(?i)\berror\b")).Count
Write-Host "`nSTEP 2 RESULT: Found $tsErrorCount2 TypeScript TS#### errors (regex count)."
Write-Host "Total 'error' keyword occurrences in build log: $otherErrorCount2"
Write-Host "Log: $RepoRoot\build-step2.log"

Write-Host "`nSCRIPT COMPLETE. Review the two logs and remaining TS error counts above."
Pop-Location