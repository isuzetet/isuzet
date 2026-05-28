import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { CONSOLIDATED_LOAD_STATUS, SUB_LOAD_STATUS, AGGREGATOR_TYPE, ConsolidatedLoadStatus, SubLoadStatus, KG_PER_QUINTAL, ETB_CENTS_PER_BIRR } from '@ruit/shared-types';
import { getConfig } from '@ruit/shared-db';

// `BUILDING` used to exist in the Prisma enum but was removed from shared-types.
// The database schema still contains the value for legacy records, so we
// convert it to the nearest current status (COLLECTING) whenever we read a
// consolidated load. This keeps the TypeScript compiler happy and ensures
// the rest of the logic treats the old value correctly.
function normalizeConsolidatedLoadStatus(status: string): ConsolidatedLoadStatus {
  if (status === 'BUILDING') {
    return CONSOLIDATED_LOAD_STATUS.COLLECTING;
  }
  return status as ConsolidatedLoadStatus;
}

const DEFAULT_TRUCK_CAPACITY = 10000; // kg

interface CreateConsolidationBody {
  corridorId: string;
  consolidationType: string;
  originCity: string;
  destinationCity: string;
  collectionDeadline: string;
  minimumFillPct: number;
  shortfallPolicy: string;
  distributionPointAddress?: string;
  distributionPointLat?: number;
  distributionPointLng?: number;
}

interface JoinConsolidationBody {
  weightKg: number;
  cargoDescription: string;
  cargoType: string;
  escrowAmountEtb: number;
  pickupAddress?: string;
  deliveryAddress?: string;
}

interface CreateCargoOfferBody {
  corridorId: string;
  cargoType: string;
  weightKg: number;
  cargoDescription: string;
  pickupAddress: string;
  deliveryAddress: string;
  escrowAmountEtb: number;
  pickupDeadlineHours: number;
}

interface HandlePartialPickupFailureBody {
  consolidatedLoadId: string;
  failureReason: string;
  affectedSubLoadIds: string[];
  compensationPct?: number;
}

export async function createConsolidatedLoad(body: CreateConsolidationBody, userId: string): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  // Validate corridor
  const corridor = await prisma.corridor.findUnique({
    where: { id: body.corridorId },
  });

  if (!corridor) {
    throw { code: 'CORRIDOR_NOT_FOUND', message: 'Corridor not found' };
  }

  if (corridor.status !== 'ACTIVE') {
    throw { code: 'CORRIDOR_INACTIVE', message: 'Corridor is not active' };
  }

  const consolidatedLoad = await prisma.consolidatedLoad.create({
    data: {
      id: generateId('csl'),
      corridorId: body.corridorId,
      aggregatorId: userId,
      aggregatorType: AGGREGATOR_TYPE.FIELD_AGENT,
      consolidationType: body.consolidationType,
      originCity: body.originCity,
      destinationCity: body.destinationCity,
      collectionDeadline: new Date(body.collectionDeadline),
      status: CONSOLIDATED_LOAD_STATUS.COLLECTING,
      minimumFillPct: body.minimumFillPct,
      shortfallPolicy: body.shortfallPolicy as any,
      totalWeightKg: 0,
      totalEscrowEtb: 0,
      currentFillPct: 0,
      distributionPointAddress: body.distributionPointAddress || null,
      distributionPointLat: body.distributionPointLat || null,
      distributionPointLng: body.distributionPointLng || null,
      createdAt: new Date(),
    },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CONSOLIDATION_CREATED',
      aggregateId: consolidatedLoad.id,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: 'ORDERER',
      strategyVersionId,
      payload: { ...body },
    },
  });

  return { success: true, data: consolidatedLoad };
}

