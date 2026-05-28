import 'dotenv/config';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { prisma } from '@ruit/shared-db';
import { requireRole } from '@ruit/shared-auth';
import { ROLES } from '@ruit/shared-types';
import { sendSms, SmsPayload } from '../services/sms.service.js';
import { sendPush, PushPayload } from '../services/push.service.js';
import {
  getUserPreferences,
  upsertUserPreferences,
} from '../services/preference.service.js';

const notificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /internal/sms - Send SMS (internal only)
  fastify.post('/internal/sms', {
    schema: {
      body: T.Object({
        phone: T.String(),
        message: T.String(),
        priority: T.Optional(T.Union([T.Literal('HIGH'), T.Literal('NORMAL'), T.Literal('LOW')])),
        referenceId: T.Optional(T.String()),
      }),
    },
  }, async (request, reply) => {
    const { phone, message, priority = 'NORMAL', referenceId } = request.body as any;

    const payload: SmsPayload = {
      phone,
      message,
      priority,
      referenceId,
    };

    const result = await sendSms(payload);

    return {
      success: result.success,
      data: result,
    };
  });

  // POST /internal/push - Send Push notification (internal only)
  fastify.post('/internal/push', {
    schema: {
      body: T.Object({
        userId: T.String(),
        title: T.String(),
        body: T.String(),
        data: T.Optional(T.Record(T.String(), T.String())),
        priority: T.Optional(T.Union([T.Literal('HIGH'), T.Literal('NORMAL'), T.Literal('LOW')])),
      }),
    },
  }, async (request, reply) => {
    const { userId, title, body, data = {}, priority = 'NORMAL' } = request.body as any;

    const payload: PushPayload = {
      userId,
      title,
      body,
      data,
      priority,
    };

    const result = await sendPush(payload);

    return {
      success: result.success,
      data: result,
    };
  });

  // GET /api/v1/notifications/health - Public health check
  fastify.get('/api/v1/notifications/health', async (request, reply) => {
    return {
      status: 'UP',
      engine: 'notification',
      timestamp: new Date().toISOString(),
      ethiopianDate: new Date().toISOString().split('T')[0],
    };
  });

  // GET /api/v1/notifications/preferences/:userId - Get user preferences
  fastify.get('/api/v1/notifications/preferences/:userId', {
    preHandler: (fastify as any).requireRole?.([ROLES.FLEET_OWNER, ROLES.DRIVER, ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) || (async () => {}),
  }, async (request: any, reply) => {
    const { userId } = request.params;
    const requestingUser = request.user;

    // Users can only view their own prefs unless OPS_ADMIN or SUPER_ADMIN
    if (
      requestingUser?.role !== ROLES.OPS_ADMIN &&
      requestingUser?.role !== ROLES.SUPER_ADMIN &&
      requestingUser?.sub !== userId
    ) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Can only view own preferences',
        },
      });
    }

    const prefs = await getUserPreferences(userId);

    if (!prefs) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification preferences not found',
        },
      });
    }

    return {
      success: true,
      data: prefs,
    };
  });

  // PUT /api/v1/notifications/preferences/:userId - Update user preferences
  fastify.put('/api/v1/notifications/preferences/:userId', {
    preHandler: (fastify as any).requireRole?.([ROLES.FLEET_OWNER, ROLES.DRIVER, ROLES.ORDERER]) || (async () => {}),
    schema: {
      body: T.Object({
        smsEnabled: T.Optional(T.Boolean()),
        pushEnabled: T.Optional(T.Boolean()),
        emailEnabled: T.Optional(T.Boolean()),
        quietHoursStart: T.Optional(T.Number({ minimum: 0, maximum: 23 })),
        quietHoursEnd: T.Optional(T.Number({ minimum: 0, maximum: 23 })),
        language: T.Optional(T.Union([T.Literal('AM'), T.Literal('EN')])),
      }),
    },
  }, async (request: any, reply) => {
    const { userId } = request.params;
    const requestingUser = request.user;

    // Users can only update their own prefs
    if (requestingUser?.sub !== userId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Can only update own preferences',
        },
      });
    }

    const prefs = request.body;

    const updated = await upsertUserPreferences(userId, prefs);

    return {
      success: true,
      data: updated,
    };
  });

  // GET /api/v1/notifications/history/:userId - Get notification history
  fastify.get('/api/v1/notifications/history/:userId', {
    preHandler: (fastify as any).requireRole?.([ROLES.FLEET_OWNER, ROLES.DRIVER, ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) || (async () => {}),
  }, async (request: any, reply) => {
    const { userId } = request.params;
    const requestingUser = request.user;
    const { page = '1', limit = '20', channel } = request.query as any;

    // Users can only view their own history unless OPS_ADMIN or SUPER_ADMIN
    if (
      requestingUser?.role !== ROLES.OPS_ADMIN &&
      requestingUser?.role !== ROLES.SUPER_ADMIN &&
      requestingUser?.sub !== userId
    ) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Can only view own history',
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      aggregateId: userId,
      eventType: 'NOTIFICATION_SENT',
    };

    if (channel) {
      where.payload = {
        path: ['channel'],
        equals: channel,
      };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          eventType: true,
          aggregateId: true,
          payload: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    const formattedEvents = events.map(e => ({
      id: e.id,
      eventType: e.eventType,
      userId: e.aggregateId,
      payload: e.payload,
      metadata: e.metadata,
      sentAt: e.createdAt,
    }));

    return {
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    };
  });

  // POST /api/v1/telegram/webhook - Telegram webhook (for updates)
  fastify.post('/api/v1/telegram/webhook', {
    schema: {
      body: T.Any(),
    }
  }, async (request, reply) => {
    const { telegramService } = await import('../services/telegram.service.js');
    try {
      const bot = telegramService.getBot();
      await bot.handleUpdate(request.body);
      return reply.status(200).send({ ok: true });
    } catch (error) {
      console.error('Telegram webhook error:', error);
      return reply.status(200).send({ ok: true }); // Always 200 to Telegram
    }
  });
};

export default notificationRoutes;
