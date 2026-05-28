import { prisma, generateId } from '@ruit/shared-db';

// Valid states
export type IncidentStatus =
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'EVIDENCE_COLLECTION'
  | 'AWAITING_RESOLUTION'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'CLOSED';

// Valid transitions map: key = current state, value = allowed next states
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['UNDER_INVESTIGATION', 'ESCALATED'],
  UNDER_INVESTIGATION: ['EVIDENCE_COLLECTION', 'AWAITING_RESOLUTION'],
  EVIDENCE_COLLECTION: ['AWAITING_RESOLUTION'],
  AWAITING_RESOLUTION: ['RESOLVED', 'ESCALATED'],
  ESCALATED: ['AWAITING_RESOLUTION', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [], // terminal state
};

// Roles allowed to trigger each transition
const TRANSITION_ROLES: Record<string, string[]> = {
  'OPEN->UNDER_INVESTIGATION': ['OPS_ADMIN', 'SUPER_ADMIN'],
  'OPEN->ESCALATED': ['SYSTEM'],
  'UNDER_INVESTIGATION->EVIDENCE_COLLECTION': ['OPS_ADMIN', 'SUPER_ADMIN'],
  'UNDER_INVESTIGATION->AWAITING_RESOLUTION': ['OPS_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
  'EVIDENCE_COLLECTION->AWAITING_RESOLUTION': ['SYSTEM', 'OPS_ADMIN', 'SUPER_ADMIN'],
  'AWAITING_RESOLUTION->RESOLVED': ['OPS_ADMIN', 'SUPER_ADMIN'],
  'AWAITING_RESOLUTION->ESCALATED': ['SYSTEM'],
  'ESCALATED->AWAITING_RESOLUTION': ['OPS_ADMIN', 'SUPER_ADMIN'],
  'ESCALATED->CLOSED': ['SUPER_ADMIN'],
  'RESOLVED->CLOSED': ['SYSTEM'],
};

export async function transitionIncident(params: {
  incidentId: string;
  toStatus: IncidentStatus;
  actorId: string;
  actorRole: string;
  resolutionNotes?: string;
  liabilityParty?: string;
  liabilityBreakdown?: Record<string, number>;
  penaltyEtb?: number;
  compensationEtb?: number;
  escalationReason?: string;
}): Promise<void> {
  const incident = await prisma.incident.findUnique({
    where: { id: params.incidentId },
  });
  if (!incident) throw new Error('ENTITY_NOT_FOUND');

  const currentStatus = incident.status as IncidentStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(params.toStatus)) {
    throw new Error(`INVALID_STATE_TRANSITION: ${currentStatus} -> ${params.toStatus}`);
  }

  const transitionKey = `${currentStatus}->${params.toStatus}`;
  const allowedRoles = TRANSITION_ROLES[transitionKey] ?? [];
  if (!allowedRoles.includes(params.actorRole)) {
    throw new Error(
      `INSUFFICIENT_TRUST_TIER: role ${params.actorRole} cannot perform ${transitionKey}`
    );
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status: params.toStatus,
  };
  if (params.toStatus === 'UNDER_INVESTIGATION') {
    updateData.assignedTo = params.actorId;
    updateData.evidenceDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
  }
  if (params.toStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date();
    updateData.resolutionNotes = params.resolutionNotes;
    updateData.liabilityParty = params.liabilityParty;
    updateData.liabilityBreakdown = params.liabilityBreakdown ?? {};
    updateData.penaltyEtb = params.penaltyEtb ?? 0;
    updateData.compensationEtb = params.compensationEtb ?? 0;
  }
  if (params.toStatus === 'ESCALATED') {
    updateData.escalationReason = params.escalationReason;
  }

  await prisma.incident.update({
    where: { id: params.incidentId },
    data: updateData,
  });

  // Emit state transition event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType:
        params.toStatus === 'RESOLVED'
          ? 'INCIDENT_RESOLVED'
          : params.toStatus === 'ESCALATED'
          ? 'DISPUTE_ESCALATED'
          : 'INCIDENT_OPENED',
      aggregateId: params.incidentId,
      aggregateType: 'INCIDENT',
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: await getActiveStrategyId(),
      payload: {
        from_status: currentStatus,
        to_status: params.toStatus,
        liabilityParty: params.liabilityParty,
        penaltyEtb: params.penaltyEtb,
        compensationEtb: params.compensationEtb,
      },
      metadata: {
        source: 'API',
        isManualOverride: false,
      },
    },
  });

  // If RESOLVED: check if escrow should be released
  // Escrow release is handled by engine-liquidity listening to INCIDENT_RESOLVED
  // Engine 6 only manages state. Engine 4 manages money.
}

