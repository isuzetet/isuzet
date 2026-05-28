import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export const QUEUES = {
  LIQUIDITY: 'ruit_liquidity',
  SHOCK: 'ruit_shock',
  OPTIMIZER: 'ruit_optimizer',
  INCIDENT: 'ruit_incident',
  NOTIFICATIONS: 'ruit_notifications',
  FRAUD: 'ruit_fraud',
  IDENTITY: 'ruit_identity',
  CORRIDOR: 'ruit_corridor',
  BEHAVIOR: 'ruit_behavior',
  DATA: 'ruit_data',
  TRUST_SCORE_UPDATE: 'ruit_trust-score-update',
  ESCROW_RELEASE: 'ruit_escrow-release',
  NOTIFICATION: 'ruit_notification',
  INCIDENT_ESCALATION: 'ruit_incident-escalation',
  CORRIDOR_SNAPSHOT: 'ruit_corridor-snapshot',
  SHOCK_MONITOR: 'ruit_shock-monitor',
  DOCUMENT_EXPIRY_CHECK: 'ruit_document-expiry-check',
  RATING_PROCESSOR: 'ruit_rating-processor',
  POD_GENERATOR: 'ruit_pod-generator',
  WEBHOOK_DELIVERY: 'ruit_webhook-delivery',
  PERFORMANCE_SNAPSHOT: 'ruit_performance-snapshot',
  // Medium-Haul Platform Queues
  BACKHAUL_MATCHING: 'backhaul-matching',
  TEMPLATE_SCHEDULER: 'template-scheduler',
  IDLE_ALERTS: 'idle-alerts',
  WEIGHBRIDGE_INTEL: 'weighbridge-intelligence',
  FUEL_INTEL: 'fuel-intelligence',
  ROUTE_DEVIATION: 'route-deviation',
  ZONE_DEMAND_UPDATE: 'zone-demand-update',
  CONSOLIDATION_MONITOR: 'consolidation-monitor',
  BROKER_COMMISSION: 'broker-commission',
  DRIVER_EARNINGS: 'driver-earnings',
  ROUTE_CONTRACT_AUTO_POST: 'ruit_route-contract-auto-post',
  DIRECT_BOOKING_EXPIRY: 'ruit_direct-booking-expiry',
  CONTRACT_RENEWAL_REMINDER: 'ruit_contract-renewal-reminder',
  RENEWAL_REMINDER: 'ruit_renewal-reminder',
  // Phase 9: Supply-Side GTM Feature Queues
  ROAD_ALERT_VERIFICATION: 'ruit_road-alert-verification',
  FUEL_PRICE_VALIDATION: 'ruit_fuel-price-validation',
  ROAD_ALERT_EXPIRY: 'ruit_road-alert-expiry',
  MAINTENANCE_REMINDER: 'ruit_maintenance-reminder',
  WAREHOUSE_QUEUE_EXPIRY: 'ruit_warehouse-queue-expiry',
  // Phase 12: Operational Protocols
  HOURS_OF_SERVICE: 'ruit_hours-of-service',

  // Phase 15: Worker Recalibration
  SHADOW_BROKER_DETECTION: 'ruit_shadow-broker-detection',
  MICRO_CREDIT_DUE: 'ruit_micro-credit-due',
  REFERRAL_BONUS: 'ruit_referral-bonus',
  DUPLICATE_ACCOUNT_DETECTION: 'ruit_duplicate-account-detection',
  NOTIFICATION_THROTTLE: 'ruit_notification-throttle',

  // PHASE 2: Dispatch Infrastructure
  OFFER_EXPIRY_CHECK: 'ruit_offer-expiry-check',
} as const;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const queueInstances = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queueInstances.has(name)) {
    const queue = new Queue(name, { connection: redis as any });
    queueInstances.set(name, queue);
  }
  return queueInstances.get(name)!;
}

export async function addJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  opts?: object
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  const idempotencyKey = `job:${queueName}:${jobName}:${JSON.stringify(data)}`;
  const exists = await redis.get(idempotencyKey);
  if (exists) {
    throw new Error('Job already exists');
  }
  const job = await queue.add(jobName, data, opts);
  await redis.setex(idempotencyKey, 86400, '1');
  return job;
}

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>,
  concurrency = 1
): Worker<T> {
  return new Worker(queueName, processor, { connection: redis as any, concurrency });
}

export { redis };
