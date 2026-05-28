import { prisma } from '@ruit/shared-db';

const RAILS = [
  { rail: 'TELEBIRR', displayName: 'Telebirr (Ethio Telecom)', slaTargetMinutes: 30, isActive: true },
  { rail: 'CBE_BIRR', displayName: 'CBE Birr (Commercial Bank of Ethiopia)', slaTargetMinutes: 30, isActive: true },
  { rail: 'AMOLE', displayName: 'Amole (Dashen Bank)', slaTargetMinutes: 120, isActive: true },
  { rail: 'HELLOCASH', displayName: 'HelloCash', slaTargetMinutes: 120, isActive: true },
  { rail: 'AWASH_WALLET', displayName: 'Awash Bank Wallet', slaTargetMinutes: 120, isActive: true },
  { rail: 'BANK_TRANSFER', displayName: 'Bank Transfer', slaTargetMinutes: 1440, isActive: true },
];

export async function seedPaymentRails() {
  for (const rail of RAILS) {
    await prisma.paymentRailConfig.upsert({
      where: { rail: rail.rail as any },
      create: rail as any,
      update: { slaTargetMinutes: rail.slaTargetMinutes, isActive: rail.isActive },
    });
  }
  console.log('Payment rail configs seeded.');
}
