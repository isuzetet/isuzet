import 'dotenv/config';
import { createTrustWorker } from './workers/trust.worker.js';
import { createEscrowWorker } from './workers/escrow.worker.js';
import { createNotificationWorker } from './workers/notification.worker.js';
import { createIncidentEscalationWorker } from './workers/incident-escalation.worker.js';
import { createCorridorSnapshotWorker } from './workers/corridor-snapshot.worker.js';
import { createShockMonitorWorker } from './workers/shock-monitor.worker.js';
import { createDocumentExpiryWorker } from './workers/document-expiry.worker.js';
import { createRatingProcessorWorker } from './workers/rating-processor.worker.js';
import { createPodGeneratorWorker } from './workers/pod-generator.worker.js';
import { createWebhookDeliveryWorker } from './workers/webhook-delivery.worker.js';
import { createPerformanceSnapshotWorker } from './workers/performance-snapshot.worker.js';
// NEW WORKERS
import { createBackhaulWorker } from './workers/backhaul.worker.js';
import { createWeighbridgeIntelligenceWorker } from './workers/weighbridge-intelligence.worker.js';
import { createFuelIntelligenceWorker } from './workers/fuel-intelligence.worker.js';
import { createRouteDeviationWorker } from './workers/route-deviation.worker.js';
import { createZoneDemandWorker } from './workers/zone-demand.worker.js';
import { createIdleAlertWorker } from './workers/idle-alert.worker.js';
import { createBrokerCommissionWorker } from './workers/broker-commission.worker.js';
// PHASE 6 WORKERS
import { createRouteContractWorker, checkContractsForRenewalReminders } from './workers/route-contract.worker.js';
import { createDirectBookingWorker } from './workers/direct-booking.worker.js';
// PHASE 9 WORKERS
import { createRoadAlertExpiryWorker } from './workers/road-alert-expiry.worker.js';
import { createFuelReportValidationWorker } from './workers/fuel-report-validation.worker.js';
import { createMaintenanceReminderWorker } from './workers/maintenance-reminder.worker.js';
import { createWarehouseQueueExpiryWorker } from './workers/warehouse-queue-expiry.worker.js';
// PHASE 12 WORKERS
import { createHoursOfServiceWorker } from './workers/hours-of-service.worker.js';
// PHASE 15 WORKERS
import { createShadowBrokerWorker } from './workers/shadow-broker.worker.js';
import { createMicroCreditDueWorker } from './workers/micro-credit-due.worker.js';
import { createReferralBonusWorker } from './workers/referral-bonus.worker.js';
import { createDuplicateAccountWorker } from './workers/duplicate-account.worker.js';
import { createNotificationThrottleWorker } from './workers/notification-throttle.worker.js';
// PHASE 2: Dispatch Infrastructure
import { createOfferExpiryWorker } from './workers/offer-expiry.worker.js';
import { redis, QUEUES } from '@ruit/shared-queue';
import { Queue } from 'bullmq';