export async function openIncident(params: {
  tripId: string;
  incidentType: string;
  reportedBy: string;
  reporterRole: string;
  severity: string;
  description: string;
  geoLat?: number;
  geoLng?: number;
}): Promise<string> {
  const incident = await prisma.incident.create({
    data: {
      id: generateId('inc'),
      tripId: params.tripId,
      incidentType: params.incidentType,
      reportedBy: params.reportedBy,
      reporterRole: params.reporterRole,
      status: 'OPEN',
      severity: params.severity,
      description: params.description,
      geoLat: params.geoLat ?? null,
      geoLng: params.geoLng ?? null,
      penaltyEtb: 0,
      compensationEtb: 0,
    },
  });

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'INCIDENT_OPENED',
      aggregateId: incident.id,
      aggregateType: 'INCIDENT',
      actorId: params.reportedBy,
      actorRole: params.reporterRole,
      strategyVersionId: await getActiveStrategyId(),
      payload: {
        incidentType: params.incidentType,
        severity: params.severity,
        tripId: params.tripId,
      },
      metadata: {
        source: 'API',
        isManualOverride: false,
      },
    },
  });

  // Schedule auto-escalation job after 24h if not assigned (SLA from Amendment 2 C4)
  // Done via BullMQ delayed job in the worker file
  return incident.id;
}

export async function submitEvidence(params: {
  incidentId: string;
  submittedBy: string;
  submitterRole: string;
  evidenceType: string;
  s3Key: string;
  s3Bucket: string;
  description?: string;
}): Promise<void> {
  await prisma.incidentEvidence.create({
    data: {
      id: generateId('iev'),
      incidentId: params.incidentId,
      submittedBy: params.submittedBy,
      submitterRole: params.submitterRole,
      evidenceType: params.evidenceType,
      s3Key: params.s3Key,
      s3Bucket: params.s3Bucket,
      description: params.description ?? null,
    },
  });

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'EVIDENCE_SUBMITTED',
      aggregateId: params.incidentId,
      aggregateType: 'INCIDENT',
      actorId: params.submittedBy,
      actorRole: params.submitterRole,
      strategyVersionId: await getActiveStrategyId(),
      payload: {
        evidenceType: params.evidenceType,
        s3Key: params.s3Key,
      },
      metadata: {
        source: 'API',
        isManualOverride: false,
      },
    },
  });
}

async function getActiveStrategyId(): Promise<string> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
  });
  return sv?.id ?? 'sv_phase1_growth';
}

// Get incidents for a user (driver/orderer) based on trip relationship
export async function getUserIncidents(
  userId: string,
  role: string,
  filters: {
    status?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.limit ?? 20;
  const skip = (page - 1) * pageSize;

  let where: any = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.severity) {
    where.severity = filters.severity;
  }

  // For driver/orderer, filter by trip relation via raw query
  let tripIds: string[] = [];
  if (role === 'DRIVER') {
    const trips = await prisma.trip.findMany({
      where: { driverId: userId },
      select: { id: true },
    });
    tripIds = trips.map((t: any) => t.id);
    where.tripId = { in: tripIds };
  } else if (role === 'ORDERER') {
    const trips = await prisma.trip.findMany({
      where: { ordererId: userId },
      select: { id: true },
    });
    tripIds = trips.map((t: any) => t.id);
    where.tripId = { in: tripIds };
  }

  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.incident.count({ where }),
  ]);

  // Fetch evidence separately for each incident
  const itemsWithEvidence = await Promise.all(
    items.map(async (incident: any) => {
      const evidence = await prisma.incidentEvidence.findMany({
        where: { incidentId: incident.id },
      });
      return { ...incident, evidence };
    })
  );

  return {
    items: itemsWithEvidence,
    total,
    page,
    pageSize,
  };
}

// Get disputes for OPS dashboard with SLA breach flags
export async function getDisputesForOps(): Promise<any[]> {
  // SLA thresholds from Amendment 2 C4
  const SLA_THRESHOLDS: Record<string, number> = {
    LOW: 5,
    MEDIUM: 3,
    HIGH: 1,
    CRITICAL: 0,
  };

  const incidents = await prisma.incident.findMany({
    where: {
      status: {
        in: ['OPEN', 'UNDER_INVESTIGATION', 'AWAITING_RESOLUTION'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch evidence and trip info separately
  const incidentsWithDetails = await Promise.all(
    incidents.map(async (incident: any) => {
      const [evidence, trip] = await Promise.all([
        prisma.incidentEvidence.findMany({
          where: { incidentId: incident.id },
        }),
        prisma.trip.findUnique({
          where: { id: incident.tripId },
        }),
      ]);
      return { ...incident, evidence, trip };
    })
  );

  return incidentsWithDetails.map((incident: any) => {
    const createdAt = new Date(incident.createdAt);
    const now = new Date();
    const daysOpen = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const slaThreshold = SLA_THRESHOLDS[incident.severity] ?? 5;
    const slaBreached = daysOpen > slaThreshold;

    return {
      ...incident,
      days_open: daysOpen,
      sla_threshold_days: slaThreshold,
      sla_breached: slaBreached,
    };
  });
}
