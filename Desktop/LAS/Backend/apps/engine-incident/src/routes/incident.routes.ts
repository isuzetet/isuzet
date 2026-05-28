import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, generateId } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';
import { transitionIncident, openIncident, getUserIncidents, getDisputesForOps, type IncidentStatus, } from '../services/incident.service.js';
import { AccessTokenPayload } from '@ruit/shared-auth';

const DRIVER_ORDERER_OPS = [
  ROLES.DRIVER, ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN,
];
const OPS_VIEWER = [
  ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN, ROLES.FINANCE_OPS,
];
const OPS_ADMIN_ONLY = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];

const CreateIncidentSchema = z.object({
  tripId: z.string(),
  incidentType: z.enum([
    'LATE_DELIVERY', 'CARGO_DAMAGE', 'ROUTE_DEVIATION', 'FRAUD', 'ACCIDENT',
    'BREAKDOWN', 'DISPUTE', 'CARGO_SHORTAGE', 'WRONG_DELIVERY', 'SOS',
    'DEMURRAGE', 'LOAD_CANCELLED', 'CARGO_DAMAGE_AT_PICKUP', 'CARGO_DAMAGE_AT_DELIVERY'
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string(),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
});

const TransitionSchema = z.object({
  to_status: z.enum([
    'OPEN', 'UNDER_INVESTIGATION', 'EVIDENCE_COLLECTION', 'AWAITING_RESOLUTION',
    'RESOLVED', 'ESCALATED', 'CLOSED',
  ]),
  resolutionNotes: z.string().optional(),
  liabilityParty: z.string().optional(),
  liabilityBreakdown: z.record(z.number()).optional(),
  penaltyEtb: z.number().optional(),
  compensationEtb: z.number().optional(),
  escalationReason: z.string().optional(),
});

// Haversine distance in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default async function incidentRoutes(fastify: FastifyInstance) {
  // POST /api/v1/incident/incidents
  fastify.post<{ Body: z.infer<typeof CreateIncidentSchema> }>(
    '/incidents',
    { preHandler: (fastify as any).requireRole(DRIVER_ORDERER_OPS) },
    async (request, reply) => {
      const body = CreateIncidentSchema.parse(request.body);
      const user = (request as any).user;
      
      const trip = await prisma.trip.findUnique({ where: { id: body.tripId } });
      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ENTITY_NOT_FOUND', message: 'Trip not found' },
        });
      }
      if (user.role === ROLES.DRIVER && trip.driverId !== user.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not related to this trip' },
        });
      }
      if (user.role === ROLES.ORDERER && trip.ordererId !== user.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not related to this trip' },
        });
      }
      if (['CARGO_DAMAGE', 'DISPUTE', 'CARGO_DAMAGE_AT_DELIVERY'].includes(body.incidentType)) {
        await prisma.load.updateMany({
          where: { id: { in: [trip.loadId] } },
          data: { status: 'DISPUTED' },
        });
      }
      const params: any = { tripId: body.tripId, incidentType: body.incidentType,
        reportedBy: user.sub, reporterRole: user.role, severity: body.severity,
        description: body.description,
      };
      if (body.geoLat !== undefined) params.geoLat = body.geoLat;
      if (body.geoLng !== undefined) params.geoLng = body.geoLng;
      const incidentId = await openIncident(params);
      return { success: true, data: { incidentId: incidentId } };
    }
  );

  // POST /api/v1/incident/breakdown/report
  fastify.post('/breakdown/report', { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ tripId: z.string(), lat: z.number(), lng: z.number(),
        description: z.string(), estimatedDelayHours: z.number().optional() });
      const { tripId, lat, lng, description, estimatedDelayHours } = schema.parse(request.body);
      const userId = request.user?.sub;
      const incidentId = await openIncident({ tripId, incidentType: 'BREAKDOWN',
        reportedBy: userId!, reporterRole: ROLES.DRIVER, severity: 'HIGH',
        description: `BREAKDOWN: ${description}. Estimated delay: ${estimatedDelayHours || 'unknown'} hours.`,
        geoLat: lat, geoLng: lng });
      await prisma.trip.update({ where: { id: tripId }, data: { status: 'DELAYED' } });
      return { success: true, data: { incidentId } };
    });

  // POST /api/v1/incident/sos
  fastify.post('/sos', { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ tripId: z.string(), lat: z.number(), lng: z.number(),
        message: z.string().optional() });
      const { tripId, lat, lng, message } = schema.parse(request.body);
      const userId = request.user?.sub;
      const incidentId = await openIncident({ tripId, incidentType: 'SOS',
        reportedBy: userId!, reporterRole: ROLES.DRIVER, severity: 'CRITICAL',
        description: `EMERGENCY SOS: ${message || 'No message provided.'}`, geoLat: lat, geoLng: lng });
      await prisma.trip.update({ where: { id: tripId }, data: { status: 'EMERGENCY' } });
      return { success: true, data: { incidentId, sosConfirmed: true } };
    });

  // POST /api/v1/incident/checkpoint/log
  // CHANGE 8: Enhanced with CheckpointIntelligence logic
  fastify.post('/checkpoint/log', { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ tripId: z.string(), lat: z.number(), lng: z.number(),
        checkpointType: z.enum(['POLICE', 'CUSTOMS', 'WEIGH_STATION', 'OTHER']),
        feeAmountEtb: z.number().int().optional(), notes: z.string().optional() });
      const { tripId, lat, lng, checkpointType, feeAmountEtb, notes } = schema.parse(request.body);
      const userId = request.user?.sub;
      
      const log = await prisma.checkpointLog.create({
        data: { id: generateId('cpl'), tripId, driverId: userId!, lat, lng,
          checkpointType, feeAmountEtb: feeAmountEtb || 0, notes }
      });
      
      // CHANGE 8: Update CheckpointIntelligence AFTER creating log
      const newFeeEtb = feeAmountEtb || 0;
      
      // Find existing intelligence within ~500m (0.005 degrees)
      const existingIntelligence = await prisma.checkpointIntelligence.findFirst({
        where: {
          lat: { gte: lat - 0.005, lte: lat + 0.005 },
          lng: { gte: lng - 0.005, lte: lng + 0.005 },
        },
      });
      
      let targetCorridorId: string | null = null;
      
      if (existingIntelligence) {
        // Update existing record with rolling weighted average
        const existingAvg = existingIntelligence.averageFeeEtb;
        const newAvg = Math.round(existingAvg * 0.8 + newFeeEtb * 0.2);
        const newMax = Math.max(existingIntelligence.maxFeeEtb, newFeeEtb);
        
        await prisma.checkpointIntelligence.update({
          where: { id: existingIntelligence.id },
          data: { averageFeeEtb: newAvg, maxFeeEtb: newMax, reportCount: { increment: 1 },
            lastReportedAt: new Date() },
        });
        targetCorridorId = existingIntelligence.corridorId;
      } else {
        // Get corridor from trip via load
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        let corridorIdValue: string | null = null;
        if (trip?.loadId) {
          const load = await prisma.load.findUnique({
            where: { id: trip.loadId },
          });
          corridorIdValue = load?.corridorId || null;
        }
        
        // Create new intelligence record
        const newIntelligence = await prisma.checkpointIntelligence.create({
          data: {
            id: generateId('cpk'),
            corridorId: corridorIdValue,
            lat: lat,
            lng: lng,
            checkpointType,
            averageFeeEtb: newFeeEtb,
            maxFeeEtb: newFeeEtb,
            reportCount: 1,
            locationName: notes || '',
            isOfficialToll: false
          }
        });
        targetCorridorId = newIntelligence.corridorId;
      }
      
      // Recalculate corridor expectedCheckpointFeeEtb
      if (targetCorridorId) {
        const allCheckpoints = await prisma.checkpointIntelligence.findMany({
          where: { corridorId: targetCorridorId },
        });
        const totalFee = allCheckpoints.reduce((sum: number, cp: any) => sum + cp.averageFeeEtb, 0);
        await prisma.corridor.update({
          where: { id: targetCorridorId },
          data: { expectedCheckpointFeeEtb: totalFee },
        });
        
        // Emit CHECKPOINT_INTELLIGENCE_UPDATED event
        await prisma.event.create({
          data: { id: generateId('evt'), eventType: EVENT_TYPES.CHECKPOINT_INTELLIGENCE_UPDATED,
            aggregateId: targetCorridorId, aggregateType: 'CORRIDOR', actorId: userId!,
            actorRole: 'DRIVER', strategyVersionId: 'default', payload: { feeAmountEtb: newFeeEtb, lat, lng } },
        });
      }
      
      return { success: true, data: { checkpointLogId: log.id } };
    });

  // GET /api/v1/incident/checkpoint/trip/:tripId
  fastify.get('/checkpoint/trip/:tripId', { preHandler: (fastify as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tripId } = request.params as { tripId: string };
      const logs = await prisma.checkpointLog.findMany({ where: { tripId }, orderBy: { loggedAt: 'desc' } });
      return { success: true, data: logs };
    });

  // POST /api/v1/incident/cargo-condition
  fastify.post('/cargo-condition', { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ stopId: z.string(), condition: z.enum(['GOOD', 'DAMAGED', 'PARTIAL']),
        notes: z.string().optional() });
      const { stopId, condition, notes } = schema.parse(request.body);
      const stop = await prisma.loadStop.findUnique({ where: { id: stopId } });
      if (!stop) throw new Error('Stop not found');
      const updateData: any = {};
      if (stop.stopType === 'PICKUP') { updateData.cargoConditionAtPickup = condition; }
      else { updateData.cargoConditionAtDelivery = condition; }
      updateData.notes = notes ? `${stop.notes || ''}\n${notes}` : stop.notes;
      await prisma.loadStop.update({ where: { id: stopId }, data: updateData });
      if (stop.stopType === 'DELIVERY') {
        let pod = await prisma.proofOfDelivery.findUnique({ where: { loadId: stop.loadId } });
        if (!pod) {
          pod = await prisma.proofOfDelivery.create({
            data: { id: generateId('pod'), loadId: stop.loadId, driverConfirmedAt: new Date() },
          });
        } else {
          await prisma.proofOfDelivery.update({ where: { id: pod.id }, data: { driverConfirmedAt: new Date() } });
        }
      }
      return { success: true };
    });

  // POST /api/v1/incident/demurrage/report
  fastify.post('/demurrage/report', { preHandler: (fastify as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({ stopId: z.string(), waitingStartedAt: z.string().datetime(), reason: z.string().optional() });
      const { stopId, waitingStartedAt, reason } = schema.parse(request.body);
      return { success: true, data: { status: 'REPORTED' } };
    });

  // POST /api/v1/incident/cancellation
  fastify.post('/cancellation', { preHandler: (fastify as any).requireRole([ROLES.ORDERER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ loadId: z.string(), reason: z.string() });
      const { loadId, reason } = schema.parse(request.body);
      const userId = request.user?.sub;
      const role = request.user?.role;
      const compensationEtb = 500;
      const record = await prisma.cancellationRecord.create({
        data: { id: generateId('can'), loadId, cancelledBy: userId!, cancelledByRole: role!,
          reason, compensationOwedEtb: compensationEtb }
      });
      await prisma.load.update({ where: { id: loadId }, data: { status: 'CANCELLED' } });
      return { success: true, data: { cancellationId: record.id, compensationEtb } };
    });

  // GET /api/v1/incident/incidents/:id
  fastify.get<{ Params: { id: string } }>(
    '/incidents/:id', { preHandler: (fastify as any).requireRole(DRIVER_ORDERER_OPS) },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;
      const incident = await prisma.incident.findUnique({ where: { id } });
      if (!incident) {
        return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Incident not found' } });
      }
      const trip = await prisma.trip.findUnique({ where: { id: incident.tripId } });
      const isOps = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
      const isRelatedToTrip = trip?.driverId === user.sub || trip?.ordererId === user.sub;
      if (!isOps && !isRelatedToTrip) {
        return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
      }
      const evidence = await prisma.incidentEvidence.findMany({ where: { incidentId: id } });
      const response: any = { ...incident, evidence };
      if (!isOps) { delete response.liabilityBreakdown; delete response.internal_notes; }
      return { success: true, data: response };
    });

  // PUT /api/v1/incident/incidents/:id/transition
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof TransitionSchema> }>(
    '/incidents/:id/transition', { preHandler: (fastify as any).requireRole(OPS_ADMIN_ONLY) },
    async (request, reply) => {
      const { id } = request.params;
      const body = TransitionSchema.parse(request.body);
      const user = (request as any).user;
      const transitionParams: any = { incidentId: id, toStatus: body.to_status as IncidentStatus,
        actorId: user.sub, actorRole: user.role };
      if (body.resolutionNotes !== undefined) transitionParams.resolutionNotes = body.resolutionNotes;
      if (body.liabilityParty !== undefined) transitionParams.liabilityParty = body.liabilityParty;
      if (body.liabilityBreakdown !== undefined) transitionParams.liabilityBreakdown = body.liabilityBreakdown;
      if (body.penaltyEtb !== undefined) transitionParams.penaltyEtb = body.penaltyEtb;
      if (body.compensationEtb !== undefined) transitionParams.compensationEtb = body.compensationEtb;
      if (body.escalationReason !== undefined) transitionParams.escalationReason = body.escalationReason;
      await transitionIncident(transitionParams);
      return { success: true, data: { incidentId: id, new_status: body.to_status } };
    });

  // GET /api/v1/incident/incidents
  fastify.get(
    '/incidents', { preHandler: (fastify as any).requireRole([...OPS_VIEWER, ROLES.DRIVER, ROLES.ORDERER]) },
    async (request, reply) => {
      const user = (request as any).user;
      const query = request.query as Record<string, string>;
      let filters: any = { status: query.status, severity: query.severity,
        page: parseInt(query.page || '1'), limit: parseInt(query.limit || '20') };
      const result = await getUserIncidents(user.sub, user.role, filters);
      return { success: true, data: result.items, pagination: { page: result.page, pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize), totalItems: result.total } };
    });

  // GET /api/v1/ops/disputes
  fastify.get(
    '/ops/disputes', { preHandler: (fastify as any).requireRole(OPS_VIEWER) },
    async (request, reply) => {
      const disputes = await getDisputesForOps();
      return { success: true, data: disputes };
    });

  // CHANGE 9: POST /api/v1/incident/weighbridge
  fastify.post('/weighbridge', { preHandler: (fastify as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ tripId: z.string(), locationName: z.string(), lat: z.number(), lng: z.number(),
        recordedWeightKg: z.number(), legalLimitKg: z.number(), truckId: z.string(), driverId: z.string(),
        fineAmountEtb: z.number().optional(), delayMinutes: z.number().optional() });
      const { tripId, locationName, lat, lng, recordedWeightKg, legalLimitKg, truckId, driverId, fineAmountEtb, delayMinutes } = schema.parse(request.body);
      
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Trip not found' } });
      }
      
      const toleranceKg = Math.round(legalLimitKg * 0.05);
      const wasOverweight = recordedWeightKg > legalLimitKg;
      const withinTolerance = recordedWeightKg <= (legalLimitKg + toleranceKg);
      
      const log = await prisma.weighbridgeLog.create({
        data: { id: generateId('wbl'), tripId, truckId, driverId, locationName,
          lat: lat, lng: lng, recordedWeightKg, legalLimitKg,
          toleranceKg: toleranceKg, wasOverweight: wasOverweight,
          fineAmountEtb: fineAmountEtb || 0, delayMinutes: delayMinutes || 0 },
      });
      
      if (wasOverweight && !withinTolerance) {
        // Create incident for overload
        await openIncident({ tripId, incidentType: 'OVERLOAD_DETECTED', reportedBy: (request as any).user?.sub || 'SYSTEM',
          reporterRole: 'DRIVER', severity: 'HIGH', description: `Overload detected at ${locationName}. Recorded: ${recordedWeightKg}kg, Limit: ${legalLimitKg}kg`,
          geoLat: lat, geoLng: lng });
      }
      
      return { success: true, data: { weighbridgeLogId: log.id, wasOverweight, withinTolerance, lat: log.lat.toNumber(), lng: log.lng.toNumber() } };
    });

  // CHANGE 10: GET /api/v1/incident/checkpoint/intelligence/:corridorId
  fastify.get('/checkpoint/intelligence/:corridorId', { preHandler: (fastify as any).requireRole(OPS_VIEWER) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { corridorId } = request.params as { corridorId: string };
      
      const checkpoints = await prisma.checkpointIntelligence.findMany({ where: { corridorId } });
      
      // Group by checkpointType
      const breakdown: Record<string, { count: number; totalFeeEtb: number; averageFeeEtb: number }> = {};
      let totalExpectedFeeEtb = 0;
      
      for (const cp of checkpoints) {
        totalExpectedFeeEtb += cp.averageFeeEtb;
        const type = cp.checkpointType;
        if (!breakdown[type]) { breakdown[type] = { count: 0, totalFeeEtb: 0, averageFeeEtb: 0 }; }
        breakdown[type].count += 1;
        breakdown[type].totalFeeEtb += cp.averageFeeEtb;
      }
      
      // Calculate averages
      for (const type in breakdown) { breakdown[type].averageFeeEtb = Math.round(breakdown[type].totalFeeEtb / breakdown[type].count); }
      
      return { success: true, data: { corridorId, totalExpectedFeeEtb, checkpoints: checkpoints.map((cp: any) => ({ ...cp, lat: cp.lat.toNumber(), lng: cp.lng.toNumber() })), breakdown } };
    });

  // CHANGE 11: POST /api/v1/incident/recovery/request
  fastify.post('/recovery/request', { preHandler: (fastify as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ tripId: z.string(), lat: z.number(), lng: z.number(),
        incidentType: z.string(), truckEngineType: z.string().optional() });
      const { tripId, lat, lng, incidentType, truckEngineType } = schema.parse(request.body);
      
      const resources = await prisma.recoveryResource.findMany({ where: { isActive: true, isVerified: true } });
      
      // Filter by distance (<= 30km)
      const nearbyResources = resources.map((r: any) => {
        const distance = haversineDistance(lat, lng, r.lat.toNumber(), r.lng.toNumber());
        return { ...r, distance };
      }).filter((r: any) => r.distance <= 30);
      
      // Filter by resourceType matching incidentType
      let typeFiltered = nearbyResources;
      const typeMap: Record<string, string[]> = {
        'BREAKDOWN': ['MECHANIC'], 'ENGINE_FAILURE': ['MECHANIC'], 'ACCIDENT': ['TOW_TRUCK'], 'ROLLOVER': ['TOW_TRUCK'], 'FUEL_SHORTAGE_DELAY': ['FUEL_DELIVERY'],
      };
      const requiredTypes = typeMap[incidentType];
      if (requiredTypes) { typeFiltered = nearbyResources.filter((r: any) => requiredTypes.includes(r.resourceType)); }
      
      // Sort by specialization match if truckEngineType provided
      let sorted = typeFiltered;
      if (truckEngineType) {
        sorted = typeFiltered.sort((a: any, b: any) => {
          const aMatch = (a.specializations as string[] || []).includes(truckEngineType) ? 0 : 1;
          const bMatch = (b.specializations as string[] || []).includes(truckEngineType) ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          return (a.distance || Infinity) - (b.distance || Infinity);
        });
      } else { sorted = typeFiltered.sort((a: any, b: any) => (a.distance || Infinity) - (b.distance || Infinity)); }
      
      const top5 = sorted.slice(0, 5).map((r: any) => ({ id: r.id, name: r.name, nameAmharic: r.nameAmharic, resourceType: r.resourceType,
        ownerName: r.ownerName, ownerPhone: r.ownerPhone, lat: r.lat.toNumber(), lng: r.lng.toNumber(),
        isVerified: r.isVerified, distance: r.distance, zoneId: r.zoneId,
        specializations: r.specializations, averageResponseMinutes: r.averageResponseMinutes,
        averageRateEtb: r.averageRateEtb }));
      
      return { success: true, data: { resources: top5, tripId } };
    });

  // CHANGE 12: GET /api/v1/incident/recovery/resources
  fastify.get('/recovery/resources', { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER]) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const where: any = {};
      if (query.zoneId) where.zoneId = query.zoneId;
      if (query.resourceType) where.resourceType = query.resourceType;
      
      const resources = await prisma.recoveryResource.findMany({ where, orderBy: { createdAt: 'desc' } });
      
      return { success: true, data: resources.map((r: any) => ({
        ...r, lat: r.lat.toNumber(), lng: r.lng.toNumber()
      })) };
    });

  // CHANGE 13: POST /api/v1/incident/recovery/resources
  fastify.post('/recovery/resources', { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({ name: z.string(), nameAmharic: z.string().optional(),
        resourceType: z.enum(['MECHANIC', 'TOW_TRUCK', 'FUEL_DELIVERY']),
        ownerName: z.string(), ownerPhone: z.string(), lat: z.number(), lng: z.number(),
        zoneId: z.string().optional(), corridorIds: z.array(z.string()).optional(),
        specializations: z.array(z.string()).optional(), averageResponseMinutes: z.number().optional(),
        averageRateEtb: z.number().optional(), isVerified: z.boolean().optional() });
      const body = schema.parse(request.body);
      
      const resource = await prisma.recoveryResource.create({
        data: { id: generateId('rec'), name: body.name, nameAmharic: body.nameAmharic,
          resourceType: body.resourceType, ownerName: body.ownerName, ownerPhone: body.ownerPhone,
          lat: body.lat, lng: body.lng,
          zoneId: body.zoneId, corridorIds: body.corridorIds || [],
          specializations: body.specializations || [], averageResponseMinutes: body.averageResponseMinutes,
          averageRateEtb: body.averageRateEtb || 0,
          isVerified: body.isVerified ?? false },
      });
      
      return { success: true, data: { ...resource, lat: resource.lat.toNumber(), lng: resource.lng.toNumber() } };
    });
}