async function main() {
  console.log('Starting RUIT CBE Workers...');

  const workers = [
    // Existing workers
    createTrustWorker(),
    createEscrowWorker(),
    createNotificationWorker(),
    createIncidentEscalationWorker(),
    createCorridorSnapshotWorker(),
    createShockMonitorWorker(),
    createDocumentExpiryWorker(),
    createRatingProcessorWorker(),
    createPodGeneratorWorker(),
    createWebhookDeliveryWorker(),
    createPerformanceSnapshotWorker(),
    // NEW WORKERS
    createBackhaulWorker(),
    createWeighbridgeIntelligenceWorker(),
    createFuelIntelligenceWorker(),
    createRouteDeviationWorker(),
    createZoneDemandWorker(),
    createIdleAlertWorker(),
    createBrokerCommissionWorker(),
    // PHASE 6 WORKERS
    createRouteContractWorker(),
    createDirectBookingWorker(),
    // PHASE 9 WORKERS
    createRoadAlertExpiryWorker(),
    createFuelReportValidationWorker(),
    createMaintenanceReminderWorker(),
    createWarehouseQueueExpiryWorker(),
    // PHASE 12 WORKERS
    createHoursOfServiceWorker(),
    // PHASE 15 WORKERS
    createShadowBrokerWorker(),
    createMicroCreditDueWorker(),
    createReferralBonusWorker(),
    createDuplicateAccountWorker(),
    createNotificationThrottleWorker(),
    // PHASE 2: Dispatch Infrastructure
    createOfferExpiryWorker(),
  ];

  // Existing worker logs
  console.log('Trust worker started');
  console.log('Escrow worker started');
  console.log('Notification worker started');
  console.log('Incident escalation worker started');
  console.log('Corridor snapshot worker started');
  console.log('Shock monitor worker started');
  console.log('Document expiry worker started');
  console.log('Rating processor worker started');
  console.log('POD generator worker started');
  console.log('Webhook delivery worker started');
  console.log('Performance snapshot worker started');
  // NEW worker logs
  console.log('Backhaul worker started');
  console.log('Weighbridge intelligence worker started');
  console.log('Fuel intelligence worker started');
  console.log('Route deviation worker started');
  console.log('Zone demand worker started');
  console.log('Idle alert worker started');
  console.log('Broker commission worker started');
  // PHASE 6 worker logs
  console.log('Route contract worker started');
  console.log('Direct booking worker started');
  // PHASE 9 worker logs
  console.log('Road alert expiry worker started');
  console.log('Fuel report validation worker started');
  console.log('Maintenance reminder worker started');
  console.log('Warehouse queue expiry worker started');
  // PHASE 12 worker logs
  console.log('Hours of service worker started');
  // PHASE 15 worker logs
  console.log('Shadow broker detection worker started');
  console.log('Micro-credit due worker started');
  console.log('Referral bonus worker started');
  console.log('Duplicate account detection worker started');
  console.log('Notification throttle worker started');
  // PHASE 2: Dispatch Infrastructure
  console.log('Offer expiry worker started');
  console.log('All workers initialized successfully');

  // Schedule daily document expiry check
  const documentExpiryQueue = new Queue(QUEUES.DOCUMENT_EXPIRY_CHECK, { connection: redis as any });
  await documentExpiryQueue.add('document-expiry-check', {}, { repeat: { pattern: '0 6 * * *', tz: 'Africa/Addis_Ababa' } }); // Every day at 6 AM Ethiopia time
  console.log('Scheduled daily document expiry check.');

  // Schedule monthly performance snapshot
  const performanceSnapshotQueue = new Queue(QUEUES.PERFORMANCE_SNAPSHOT, { connection: redis as any });
  // Run on the 1st of every month at 3 AM
  await performanceSnapshotQueue.add('monthly-performance-snapshot', 
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { repeat: { pattern: '0 3 1 * *' } }
  );
  console.log('Scheduled monthly performance snapshot.');

  // NEW: Schedule zone demand update every 15 minutes
  const zoneDemandQueue = new Queue(QUEUES.ZONE_DEMAND_UPDATE, { connection: redis as any });
  await zoneDemandQueue.add('zone-demand-update', {}, { repeat: { every: 15 * 60 * 1000 } }); // Every 15 minutes
  console.log('Scheduled zone demand update every 15 minutes.');

  // NEW: Schedule idle alert check every hour
  const idleAlertQueue = new Queue(QUEUES.IDLE_ALERTS, { connection: redis as any });
  await idleAlertQueue.add('idle-alert-check', {}, { repeat: { every: 60 * 60 * 1000 } }); // Every hour
  console.log('Scheduled idle alert check every hour.');

  // PHASE 6: Schedule contract renewal reminders daily at 1 AM
  const renewalReminderQueue = new Queue(QUEUES.CONTRACT_RENEWAL_REMINDER, { connection: redis as any });
  await renewalReminderQueue.add('check-renewal-reminders', {}, { repeat: { pattern: '0 1 * * *' } }); // Every day at 1 AM
  console.log('Scheduled contract renewal reminders check daily.');

  // PHASE 6: Process initial renewal reminders (if any)
  await checkContractsForRenewalReminders();

  // PHASE 2: Schedule offer expiry check every 2 minutes
  const offerExpiryQueue = new Queue(QUEUES.OFFER_EXPIRY_CHECK, { connection: redis as any });
  await offerExpiryQueue.add('offer-expiry-check', {}, { repeat: { every: 2 * 60 * 1000 } }); // Every 2 minutes
  console.log('Scheduled offer expiry check every 2 minutes.');

  // PHASE 12: Schedule hours of service check every 30 minutes
  const hosQueue = new Queue(QUEUES.HOURS_OF_SERVICE, { connection: redis as any });
  await hosQueue.add('hos-check', {}, { repeat: { every: 30 * 60 * 1000 } }); // Every 30 minutes
  console.log('Scheduled hours of service check every 30 minutes.');

  // PHASE 15: Schedule shadow broker detection check daily at midnight
  const shadowBrokerQueue = new Queue(QUEUES.SHADOW_BROKER_DETECTION, { connection: redis as any });
  await shadowBrokerQueue.add('shadow-broker-scan', {}, { repeat: { pattern: '0 0 * * *' } }); // Every day at midnight
  console.log('Scheduled shadow broker detection check daily.');

  // PHASE 15: Schedule micro-credit due check every 6 hours
  const microCreditQueue = new Queue(QUEUES.MICRO_CREDIT_DUE, { connection: redis as any });
  await microCreditQueue.add('micro-credit-due', {}, { repeat: { every: 6 * 60 * 60 * 1000 } }); // Every 6 hours
  console.log('Scheduled micro-credit due check every 6 hours.');

  // PHASE 15: Schedule duplicate account detection check daily at 1 AM
  const duplicateAccountQueue = new Queue(QUEUES.DUPLICATE_ACCOUNT_DETECTION, { connection: redis as any });
  await duplicateAccountQueue.add('duplicate-account-scan', {}, { repeat: { pattern: '0 1 * * *' } }); // Every day at 1 AM
  console.log('Scheduled duplicate account detection check daily.');

  // PHASE 15: Schedule notification throttle check every hour
  const notificationThrottleQueue = new Queue(QUEUES.NOTIFICATION_THROTTLE, { connection: redis as any });
  await notificationThrottleQueue.add('notification-throttle', {}, { repeat: { every: 60 * 60 * 1000 } }); // Every hour
  console.log('Scheduled notification throttle check every hour.');

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down workers...`);
    await Promise.all(workers.map(w => w.close()));
    await redis.quit();
    console.log('Workers shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void main();