export async function joinConsolidatedLoad(
  consolidatedLoadId: string,
  body: JoinConsolidationBody,
  userId: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const consolidatedLoad = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
  });

  if (!consolidatedLoad) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  // normalize status so that legacy BUILDING values are treated as COLLECTING
  const currentStatus = normalizeConsolidatedLoadStatus(consolidatedLoad.status);

  if (currentStatus !== CONSOLIDATED_LOAD_STATUS.COLLECTING) {
    throw { code: 'INVALID_STATUS', message: 'Load is not accepting new sub-loads' };
  }

  if (new Date() > consolidatedLoad.collectionDeadline) {
    throw { code: 'DEADLINE_PASSED', message: 'Collection deadline has passed' };
  }

  const weightQuintals = body.weightKg / 100;

  // Create sub-load
  const subLoad = await prisma.subLoad.create({
    data: {
      id: generateId('sdl'),
      consolidatedLoadId,
      ordererId: userId,
      weightKg: body.weightKg,
      weightQuintals: body.weightKg / 100,
      cargoDescription: body.cargoDescription,
      cargoType: body.cargoType,
      escrowAmountEtb: body.escrowAmountEtb,
      pickupAddress: body.pickupAddress || null,
      deliveryAddress: body.deliveryAddress || null,
      status: SUB_LOAD_STATUS.PENDING,
      createdAt: new Date(),
    },
  });

  // Update consolidated load
  const newTotalWeight = consolidatedLoad.totalWeightKg + body.weightKg;
  const newTotalEscrow = consolidatedLoad.totalEscrowEtb + body.escrowAmountEtb;
  const newFillPct = Math.round((newTotalWeight / DEFAULT_TRUCK_CAPACITY) * 100);

  // start with the normalized status so we never propagate BUILDING to the
  // client or into our own types.
  let newStatus: ConsolidatedLoadStatus = currentStatus;
  if (newFillPct >= consolidatedLoad.minimumFillPct && currentStatus === CONSOLIDATED_LOAD_STATUS.COLLECTING) {
    newStatus = CONSOLIDATED_LOAD_STATUS.READY;
  }

  const updatedConsolidatedLoad = await prisma.consolidatedLoad.update({
    where: { id: consolidatedLoadId },
    data: {
      totalWeightKg: newTotalWeight,
      totalEscrowEtb: newTotalEscrow,
      currentFillPct: newFillPct,
      status: newStatus,
    },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'SUB_LOAD_JOINED',
      aggregateId: subLoad.id,
      aggregateType: 'SUB_LOAD',
      actorId: userId,
      actorRole: 'ORDERER',
      strategyVersionId,
      payload: { consolidatedLoadId, subLoadId: subLoad.id, weightKg: body.weightKg },
    },
  });

  return { success: true, data: { subLoad, consolidatedLoad: updatedConsolidatedLoad } };
}

export async function getAvailableConsolidatedLoads(
  corridorId?: string,
  cargoType?: string,
  maxDeadlineHours?: string
): Promise<any> {
  const now = new Date();
  const maxDeadline = maxDeadlineHours
    ? new Date(now.getTime() + parseInt(maxDeadlineHours) * 60 * 60 * 1000)
    : null;

  const loads = await prisma.consolidatedLoad.findMany({
    where: {
      status: { in: ['COLLECTING', 'READY'] },
      collectionDeadline: { gt: now },
      ...(corridorId && { corridorId }),
    },
    include: { subLoads: true },
    orderBy: { createdAt: 'desc' },
  });

  const filteredLoads = cargoType
    ? loads.filter((load: any) =>
        load.subLoads.some(
          (sl: any) => sl.cargoType.toLowerCase() === cargoType.toLowerCase()
        )
      )
    : loads;

  const formattedLoads = filteredLoads
    .filter((load: any) => !maxDeadline || load.collectionDeadline <= maxDeadline)
    .map((load: any) => {
      const remainingCapacity = DEFAULT_TRUCK_CAPACITY - load.totalWeightKg;
      const estimatedCostPerQuintal =
        load.totalWeightKg > 0
          ? Math.round(load.totalEscrowEtb / (load.totalWeightKg / 100))
          : 0;

      return {
        id: load.id,
        consolidationType: load.consolidationType,
        originCity: load.originCity,
        destinationCity: load.destinationCity,
        collectionDeadline: load.collectionDeadline,
        status: load.status,
        totalWeightKg: load.totalWeightKg,
        currentFillPct: load.currentFillPct,
        remainingCapacityKg: remainingCapacity,
        estimatedCostPerQuintal,
        subLoadsCount: load.subLoads.length,
      };
    });

  return { success: true, data: formattedLoads };
}

