Get-ChildItem -Path "C:\Users\ygebr\Desktop\LAS\Backend\apps","C:\Users\ygebr\Desktop\LAS\Backend\packages" -Recurse -Filter "*.ts" | 
Where-Object { $_.FullName -notmatch "\\dist\\" -and $_.FullName -notmatch "\\node_modules\\" } | 
ForEach-Object { 
    $content = Get-Content $_.FullName -Raw
    $original = $content
    $replacements = @{
        'prisma\.corridors\b' = 'prisma.corridor'
        'prisma\.events\b' = 'prisma.event'
        'prisma\.strategy_versions\b' = 'prisma.strategyVersion'
        'prisma\.loads\b' = 'prisma.load'
        'prisma\.assignments\b' = 'prisma.assignment'
        'prisma\.incidents\b' = 'prisma.incident'
        'prisma\.shock_events\b' = 'prisma.shockEvent'
        'prisma\.fraud_flags\b' = 'prisma.fraudFlag'
        'prisma\.financial_transactions\b' = 'prisma.financialTransaction'
        'prisma\.rate_card_versions\b' = 'prisma.rateCardVersion'
        'prisma\.commission_configs\b' = 'prisma.commissionConfig'
        'prisma\.decision_traces\b' = 'prisma.decisionTrace'
        'prisma\.kyc_documents\b' = 'prisma.kycDocument'
        'prisma\.fleet_owners\b' = 'prisma.fleetOwner'
        'prisma\.drivers\b' = 'prisma.driver'
        'prisma\.orderers\b' = 'prisma.orderer'
        'prisma\.users\b' = 'prisma.user'
        'prisma\.trucks\b' = 'prisma.truck'
        'prisma\.trips\b' = 'prisma.trip'
        'prisma\.exposure_caps\b' = 'prisma.exposureCap'
        'prisma\.incident_evidence\b' = 'prisma.incidentEvidence'
        'prisma\.webhooks\b' = 'prisma.webhook'
        'prisma\.notification_preferences\b' = 'prisma.notificationPreference'
        'prisma\.ethiopian_calendar_events\b' = 'prisma.ethiopianCalendarEvent'
        'prisma\.load_negotiations\b' = 'prisma.loadNegotiation'
        'prisma\.orderer_payment_contracts\b' = 'prisma.ordererPaymentContract'
        'prisma\.corridor_checkpoints\b' = 'prisma.corridorCheckpoint'
    }
    foreach ($pattern in $replacements.Keys) {
        $content = $content -replace $pattern, $replacements[$pattern]
    }
    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline
        Write-Host "Updated: $($_.FullName)"
    }
}
