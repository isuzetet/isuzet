import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { reportFuelPrice, getFuelStations } from '../services/fuel-report.service.js';

const ReportFuelPriceSchema = z.object({
  dieselPriceEtbPerLiter: z.number().positive(),
  petrolPriceEtbPerLiter: z.number().positive().optional(),
  region: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export default async function fuelReportRoutes(fastify: FastifyInstance) {
  // POST /api/v1/fuel/report — DRIVER auth, no trip required
  fastify.post<{ Body: z.infer<typeof ReportFuelPriceSchema> }>(
    '/report',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const body = ReportFuelPriceSchema.parse(request.body);
        const user = (request as any).user;

        const snapshotId = await reportFuelPrice({
          driverId: user.sub,
          dieselPriceEtbPerLiter: body.dieselPriceEtbPerLiter,
          petrolPriceEtbPerLiter: body.petrolPriceEtbPerLiter,
          region: body.region,
          lat: body.lat,
          lng: body.lng,
        });

        return { success: true, data: { snapshotId } };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'REPORT_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/fuel/stations?zoneId= — any auth
  fastify.get<{ Querystring: { zoneId?: string } }>(
    '/stations',
    { preHandler: (fastify as any).requireRole(
      Object.values(ROLES) as string[]
    ) },
    async (request, reply) => {
      try {
        const { zoneId } = request.query;

        const stations = await getFuelStations(zoneId);

        return { success: true, data: stations };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );
}
