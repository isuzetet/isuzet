$engineConfigs = @(
    "apps/engine-identity/tsconfig.json",
    "apps/engine-strategy/tsconfig.json",
    "apps/engine-optimizer/tsconfig.json",
    "apps/engine-liquidity/tsconfig.json",
    "apps/engine-corridor/tsconfig.json",
    "apps/engine-shock/tsconfig.json",
    "apps/engine-incident/tsconfig.json",
    "apps/engine-behavior/tsconfig.json",
    "apps/engine-data/tsconfig.json",
    "apps/engine-fraud/tsconfig.json",
    "apps/engine-health/tsconfig.json",
    "apps/engine-twin/tsconfig.json",
    "apps/notification-engine/tsconfig.json"
)

$newContent = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@ruit/shared-types": ["../../packages/shared-types/dist/index.d.ts"],
      "@ruit/shared-utils": ["../../packages/shared-utils/dist/index.d.ts"],
      "@ruit/shared-db": ["../../packages/shared-db/dist/index.d.ts"],
      "@ruit/shared-queue": ["../../packages/shared-queue/dist/index.d.ts"],
      "@ruit/shared-auth": ["../../packages/shared-auth/dist/index.d.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
'@

foreach ($config in $engineConfigs) {
    $fullPath = Join-Path "C:\Users\ygebr\Desktop\LAS\Backend" $config
    if (Test-Path $fullPath) {
        Set-Content -Path $fullPath -Value $newContent -NoNewline
        Write-Host "Updated: $config"
    } else {
        $dir = Split-Path $fullPath -Parent
        if (Test-Path $dir) {
            Set-Content -Path $fullPath -Value $newContent -NoNewline
            Write-Host "Created: $config"
        } else {
            Write-Host "Skipping (directory missing): $config"
        }
    }
}
