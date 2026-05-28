import 'dotenv/config';
// use shared db helper instead of creating a client here
import { prisma as db, generateId } from '@ruit/shared-db';

export async function createIncentive(data: {
  targetType: string;
  targetId: string;
  incentiveType: string;
  amountEtb: number;
  validFrom: Date;
  validUntil: Date;
  corridorId?: string;
  description?: string;
}): Promise<any> {
  // Validate amount
  if (data.amountEtb <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Validate validFrom < validUntil
  if (data.validFrom >= data.validUntil) {
    throw new Error('validFrom must be before validUntil');
  }

  // Validate targetType
  const validTargetTypes = ['DRIVER', 'FLEET_OWNER', 'CORRIDOR'];
  if (!validTargetTypes.includes(data.targetType)) {
    throw new Error(`targetType must be one of: ${validTargetTypes.join(', ')}`);
  }

  const incentive = await db.liquidityIncentive.create({
    data: {
      id: generateId('inc'),
      targetType: data.targetType,
      targetId: data.targetId,
      incentiveType: data.incentiveType as any,
      valueEtb: data.amountEtb,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      corridorId: data.corridorId,
      description: data.description,
      triggerCondition: 'MANUAL',
      isActive: true,
    },
  });

  return incentive;
}

export async function getActiveIncentives(filters: {
  corridorId?: string;
  targetType?: string;
}): Promise<any[]> {
  const now = new Date();

  const where: any = {
    isActive: true,
    validFrom: { lte: now },
    validUntil: { gte: now },
  };

  if (filters.corridorId) {
    where.corridorId = filters.corridorId;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  return db.liquidityIncentive.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}



