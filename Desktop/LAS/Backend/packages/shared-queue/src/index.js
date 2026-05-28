"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.QUEUES = void 0;
exports.getQueue = getQueue;
exports.addJob = addJob;
exports.createWorker = createWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
exports.QUEUES = {
    LIQUIDITY: 'ruit:liquidity',
    SHOCK: 'ruit:shock',
    OPTIMIZER: 'ruit:optimizer',
    INCIDENT: 'ruit:incident',
    NOTIFICATIONS: 'ruit:notifications',
    FRAUD: 'ruit:fraud',
    IDENTITY: 'ruit:identity',
    CORRIDOR: 'ruit:corridor',
    BEHAVIOR: 'ruit:behavior',
    DATA: 'ruit:data',
    TRUST_SCORE_UPDATE: 'ruit:trust-score-update',
    ESCROW_RELEASE: 'ruit:escrow-release',
    NOTIFICATION: 'ruit:notification',
    INCIDENT_ESCALATION: 'ruit:incident-escalation',
    CORRIDOR_SNAPSHOT: 'ruit:corridor-snapshot',
    SHOCK_MONITOR: 'ruit:shock-monitor',
    DOCUMENT_EXPIRY_CHECK: 'ruit:document-expiry-check',
    RATING_PROCESSOR: 'ruit:rating-processor',
    POD_GENERATOR: 'ruit:pod-generator',
    WEBHOOK_DELIVERY: 'ruit:webhook-delivery',
    PERFORMANCE_SNAPSHOT: 'ruit:performance-snapshot',
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
};
const redis = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
exports.redis = redis;
const queueInstances = new Map();
function getQueue(name) {
    if (!queueInstances.has(name)) {
        const queue = new bullmq_1.Queue(name, { connection: redis });
        queueInstances.set(name, queue);
    }
    return queueInstances.get(name);
}
async function addJob(queueName, jobName, data, opts) {
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
function createWorker(queueName, processor, concurrency = 1) {
    return new bullmq_1.Worker(queueName, processor, { connection: redis, concurrency });
}
//# sourceMappingURL=index.js.map