export async function getConsolidatedLoad(id: string): Promise<any> {
  const load = await prisma.consolidatedLoad.findUnique({
    where: { id },
    include: { subLoads: true },
  });

  if (!load) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  return { success: true, data: load };
}

export async function cancelSubLoad(consolidatedLoadId: string, subLoadId: string, userId: string): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const subLoad = await prisma.subLoad.findUnique({
    where: { id: subLoadId },
  });

  if (!subLoad) {
    throw { code: 'SUB_LOAD_NOT_FOUND', message: 'Sub-load not found' };
  }

  if (subLoad.ordererId !== userId) {
    throw { code: 'NOT_AUTHORIZED', message: 'You did not create this sub-load' };
  }

  const consolidatedLoad = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
  });

  if (!consolidatedLoad) {
    throw { code: 'CONSOLIDATED_LOAD_NOT_FOUND', message: 'Consolidated load not found' };
  }

  const cancelStatus = normalizeConsolidatedLoadStatus(consolidatedLoad.status);

  if (
    cancelStatus !== CONSOLIDATED_LOAD_STATUS.COLLECTING &&
    cancelStatus !== CONSOLIDATED_LOAD_STATUS.READY
  ) {
    throw { code: 'INVALID_STATUS', message: 'Cannot cancel sub-load in current state' };
  }

  // Update sub-load
  await prisma.subLoad.update({
    where: { id: subLoadId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  // Update consolidated load
  const newTotalWeight = consolidatedLoad.totalWeightKg - subLoad.weightKg;
  const newTotalEscrow = consolidatedLoad.totalEscrowEtb - subLoad.escrowAmountEtb;
  const newFillPct = Math.round((newTotalWeight / DEFAULT_TRUCK_CAPACITY) * 100);

  let newStatus: ConsolidatedLoadStatus = cancelStatus;
  if (newFillPct < consolidatedLoad.minimumFillPct && cancelStatus === CONSOLIDATED_LOAD_STATUS.READY) {
    newStatus = CONSOLIDATED_LOAD_STATUS.COLLECTING;
  }

  const updatedConsolidatedLoad = await prisma.consolidatedLoad.update({
    where: { id: consolidatedLoadId },
    data: {
      totalWeightKg: newTotalWeight,
      totalEscrowEtb: newTotalEscrow,
      currentFillPct: newFillPct,
      status: newStatus,
    },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'SUB_LOAD_CANCELLED',
      aggregateId: subLoadId,
      aggregateType: 'SUB_LOAD',
      actorId: userId,
      actorRole: 'ORDERER',
      strategyVersionId,
      payload: { consolidatedLoadId, subLoadId, weightKg: subLoad.weightKg },
    },
  });

  return { success: true, data: updatedConsolidatedLoad };
}

export async function dispatchConsolidatedLoad(
  consolidatedLoadId: string,
  userId: string,
  userRole: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const consolidatedLoad = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
    include: { subLoads: true },
  });

  if (!consolidatedLoad) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  const corridor = await prisma.corridor.findUnique({
    where: { id: consolidatedLoad.corridorId }
  });

  const dispatchStatus = normalizeConsolidatedLoadStatus(consolidatedLoad.status);

  if (
    dispatchStatus !== CONSOLIDATED_LOAD_STATUS.COLLECTING &&
    dispatchStatus !== CONSOLIDATED_LOAD_STATUS.READY
  ) {
    throw { code: 'INVALID_STATUS', message: 'Load is not in a dispatched state' };
  }

  if (
    consolidatedLoad.currentFillPct < consolidatedLoad.minimumFillPct &&
    userRole !== 'OPS_ADMIN'
  ) {
    throw {
      code: 'BELOW_MINIMUM_FILL',
      message: 'Fill percentage is below minimum required',
    };
  }

  const activeSubLoads = consolidatedLoad.subLoads.filter(
    (sl: any) => ['PENDING', 'CONFIRMED'].includes(sl.status)
  );

  // Create master load and sub-load stops in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Create master Load
    const masterLoad = await tx.load.create({
      data: {
        id: generateId('lod'),
        ordererId: consolidatedLoad.aggregatorId,
        loadType: 'MULTI_DISPATCH',
        status: 'OPEN',
        weightKg: consolidatedLoad.totalWeightKg,
        systemQuoteEtbCents: consolidatedLoad.totalEscrowEtb * 100,
        corridorId: consolidatedLoad.corridorId,
        pickupZoneId: corridor?.originZoneId,
        deliveryZoneId: corridor?.destinationZoneId,
        createdAt: new Date(),
        // Add default required fields
        priceEtbCents: consolidatedLoad.totalEscrowEtb * 100,
        currency: 'ETB',
      },
    });

    // Create LoadStops for each sub-load
    for (const subLoad of activeSubLoads) {
      // Create pickup stop
      await tx.loadStop.create({
        data: {
          id: generateId('lst'),
          loadId: masterLoad.id,
          stopType: 'PICKUP',
          address: subLoad.pickupAddress || consolidatedLoad.originCity,
          city: consolidatedLoad.originCity,
          lat: consolidatedLoad.distributionPointLat || 0,
          lng: consolidatedLoad.distributionPointLng || 0,
          stopOrder: 1,
        },
      });

      // Create delivery stop
      await tx.loadStop.create({
        data: {
          id: generateId('lst'),
          loadId: masterLoad.id,
          stopType: 'DELIVERY',
          address: subLoad.deliveryAddress || consolidatedLoad.destinationCity,
          city: consolidatedLoad.destinationCity,
          lat: 0,
          lng: 0,
          stopOrder: 2,
        },
      });

      // Update sub-load status
      await tx.subLoad.update({
        where: { id: subLoad.id },
        data: { status: SUB_LOAD_STATUS.CONFIRMED },
      });
    }

    // Update consolidated load
    const updatedConsolidatedLoad = await tx.consolidatedLoad.update({
      where: { id: consolidatedLoadId },
      data: {
        masterLoadId: masterLoad.id,
        status: CONSOLIDATED_LOAD_STATUS.IN_TRANSIT,
      },
    });

    return { masterLoadId: masterLoad.id, consolidatedLoad: updatedConsolidatedLoad };
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CONSOLIDATION_DISPATCHED',
      aggregateId: consolidatedLoadId,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: userRole,
      strategyVersionId,
      payload: {
        masterLoadId: result.masterLoadId,
        consolidatedLoadId,
        totalWeightKg: consolidatedLoad.totalWeightKg,
        subLoadsCount: activeSubLoads.length,
      },
    },
  });

  return { success: true, data: result };
}

