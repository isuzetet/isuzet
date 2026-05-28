import 'dotenv/config';
import { prisma } from '@ruit/shared-db';
import { telegramService } from './telegram.service.js';
import { sendSms } from './sms.service.js';
import { sendPush } from './push.service.js';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  channel?: 'telegram' | 'push' | 'sms' | 'auto';
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  data?: Record<string, string>;
  phoneNumber?: string;
}

/**
 * Intelligent notification dispatcher
 * Priority: Telegram → Push → SMS (fallback chain)
 */
export class NotificationDispatcher {
  async dispatch(payload: NotificationPayload): Promise<{ success: boolean; channel: string; error?: string }> {
    const { userId, title, message, channel = 'auto', priority = 'NORMAL', data, phoneNumber } = payload;

    if (channel === 'telegram' || channel === 'auto') {
      // Try Telegram first if auto channel
      const telegramResult = await this.trySendViaTelegram(userId, message);
      if (telegramResult.success) {
        return { success: true, channel: 'telegram' };
      }
    }

    if (channel === 'push' || (channel === 'auto' && !process.env.TELEGRAM_BOT_TOKEN)) {
      // Try push notifications
      const pushResult = await this.trySendViaPush(userId, title, message, data, priority);
      if (pushResult.success) {
        return { success: true, channel: 'push' };
      }
    }

    if (channel === 'sms' || (channel === 'auto')) {
      // Fallback to SMS if phone number is available
      let phone = phoneNumber;
      if (!phone) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        phone = user?.phone;
      }
      
      if (phone) {
        const smsResult = await this.trySendViaSms(phone, message, priority);
        if (smsResult.success) {
          return { success: true, channel: 'sms' };
        }
      }
    }

    return { 
      success: false, 
      channel: 'none', 
      error: 'All notification channels failed' 
    };
  }

  private async trySendViaTelegram(userId: string, message: string): Promise<{ success: boolean }> {
    try {
      const telegramAccount = await prisma.telegramAccount.findUnique({
        where: { userId },
      });

      if (!telegramAccount?.isActive) {
        return { success: false };
      }

      const sent = await telegramService.sendMessage(telegramAccount.telegramUserId, message);
      return { success: sent };
    } catch (error) {
      console.error('Telegram dispatch error:', error);
      return { success: false };
    }
  }

  private async trySendViaPush(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, string>,
    priority: string = 'NORMAL'
  ): Promise<{ success: boolean }> {
    try {
      const result = await sendPush({
        userId,
        title,
        body: message,
        data,
        priority: priority as 'HIGH' | 'NORMAL' | 'LOW',
      });
      return { success: result.success };
    } catch (error) {
      console.error('Push dispatch error:', error);
      return { success: false };
    }
  }

  private async trySendViaSms(
    phone: string,
    message: string,
    priority: string = 'NORMAL'
  ): Promise<{ success: boolean }> {
    try {
      const result = await sendSms({
        phone,
        message,
        priority: priority as 'HIGH' | 'NORMAL' | 'LOW',
      });
      return { success: result.success };
    } catch (error) {
      console.error('SMS dispatch error:', error);
      return { success: false };
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
