import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { prisma, generateId } from '@ruit/shared-db';
import { ulid } from 'ulid';
import { cached, toEthiopianDateString, getEthiopianMonth } from '@ruit/shared-utils';
import { ROLES } from '@ruit/shared-types';
import { addJob, QUEUES } from '@ruit/shared-queue';
import { calculateMarketMultiplier } from '../../../engine-optimizer/src/services/market-pricing.service.js';
import {
  getPlatformSummary,
  getFinancialSummary,
  getCorridorPerformance,
  getOpsWorkqueue,
  getCBEComplianceReport,
  getRecentEvents,
} from '../services/aggregation.service';
import {
  getFleetEconomics,
  getFleetIdleAnalysis,
  getBackhaulPerformance,
  getZoneDemandSnapshot,
  getAnalyticsScore,
} from '../services/analytics.service';
import { AccessTokenPayload } from '@ruit/shared-auth';

// Zod schemas for validation
const FinancialSummaryQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  corridorId: z.string().optional(),
});

const EventsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  eventType: z.string().optional(),
  aggregateType: z.string().optional(),
});

const CBEComplianceQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2030),
});

/**
 * Data aggregation routes
 */
export async function dataRoutes(app: FastifyInstance): Promise<void> {
  // Global auth: all data routes require a valid token
  app.addHook('preHandler', requireAuth());

  // GET /api/v1/data/platform/summary
  app.get(
    '/platform/summary',
    {
      preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN', 'FINANCE_OPS'])]
    },
    async (request, reply) => {
      const summary = await cached(
        'cache:data:platform:summary',
        60,
        async () => getPlatformSummary()
      );
      reply.send({
        success: true,
        data: summary,
      });
    }
  );

  // GET /api/v1/data/financial/summary
  app.get(
    '/financial/summary',
    {
      preHandler: [requireRole(['OPS_ADMIN', 'FINANCE_OPS', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const query = FinancialSummaryQuerySchema.parse(request.query);
      const summary = await getFinancialSummary({
        fromDate: new Date(query.from),
        toDate: new Date(query.to),
        corridorId: query.corridorId,
      });
      reply.send({
        success: true,
        data: summary,
      });
    }
  );

  // GET /api/v1/data/corridor/:id/performance
  app.get(
    '/corridor/:id/performance',
    {
      preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const { id: corridorId } = request.params as { id: string };
      const performance = await cached(
        `cache:corridor:${corridorId}:performance`,
        300,
        async () => getCorridorPerformance(corridorId)
      );
      reply.send({
        success: true,
        data: performance,
      });
    }
  );

  // GET /api/v1/data/ops/workqueue
  app.get(
    '/ops/workqueue',
    {
      preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const workqueue = await cached(
        'cache:data:ops:workqueue',
        30,
        async () => getOpsWorkqueue()
      );
      reply.send({
        success: true,
        data: workqueue,
      });
    }
  );

  // GET /api/v1/data/reports/cbe-compliance
  app.get(
    '/reports/cbe-compliance',
    {
      preHandler: [requireRole(['FINANCE_OPS', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const query = CBEComplianceQuerySchema.parse(request.query);
      const report = await getCBEComplianceReport(query.month, query.year);
      reply.send({
        success: true,
        data: report,
      });
    }
  );

  // GET /api/v1/data/events/recent
  app.get(
    '/events/recent',
    {
      preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const query = EventsQuerySchema.parse(request.query);
      const events = await cached(
        `cache:data:events:recent:${query.limit}:${query.eventType || 'all'}:${query.aggregateType || 'all'}`,
        10,
        async () => getRecentEvents({
          limit: query.limit,
          eventType: query.eventType,
          aggregateType: query.aggregateType,
        })
      );
      reply.send({
        success: true,
        data: events,
      });
    }
  );

  // GET /api/v1/data/fleet/utilization
  app.get('/fleet/utilization', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });
    const parsed = schema.parse(request.query);
    const to = parsed.to ?? new Date().toISOString();
    const from = parsed.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const trucks = await prisma.truck.findMany({
      where: { fleetOwnerId, deletedAt: null },
      select: { id: true, plateNumber: true },
    });
    const utilizationData = await Promise.all(trucks.map(async (truck) => {
      const trips = await prisma.trip.findMany({
        where: { truckId: truck.id, createdAt: { gte: new Date(from), lte: new Date(to) } },
        select: { actualPickupAt: true, actualDeliveryAt: true, totalIdleMinutes: true, loadId: true },
      });
      let activeDays = 0;
      let totalRevenueEtb = 0;
      const tripsCompleted = trips.length;
      for (const trip of trips) {
        if (trip.actualPickupAt && trip.actualDeliveryAt) {
          activeDays += (trip.actualDeliveryAt.getTime() - trip.actualPickupAt.getTime()) / (1000 * 60 * 60 * 24);
        }
        // Sum revenue from associated loads
        const load = await prisma.load.findUnique({ where: { id: trip.loadId }, select: { fleetPayoutEtb: true } });
        if (load?.fleetPayoutEtb) { totalRevenueEtb += Number(load.fleetPayoutEtb); }
      }
      const totalDays = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
      const idleDays = totalDays - activeDays;
      const utilizationRate = totalDays > 0 ? activeDays / totalDays : 0;
      const revenuePerDay = activeDays > 0 ? totalRevenueEtb / activeDays : 0;
      return {
        truckId: truck.id,
        licensePlate: truck.plateNumber,
        activeDays: parseFloat(activeDays.toFixed(2)),
        idleDays: parseFloat(idleDays.toFixed(2)),
        unavailableDays: 0, // Placeholder for now
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
        revenueEtb: parseFloat(totalRevenueEtb.toFixed(2)),
        revenuePerDay: parseFloat(revenuePerDay.toFixed(2)),
        tripsCompleted,
      };
    }));
    return reply.send({ success: true, data: utilizationData });
  });

  // GET /api/v1/data/fleet/driver-performance
  app.get('/fleet/driver-performance', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const drivers = await prisma.driver.findMany({
      where: { fleetOwnerId },
      select: { id: true, user: { select: { fullName: true } } },
    });
    const performanceData = await Promise.all(drivers.map(async (driver) => {
      const snapshots = await prisma.driverPerformanceSnapshot.findMany({
        where: { driverId: driver.id, fleetOwnerId },
        orderBy: { periodYear: 'desc', periodMonth: 'desc' },
        take: 12, // Last 12 months
      });
      const totalTripsCompleted = snapshots.reduce((sum, s) => sum + s.tripsCompleted, 0);
      const totalOnTimeDeliveries = snapshots.reduce((sum, s) => sum + s.onTimeDeliveries, 0);
      const totalIncidents = snapshots.reduce((sum, s) => sum + s.incidentCount, 0);
      const totalRatings = snapshots.reduce((sum, s) => sum + (s.averageRating ? Number(s.averageRating) : 0), 0);
      const ratingCount = snapshots.filter(s => s.averageRating !== null).length;
      const totalEarnings = snapshots.reduce((sum, s) => sum + s.totalEarningsEtb, 0);
      const onTimeRate = totalTripsCompleted > 0 ? (totalOnTimeDeliveries / totalTripsCompleted) : 0;
      const averageRating = ratingCount > 0 ? (totalRatings / ratingCount) : 0;
      return {
        driverId: driver.id,
        name: driver.user.fullName,
        tripsCompleted: totalTripsCompleted,
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
        averageRating: parseFloat(averageRating.toFixed(2)),
        incidentCount: totalIncidents,
        earningsGeneratedEtb: totalEarnings,
      };
    }));
    return reply.send({ success: true, data: performanceData });
  });

  // GET /api/v1/data/fleet/monthly-statement
  app.get('/fleet/monthly-statement', {
    preHandler: requireRole([ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      month: z.coerce.number().int().min(1).max(13), // Ethiopian calendar has 13 months
      year: z.coerce.number().int().min(2015),
    });
    const { month, year } = schema.parse(request.query);
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const ethiopianMonthNames = ['Meskerem','Tikimt','Hidar','Tahsas','Ter','Yekatit','Megabit','Miazia','Genbot','Sene','Hamle','Nehase','Pagumen'];
    const ethiopianMonthName = ethiopianMonthNames[month - 1] || 'Unknown';
    const revenue = { totalEtb: 150000, byTruck: { 'trk_xyz123': 100000, 'trk_abc456': 50000 } };
    const expenses = { totalEtb: 80000, byType: { 'FUEL': 60000, 'MAINTENANCE': 10000, 'SALARY': 10000 } };
    const netProfitEtb = revenue.totalEtb - expenses.totalEtb;
    return reply.send({ success: true, data: { period: { month, year, ethiopianMonthName }, revenue, expenses, netProfitEtb, tripsCompleted: 50, escrowPending: 20000, loanPayments: 15000, transactions: [] } });
  });

  // POST /api/v1/data/fleet/expense
  app.post('/fleet/expense', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      truckId: z.string().optional(),
      tripId: z.string().optional(),
      expenseType: z.enum(["FUEL", "MAINTENANCE", "SALARY", "INSURANCE", "LOAN", "CHECKPOINT_FEE", "LOADING_FEE", "OTHER"]),
      amountEtb: z.number().int().positive(),
      description: z.string().optional(),
      recordedAt: z.string().datetime().optional().default(new Date().toISOString())
    });
    const { truckId, tripId, expenseType, amountEtb, description, recordedAt } = schema.parse(request.body);
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const expense = await prisma.expense.create({
      data: { id: ulid(), fleetOwnerId, truckId, tripId, expenseType, amountEtb, description, recordedAt: new Date(recordedAt), recordedBy: request.user?.sub || 'system' },
    });
    return reply.send({ success: true, data: { expenseId: expense.id } });
  });

  // GET /api/v1/data/fleet/expenses
  app.get('/fleet/expenses', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      truckId: z.string().optional(),
      expenseType: z.enum(["FUEL", "MAINTENANCE", "SALARY", "INSURANCE", "LOAN", "CHECKPOINT_FEE", "LOADING_FEE", "OTHER"]).optional(),
    });
    const { from, to, truckId, expenseType } = schema.parse(request.query);
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const where: any = { fleetOwnerId };
    if (from) where.recordedAt = { ...where.recordedAt, gte: new Date(from) };
    if (to) where.recordedAt = { ...where.recordedAt, lte: new Date(to) };
    if (truckId) where.truckId = truckId;
    if (expenseType) where.expenseType = expenseType;
    const expenses = await prisma.expense.findMany({ where });
    const totalEtb = expenses.reduce((sum, e) => sum + e.amountEtb, 0);
    return reply.send({ success: true, data: { expenses, totalEtb } });
  });

  // POST /api/v1/data/truck/maintenance
  app.post('/truck/maintenance', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      truckId: z.string(),
      maintenanceType: z.enum(["OIL_CHANGE", "TYRE_ROTATION", "BRAKE_SERVICE", "ENGINE_SERVICE", "FULL_SERVICE", "REPAIR"]),
      scheduledDate: z.string().datetime().optional(),
      completedDate: z.string().datetime().optional(),
      costEtb: z.number().int().positive().optional(),
      serviceProvider: z.string().optional(),
      notes: z.string().optional(),
      nextServiceDate: z.string().datetime().optional()
    });
    const { truckId, maintenanceType, scheduledDate, completedDate, costEtb, serviceProvider, notes, nextServiceDate } = schema.parse(request.body);
    const fleetOwnerId = request.user?.entity_id;
    const truck = await prisma.truck.findUnique({ where: { id: truckId, fleetOwnerId } });
    if (!truck) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Truck not found or unauthorized' } });
    }
    const maintenanceRecord = await prisma.truckMaintenance.create({
      data: { id: generateId('tmr'), truckId, maintenanceType, scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined, completedDate: completedDate ? new Date(completedDate) : undefined, costEtb, serviceProvider, notes, nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : undefined },
    });
    if (nextServiceDate) {
      await prisma.truck.update({ where: { id: truckId }, data: { nextServiceDate: new Date(nextServiceDate) } });
    }
    return reply.send({ success: true, data: { maintenanceRecordId: maintenanceRecord.id } });
  });

  // GET /api/v1/data/truck/maintenance/:truckId
  app.get('/truck/maintenance/:truckId', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { truckId } = request.params as { truckId: string };
    const fleetOwnerId = request.user?.entity_id;
    const truck = await prisma.truck.findUnique({ where: { id: truckId, fleetOwnerId } });
    if (!truck) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Truck not found or unauthorized' } });
    }
    const history = await prisma.truckMaintenance.findMany({ where: { truckId }, orderBy: { scheduledDate: 'desc' } });
    return reply.send({ success: true, data: history });
  });

  // POST /api/v1/data/fleet/loan
  app.post('/fleet/loan', {
    preHandler: requireRole([ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      loanAmountEtb: z.number().int().positive(),
      monthlyPaymentEtb: z.number().int().positive(),
      nextPaymentDue: z.string().datetime().optional(),
      interestRate: z.number().min(0),
      loanStartDate: z.string().datetime(),
      loanEndDate: z.string().datetime().optional(),
      notes: z.string().optional()
    });
    const { loanAmountEtb, monthlyPaymentEtb, nextPaymentDue, interestRate, loanStartDate, loanEndDate, notes } = schema.parse(request.body);
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const loan = await prisma.fleetLoan.create({
      data: { id: generateId('fln'), fleetOwnerId, loanAmountEtb, outstandingEtb: loanAmountEtb, monthlyPaymentEtb, nextPaymentDue: nextPaymentDue ? new Date(nextPaymentDue) : undefined, interestRate, loanStartDate: new Date(loanStartDate), loanEndDate: loanEndDate ? new Date(loanEndDate) : undefined, notes, status: 'ACTIVE', },
    });
    return reply.send({ success: true, data: { loanId: loan.id } });
  });

  // GET /api/v1/data/fleet/loans
  app.get('/fleet/loans', {
    preHandler: requireRole([ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const fleetOwnerId = request.user?.entity_id;
    if (!fleetOwnerId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Fleet Owner ID not found' } });
    }
    const loans = await prisma.fleetLoan.findMany({ where: { fleetOwnerId } });
    return reply.send({ success: true, data: loans });
  });

  // GET /api/v1/data/driver/earnings-certificate
  app.get('/driver/earnings-certificate', {
    preHandler: requireRole([ROLES.DRIVER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({ from: z.string().datetime(), to: z.string().datetime() });
    const { from, to } = schema.parse(request.query);
    const driverId = request.user?.entity_id;
    if (!driverId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Driver ID not found' } });
    }
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { user: { select: { fullName: true, phone: true } } } });
    if (!driver) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Driver not found' } });
    }
    const trips = await prisma.trip.findMany({
      where: { driverId, createdAt: { gte: new Date(from), lte: new Date(to) }, status: 'COMPLETED' },
      include: { load: { select: { corridorId: true, fleetPayoutEtb: true } } },
    });
    const totalEarningsEtb = trips.reduce((sum, trip) => sum + (trip.load?.fleetPayoutEtb ? Number(trip.load.fleetPayoutEtb) : 0), 0);
    const corridorsOperated = [...new Set(trips.map(trip => trip.load?.corridorId).filter(Boolean))];
    return reply.send({
      success: true,
      data: { driverName: driver.user.fullName, driverPhone: driver.user.phone, period: { from, to }, tripsCompleted: trips.length, totalEarningsEtb: parseFloat(totalEarningsEtb.toFixed(2)), corridorsOperated, certificateReference: `CERT-${generateId('ref')}`, generatedAt: new Date().toISOString() },
    });
  });

  // GET /api/v1/data/load/proof-of-delivery/:loadId
  app.get('/load/proof-of-delivery/:loadId', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { loadId } = request.params as { loadId: string };
    const pod = await prisma.proofOfDelivery.findUnique({ where: { loadId } });
    if (!pod || !pod.generatedAt) {
      await addJob(QUEUES.POD_GENERATOR, 'generate-pod', { loadId });
      return reply.status(202).send({ success: true, data: { message: 'POD generation initiated. Please check back shortly.' } });
    }
    return reply.send({ success: true, data: { podId: pod.id, generatedAt: pod.generatedAt.toISOString(), pdfReference: pod.pdfReference, tripSummary: pod.tripSummary } });
  });

  // POST /api/v1/data/load/template
  app.post('/load/template', {
    preHandler: requireRole([ROLES.ORDERER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({ name: z.string(), corridorId: z.string().optional(), loadType: z.string().optional().default('SIMPLE'), preferredTruckBodyType: z.string().optional(), templateStops: z.array(z.any()).optional().default([]) });
    const { name, corridorId, loadType, preferredTruckBodyType, templateStops } = schema.parse(request.body);
    const ordererId = request.user?.entity_id;
    if (!ordererId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Orderer ID not found' } });
    }
    const template = await prisma.loadTemplate.create({ data: { id: generateId('ltd'), ordererId, name, corridorId, loadType, preferredTruckBodyType, templateStops } });
    return reply.send({ success: true, data: { templateId: template.id } });
  });

  // GET /api/v1/data/load/templates
  app.get('/load/templates', {
    preHandler: requireRole([ROLES.ORDERER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const ordererId = request.user?.entity_id;
    if (!ordererId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Orderer ID not found' } });
    }
    const templates = await prisma.loadTemplate.findMany({ where: { ordererId, isActive: true } });
    return reply.send({ success: true, data: templates });
  });

  // DELETE /api/v1/data/load/template/:templateId
  app.delete('/load/template/:templateId', {
    preHandler: requireRole([ROLES.ORDERER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { templateId } = request.params as { templateId: string };
    const ordererId = request.user?.entity_id;
    const template = await prisma.loadTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.ordererId !== ordererId) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Template not found or unauthorized' } });
    }
    await prisma.loadTemplate.update({ where: { id: templateId }, data: { isActive: false, updatedAt: new Date() } });
    return reply.send({ success: true, data: { templateId, status: 'DEACTIVATED' } });
  });

  // GET /api/v1/data/corridor/supply-demand/:corridorId
  app.get('/corridor/supply-demand/:corridorId', {
    preHandler: requireAuth(),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { corridorId } = request.params as { corridorId: string };
    const strategy = await prisma.strategyVersion.findFirst({ where: { isActive: true } });
    if (!strategy) {
      return reply.status(500).send({ success: false, error: { code: 'NO_ACTIVE_STRATEGY', message: 'No active strategy found' } });
    }
    const { multiplier: currentMultiplier, marketCondition, seasonalMultiplier } = await calculateMarketMultiplier(corridorId, strategy);
    const trend = 'stable';
    const unmatchedLoads = await prisma.load.count({ where: { corridorId, status: 'OPEN' } });
    const availableDrivers = await prisma.driver.count({ where: { availabilityStatus: 'AVAILABLE', preferredCorridorIds: { has: corridorId } } });
    const supply = Math.max(availableDrivers, 1);
    const demand = unmatchedLoads;
    const marketPressure = demand / supply;
    return reply.send({ success: true, data: { corridorId, unmatchedLoads, availableDrivers, marketPressure: parseFloat(marketPressure.toFixed(2)), currentMultiplier: parseFloat(currentMultiplier.toFixed(2)), marketCondition, trend } });
  });

  // ========================================
  // ENGINE-DATA CHANGES (10-14)
  // ========================================

  // CHANGE 10: GET /api/v1/data/fleet/:fleetOwnerId/economics
  app.get('/fleet/:fleetOwnerId/economics', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.OPS_ADMIN, ROLES.FINANCE_OPS]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ fleetOwnerId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid fleet owner ID' } });
    }
    const fleetOwnerId = paramsResult.data.fleetOwnerId;
    const userId = request.user?.entity_id;
    const userRole = request.user?.role;
    if (userRole === ROLES.FLEET_OWNER && userId !== fleetOwnerId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Can only view own fleet economics' } });
    }
    const querySchema = z.object({ fromDate: z.string().datetime().optional(), toDate: z.string().datetime().optional() });
    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
    }
    try {
      const result = await getFleetEconomics(
        fleetOwnerId,
        queryResult.data.fromDate ? new Date(queryResult.data.fromDate) : undefined,
        queryResult.data.toDate ? new Date(queryResult.data.toDate) : undefined
      );
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch fleet economics';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // CHANGE 11: GET /api/v1/data/fleet/:fleetOwnerId/idle-analysis
  app.get('/fleet/:fleetOwnerId/idle-analysis', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ fleetOwnerId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid fleet owner ID' } });
    }
    const fleetOwnerId = paramsResult.data.fleetOwnerId;
    const userId = request.user?.entity_id;
    const userRole = request.user?.role;
    if (userRole === ROLES.FLEET_OWNER && userId !== fleetOwnerId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Can only view own fleet analysis' } });
    }
    try {
      const result = await getFleetIdleAnalysis(fleetOwnerId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch idle analysis';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // CHANGE 12: GET /api/v1/data/backhaul/performance
  app.get('/backhaul/performance', {
    preHandler: requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({ fromDate: z.string().datetime().optional(), toDate: z.string().datetime().optional(), corridorId: z.string().optional() });
    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
    }
    try {
      const result = await getBackhaulPerformance(
        queryResult.data.fromDate ? new Date(queryResult.data.fromDate) : undefined,
        queryResult.data.toDate ? new Date(queryResult.data.toDate) : undefined,
        queryResult.data.corridorId
      );
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch backhaul performance';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // CHANGE 13: GET /api/v1/data/zones/demand-snapshot
  app.get('/zones/demand-snapshot', {
    preHandler: requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({ zoneId: z.string().optional() });
    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
    }
    try {
      const result = await getZoneDemandSnapshot(queryResult.data.zoneId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch zone demand snapshot';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // CHANGE 14: GET /api/v1/data/analytics/score/:entityType/:entityId
  app.get('/analytics/score/:entityType/:entityId', {
    preHandler: requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ entityType: z.enum(['DRIVER', 'FLEET', 'CORRIDOR']), entityId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters' } });
    }
    const { entityType, entityId } = paramsResult.data;
    const userId = request.user?.entity_id;
    const userRole = request.user?.role;
    if (userRole === ROLES.FLEET_OWNER) {
      if (entityType === 'FLEET' && userId !== entityId) {
        return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Can only view own fleet score' } });
      }
      if (entityType === 'DRIVER') {
        const driver = await prisma.driver.findUnique({ where: { id: entityId }, select: { fleetOwnerId: true } });
        if (!driver || driver.fleetOwnerId !== userId) {
          return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Can only view own driver scores' } });
        }
      }
    }
    try {
      const result = await getAnalyticsScore(entityType, entityId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch analytics score';
      const statusCode = message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });
}