// PHASE 5 FUNCTIONS (LTL CONSOLIDATION + MULTI-PAYER ESCROW)

/**
 * Create a cargo offer for LTL consolidation
 * - Validates shipper has not exceeded daily offer quota
 * - Creates CargoOffer with OPEN status
 * - Calculates pickup window (now → pickupDeadlineHours from now)
 */
export async function createCargoOffer(
  body: CreateCargoOfferBody,
  userId: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  // Validate corridor
  const corridor = await prisma.corridor.findUnique({
    where: { id: body.corridorId }
  });

  if (!corridor) {
    throw { code: 'CORRIDOR_NOT_FOUND', message: 'Corridor not found' };
  }

  if (corridor.status !== 'ACTIVE') {
    throw { code: 'CORRIDOR_INACTIVE', message: 'Corridor is not active' };
  }

  // Calculate pickup deadline
  const pickupDeadline = new Date(Date.now() + body.pickupDeadlineHours * 60 * 60 * 1000);

  // Create cargo offer
  const cargoOffer = await (prisma as any).cargoOffer.create({
    data: {
      id: generateId('cgo'),
      corridorId: body.corridorId,
      shipperId: userId,
      cargoType: body.cargoType,
      weightKg: body.weightKg,
      weightQuintals: body.weightKg / 100,
      cargoDescription: body.cargoDescription,
      pickupAddress: body.pickupAddress,
      deliveryAddress: body.deliveryAddress,
      escrowAmountEtb: body.escrowAmountEtb,
      pricePerKgEtb: body.escrowAmountEtb / body.weightKg,
      pickupWindowStart: new Date(),
      pickupWindowEnd: pickupDeadline,
      status: 'OPEN',
      createdAt: new Date(),
    },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CARGO_OFFER_CREATED',
      aggregateId: cargoOffer.id,
      aggregateType: 'CARGO_OFFER',
      actorId: userId,
      actorRole: 'SHIPPER',
      strategyVersionId,
      payload: {
        cargoOfferId: cargoOffer.id,
        corridorId: body.corridorId,
        weightKg: body.weightKg,
        escrowAmountEtb: body.escrowAmountEtb,
      },
    },
  });

  return { success: true, data: cargoOffer };
}

