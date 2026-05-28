import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ruit/shared-db';
import crypto from 'crypto';

// Hash an API key for storage/comparison
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Middleware: validates device API key from header
// Header: X-Device-Key: <api_key>
export async function requireDeviceAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const deviceKey = request.headers['x-device-key'] as string;

  if (!deviceKey) {
    reply.status(401).send({
      success: false,
      error: {
        code: 'MISSING_DEVICE_KEY',
        message: 'X-Device-Key header required'
      }
    });
    return;
  }

  const keyHash = hashApiKey(deviceKey);
  const device = await prisma.deviceRegistration.findUnique({
    where: { apiKeyHash: keyHash }
  });

  if (!device || !device.isActive) {
    reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_DEVICE_KEY',
        message: 'Invalid or inactive device key'
      }
    });
    return;
  }

  // Update lastSeenAt
  await prisma.deviceRegistration.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() }
  }).catch(() => {}); // non-fatal

  // Attach device info to request for use in handler
  (request as any).device = device;
}
