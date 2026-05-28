/**
 * Queue names for the ISUZET inland transport platform
 * Used by workers and message processors
 */

export const QueueNames = {
  // Phase 2 queues
  MULTI_STOP_COMPLETION: 'multi_stop_completion',
  CONSOLIDATION_MATCHING: 'consolidation_matching',
  ROUTE_CONTRACT_AUTO_POST: 'route_contract_auto_post',
  DIRECT_BOOKING_EXPIRY: 'direct_booking_expiry',
  ROAD_ALERT_VERIFICATION: 'road_alert_verification',
  AGENT_CASH_SETTLEMENT: 'agent_cash_settlement',
  ESCROW_LEDGER_PROCESS: 'escrow_ledger_process',
  MICRO_CREDIT_DUE: 'micro_credit_due',
  RELAY_HANDOFF: 'relay_handoff',
  REFERRAL_BONUS: 'referral_bonus',
  COOPERATIVE_DISPATCH_TIMEOUT: 'cooperative_dispatch_timeout',

  // Existing queues (keeping for reference)
  LOAD_MATCHING: 'load_matching',
  TRIP_TRACKING: 'trip_tracking',
  PAYMENT_PROCESSING: 'payment_processing',
  NOTIFICATION_DELIVERY: 'notification_delivery',
  INCIDENT_ESCALATION: 'incident_escalation',
  FRAUD_DETECTION: 'fraud_detection',
  BACKHAUL_SUGGESTIONS: 'backhaul_suggestions',
  TERMINAL_QUEUE_UPDATES: 'terminal_queue_updates',
} as const;

export type QueueName = typeof QueueNames[keyof typeof QueueNames];
