/**
 * RUIT CBE - Engine 4: Liquidity & Exposure Service
 * Implements Amendment 2 Final Edit 6 - Contingent Liability Exposure
 */

import { prisma as db } from '@ruit/shared-db';
import { cached, invalidateCache } from '@ruit/shared-utils';

export interface ExposureCheckResult {
  blocked: boolean;
  reason: string | undefined;
  breachedCaps: Array<{
    scopeType: string;
    scopeId: string | null;
    capEtb: number;
    currentEtb: number;
  }>;
  warnings: Array<{
    scopeType: string;
    scopeId: string | null;
    pctUsed: number;
  }>;
}

/**
 * Get cluster ID for corridor from strategy mapping
 */
async function getClusterIdForCorridor(corridorId: string): Promise<string | null> {
  const strategy = await cached(
    'cache:strategy:active:GLOBAL',
    300,
    async () => {
      const result = await db.strategyVersion.findFirst({
        where: { isActive: true },
        select: { thresholdSet: true }
      });
      return result?.thresholdSet ?? null;
    }
  );

  const thresholdSet = strategy as Record<string, unknown>;
  const clusterMapping = thresholdSet?.clusterMapping as Record<string, string[]> | undefined;
  
  if (!clusterMapping) return null;
  
  for (const [clusterId, corridors] of Object.entries(clusterMapping)) {
    if (corridors.includes(corridorId)) {
      return clusterId;
    }
  }
  
  return null;
}

/**
 * Get TRUE exposure including contingent liabilities (Amendment 2 Edit 6)
 * Includes: active loads + pending escrow + frozen disputes + unverified COD
 */