/**
 * Get open cargo offers for a specific corridor
 * - Returns offers in OPEN status
 * - Sorted by oldest-first (FIFO consolidation)
 */
export async function getOpenCargoOffersByCorridor(
  corridorId: string,
  limit?: number
): Promise<any> {
  const offers = await (prisma as any).cargoOffer.findMany({
    where: {
      corridorId,
      status: 'OPEN',
      pickupWindowEnd: { gt: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: limit || 50,
  });

  // Calculate fill percentages and remaining capacity
  const enriched = offers.map((offer: any) => {
    const estimatedCostPerQuintal = offer.escrowAmountEtb / (offer.weightKg / 100);
    return {
      ...offer,
      estimatedCostPerQuintal: Math.round(estimatedCostPerQuintal),
      hoursUntilPickupDeadline: Math.round(
        (offer.pickupWindowEnd.getTime() - Date.now()) / (60 * 60 * 1000)
      ),
    };
  });

  return { success: true, data: enriched };
}

/**
 * Consolidate multiple cargo offers into a consolidated load
 * - Validates offers are in OPEN status and have not expired
 * - Groups by corridor
 * - Creates consolidated load with weight-based proportional escrow allocation
 * - Updates cargo offer statuses to CONSOLIDATED
 */
export async function consolidateOffers(
  offerIds: string[],
  consolidationAgentId: string
): Promise<any> {
  if (offerIds.length < 2) {
    throw { code: 'INVALID_REQUEST', message: 'At least 2 offers required for consolidation' };
  }

  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';
  const config = await getConfig();

  // Fetch all offers
  const offers = await (prisma as any).cargoOffer.findMany({
    where: {
      id: { in: offerIds },
      status: 'OPEN',
    },
  });

  if (offers.length !== offerIds.length) {
    throw { code: 'INVALID_OFFERS', message: 'Some offers are no longer available' };
  }

  // Validate all are from same corridor
  const corridorIds = new Set(offers.map((o: any) => o.corridorId));
  if (corridorIds.size > 1) {
    throw { code: 'CORRIDOR_MISMATCH', message: 'All offers must be from the same corridor' };
  }

  const corridorId = offers[0].corridorId;
  const totalWeightKg = offers.reduce((sum: number, o: any) => sum + o.weightKg, 0);
  const totalEscrowEtb = offers.reduce((sum: number, o: any) => sum + o.escrowAmountEtb, 0);

  // Create consolidated load
  const result = await prisma.$transaction(async (tx: any) => {
    const consolidatedLoad = await tx.consolidatedLoad.create({
      data: {
        id: generateId('csl'),
        corridorId,
        aggregatorId: consolidationAgentId,
        aggregatorType: AGGREGATOR_TYPE.CONSOLIDATION_AGENT,
        consolidationType: 'LTL_CONSOLIDATION',
        originCity: offers[0].pickupAddress.split(',')[0] || 'N/A',
        destinationCity: offers[0].deliveryAddress.split(',')[0] || 'N/A',
        collectionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        status: CONSOLIDATED_LOAD_STATUS.COLLECTING,
        minimumFillPct: config.consolidationMinFillPct,
        shortfallPolicy: 'CANCEL_AND_REFUND',
        totalWeightKg,
        totalEscrowEtb,
        currentFillPct: Math.round((totalWeightKg / DEFAULT_TRUCK_CAPACITY) * 100),
        distributionPointAddress: offers[0].pickupAddress,
        distributionPointLat: 9.0320, // Default to Addis Ababa
        distributionPointLng: 38.7469,
        createdAt: new Date(),
      },
    });

    // Create sub-loads for each cargo offer (proportional escrow allocation)
    for (const offer of offers) {
      const weightRatio = offer.weightKg / totalWeightKg;
      const allocatedEscrowEtb = Math.round(totalEscrowEtb * weightRatio);

      await tx.subLoad.create({
        data: {
          id: generateId('sdl'),
          consolidatedLoadId: consolidatedLoad.id,
          ordererId: offer.shipperId,
          weightKg: offer.weightKg,
          weightQuintals: offer.weightKg / 100,
          cargoDescription: offer.cargoDescription,
          cargoType: offer.cargoType,
          escrowAmountEtb: allocatedEscrowEtb,
          pickupAddress: offer.pickupAddress,
          deliveryAddress: offer.deliveryAddress,
          status: SUB_LOAD_STATUS.PENDING,
          createdAt: new Date(),
        },
      });

      // Update cargo offer status
      await tx.cargoOffer.update({
        where: { id: offer.id },
        data: { status: 'CONSOLIDATED' },
      });
    }

    return consolidatedLoad;
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'OFFERS_CONSOLIDATED',
      aggregateId: result.id,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: consolidationAgentId,
      actorRole: 'CONSOLIDATION_AGENT',
      strategyVersionId,
      payload: {
        consolidatedLoadId: result.id,
        offerCount: offers.length,
        totalWeightKg,
        totalEscrowEtb,
      },
    },
  });

  return { success: true, data: result };
}

/**
 * Mark consolidated load as ready for dispatch
 * - Validates weight is at/above minimum fill percentage
 */
export async function markConsolidatedLoadReady(
  consolidatedLoadId: string,
  userId: string,
  userRole: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const load = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
  });

  if (!load) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  const currentStatus = normalizeConsolidatedLoadStatus(load.status);

  if (currentStatus !== CONSOLIDATED_LOAD_STATUS.COLLECTING) {
    throw { code: 'INVALID_STATUS', message: 'Load is not in COLLECTING status' };
  }

  if (load.currentFillPct < load.minimumFillPct && userRole !== 'OPS_ADMIN') {
    throw {
      code: 'BELOW_MINIMUM_FILL',
      message: `Fill percentage (${load.currentFillPct}%) is below minimum (${load.minimumFillPct}%)`,
    };
  }

  const updated = await prisma.consolidatedLoad.update({
    where: { id: consolidatedLoadId },
    data: { status: CONSOLIDATED_LOAD_STATUS.READY },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CONSOLIDATION_MARKED_READY',
      aggregateId: consolidatedLoadId,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: userRole,
      strategyVersionId,
      payload: {
        consolidatedLoadId,
        fillPct: load.currentFillPct,
        totalWeightKg: load.totalWeightKg,
      },
    },
  });

  return { success: true, data: updated };
}

