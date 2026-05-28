import 'dotenv/config';

/**
 * RUIT CBE - Notification Service
 * Port: 3013
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import notificationRoutes from './routes/notification.routes.js';
import ussdRoutes from './routes/ussd.routes.js';
import smsReplyRoutes from './routes/sms-reply.routes.js';
import { telegramService } from './services/telegram.service.js';

const app = Fastify({ 
  logger: { level: 'info' }, 
  trustProxy: true 
});

// Register CORS
void app.register(cors as any, { 
  origin: true, 
  credentials: true 
});

// Initialize Telegram service
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    telegramService.setupHandlers();
    console.log('Telegram service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Telegram service:', error);
  }
}

// Register notification routes (includes health, preferences, history)
void app.register(notificationRoutes);

// Register USSD routes
void app.register(ussdRoutes);

// Register SMS reply routes
void app.register(smsReplyRoutes);

// Start server
app.listen({ port: 3013, host: '0.0.0.0' }).then(() => {
  console.log('Notification Engine running on port 3013');
});

export { app };
