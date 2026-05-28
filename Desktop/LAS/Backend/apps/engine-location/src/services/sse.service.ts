import { FastifyReply } from 'fastify';

// Store active SSE connections per tripId
// Map<tripId, Set<FastifyReply>>
const sseConnections = new Map<string, Set<FastifyReply>>();

// Register a new SSE subscriber for a trip
export function addSSESubscriber(tripId: string, reply: FastifyReply): void {
  if (!sseConnections.has(tripId)) {
    sseConnections.set(tripId, new Set());
  }
  const connections = sseConnections.get(tripId);
  if (connections) {
    connections.add(reply);
  }

  // Remove subscriber when connection closes
  reply.raw.on('close', () => {
    removeSSESubscriber(tripId, reply);
  });
}

// Remove subscriber
export function removeSSESubscriber(tripId: string, reply: FastifyReply): void {
  const subscribers = sseConnections.get(tripId);
  if (subscribers) {
    subscribers.delete(reply);
    if (subscribers.size === 0) {
      sseConnections.delete(tripId);
    }
  }
}

// Push location update to all subscribers of a trip
export function notifyLocationSubscribers(
  tripId: string,
  locationData: object
): void {
  const subscribers = sseConnections.get(tripId);
  if (!subscribers || subscribers.size === 0) return;

  const data = JSON.stringify(locationData);
  const deadConnections: FastifyReply[] = [];

  for (const reply of subscribers) {
    try {
      reply.raw.write(`data: ${data}\n\n`);
    } catch {
      // Connection is dead
      deadConnections.push(reply);
    }
  }

  // Clean up dead connections
  for (const dead of deadConnections) {
    removeSSESubscriber(tripId, dead);
  }
}

// Get subscriber count for monitoring
export function getSubscriberCount(): number {
  let total = 0;
  for (const subscribers of sseConnections.values()) {
    total += subscribers.size;
  }
  return total;
}
