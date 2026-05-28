import 'dotenv/config';
import { prisma } from '@ruit/shared-db';

export type NotificationPreference = {
  userId: string;
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  assignmentNotify: string;
  payoutNotify: string;
  incidentNotify: string;
  marketingNotify: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  updatedAt: Date;
};

export type PreferenceUpdateInput = {
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  language?: 'AM' | 'EN';
};

function toPreferenceResponse(pref: any): NotificationPreference {
  return {
    userId: pref.userId,
    smsEnabled: pref.smsEnabled,
    pushEnabled: pref.pushEnabled,
    emailEnabled: pref.emailEnabled,
    assignmentNotify: pref.assignmentNotify,
    payoutNotify: pref.payoutNotify,
    incidentNotify: pref.incidentNotify,
    marketingNotify: pref.marketingNotify,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
    updatedAt: pref.updatedAt,
  };
}

export async function getUserPreferences(userId: string): Promise<NotificationPreference | null> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    return null;
  }

  return toPreferenceResponse(pref);
}

export async function upsertUserPreferences(
  userId: string,
  prefs: PreferenceUpdateInput
): Promise<NotificationPreference> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (prefs.smsEnabled !== undefined) updateData.smsEnabled = prefs.smsEnabled;
  if (prefs.pushEnabled !== undefined) updateData.pushEnabled = prefs.pushEnabled;
  if (prefs.emailEnabled !== undefined) updateData.emailEnabled = prefs.emailEnabled;
  if (prefs.quietHoursStart !== undefined) updateData.quietHoursStart = prefs.quietHoursStart;
  if (prefs.quietHoursEnd !== undefined) updateData.quietHoursEnd = prefs.quietHoursEnd;

  const result = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      smsEnabled: prefs.smsEnabled ?? true,
      pushEnabled: prefs.pushEnabled ?? true,
      emailEnabled: prefs.emailEnabled ?? false,
      assignmentNotify: 'SMS',
      payoutNotify: 'SMS',
      incidentNotify: 'BOTH',
      marketingNotify: false,
      quietHoursStart: prefs.quietHoursStart ?? null,
      quietHoursEnd: prefs.quietHoursEnd ?? null,
    },
    update: updateData,
  });

  return toPreferenceResponse(result);
}

function getEthiopianHour(date: Date): number {
  // Ethiopian time is UTC+3
  const utcHour = date.getUTCHours();
  const ethiopianHour = (utcHour + 3) % 24;
  return ethiopianHour;
}

function isInQuietHours(quietHoursStart: number | null, quietHoursEnd: number | null): boolean {
  if (quietHoursStart === null || quietHoursEnd === null) {
    return false;
  }

  const currentHour = getEthiopianHour(new Date());

  // Handle wrap-around (e.g., quiet hours 22:00 - 06:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  }

  return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
}

export async function isChannelEnabled(
  userId: string,
  channel: 'SMS' | 'PUSH' | 'EMAIL'
): Promise<boolean> {
  const prefs = await getUserPreferences(userId);

  // If no preferences record, default to enabled
  if (!prefs) {
    return true;
  }

  // Check quiet hours first - if in quiet hours, disable all channels
  if (isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
    return false;
  }

  // Check channel-specific setting
  switch (channel) {
    case 'SMS':
      return prefs.smsEnabled;
    case 'PUSH':
      return prefs.pushEnabled;
    case 'EMAIL':
      return prefs.emailEnabled;
    default:
      return true;
  }
}

export async function shouldSendNotification(
  userId: string,
  notificationType: 'ASSIGNMENT' | 'PAYOUT' | 'INCIDENT' | 'MARKETING'
): Promise<{ sms: boolean; push: boolean }> {
  const prefs = await getUserPreferences(userId);

  if (!prefs) {
    return { sms: true, push: true };
  }

  // Check quiet hours
  if (isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
    return { sms: false, push: false };
  }

  let smsEnabled = prefs.smsEnabled;
  let pushEnabled = prefs.pushEnabled;

  // Check notification type preference
  switch (notificationType) {
    case 'ASSIGNMENT':
      if (prefs.assignmentNotify === 'SMS') pushEnabled = false;
      if (prefs.assignmentNotify === 'PUSH') smsEnabled = false;
      if (prefs.assignmentNotify === 'NONE') {
        smsEnabled = false;
        pushEnabled = false;
      }
      break;
    case 'PAYOUT':
      if (prefs.payoutNotify === 'SMS') pushEnabled = false;
      if (prefs.payoutNotify === 'PUSH') smsEnabled = false;
      if (prefs.payoutNotify === 'NONE') {
        smsEnabled = false;
        pushEnabled = false;
      }
      break;
    case 'INCIDENT':
      if (prefs.incidentNotify === 'SMS') pushEnabled = false;
      if (prefs.incidentNotify === 'PUSH') smsEnabled = false;
      if (prefs.incidentNotify === 'NONE') {
        smsEnabled = false;
        pushEnabled = false;
      }
      break;
    case 'MARKETING':
      if (!prefs.marketingNotify) {
        smsEnabled = false;
        pushEnabled = false;
      }
      break;
  }

  return { sms: smsEnabled, push: pushEnabled };
}