async function getTrueExposure(scopeType: string, scopeId: string | null): Promise<number> {
  let activeLoadsValue = 0;
  let pendingEscrowValue = 0;
  let frozenDisputeValue = 0;
  let unverifiedCodValue = 0;

  if (scopeType === 'FLEET' && scopeId) {
    // Active loads (MATCHED or IN_TRANSIT status) - query assignments to find loads
    const activeAssignments = await db.assignment.findMany({
      where: {
        fleetOwnerId: scopeId,
        status: { in: ['ACTIVE', 'ACCEPTED'] }
      },
      select: { loadId: true }
    });
    
    const loadIds = activeAssignments.map((a: any) => a.loadId);
    
    if (loadIds.length > 0) {
      const loads = await db.load.aggregate({
        where: { id: { in: loadIds } },
        _sum: { finalRateEtb: true }
      });
      activeLoadsValue = Number(loads._sum?.finalRateEtb ?? 0);
    }

    // Pending escrow (ESCROW_HOLD transactions not yet released)
    const pendingEscrow = await db.financialTransaction.aggregate({
      where: {
        fleetOwnerId: scopeId,
        txType: 'ESCROW_HOLD',
        status: 'PENDING'
      },
      _sum: { amountEtb: true }
    });
    pendingEscrowValue = Number(pendingEscrow._sum?.amountEtb ?? 0);

    // Frozen disputes - trips with open incidents (MEDIUM or higher severity)
    // Find trips for this fleet owner with open incidents
    const disputedTrips = await db.trip.findMany({
      where: {
        fleetOwnerId: scopeId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] }
      },
      select: { id: true, loadId: true }
    });
    
    // Check if any have open incidents with MEDIUM+ severity
    for (const trip of disputedTrips) {
      const openIncident = await db.incident.findFirst({
        where: {
          tripId: trip.id,
          status: { in: ['OPEN', 'UNDER_INVESTIGATION', 'EVIDENCE_COLLECTION', 'AWAITING_RESOLUTION', 'ESCALATED'] },
          severity: { in: ['MEDIUM', 'HIGH', 'CRITICAL'] }
        }
      });
      
      if (openIncident && trip.loadId) {
        const load = await db.load.findFirst({
          where: { id: trip.loadId },
          select: { finalRateEtb: true }
        });
        frozenDisputeValue += Number(load?.finalRateEtb ?? 0);
      }
    }

    // Unverified COD (COD_LOG transactions where codVerified is false or null)
    const unverifiedCod = await db.financialTransaction.aggregate({
      where: {
        fleetOwnerId: scopeId,
        txType: 'COD_LOG',
        codVerified: null,
        status: 'PENDING'
      },
      _sum: { amountEtb: true }
    });
    unverifiedCodValue = Number(unverifiedCod._sum?.amountEtb ?? 0);

  } else if (scopeType === 'CLIENT' && scopeId) {
    // Similar logic for orderers
    // First get all loads for this orderer that are matched/in_transit
    const loadsForOrderer = await db.load.findMany({
      where: {
        ordererId: scopeId,
        status: { in: ['MATCHED', 'IN_TRANSIT'] }
      },
      select: { id: true }
    });
    
    let clientLoadIds = loadsForOrderer.map((l: any) => l.id);
    
    const activePurchases = await db.assignment.findMany({
      where: {
        loadId: { in: clientLoadIds },
        status: { in: ['ACTIVE', 'ACCEPTED'] }
      },
      select: { loadId: true }
    });
    
    const loadIds = activePurchases.map((a: any) => a.loadId);
    
    if (loadIds.length > 0) {
      const loads = await db.load.aggregate({
        where: { id: { in: loadIds } },
        _sum: { finalRateEtb: true }
      });
      activeLoadsValue = Number(loads._sum?.finalRateEtb ?? 0);
    }

    const pendingEscrow = await db.financialTransaction.aggregate({
      where: {
        ordererId: scopeId,
        txType: 'ESCROW_HOLD',
        status: 'PENDING'
      },
      _sum: { amountEtb: true }
    });
    pendingEscrowValue = Number(pendingEscrow._sum?.amountEtb ?? 0);

    const unverifiedCod = await db.financialTransaction.aggregate({
      where: {
        ordererId: scopeId,
        txType: 'COD_LOG',
        codVerified: null,
        status: 'PENDING'
      },
      _sum: { amountEtb: true }
    });
    unverifiedCodValue = Number(unverifiedCod._sum?.amountEtb ?? 0);

  } else if (scopeType === 'CORRIDOR' && scopeId) {
    // Corridor exposures
    const activeLoads = await db.load.aggregate({
      where: {
        corridorId: scopeId,
        status: { in: ['MATCHED', 'IN_TRANSIT'] }
      },
      _sum: { finalRateEtb: true }
    });
    activeLoadsValue = Number(activeLoads._sum?.finalRateEtb ?? 0);
  }

  return activeLoadsValue + pendingEscrowValue + frozenDisputeValue + unverifiedCodValue;
}

/**
 * Check exposure before allowing load creation
 * Implements Amendment 2 Edit 6 with soft block in Phase 1
 */