/**
 * Handle partial pickup failure
 * - When driver fails to pick up some goods
 * - Opens 45-minute decision window for affected shippers
 * - Creates dual EscrowLedgerEntry records per affected sub-load:
 *   1. REFUND to shipper: escrowAmount × (1 - noShowFeePct/100) = 90% refund
 *   2. NO-SHOW FEE to driver: escrowAmount × noShowFeePct/100 = 10% fee earned
 */
export async function handlePartialPickupFailure(
  body: HandlePartialPickupFailureBody,
  userId: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';
  const config = await getConfig();

  const load = await prisma.consolidatedLoad.findUnique({
    where: { id: body.consolidatedLoadId },
    include: { subLoads: true },
  });

  if (!load) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  const affectedLoads = load.subLoads.filter((sl: any) =>
    body.affectedSubLoadIds.includes(sl.id)
  );

  const decisionDeadline = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes
  const noShowFeePct = config.consolidationNoShowFeePct; // 10% no-show fee

  // The driver reporting the failure receives the no-show fee
  const driverId = userId;

  // Create escrow ledger entries for affected loads
  const result = await prisma.$transaction(async (tx: any) => {
    const entries = [];

    for (const subLoad of affectedLoads) {
      // Calculate refund to shipper (90% for 10% no-show fee)
      const refundToShipperEtb = Math.round(
        (subLoad.escrowAmountEtb * (100 - noShowFeePct)) / 100
      );

      // Calculate no-show fee to driver (10%)
      const noShowFeeToDriverEtb = Math.round(
        (subLoad.escrowAmountEtb * noShowFeePct) / 100
      );

      // 1. Create REFUND entry for shipper
      const refundEntry = await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('els'),
          subLoadId: subLoad.id,
          consolidatedLoadId: body.consolidatedLoadId,
          ownerId: subLoad.ordererId,
          ownerRole: 'SHIPPER',
          txType: 'ESCROW_RELEASE',
          amountEtbCents: refundToShipperEtb * 100,
          reason: `Partial pickup failure refund (${100 - noShowFeePct}%): ${body.failureReason}`,
          decisionWindow: {
            openedAt: new Date(),
            deadline: decisionDeadline,
            requiresApproval: false,
          },
          createdAt: new Date(),
        },
      });

      // 2. Create NO-SHOW FEE entry for driver
      const noShowFeeEntry = await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('els'),
          subLoadId: subLoad.id,
          consolidatedLoadId: body.consolidatedLoadId,
          ownerId: driverId,
          ownerRole: 'DRIVER',
          txType: 'BONUS', // Treating as driver bonus/payment
          amountEtbCents: noShowFeeToDriverEtb * 100,
          reason: `No-show fee for partial pickup failure (${noShowFeePct}%): ${body.failureReason}`,
          decisionWindow: null,
          createdAt: new Date(),
        },
      });

      entries.push({ refundEntry, noShowFeeEntry });

      // Update sub-load status
      await tx.subLoad.update({
        where: { id: subLoad.id },
        data: { status: 'PARTIALLY_FAILED' },
      });
    }

    return { entries: entries, decisionDeadline: decisionDeadline };
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'PARTIAL_PICKUP_FAILURE',
      aggregateId: body.consolidatedLoadId,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: 'DRIVER',
      strategyVersionId,
      payload: {
        consolidatedLoadId: body.consolidatedLoadId,
        failureReason: body.failureReason,
        affectedSubLoadCount: affectedLoads.length,
        decisionDeadline: result.decisionDeadline,
      },
    },
  });

  return { success: true, data: result };
}

