import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { QueueNames } from '@ruit/shared-types/src/queues';
import { redis } from '@ruit/shared-queue';
import { Queue } from 'bullmq';

interface CreateCooperativeData {
  name: string;
  nameAmharic?: string;
  registrationNumber: string;
  dispatcherUserId: string;
  zoneId: string;
}

interface AddMemberData {
  cooperativeId: string;
  fleetOwnerId: string;
  dispatcherUserId: string;
}

interface DispatcherAcceptsLoadData {
  cooperativeId: string;
  loadId: string;
  dispatcherUserId: string;
  assignedFleetOwnerId: string;
  assignedDriverId: string;
}

interface CooperativeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function createCooperative(
  data: CreateCooperativeData,
): Promise<CooperativeResult> {
  try {
    const config = await getConfig();

    const existingCoop = await prisma.transportCooperative.findFirst({
      where: { registrationNumber: data.registrationNumber },
    });

    if (existingCoop) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_NUMBER_EXISTS',
          message: 'Cooperative with this registration number already exists',
        },
      };
    }

    const dispatcher = await prisma.user.findUnique({
      where: { id: data.dispatcherUserId },
    });

    if (!dispatcher) {
      return {
        success: false,
        error: {
          code: 'DISPATCHER_NOT_FOUND',
          message: 'Dispatcher user not found',
        },
      };
    }

    const cooperative = await prisma.$transaction(async (tx) => {
      const coop = await tx.transportCooperative.create({
        data: {
          id: generateId('coo'),
          name: data.name,
          nameAmharic: data.nameAmharic,
          registrationNumber: data.registrationNumber,
          dispatcherUserId: data.dispatcherUserId,
          zoneId: data.zoneId,
          trustTier: 2,
          memberCount: 0,
          status: 'ACTIVE',
        },
      });

      await tx.user.update({
        where: { id: data.dispatcherUserId },
        data: {
          role: 'COOPERATIVE_DISPATCHER',
        },
      });

      return coop;
    });

    return { success: true, data: cooperative };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CREATE_COOPERATIVE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function addCooperativeMember(
  data: AddMemberData,
): Promise<CooperativeResult> {
  try {
    const cooperative = await prisma.transportCooperative.findUnique({
      where: { id: data.cooperativeId },
    });

    if (!cooperative) {
      return {
        success: false,
        error: {
          code: 'COOPERATIVE_NOT_FOUND',
          message: 'Cooperative not found',
        },
      };
    }

    if (cooperative.dispatcherUserId !== data.dispatcherUserId) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only the dispatcher can add members',
        },
      };
    }

    const fleetOwner = await prisma.fleetOwner.findUnique({
      where: { id: data.fleetOwnerId },
    });

    if (!fleetOwner) {
      return {
        success: false,
        error: {
          code: 'FLEET_OWNER_NOT_FOUND',
          message: 'Fleet owner not found',
        },
      };
    }

    const existingMember = await prisma.cooperativeMember.findFirst({
      where: {
        cooperativeId: data.cooperativeId,
        fleetOwnerId: data.fleetOwnerId,
      },
    });

    if (existingMember) {
      return {
        success: false,
        error: {
          code: 'MEMBER_ALREADY_EXISTS',
          message: 'This fleet owner is already a member',
        },
      };
    }

    const member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.cooperativeMember.create({
        data: {
          id: generateId('mem'),
          cooperativeId: data.cooperativeId,
          fleetOwnerId: data.fleetOwnerId,
          status: 'ACTIVE',
        },
      });

      await tx.transportCooperative.update({
        where: { id: data.cooperativeId },
        data: { memberCount: { increment: 1 } },
      });

      return newMember;
    });

    return { success: true, data: member };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ADD_MEMBER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function dispatcherAcceptsLoad(
  data: DispatcherAcceptsLoadData,
): Promise<CooperativeResult> {
  try {
    const cooperative = await prisma.transportCooperative.findUnique({
      where: { id: data.cooperativeId },
    });

    if (!cooperative) {
      return {
        success: false,
        error: {
          code: 'COOPERATIVE_NOT_FOUND',
          message: 'Cooperative not found',
        },
      };
    }

    if (cooperative.dispatcherUserId !== data.dispatcherUserId) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only the dispatcher can accept loads',
        },
      };
    }

    const member = await prisma.cooperativeMember.findFirst({
      where: {
        cooperativeId: data.cooperativeId,
        fleetOwnerId: data.assignedFleetOwnerId,
        status: 'ACTIVE',
      },
    });

    if (!member) {
      return {
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Fleet owner is not an active member of this cooperative',
        },
      };
    }

    const load = await prisma.load.findUnique({
      where: { id: data.loadId },
    });

    if (!load) {
      return {
        success: false,
        error: {
          code: 'LOAD_NOT_FOUND',
          message: 'Load not found',
        },
      };
    }

    return { success: true, data: { loadId: data.loadId, status: 'ASSIGNED' } };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DISPATCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export function calculateCooperativePenalty(
  individualPenaltyCents: number,
): number {
  return Math.round(individualPenaltyCents * 0.4);
}

export async function getCooperativeStats(
  cooperativeId: string,
): Promise<CooperativeResult> {
  try {
    const cooperative = await prisma.transportCooperative.findUnique({
      where: { id: cooperativeId },
      include: {
        members: true,
      },
    });

    if (!cooperative) {
      return {
        success: false,
        error: {
          code: 'COOPERATIVE_NOT_FOUND',
          message: 'Cooperative not found',
        },
      };
    }

    const stats = {
      cooperativeId: cooperative.id,
      name: cooperative.name,
      memberCount: cooperative.memberCount,
      trustTier: cooperative.trustTier,
      status: cooperative.status,
      createdAt: cooperative.createdAt,
    };

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