export async function checkExposure(
  ordererId: string,
  fleetOwnerId: string,
  corridorId: string,
  amountEtb: number,
  isShockMode: boolean
): Promise<ExposureCheckResult> {
  // Get cluster ID for this corridor
  const clusterId = await getClusterIdForCorridor(corridorId);

  // Fetch all relevant exposure caps
  const scopes: { type: string; id: string | null }[] = [
    { type: 'CLIENT', id: ordererId },
    { type: 'FLEET', id: fleetOwnerId },
    { type: 'CORRIDOR', id: corridorId },
    { type: 'CLUSTER', id: clusterId },
    { type: 'SYSTEM', id: null }
  ];

  const caps: Array<{
    id: string;
    scopeType: string;
    scopeId: string | null;
    capEtb: number;
    currentExposureEtb: number;
    warningThresholdPct: number;
    isActive: boolean;
  }> = [];
  
  for (const scope of scopes) {
    const scopeCaps = await db.exposureCap.findMany({
      where: {
        scopeType: scope.type,
        scopeId: scope.id,
        isActive: true
      }
    });
    caps.push(...scopeCaps.map((c: any) => ({
      id: c.id,
      scopeType: c.scopeType,
      scopeId: c.scopeId,
      capEtb: Number(c.capEtb),
      currentExposureEtb: Number(c.currentExposureEtb),
      warningThresholdPct: Number(c.warningThresholdPct),
      isActive: c.isActive
    })));
  }

  const breachedCaps: ExposureCheckResult['breachedCaps'] = [];
  const warnings: ExposureCheckResult['warnings'] = [];
  let anyBreach = false;

  // Check each cap
  for (const cap of caps) {
    const currentExposure = await getTrueExposure(cap.scopeType, cap.scopeId);
    const projectedExposure = currentExposure + amountEtb;
    const pctUsed = (currentExposure / cap.capEtb) * 100;
    
    // Check for breach
    if (projectedExposure > cap.capEtb) {
      breachedCaps.push({
        scopeType: cap.scopeType,
        scopeId: cap.scopeId,
        capEtb: cap.capEtb,
        currentEtb: currentExposure
      });
      anyBreach = true;
    } else if (pctUsed >= cap.warningThresholdPct) {
      // Warning if above threshold but not breached
      warnings.push({
        scopeType: cap.scopeType,
        scopeId: cap.scopeId,
        pctUsed
      });
    }
  }

  // Decision based on shock mode
  const blocked = anyBreach && isShockMode;
  
  return {
    blocked,
    reason: blocked ? 'EXPOSURE_CAP_EXCEEDED' : undefined,
    breachedCaps,
    warnings
  };
}

/**
 * Increment exposure for a scope
 */
export async function incrementExposure(
  scopeType: string,
  scopeId: string | null,
  amountEtb: number
): Promise<void> {
  const scopeIdParam = scopeId ?? null;
  
  await db.$executeRaw`UPDATE exposure_caps
    SET current_exposure_etb = current_exposure_etb + ${amountEtb},
        updatedAt = NOW()
    WHERE scope_type = ${scopeType}
      AND (${scopeIdParam}::text IS NULL OR scope_id = ${scopeIdParam})
      AND isActive = true`;
  
  // Invalidate cache
  const cacheKey = `cache:exposure:caps:${scopeType}:${scopeId ?? 'null'}`;
  await invalidateCache(cacheKey);
}

/**
 * Decrement exposure for a scope
 */
export async function decrementExposure(
  scopeType: string,
  scopeId: string | null,
  amountEtb: number
): Promise<void> {
  const scopeIdParam = scopeId ?? null;
  
  await db.$executeRaw`UPDATE exposure_caps
    SET current_exposure_etb = GREATEST(0, current_exposure_etb - ${amountEtb}),
        updatedAt = NOW()
    WHERE scope_type = ${scopeType}
      AND (${scopeIdParam}::text IS NULL OR scope_id = ${scopeIdParam})
      AND isActive = true`;
  
  // Invalidate cache
  const cacheKey = `cache:exposure:caps:${scopeType}:${scopeId ?? 'null'}`;
  await invalidateCache(cacheKey);
}

/**
 * Get exposure risk for WDM liquidityDelta calculation
 * Used directly by Engine 2 (no HTTP call, direct Prisma access)
 */
export async function getExposureRisk(
  fleetOwnerId: string,
  loadAmountEtb: number
): Promise<number> {
  const cap = await db.exposureCap.findFirst({
    where: {
      scopeType: 'FLEET',
      scopeId: fleetOwnerId,
      isActive: true
    }
  });
  
  if (!cap) {
    return 0; // No cap means no risk
  }
  
  const currentExposure = await getTrueExposure('FLEET', fleetOwnerId);
  const projectedExposure = currentExposure + loadAmountEtb;
  const ratio = projectedExposure / Number(cap.capEtb);
  
  return Math.min(1, Math.max(0, ratio));
}




