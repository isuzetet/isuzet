import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { Decimal } from '@prisma/client/runtime/library';

export interface BulkLoadInput {
  ordererId: string;
  loads: Array<{
    corridorId: string;
    cargoType: string;
    weightKg: number;
    pickupDate: Date;
    estimatedValueCents: number;
    specialInstructions?: string;
  }>;
  fundingRailId: string;
}

export interface BulkLoadResult {
  success: boolean;
  data?: {
    batchId: string;
    loadIds: string[];
    totalEscrowCents: number;
    loadsCreated: number;
  };
  error?: { code: string; message: string };
}

/**
 * Create multiple loads in a single transaction with bulk escrow funding
 * Max 50 loads per batch
 * Single EscrowLedgerEntry for total amount
 */
export async function createBulkLoads(input: BulkLoadInput): Promise<BulkLoadResult> {
  try {
    const { ordererId, loads, fundingRailId } = input;

    // Validate
    if (!ordererId || !loads || loads.length === 0) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'ordererId and loads array required' },
      };
    }

    if (loads.length > 50) {
      return {
        success: false,
        error: { code: 'BATCH_TOO_LARGE', message: 'Maximum 50 loads per batch' },
      };
    }

    const config = await getConfig();

    // Validate orderer exists and has bulk load permission
    const orderer = await prisma.orderer.findUnique({
      where: { id: ordererId },
      select: { id: true, userId: true },
    });

    if (!orderer) {
      return {
        success: false,
        error: { code: 'ORDERER_NOT_FOUND', message: 'Orderer not found' },
      };
    }

    // Calculate total escrow
    let totalEscrowCents = 0;
    const validatedLoads: Array<{
      corridorId: string;
      cargoType: string;
      weightKg: number;
      pickupDate: Date;
      estimatedValueCents: number;
      specialInstructions?: string;
    }> = [];

    for (const load of loads) {
      if (!load.corridorId || !load.cargoType || load.weightKg <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_LOAD_DATA',
            message: 'All loads must have corridorId, cargoType, and positive weightKg',
          },
        };
      }

      validatedLoads.push(load);
      totalEscrowCents += load.estimatedValueCents;
    }

    // Create batch in transaction
    const batchId = generateId('blb');
    const loadIds: string[] = [];

    const result = await prisma.$transaction(async (tx: any) => {
      // Get strategy version for loads
      const strategyConfig = await tx.strategyConfig.findFirst({
        where: { isActive: true },
        select: { id: true },
      });

      if (!strategyConfig) {
        throw new Error('No active strategy config found');
      }

      // Create all loads
      for (const load of validatedLoads) {
        const loadId = generateId('lod');
        loadIds.push(loadId);

        // Get corridor details
        const corridor = await tx.corridor.findUnique({
          where: { id: load.corridorId },
          select: { originZoneId: true, destinationZoneId: true, name: true },
        });

        if (!corridor) {
          throw new Error(`Corridor ${load.corridorId} not found`);
        }

        // Create load
        await tx.load.create({
          data: {
            id: loadId,
            ordererId,
            corridorId: load.corridorId,
            originCity: corridor.name?.split(' TO ')[0] || 'origin',
            destinationCity: corridor.name?.split(' TO ')[1] || 'destination',
            cargoType: load.cargoType,
            weightKg: load.weightKg,
            pickupDate: new Date(load.pickupDate),
            deliveryDeadline: new Date(new Date(load.pickupDate).getTime() + 72 * 60 * 60 * 1000), // 3 days
            urgencyLevel: 2,
            systemQuoteEtb: new Decimal(load.estimatedValueCents / 100),
            status: 'OPEN',
            source: 'BULK_API',
            strategyVersionId: strategyConfig.id,
            specialInstructions: load.specialInstructions,
            idempotencyKey: `BULK:${batchId}:${loadId}`,
          },
        });
      }

      // Create one escrow entry for total bulk funding
      const escrowId = generateId('els');
      await tx.escrowLedgerEntry.create({
        data: {
          id: escrowId,
          fromUserId: orderer.userId,
          amountCents: totalEscrowCents,
          type: 'BULK_FUNDING',
          paymentRailId: fundingRailId,
          status: 'PENDING',
          notes: JSON.stringify({
            batchId,
            loadIds,
            bulkCreatedAt: new Date().toISOString(),
          }),
        },
      });

      return { batchId, escrowId };
    });

    return {
      success: true,
      data: {
        batchId: result.batchId,
        loadIds,
        totalEscrowCents,
        loadsCreated: loadIds.length,
      },
    };
  } catch (error: any) {
    console.error('[BulkLoad] createBulkLoads error:', error);
    return {
      success: false,
      error: {
        code: 'CREATE_BULK_LOADS_FAILED',
        message: error.message,
      },
    };
  }
}

/**
 * Get status of all loads in a batch
 * Returns batch metadata and aggregated load statuses
 */
export async function getBulkLoadStatus(batchId: string): Promise<{
  success: boolean;
  data?: {
    batchId: string;
    totalLoads: number;
    matchedCount: number;
    inTransitCount: number;
    deliveredCount: number;
    draftCount: number;
    loads: any[];
  };
  error?: { code: string; message: string };
}> {
  try {
    // Find escrow entry for this batch
    const escrowEntry = await prisma.escrowLedgerEntry.findFirst({
      where: {
        type: 'BULK_FUNDING',
        notes: {
          contains: batchId,
        },
      },
    });

    if (!escrowEntry) {
      return {
        success: false,
        error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' },
      };
    }

    const batchData = JSON.parse(escrowEntry.notes || '{}');
    const loadIds: string[] = batchData.loadIds || [];

    // Get all loads in batch with detailed status
    const loads = await prisma.load.findMany({
      where: {
        id: { in: loadIds },
      },
      select: {
        id: true,
        status: true,
        cargoType: true,
        weightKg: true,
        pickupDate: true,
        corridorId: true,
      },
    });

    // Aggregate counts
    const statuses: Record<string, number> = {
      DRAFT: 0,
      OPEN: 0,
      MATCHED: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    for (const load of loads) {
      const status = load.status || 'DRAFT';
      statuses[status] = (statuses[status] || 0) + 1;
    }

    return {
      success: true,
      data: {
        batchId,
        totalLoads: loadIds.length,
        matchedCount: statuses['MATCHED'] || 0,
        inTransitCount: statuses['IN_TRANSIT'] || 0,
        deliveredCount: statuses['DELIVERED'] || 0,
        draftCount: statuses['DRAFT'] || 0,
        loads,
      },
    };
  } catch (error: any) {
    console.error('[BulkLoad] getBulkLoadStatus error:', error);
    return {
      success: false,
      error: {
        code: 'GET_BULK_LOAD_STATUS_FAILED',
        message: error.message,
      },
    };
  }
}
