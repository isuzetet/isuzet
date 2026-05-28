# Engine-Location Implementation Task Progress

## Changes Overview
- [ ] Change 1: Modify processLocationPing - Zone Resolution & Route Deviation
- [ ] Change 2: Add GET /zone/:zoneId/trucks route
- [ ] Change 3: Add GET /fleet/live route
- [ ] Change 4: Add POST /weighbridge/log route
- [ ] Change 5: Add GET /fuel-price/current route
- [ ] Change 6: Add POST /fuel-price/report route

## Change 1 Details
- [ ] Extract haversine function (reusable)
- [ ] Add processZoneAndDeviation helper
- [ ] Add resolveZone function (haversine + zone lookup)
- [ ] Add checkRouteDeviation function
- [ ] Insert call in processLocationPing after offline sync
- [ ] Add Redis cache invalidation for fleet:live:{fleetOwnerId}
- [ ] Add ROUTE_DEVIATION job queueing

## Change 2 Details
- [ ] Add route in tracking.routes.ts
- [ ] Add getTrucksInZone service function
- [ ] Handle FLEET_OWNER filtering
- [ ] Handle role-based access

## Change 3 Details
- [ ] Add route in tracking.routes.ts
- [ ] Add getFleetLiveState service function
- [ ] Implement Redis caching (TTL 30s)
- [ ] Build FleetLiveState interface

## Change 4 Details
- [ ] Add route in location.routes.ts
- [ ] Add logWeighbridgeEntry service function
- [ ] Implement tolerance calculation
- [ ] Handle overload incident creation
- [ ] Update Load.overloadWarningIssued
- [ ] Queue WEIGHBRIDGE_INTEL job

## Change 5 Details
- [ ] Add route in location.routes.ts
- [ ] Add getCurrentFuelPrice service function
- [ ] Handle optional region filter

## Change 6 Details
- [ ] Add route in location.routes.ts
- [ ] Add reportFuelPrice service function
- [ ] Validate region enum
- [ ] Try fetch fuelReportBonusEtb from StrategyVersion
- [ ] Create FuelPriceSnapshot
- [ ] Create DriverEarning with FUEL_REPORT_BONUS
- [ ] Queue FUEL_INTEL job

## Import Updates
- [ ] Add imports from @ruit/shared-utils (getRedisClient, invalidateCache)
- [ ] Add imports from @ruit/shared-queue (QUEUES, addJob)
- [ ] Add imports for enums (FUEL_PRICE_SOURCE, DRIVER_EARNING_TYPE, etc.)
