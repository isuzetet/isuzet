import 'dotenv/config';
import { Telegraf, Context } from 'telegraf';
import { prisma } from '@ruit/shared-db';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

export interface TelegramLoadOffer {
  loadId: string;
  origin: string;
  destination: string;
  cargoType: string;
  earningsEtb: number;
  pickupTime: string;
  acceptanceWindowMinutes: number;
}

export interface TelegramPaymentConfirmation {
  amountEtb: number;
  rail: string;
  tripId: string;
}

export class TelegramService {
  async sendMessage(telegramUserId: string, text: string, replyMarkup?: any) {
    try {
      await bot.telegram.sendMessage(telegramUserId, text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return true;
    } catch (error) {
      console.error(`Telegram send failed for user ${telegramUserId}:`, error);
      return false;
    }
  }

  async sendLoadOffer(telegramUserId: string, offer: TelegramLoadOffer) {
    const text = `🚛 <b>ISUZET Load Offer</b>\n` +
      `${offer.origin} → ${offer.destination}\n` +
      `Cargo: ${offer.cargoType}\n` +
      `Earnings: ${offer.earningsEtb.toLocaleString()} ETB\n` +
      `Pickup: ${offer.pickupTime}\n` +
      `⏱ Accept within ${offer.acceptanceWindowMinutes} minutes`;

    const replyMarkup = {
      inline_keyboard: [[
        { text: '✅ Accept', callback_data: `accept_load_${offer.loadId}` },
        { text: '❌ Decline', callback_data: `decline_load_${offer.loadId}` },
        { text: 'ℹ️ Details', callback_data: `details_load_${offer.loadId}` },
      ]]
    };

    return this.sendMessage(telegramUserId, text, replyMarkup);
  }

  async sendPaymentConfirmation(telegramUserId: string, params: TelegramPaymentConfirmation) {
    const text = `✅ <b>Payment Released</b>\n` +
      `${params.amountEtb.toLocaleString()} ETB\n` +
      `Arriving in your ${params.rail} within 30 minutes\n` +
      `Trip: ${params.tripId}`;
    return this.sendMessage(telegramUserId, text);
  }

  setupHandlers() {
    bot.command('start', async (ctx) => {
      await ctx.reply('Welcome to ISUZET bot. Send /link to connect your account.');
    });

    bot.command('link', async (ctx) => {
      const args = ctx.message?.text?.split(' ') || [];
      const code = args[1];
      
      if (!code) {
        await ctx.reply('Usage: /link <CODE>\n\nGet your code from the ISUZET app.');
        return;
      }

      try {
        // Send to identity engine to complete the link
        const response = await fetch('http://localhost:3001/api/v1/telegram/complete-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkCode: code,
            telegramUserId: String(ctx.from?.id),
            telegramUsername: ctx.from?.username || null,
            telegramFirstName: ctx.from?.first_name || null,
            telegramLastName: ctx.from?.last_name || null,
          }),
        });

        if (response.ok) {
          await ctx.reply('✅ Account linked successfully! You can now receive ISUZET notifications.');
        } else {
          const error = await response.json();
          await ctx.reply(`❌ Linking failed: ${error.error || 'Invalid code or expired'}`);
        }
      } catch (error) {
        console.error('Telegram link error:', error);
        await ctx.reply('❌ An error occurred while linking. Please try again.');
      }
    });

    bot.action(/accept_load_(.+)/, async (ctx) => {
      const loadId = ctx.match![1];
      const telegramUserId = String(ctx.from?.id);
      
      try {
        const account = await prisma.telegramAccount.findUnique({ 
          where: { telegramUserId } 
        });
        
        if (account) {
          // TODO: Call dispatch service to accept load
          await ctx.answerCbQuery('Accepting load...');
          await ctx.editMessageText('✅ Load accepted. Opening ISUZET app for full details.');
        } else {
          await ctx.answerCbQuery('Please link your ISUZET account first.');
        }
      } catch (error) {
        console.error('Load acceptance error:', error);
        await ctx.answerCbQuery('An error occurred.');
      }
    });

    bot.action(/decline_load_(.+)/, async (ctx) => {
      try {
        await ctx.answerCbQuery('Load declined.');
        await ctx.editMessageText('❌ Load declined.');
      } catch (error) {
        console.error('Load decline error:', error);
        await ctx.answerCbQuery('An error occurred.');
      }
    });

    bot.action(/details_load_(.+)/, async (ctx) => {
      try {
        await ctx.answerCbQuery('Opening details...');
        await ctx.editMessageText('ℹ️ More details available in the ISUZET app.');
      } catch (error) {
        console.error('Load details error:', error);
        await ctx.answerCbQuery('An error occurred.');
      }
    });

    return bot;
  }

  async startWebhook(webhookUrl: string) {
    try {
      await bot.telegram.setWebhook(`${webhookUrl}/api/v1/telegram/webhook`);
      console.log('Telegram webhook set successfully');
    } catch (error) {
      console.error('Failed to set webhook:', error);
      throw error;
    }
  }

  async stopWebhook() {
    try {
      await bot.telegram.deleteWebhook();
      console.log('Telegram webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  }

  getBot() {
    return bot;
  }
}

export const telegramService = new TelegramService();