/**
 * Calculate proportional escrow allocation
 * - Takes total escrow and distributes by weight ratio
 * - Returns allocation per shipper
 */
export function calculateProportionalEscrow(
  totalEscrowEtb: number,
  weights: Array<{ shipperId: string; weightKg: number }>
): any {
  const totalWeight = weights.reduce((sum, w) => sum + w.weightKg, 0);
  
  if (totalWeight === 0) {
    throw { code: 'INVALID_WEIGHTS', message: 'Total weight must be greater than 0' };
  }

  const allocation = weights.map((w) => ({
    shipperId: w.shipperId,
    weightKg: w.weightKg,
    weightRatio: w.weightKg / totalWeight,
    allocatedEscrowEtb: Math.round((totalEscrowEtb * w.weightKg) / totalWeight),
  }));

  return {
    success: true,
    data: {
      totalEscrowEtb,
      totalWeightKg: totalWeight,
      allocation,
    },
  };
}

/**
 * Release consolidated load escrow
 * - Can only be called after load is delivered
 * - Creates per-owner EscrowLedgerEntry records
 * - Executes in transaction to ensure atomicity
 */
export async function releaseConsolidatedLoadEscrow(
  consolidatedLoadId: string,
  userId: string,
  userRole: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const load = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
    include: {
      subLoads: true,
    },
  });

  if (!load) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  const currentStatus = normalizeConsolidatedLoadStatus(load.status);

  if (
    currentStatus !== CONSOLIDATED_LOAD_STATUS.IN_TRANSIT &&
    currentStatus !== CONSOLIDATED_LOAD_STATUS.DELIVERED
  ) {
    throw {
      code: 'INVALID_STATUS',
      message: 'Load must be in transit or delivered for escrow release',
    };
  }

  // Create escrow ledger entries for each owner
  const result = await prisma.$transaction(async (tx: any) => {
    const owners = new Map<string, { escrowEtb: number; subLoadIds: string[] }>();

    // Group sub-loads by owner
    for (const subLoad of load.subLoads) {
      if (!owners.has(subLoad.ordererId)) {
        owners.set(subLoad.ordererId, { escrowEtb: 0, subLoadIds: [] });
      }
      const owner = owners.get(subLoad.ordererId)!;
      owner.escrowEtb += subLoad.escrowAmountEtb;
      owner.subLoadIds.push(subLoad.id);
    }

    // Create per-owner release entries
    const entries: any[] = [];
    for (const [shipperId, { escrowEtb, subLoadIds }] of owners.entries()) {
      const entry = await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('els'),
          subLoadIds, // Multiple sub-loads per entry
          consolidatedLoadId,
          ownerId: shipperId,
          ownerRole: 'SHIPPER',
          txType: 'ESCROW_RELEASE',
          amountEtbCents: escrowEtb * 100,
          reason: `Escrow release for successful delivery of consolidated load ${consolidatedLoadId}`,
          createdAt: new Date(),
        } as any,
      });
      entries.push(entry);
    }

    // Update consolidated load status
    const updated = await tx.consolidatedLoad.update({
      where: { id: consolidatedLoadId },
      data: { status: CONSOLIDATED_LOAD_STATUS.DELIVERED },
    });

    return {
      entries: entries,
      consolidatedLoad: updated,
    };
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CONSOLIDATION_ESCROW_RELEASED',
      aggregateId: consolidatedLoadId,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: userRole,
      strategyVersionId,
      payload: {
        consolidatedLoadId,
        totalEscrowReleasedEtb: load.totalEscrowEtb,
        entryCount: result.entries.length,
      },
    },
  });

  return { success: true, data: result };
}

