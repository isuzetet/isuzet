import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Correlation ID for distributed tracing across microservices
 * Store in context for all logs/spans
 */
const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Get correlation ID from request or generate new one
 */
export function getCorrelationId(request: FastifyRequest): string {
  const existing = request.headers[CORRELATION_ID_HEADER];
  if (typeof existing === 'string') {
    return existing;
  }
  return randomUUID();
}

/**
 * Middleware to add correlation ID to all requests
 * Attach to request.id and response headers
 */
export function correlationIdMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);
    
    // Attach to request for access in handlers
    request.id = correlationId;
    
    // Set response header so client can track response
    reply.header(CORRELATION_ID_HEADER, correlationId);
    
    // Store in context for logging
    (request as any).correlationId = correlationId;
  };
}

/**
 * Add correlation ID to log object
 * Usage in logs: { ...logData, correlationId: getLogContext().correlationId }
 */
export function getLogContext(): { correlationId?: string } {
  // In a real implementation, this would use AsyncLocalStorage or similar
  // For now, callers should pass correlationId explicitly
  return {};
}

/**
 * Wrap console methods to include correlation ID
 * Call once during app initialization
 */
export function setupCorrelationIdLogging(getCorrelationId: () => string) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const wrap = (fn: typeof console.log) => {
    return (...args: any[]) => {
      const correlationId = getCorrelationId();
      fn(`[${correlationId}]`, ...args);
    };
  };

  console.log = wrap(originalLog);
  console.error = wrap(originalError);
  console.warn = wrap(originalWarn);
}
