import 'dotenv/config';
// use shared database helper
import { prisma as db, generateId } from '@ruit/shared-db';

// Generate unique 8-char alphanumeric code
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createVoucher(data: {
  recipientUserId: string;
  voucherType: string;
  amountEtb: number;
  expiresAt: Date;
  corridorId?: string;
  notes?: string;
  issuedByUserId: string;
}): Promise<any> {
  if (data.amountEtb <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Find recipient user
  const user = await db.user.findUnique({
    where: { id: data.recipientUserId },
  });

  if (!user) {
    throw new Error('Recipient user not found');
  }

  // Generate unique code
  let code = generateVoucherCode();
  let existing = await db.digitalVoucher.findUnique({ where: { code } });
  while (existing) {
    code = generateVoucherCode();
    existing = await db.digitalVoucher.findUnique({ where: { code } });
  }

  const voucher = await db.digitalVoucher.create({
    data: {
      id: generateId('vch'),
      code,
      recipientUserId: data.recipientUserId,
      voucherType: data.voucherType,
      amountEtb: data.amountEtb,
      issuedByUserId: data.issuedByUserId,
      status: 'ACTIVE',
      expiresAt: data.expiresAt,
      corridorId: data.corridorId,
      notes: data.notes,
    },
  });

  return voucher;
}

export async function validateVoucher(code: string): Promise<{
  valid: boolean;
  voucher: any | null;
  reason?: string;
}> {
  const voucher = await db.digitalVoucher.findUnique({
    where: { code },
  });

  if (!voucher) {
    return { valid: false, voucher: null, reason: 'Voucher not found' };
  }

  if (voucher.status !== 'ACTIVE') {
    return { valid: false, voucher, reason: `Voucher is ${voucher.status.toLowerCase()}` };
  }

  if (voucher.expiresAt < new Date()) {
    return { valid: false, voucher, reason: 'Voucher has expired' };
  }

  return { valid: true, voucher };
}

export async function redeemVoucher(
  code: string,
  userId: string
): Promise<any> {
  const voucher = await db.digitalVoucher.findUnique({
    where: { code },
  });

  if (!voucher) {
    throw new Error('Voucher not found');
  }

  if (voucher.status !== 'ACTIVE') {
    throw new Error(`Voucher is ${voucher.status.toLowerCase()}`);
  }

  if (voucher.expiresAt < new Date()) {
    throw new Error('Voucher has expired');
  }

  if (voucher.recipientUserId !== userId) {
    throw new Error('Voucher not assigned to this user');
  }

  const result = await db.$transaction(async (tx: any) => {
    const updated = await tx.digitalVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedByUserId: userId,
      },
    });

    // Create event
    await tx.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'VOUCHER_REDEEMED',
        aggregateId: voucher.id,
        aggregateType: 'DIGITAL_VOUCHER',
        actorId: userId,
        actorRole: 'DRIVER',
        strategyVersionId: 'default',
        payload: {
          voucherId: voucher.id,
          code: voucher.code,
          amountEtb: voucher.amountEtb,
        },
      },
    });

    return updated;
  });

  return result;
}

export async function listVouchers(filters: {
  status?: string;
  recipientUserId?: string;
  corridorId?: string;
}): Promise<any[]> {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.recipientUserId) {
    where.recipientUserId = filters.recipientUserId;
  }
  if (filters.corridorId) {
    where.corridorId = filters.corridorId;
  }

  return db.digitalVoucher.findMany({    where,
    orderBy: { createdAt: 'desc' },
  });
}