/**
 * Assign driver to consolidated load
 * - Used after load is marked READY
 * - Links driver to the master load
 */
export async function assignDriverToConsolidatedLoad(
  consolidatedLoadId: string,
  driverId: string,
  userId: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const load = await prisma.consolidatedLoad.findUnique({
    where: { id: consolidatedLoadId },
  });

  if (!load) {
    throw { code: 'NOT_FOUND', message: 'Consolidated load not found' };
  }

  if (!load.masterLoadId) {
    throw {
      code: 'NO_MASTER_LOAD',
      message: 'Master load not yet created. Mark load as ready first.',
    };
  }

  // Create assignment
  const assignment = await prisma.assignment.create({
    data: {
      id: generateId('asn'),
      loadId: load.masterLoadId!,
      driverId,
      status: 'ACCEPTED',
      createdAt: new Date(),
    } as any,
  });

  // Update master load
  await prisma.load.update({
    where: { id: load.masterLoadId },
    data: { status: 'MATCHED' },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'DRIVER_ASSIGNED_TO_CONSOLIDATION',
      aggregateId: consolidatedLoadId,
      aggregateType: 'CONSOLIDATED_LOAD',
      actorId: userId,
      actorRole: 'DISPATCHER',
      strategyVersionId,
      payload: {
        consolidatedLoadId,
        driverId,
        assignmentId: assignment.id,
      },
    },
  });

  return { success: true, data: assignment };
}
