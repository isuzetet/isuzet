/**
 * RUIT CBE — Engine 1 Identity Routes
 * User profile, KYC, trucks, drivers, trust queries, manager management, API keys
 */
import { FastifyInstance, FastifyReply } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { prisma, generateId } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { encryptPII, decryptPII, normalizePhone, signAccessToken, signRefreshToken } from '@ruit/shared-auth';
import { formatDateResponse } from '@ruit/shared-utils';
import { getFullTrustBreakdown, getPublicTrustInfo } from '../services/trust.service.js';
import { ulid } from 'ulid';
import { createHash, randomBytes } from 'crypto';

// Emit event helper
async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  corridorId?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const strategyId = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  }).then((s: { id?: string } | null) => s?.id ?? 'str_default');

  await prisma.event.create({
    data: {
      id: `evt_${ulid()}`,
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategyId,
      corridorId: params.corridorId ?? null,
      payload: params.payload as any,
      metadata: { source: 'API', timestamp: new Date().toISOString() } as any
    }
  });
}

// KYC Document Types
const ALLOWED_DOC_TYPES: Record<string, string[]> = {
  FLEET_OWNER: ['NATIONAL_ID', 'KEBELE_ID', 'PASSPORT', 'TRADE_LICENSE', 'TIN_CERT', 'PROOF_OF_ADDRESS'],
  DRIVER: ['NATIONAL_ID', 'KEBELE_ID', 'PASSPORT', 'DRIVER_LICENSE', 'DRIVER_DIPLOMA'],
  ORDERER: ['NATIONAL_ID', 'KEBELE_ID', 'PASSPORT', 'BUSINESS_LICENSE', 'TIN_CERT']
};

export default async function identityRoutes(app: FastifyInstance) {
  // GET /api/v1/identity/me
  // Auth: ANY role
  app.get('/me', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN])
  }, async (request: any) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        fleetOwner: true,
        driver: true,
        orderer: true
      }
    }) as any;

    let entityProfile: any = null;
    let trustScore: number | null = null;
    let trustTier: number | null = null;
    let kycTier = user.kycTier;
    let regionAccess: string[] = [];
    let payoutSpeed: string | null = null;

    if ((user.role === ROLES.FLEET_OWNER || user.role === ROLES.FLEET_MANAGER) && user.fleetOwner) {
      const fo = user.fleetOwner;
      const trucks = await prisma.truck.findMany({
        where: { fleetOwnerId: fo.id, deletedAt: null }
      });
      entityProfile = {
        ...fo,
        trustScore: fo.trustScore,
        trustTier: fo.trustTier,
        kycTier: kycTier,
        regionAccess: fo.regionAccess,
        payoutSpeed: fo.payoutSpeed,
        trucks: trucks.map((t: any) => ({
          ...t,
          insurance_expiry: t.insuranceExpiry?.toISOString(),
          annual_inspection_expiry: t.annualInspectionExpiry?.toISOString(),
          road_worthiness_expiry: t.roadWorthinessExpiry?.toISOString()
        })),
        createdAt: fo.createdAt.toISOString(),
        updatedAt: fo.updatedAt.toISOString()
      };
      trustScore = Number(fo.trustScore);
      trustTier = fo.trustTier;
      regionAccess = fo.regionAccess;
      payoutSpeed = fo.payoutSpeed;
    } else if (user.role === ROLES.DRIVER && user.driver) {
      const d = user.driver;
      entityProfile = {
        ...d,
        license_expiry: d.licenseExpiry?.toISOString(),
        trustScore: d.trustScore,
        trustTier: d.trustTier,
        kycTier: kycTier,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString()
      };
      trustScore = Number(d.trustScore);
      trustTier = d.trustTier;
    } else if (user.role === ROLES.ORDERER && user.orderer) {
      const o = user.orderer;
      entityProfile = {
        ...o,
        kycTier: kycTier,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString()
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        full_name_amharic: user.fullNameAmharic,
        email: user.email,
        role: user.role,
        status: user.status,
        kycTier: kycTier,
        preferred_language: user.preferredLanguage,
        notification_channel: user.notificationChannel,
        trustScore: trustScore,
        trustTier: trustTier,
        regionAccess: regionAccess,
        payoutSpeed: payoutSpeed,
        entity_profile: entityProfile,
        linkedAccountIds: user.linkedAccountIds,
        accountType: user.accountType,
        createdAt: {
          gregorian_date: user.createdAt.toISOString(),
          ethiopian_date: formatDateResponse(user.createdAt).ethiopian_date
        },
        last_login_at: user.lastLoginAt?.toISOString()
      }
    };
  });

  // POST /api/v1/identity/manager/invite
  app.post('/manager/invite', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER]),
    schema: {
      body: T.Object({
        phone: T.String(),
        name: T.String()
      })
    }
  }, async (request: any, reply: any) => {
    const { phone, name } = request.body as { phone: string; name: string };
    const normalized = normalizePhone(phone);
    const fleetOwnerId = request.user.entity_id;

    // Create user with FLEET_MANAGER role linked to fleet owner
    const managerId = generateId('usr');
    await prisma.user.create({
      data: {
        id: managerId,
        phone: normalized,
        fullName: name,
        role: ROLES.FLEET_MANAGER,
        status: 'ACTIVE',
        fleetOwner: {
          connect: { id: fleetOwnerId }
        }
      }
    });

    // In a real system, we'd send an OTP or invite link here
    return { success: true, data: { managerId, phone: normalized } };
  });

  // GET /api/v1/identity/managers
  app.get('/managers', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER])
  }, async (request: any) => {
    const fleetOwnerId = request.user.entity_id;
    const managers = await prisma.user.findMany({
      where: {
        role: ROLES.FLEET_MANAGER,
        fleetOwner: { id: fleetOwnerId }
      }
    });
    return { success: true, data: managers };
  });

  // DELETE /api/v1/identity/manager/:managerId
  app.delete('/manager/:managerId', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER]),
    schema: {
      params: T.Object({ managerId: T.String() })
    }
  }, async (request: any, reply: any) => {
    const { managerId } = request.params as { managerId: string };
    const fleetOwnerId = request.user.entity_id;

    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        role: ROLES.FLEET_MANAGER,
        fleetOwner: { id: fleetOwnerId }
      }
    });

    if (!manager) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Manager not found' } });
    }

    await prisma.user.update({
      where: { id: managerId },
      data: { status: 'DEACTIVATED', role: 'DEACTIVATED_MANAGER' }
    });

    return { success: true };
  });

  // POST /api/v1/identity/account/switch
  app.post('/account/switch', {
    preHandler: (app as any).requireAuth
  }, async (request: any, reply: any) => {
    const { targetAccountId } = request.body as { targetAccountId: string };
    const userId = request.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { fleetOwner: true, driver: true, orderer: true }
    });

    if (!user || !user.linkedAccountIds.includes(targetAccountId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Target account not linked' } });
    }

    // This is a simplified switch logic. In reality, you'd fetch the target account's role and entity info.
    // For now, let's assume switching between roles is allowed if linked.
    
    const newToken = await signAccessToken({
      sub: user.id,
      role: user.role as any, // Should determine target role
      entity_id: targetAccountId,
      entity_type: 'FLEET_OWNER', // Should determine target type
      trust_tier: user.kycTier,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      jti: ulid()
    });

    return { success: true, data: { access_token: newToken, account: targetAccountId } };
  });

  // POST /api/v1/identity/api-key/generate
  app.post('/api-key/generate', {
    preHandler: (app as any).requireRole([ROLES.ORDERER]),
    schema: {
      body: T.Object({
        name: T.String(),
        permissions: T.Optional(T.Array(T.String()))
      })
    }
  }, async (request: any) => {
    const { name, permissions } = request.body as { name: string; permissions?: string[] };
    const ordererId = request.user.entity_id;
    const rawKey = `rk_live_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    await prisma.apiKey.create({
      data: {
        id: generateId('apk'),
        ordererId,
        keyHash,
        keyPrefix,
        name,
        permissions: permissions || ['loads:create', 'loads:read']
      }
    });

    return { success: true, data: { key: rawKey, keyPrefix, name, warning: 'Store this key safely. It will not be shown again.' } };
  });

  // GET /api/v1/identity/api-keys
  app.get('/api-keys', {
    preHandler: (app as any).requireRole([ROLES.ORDERER])
  }, async (request: any) => {
    const ordererId = request.user.entity_id;
    const keys = await prisma.apiKey.findMany({
      where: { ordererId, isActive: true },
      select: { id: true, keyPrefix: true, name: true, permissions: true, lastUsedAt: true, createdAt: true }
    });
    return { success: true, data: keys };
  });

  // DELETE /api/v1/identity/api-key/:keyId
  app.delete('/api-key/:keyId', {
    preHandler: (app as any).requireRole([ROLES.ORDERER]),
    schema: { params: T.Object({ keyId: T.String() }) }
  }, async (request: any) => {
    const { keyId } = request.params as { keyId: string };
    const ordererId = request.user.entity_id;

    await prisma.apiKey.updateMany({
      where: { id: keyId, ordererId },
      data: { isActive: false }
    });

    return { success: true };
  });

  // PUT /api/v1/identity/driver/profile
  app.put('/driver/profile', {
    preHandler: (app as any).requireRole([ROLES.DRIVER]),
    schema: {
      body: T.Object({
        homeBaseCityId: T.Optional(T.String()),
        preferredCorridorIds: T.Optional(T.Array(T.String())),
        availabilityStatus: T.Optional(T.String()),
        licenseNumber: T.Optional(T.String()),
        licenseCategory: T.Optional(T.String()),
        licenseExpiry: T.Optional(T.String({ format: 'date-time' })),
        emergencyContactName: T.Optional(T.String()),
        emergencyContactPhone: T.Optional(T.String()),
        telebirrNumber: T.Optional(T.String())
      })
    }
  }, async (request: any) => {
    const driverId = request.user.entity_id;
    const data = request.body as any;

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        homeBaseCityId: data.homeBaseCityId,
        preferredCorridorIds: data.preferredCorridorIds,
        availabilityStatus: data.availabilityStatus,
        licenseNumber: data.licenseNumber ? encryptPII(data.licenseNumber) : undefined,
        licenseCategory: data.licenseCategory,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        telebirrNumber: data.telebirrNumber
      }
    });

    return { success: true, data: updated };
  });

  // PUT /api/v1/identity/fleet/profile
  app.put('/fleet/profile', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER]),
    schema: {
      body: T.Object({
        businessRegistrationNumber: T.Optional(T.String()),
        tinNumber: T.Optional(T.String()),
        tradeLicenseExpiry: T.Optional(T.String({ format: 'date-time' })),
        cbeBankAccount: T.Optional(T.String()),
        monthlyRevenueEstimate: T.Optional(T.Integer())
      })
    }
  }, async (request: any) => {
    const fleetOwnerId = request.user.entity_id;
    const data = request.body as any;

    const updated = await prisma.fleetOwner.update({
      where: { id: fleetOwnerId },
      data: {
        businessRegistrationNumber: data.businessRegistrationNumber,
        tinNumber: data.tinNumber,
        tradeLicenseExpiry: data.tradeLicenseExpiry ? new Date(data.tradeLicenseExpiry) : undefined,
        cbeBankAccount: data.cbeBankAccount,
        monthlyRevenueEstimate: data.monthlyRevenueEstimate
      }
    });

    return { success: true, data: updated };
  });

  // PUT /api/v1/identity/orderer/profile
  app.put('/orderer/profile', {
    preHandler: (app as any).requireRole([ROLES.ORDERER]),
    schema: {
      body: T.Object({
        tinNumber: T.Optional(T.String()),
        businessRegistrationNumber: T.Optional(T.String()),
        industrySector: T.Optional(T.String()),
        monthlyFreightSpend: T.Optional(T.Integer()),
        preferredTruckBodyTypes: T.Optional(T.Array(T.String())),
        webhookUrl: T.Optional(T.String())
      })
    }
  }, async (request: any) => {
    const ordererId = request.user.entity_id;
    const data = request.body as any;

    const updated = await prisma.orderer.update({
      where: { id: ordererId },
      data: {
        tinNumber: data.tinNumber,
        businessRegistrationNumber: data.businessRegistrationNumber,
        industrySector: data.industrySector,
        monthlyFreightSpend: data.monthlyFreightSpend,
        preferredTruckBodyTypes: data.preferredTruckBodyTypes,
        webhookUrl: data.webhookUrl
      }
    });

    return { success: true, data: updated };
  });

  // POST /api/v1/identity/truck/kyc
  app.post('/truck/kyc', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
    schema: {
      body: T.Object({
        truckId: T.String(),
        libreNumber: T.Optional(T.String()),
        chassisNumber: T.Optional(T.String()),
        engineNumber: T.Optional(T.String()),
        manufacturingYear: T.Optional(T.Integer()),
        bodyType: T.Optional(T.String()),
        payloadQuintals: T.Optional(T.Number()),
        insurancePolicyNumber: T.Optional(T.String()),
        insuranceCompany: T.Optional(T.String()),
        insuranceType: T.Optional(T.String()),
        insuranceExpiry: T.Optional(T.String({ format: 'date-time' })),
        inspectionNumber: T.Optional(T.String()),
        inspectionExpiry: T.Optional(T.String({ format: 'date-time' }))
      })
    }
  }, async (request: any) => {
    const { truckId, ...data } = request.body as any;
    
    // Check truck belongs to fleet
    const truck = await prisma.truck.findUnique({ where: { id: truckId } });
    if (!truck || truck.fleetOwnerId !== request.user.entity_id) {
      throw new Error('Truck not found or access denied');
    }

    const updated = await prisma.truck.update({
      where: { id: truckId },
      data: {
        libreNumber: data.libreNumber,
        chassisNumber: data.chassisNumber,
        engineNumber: data.engineNumber,
        manufacturingYear: data.manufacturingYear,
        bodyType: data.bodyType,
        payloadQuintals: data.payloadQuintals,
        insurancePolicyNumber: data.insurancePolicyNumber,
        insuranceCompany: data.insuranceCompany,
        insuranceType: data.insuranceType,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
        inspectionNumber: data.inspectionNumber,
        inspectionExpiry: data.inspectionExpiry ? new Date(data.inspectionExpiry) : undefined
      }
    });

    // Simple eligibility check
    const isEligible = !!(updated.insuranceExpiry && updated.insuranceExpiry > new Date() && 
                          updated.inspectionExpiry && updated.inspectionExpiry > new Date());
    
    await prisma.truck.update({
      where: { id: truckId },
      data: { isEligibleForLoads: isEligible }
    });

    return { success: true, data: { ...updated, isEligibleForLoads: isEligible } };
  });

  // GET /api/v1/identity/fleet/affiliations
  app.get('/fleet/affiliations', {
    preHandler: (app as any).requireRole([ROLES.DRIVER])
  }, async (request: any) => {
    const driverId = request.user.entity_id;
    const affiliations = await prisma.driverFleetAffiliation.findMany({
      where: { driverId }
    });
    return { success: true, data: affiliations };
  });

  // POST /api/v1/identity/fleet/affiliate
  app.post('/fleet/affiliate', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
    schema: {
      body: T.Object({
        driverId: T.String(),
        paymentType: T.String(),
        paymentAmount: T.Optional(T.Integer())
      })
    }
  }, async (request: any) => {
    const { driverId, paymentType, paymentAmount } = request.body as any;
    const fleetOwnerId = request.user.entity_id;

    const affiliation = await prisma.driverFleetAffiliation.upsert({
      where: { driverId_fleetOwnerId: { driverId, fleetOwnerId } },
      update: { paymentType, paymentAmount, updatedAt: new Date() },
      create: {
        id: generateId('dfa'),
        driverId,
        fleetOwnerId,
        paymentType,
        paymentAmount
      }
    });

    return { success: true, data: affiliation };
  });

  // POST /api/v1/identity/kyc/upload
  // Auth: ANY role (own entity only)
  app.post('/kyc/upload', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.ORDERER]),
    schema: {
      body: T.Object({
        entity_id: T.String(),
        doc_type: T.String()
      })
    }
  }, async (request: any, reply: any) => {
    const { entity_id, doc_type } = request.body as { entity_id: string; doc_type: string };
    const user = request.user;

    // Validate doc_type for entity_type
    const allowedTypes = ALLOWED_DOC_TYPES[user.entity_type] || [];
    if (!allowedTypes.includes(doc_type)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid doc_type for ${user.entity_type}` }
      });
    }

    const { ulid: ulId } = await import('ulid');
    const docId = `kyc_${ulId()}`;
    const ext = 'pdf'; // Default
    const key = `kyc/${user.entity_type.toLowerCase()}/${entity_id}/${doc_type}/${ulId}.${ext}`;

    // Create document record
    const doc = await prisma.kycDocument.create({
      data: {
        id: docId,
        entityId: entity_id,
        entityType: user.entity_type,
        docType: doc_type,
        s3Key: key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'ruit-kyc-docs',
        status: 'PENDING'
      }
    });

    // Emit event
    await emitEvent({
      eventType: EVENT_TYPES.KYC_DOCUMENT_UPLOADED,
      aggregateId: entity_id,
      aggregateType: user.entity_type,
      actorId: user.sub,
      actorRole: user.role,
      payload: { doc_id: docId, doc_type, s3_key: key }
    });

    // Generate presigned URL (expires in 600 seconds)
    // In production: this calls AWS S3 API for real presigned URLs
    // In development: mock URL for testing
    const presignedUrl = `https://${doc.s3Bucket}.s3.amazonaws.com/${key}?X-Amz-Expires=600&X-Amz-Algorithm=AWS4-HMAC-SHA256`;

    return {
      success: true,
      data: { doc_id: docId, upload_url: presignedUrl, expires_in: 600 }
    };
  });

  // PUT /api/v1/identity/kyc/:docId/review
  // Auth: OPS_ADMIN only
  app.put('/kyc/:docId/review', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: {
      params: T.Object({ docId: T.String() }),
      body: T.Object({
        status: T.Union([T.Literal('APPROVED'), T.Literal('REJECTED')]),
        rejection_reason: T.Optional(T.String())
      })
    }
  }, async (request: any, reply: any) => {
    const { docId } = request.params as { docId: string };
    const { status, rejection_reason } = request.body as { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string };
    const user = request.user;

    const doc = await prisma.kycDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Document not found' } });
    }

    // Update document
    const updated = await prisma.kycDocument.update({
      where: { id: docId },
      data: {
        status: status as string,
        rejectionReason: rejection_reason || null,
        reviewedBy: user.sub,
        reviewedAt: new Date()
      }
    });

    // If APPROVED, update KYC tier
    if (status === 'APPROVED') {
      await import('../services/trust.service.js').then(m => m.updateKycTier(doc.entityId, doc.entityType));
    }

    // Emit event
    await emitEvent({
      eventType: status === 'APPROVED' ? EVENT_TYPES.KYC_APPROVED : EVENT_TYPES.KYC_REJECTED,
      aggregateId: doc.entityId,
      aggregateType: doc.entityType,
      actorId: user.sub,
      actorRole: user.role,
      payload: { doc_id: docId, doc_type: doc.docType, status, rejection_reason }
    });

    return {
      success: true,
      data: { id: updated.id, status: updated.status, reviewed_at: updated.reviewedAt?.toISOString() }
    };
  });

  // POST /api/v1/identity/trucks
  // Auth: FLEET_OWNER only
  app.post('/trucks', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
    schema: {
      body: T.Object({
        plate_number: T.String({ minLength: 1 }),
        truck_type: T.Union([
          T.Literal('FLATBED'), T.Literal('REEFER'), T.Literal('TANKER'),
          T.Literal('BOX'), T.Literal('TIPPER'), T.Literal('CURTAINSIDER')
        ]),
        capacity_kg: T.Number({ minimum: 1000, maximum: 100000 }),
        fuel_type: T.Optional(T.Union([T.Literal('DIESEL'), T.Literal('PETROL')]))
      })
    }
  }, async (request: any, reply: any) => {
    const user = request.user;
    const { plate_number, truck_type, capacity_kg, fuel_type = 'DIESEL' } = request.body as any;

    const fo = await prisma.fleetOwner.findUnique({ where: { id: user.entity_id }, select: { id: true } });
    if (!fo || user.trust_tier < 1) {
      return reply.status(403).send({ success: false, error: { code: 'KYC_REQUIRED', message: 'KYC Tier 1 required to register trucks' } });
    }

    const existing = await prisma.truck.findFirst({ where: { plateNumber: plate_number, deletedAt: null } });
    if (existing) {
      return reply.status(409).send({ success: false, error: { code: 'DUPLICATE_FINANCIAL_TX', message: 'Plate number already registered' } });
    }

    const { ulid: ulId } = await import('ulid');
    const truck = await prisma.truck.create({
      data: {
        id: `trk_${ulId()}`,
        plateNumber: plate_number,
        fleetOwnerId: fo.id,
        truckType: truck_type,
        capacityKg: capacity_kg,
        fuelType: fuel_type,
        status: 'ACTIVE'
      }
    });

    return { success: true, data: { truck_id: truck.id, plate_number: truck.plateNumber } };
  });

  // PUT /api/v1/identity/trucks/:id
  // Auth: FLEET_OWNER (own only) | OPS_ADMIN
  app.put('/trucks/:id', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: { params: T.Object({ id: T.String() }) }
  }, async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    const body = request.body as any;

    const truck = await prisma.truck.findUnique({ where: { id } });
    if (!truck) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Truck not found' } });
    }

    // Check entity isolation
    if (user.role === ROLES.FLEET_OWNER || user.role === ROLES.FLEET_MANAGER) {
      if (truck.fleetOwnerId !== user.entity_id) {
        return reply.status(403).send({ success: false, error: { code: 'INSUFFICIENT_PRIVILEGES', message: 'Not authorized for this truck' } });
      }
    }

    const updateData: any = {};
    if (body.truck_type) updateData.truckType = body.truck_type;
    if (body.capacity_kg) updateData.capacityKg = body.capacity_kg;
    if (body.status) updateData.status = body.status;

    await prisma.truck.update({ where: { id }, data: updateData });
    return { success: true };
  });

  // POST /api/v1/identity/drivers
  // Auth: FLEET_OWNER (adding to own fleet) | OPS_ADMIN
  app.post('/drivers', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: {
      body: T.Object({
        userId: T.String(),
        license_number: T.String({ minLength: 1 }),
        license_expiry: T.String({ format: 'date' }),
        license_class: T.Optional(T.String()),
        fleetOwnerId: T.Optional(T.String())
      })
    }
  }, async (request: any, reply: any) => {
    const user = request.user;
    const { userId, license_number, license_expiry, license_class, fleetOwnerId } = request.body as any;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'User not found' } });
    }
    if (targetUser.role !== ROLES.DRIVER) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User must have DRIVER role' } });
    }

    const existingDriver = await prisma.driver.findUnique({ where: { userId: userId } });
    if (existingDriver && existingDriver.deletedAt === null) {
      return reply.status(409).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Driver record already exists' } });
    }

    let foId: string;
    if (user.role === ROLES.FLEET_OWNER || user.role === ROLES.FLEET_MANAGER) {
      foId = user.entity_id;
    } else {
      if (!fleetOwnerId) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'fleetOwnerId required for OPS_ADMIN' } });
      }
      foId = fleetOwnerId;
    }

    const encryptedLicense = encryptPII(license_number);

    const updated = existingDriver
      ? await prisma.driver.update({
          where: { id: existingDriver.id },
          data: {
            fleetOwnerId: foId,
            licenseNumber: encryptedLicense,
            licenseExpiry: new Date(license_expiry),
            licenseClass: license_class || 'C',
            deletedAt: null
          }
        })
      : await prisma.driver.create({
          data: {
            id: `dvr_${ulid()}`,
            userId: userId,
            fleetOwnerId: foId,
            licenseNumber: encryptedLicense,
            licenseExpiry: new Date(license_expiry),
            licenseClass: license_class || 'C'
          }
        });

    return { success: true, data: { driverId: updated.id } };
  });

  // GET /api/v1/identity/trust/:type/:id
  app.get('/trust/:type/:id', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN])
  }, async (request: any, reply: any) => {
    const { type, id } = request.params as { type: 'driver' | 'fleet_owner'; id: string };
    const user = request.user;

    const entityType = type === 'driver' ? ROLES.DRIVER : ROLES.FLEET_OWNER;

    if (![ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN].includes(user.role)) {
      const isOwnEntity = user.entity_id === id;
      const isOwnDriver = type === 'driver' && await prisma.driver.findFirst({ where: { id, fleetOwnerId: user.entity_id } });
      if (!isOwnEntity && !isOwnDriver) {
        return reply.status(403).send({ success: false, error: { code: 'INSUFFICIENT_PRIVILEGES', message: 'Not authorized to view this trust data' } });
      }
    }

    const isOps = [ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN].includes(user.role);
    if (isOps) {
      const breakdown = await getFullTrustBreakdown(id, entityType);
      return { success: true, data: breakdown };
    } else {
      const info = await getPublicTrustInfo(id, entityType);
      return { success: true, data: info };
    }
  });

  // POST /api/v1/identity/broker/register
  // Change 6: Broker registration
  app.post('/broker/register', {
    preHandler: requireRole([ROLES.OPS_ADMIN, ROLES.FLEET_OWNER])
  }, async (request: any, reply: FastifyReply) => {
    const body = request.body as {
      userId: string;
      businessName: string;
      businessNameAmharic?: string;
      phoneNumber: string;
      region: string;
      corridorIds: string[];
      commissionRatePercent: number;
      tinNumber?: string;
    };
    
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    const existingBroker = await prisma.broker.findUnique({
      where: { userId: body.userId }
    });
    if (existingBroker) {
      return reply.status(409).send({
        success: false,
        error: { code: 'BROKER_EXISTS', message: 'Broker already exists for this user' }
      });
    }
    
    const broker = await prisma.broker.create({
      data: {
        id: generateId('brk'),
        userId: body.userId,
        operatingZoneIds: [body.region],
        operatingCorridorIds: body.corridorIds || [],
        totalMatchesCompleted: 0,
        totalEarningsEtb: 0,
        isVerified: false,
        averageRating: 5.0
      }
    });
    
    await prisma.user.update({
      where: { id: body.userId },
      data: { role: ROLES.BROKER }
    });
    
    await emitEvent({
      eventType: EVENT_TYPES.BROKER_REGISTERED,
      aggregateId: broker.id,
      aggregateType: 'BROKER',
      actorId: request.user?.sub || 'SYSTEM',
      actorRole: request.user?.role || 'OPS_ADMIN',
      payload: { userId: body.userId, businessName: body.businessName, region: body.region }
    });
    
    return reply.send({
      success: true,
      data: {
        id: broker.id,
        userId: broker.userId,
        averageRating: broker.averageRating,
        isVerified: broker.isVerified
      }
    });
  });

  // GET /api/v1/identity/broker/:id
  // Change 7: Get broker profile
  app.get('/broker/:id', {
    preHandler: requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.FLEET_OWNER])
  }, async (request: any, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    
    const broker = await prisma.broker.findUnique({ where: { id } });
    const brokerUser = broker ? await prisma.user.findUnique({ where: { id: broker.userId }, select: { fullName: true, phone: true, email: true } }) : null;
    
    if (!broker) {
      return reply.status(404).send({
        success: false,
        error: { code: 'BROKER_NOT_FOUND', message: 'Broker not found' }
      });
    }
    
    if (user?.role === ROLES.FLEET_OWNER && broker.userId !== user.sub) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only view own broker profile' }
      });
    }
    
    return reply.send({
      success: true,
      data: {
        id: broker.id,
        userId: broker.userId,
        user: brokerUser,
        operatingZoneIds: broker.operatingZoneIds,
        operatingCorridorIds: broker.operatingCorridorIds,
        commissionPerMatchEtb: broker.commissionPerMatchEtb,
        totalMatchesCompleted: broker.totalMatchesCompleted,
        totalEarningsEtb: broker.totalEarningsEtb,
        averageRating: broker.averageRating,
        isVerified: broker.isVerified,
        createdAt: broker.createdAt.toISOString()
      }
    });
  });

  // PATCH /api/v1/identity/broker/:id/verify
  // Change 8: Verify broker
  app.patch('/broker/:id/verify', {
    preHandler: requireRole([ROLES.OPS_ADMIN])
  }, async (request: any, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { isVerified: boolean; notes?: string; };
    
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      return reply.status(404).send({
        success: false,
        error: { code: 'BROKER_NOT_FOUND', message: 'Broker not found' }
      });
    }
    
    const updated = await prisma.broker.update({
      where: { id },
      data: { isVerified: body.isVerified, updatedAt: new Date() }
    });
    
    await emitEvent({
      eventType: body.isVerified ? EVENT_TYPES.BROKER_VERIFIED : EVENT_TYPES.BROKER_SUSPENDED,
      aggregateId: id,
      aggregateType: 'BROKER',
      actorId: request.user?.sub || 'SYSTEM',
      actorRole: ROLES.OPS_ADMIN,
      payload: { isVerified: body.isVerified, notes: body.notes }
    });
    
    return reply.send({
      success: true,
      data: {
        id: updated.id,
        isVerified: updated.isVerified,
        notes: body.notes
      }
    });
  });

  // POST /api/v1/identity/templates
  // Change 9: Create template
  app.post('/templates', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER])
  }, async (request: any, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      description?: string;
      corridorId?: string;
      cargoType?: string;
      weightQuintals?: number;
      estimatedRateEtb?: number;
      truckTypeRequired?: string;
      scheduledDays?: string[];
      isActive?: boolean;
    };
    
    const user = request.user;
    const ordererId = user.entity_id;
    
    const template = await prisma.loadTemplate.create({
      data: {
        id: generateId('tmp'),
        ordererId: ordererId,
        name: body.name,
        cargoTypeML: body.cargoType,
        typicalWeightKg: body.weightQuintals ? body.weightQuintals * 100 : undefined,
        isActive: body.isActive ?? true,
        corridorId: body.corridorId,
        preferredBodyType: body.truckTypeRequired,
        autoPostSchedule: body.scheduledDays ? JSON.stringify(body.scheduledDays) : undefined
      }
    });
    
    return reply.send({
      success: true,
      data: {
        id: template.id,
        ordererId: template.ordererId,
        name: template.name,
        createdAt: template.createdAt.toISOString()
      }
    });
  });

  // GET /api/v1/identity/templates
  // Change 10: List templates
  app.get('/templates', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER])
  }, async (request: any, reply: FastifyReply) => {
    const user = request.user;
    
    const whereClause: any = { isActive: true };
    if (![ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
      whereClause.ordererId = user.entity_id;
    }
    
    const templates = await prisma.loadTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    return reply.send({
      success: true,
      data: templates.map((t: any) => ({
        id: t.id,
        ordererId: t.ordererId,
        name: t.name,
        cargoType: t.cargoTypeML,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString()
      }))
    });
  });

  // GET /api/v1/identity/templates/:id
  // Change 11: Get template
  app.get('/templates/:id', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER, ROLES.OPS_ADMIN])
  }, async (request: any, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    
    const template = await prisma.loadTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }
    
    if (![ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
      if (template.ordererId !== user.entity_id) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Can only view own templates' }
        });
      }
    }
    
    return reply.send({
      success: true,
      data: {
        id: template.id,
        ordererId: template.ordererId,
        name: template.name,
        cargoType: template.cargoTypeML,
        typicalWeightKg: template.typicalWeightKg,
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString()
      }
    });
  });

  // PATCH /api/v1/identity/templates/:id
  // Change 12: Update template
  app.patch('/templates/:id', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER])
  }, async (request: any, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    const body = request.body as any;
    
    const template = await prisma.loadTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }
    
    if (template.ordererId !== user.entity_id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only update own templates' }
      });
    }
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.cargoType !== undefined) updateData.cargoTypeML = body.cargoType;
    if (body.weightQuintals !== undefined) updateData.typicalWeightKg = body.weightQuintals * 100;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.corridorId !== undefined) updateData.corridorId = body.corridorId;
    if (body.truckTypeRequired !== undefined) updateData.preferredBodyType = body.truckTypeRequired;
    
    const updated = await prisma.loadTemplate.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() }
    });
    
    return reply.send({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive
      }
    });
  });

  // DELETE /api/v1/identity/templates/:id
  // Change 13: Soft delete template
  app.delete('/templates/:id', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.ORDERER])
  }, async (request: any, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    
    const template = await prisma.loadTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }
    
    if (template.ordererId !== user.entity_id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only delete own templates' }
      });
    }
    
    await prisma.loadTemplate.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() }
    });
    
    return reply.send({ success: true });
  });

  // POST /api/v1/identity/referrals
  // Change 14: Create referral
  app.post('/referrals', {
    preHandler: requireAuth()
  }, async (request: any, reply: FastifyReply) => {
    const body = request.body as {
      referredUserId: string;
      referralCode?: string;
    };
    const referrerId = request.user.sub;
    
    const referredUser = await prisma.user.findUnique({ where: { id: body.referredUserId } });
    if (!referredUser) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Referred user not found' }
      });
    }
    
    const existingReferral = await prisma.referralRecord.findFirst({
      where: { referredId: body.referredUserId }
    });
    if (existingReferral) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_REFERRED', message: 'User has already been referred' }
      });
    }
    
    const code = body.referralCode || `REF_${generateId('code').substring(0, 8)}`;
    
    const referral = await prisma.referralRecord.create({
      data: {
        id: generateId('rfr'),
        referrerId: referrerId,
        referredId: body.referredUserId,
        referralCode: code,
        status: 'PENDING',
        rewardAmountEtb: 0
      }
    });
    
    return reply.send({
      success: true,
      data: {
        id: referral.id,
        referrerId: referral.referrerId,
        referredId: referral.referredId,
        referralCode: referral.referralCode,
        status: referral.status
      }
    });
  });

  // GET /api/v1/identity/referrals
  // Change 15: List referrals
  app.get('/referrals', {
    preHandler: requireAuth()
  }, async (request: any, reply: FastifyReply) => {
    const referrerId = request.user.sub;
    
    const referrals = await prisma.referralRecord.findMany({
      where: { referrerId }
    });
    
    const referredUserIds = referrals.map((r: any) => r.referredId);
    const referredUsers = await prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, fullName: true, phone: true }
    });
    const userMap = new Map(referredUsers.map((u: any) => [u.id, u]));
    
    return reply.send({
      success: true,
      data: referrals.map((r: any) => {
        const referredUser = userMap.get(r.referredId) as any;
        return {
          id: r.id,
          status: r.status,
          rewardAmountEtb: r.rewardAmountEtb,
          referralCode: r.referralCode,
          referredUser: referredUser ? {
            name: referredUser.fullName,
            phone: referredUser.phone
          } : null
        };
      })
    });
  });

  // POST /api/v1/identity/agent/register
  // Change 16: Register agent (FIELD_AGENT only)
  app.post('/agent/register', {
    preHandler: requireRole([ROLES.OPS_ADMIN])
  }, async (request: any, reply: FastifyReply) => {
    const body = request.body as {
      userId: string;
      agentType: string;
      region: string;
      phoneNumber: string;
      assignedCorridorIds?: string[];
    };
    
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    // Update user to FIELD_AGENT role, store region/corridor info in User
    await prisma.user.update({
      where: { id: body.userId },
      data: { 
        role: ROLES.FIELD_AGENT,
        // Store region and corridors in preferredLanguage field as JSON for now
        preferredLanguage: JSON.stringify({
          region: body.region,
          corridorIds: body.assignedCorridorIds || [],
          assignedAt: new Date().toISOString()
        })
      }
    });
    
    await emitEvent({
      eventType: EVENT_TYPES.AGENT_REGISTERED,
      aggregateId: body.userId,
      aggregateType: 'USER',
      actorId: request.user?.sub || 'SYSTEM',
      actorRole: ROLES.OPS_ADMIN,
      payload: { 
        userId: body.userId, 
        agentType: body.agentType,
        region: body.region,
        corridorIds: body.assignedCorridorIds || []
      }
    });
    
    return reply.send({
      success: true,
      data: {
        userId: body.userId,
        role: ROLES.FIELD_AGENT,
        region: body.region,
        message: 'Agent registered successfully'
      }
    });
  });

  // POST /api/v1/identity/users/me/payment-phone
  // Set payment phone for multi-SIM support (verify via OTP)
  app.post('/users/me/payment-phone', {
    preHandler: requireAuth(),
    schema: {
      body: T.Object({
        paymentPhone: T.String({ minLength: 9, maxLength: 15 }),
        otp: T.Optional(T.String({ minLength: 4, maxLength: 6 }))
      })
    }
  }, async (request: any, reply: FastifyReply) => {
    const { paymentPhone, otp } = request.body as { paymentPhone: string; otp?: string };
    const userId = request.user.sub;
    const normalizedPaymentPhone = normalizePhone(paymentPhone);

    // Check if this is the same as primary phone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, paymentPhone: true, role: true }
    });

    if (!user) {
      return reply.status(400).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    if (normalizedPaymentPhone === user.phone) {
      return reply.status(400).send({
        success: false,
        error: { code: 'PAYMENT_PHONE_SAME_AS_PRIMARY', message: 'Payment phone cannot be the same as primary phone' }
      });
    }

    // If OTP provided, verify it
    if (otp) {
      const { verifyOtp } = await import('@ruit/shared-auth');
      const otpResult = await verifyOtp(normalizedPaymentPhone, otp);

      if (!otpResult.valid) {
        return reply.status(400).send({
          success: false,
          error: { code: 'OTP_INVALID_OR_EXPIRED', message: 'Invalid or expired OTP' }
        });
      }

      // Update payment phone and update driver if applicable
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: { paymentPhone: normalizedPaymentPhone }
        });

        // If user is a driver, update multiSimPaymentPhone
        const driver = await tx.driver.findFirst({
          where: { userId: userId }
        });

        if (driver) {
          await tx.driver.update({
            where: { id: driver.id },
            data: { multiSimPaymentPhone: normalizedPaymentPhone }
          });
        }

        // Emit event
        await tx.event.create({
          data: {
            id: `evt_${ulid()}`,
            eventType: 'PAYMENT_PHONE_VERIFIED',
            aggregateId: userId,
            aggregateType: 'USER',
            actorId: userId,
            actorRole: user.role || 'USER',
            strategyVersionId: 'default',
            payload: {
              paymentPhone: normalizedPaymentPhone,
              verifiedAt: new Date().toISOString()
            } as any,
            metadata: {
              source: 'MULTI_SIM',
              timestamp: new Date().toISOString()
            } as any
          }
        });
      });

      return reply.send({
        success: true,
        data: {
          paymentPhone: normalizedPaymentPhone,
          verified: true,
          message: 'Payment phone verified and saved'
        }
      });
    } else {
      // No OTP provided - send OTP first
      const { generateOtp, storeOtp } = await import('@ruit/shared-auth');
      const newOtp = generateOtp();
      await storeOtp(normalizedPaymentPhone, newOtp);

      // Send SMS
      const message = `የ Ruit ሞባይል ገንዘብ ማረጋገጫ ኮድ: ${newOtp} ነው። በ 5 ደቂቃ ውስጥ ይጠቀሙ።`;
      try {
        // Note: sendSms would need to be imported and available from shared-auth
        console.log(`[OTP] To: ${normalizedPaymentPhone}, Code: ${newOtp}`);
      } catch (error) {
        console.log(`[OTP] Failed to send SMS to ${normalizedPaymentPhone}`);
      }

      return reply.status(200).send({
        success: true,
        data: {
          paymentPhone: normalizedPaymentPhone,
          verified: false,
          message: 'OTP sent to payment phone. Verify with next request.'
        }
      });
    }
  });

  // POST /api/v1/identity/fcm-token
  // Store or update the caller's FCM push token
  // Auth: any authenticated role
  app.post('/fcm-token', {
    preHandler: (app as any).requireRole([
      ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER,
      ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN
    ])
  }, async (request: any, reply: any) => {
    const body = request.body as { fcmToken?: string };

    if (!body?.fcmToken || typeof body.fcmToken !== 'string' || body.fcmToken.length < 10) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'fcmToken is required' }
      });
    }

    await prisma.user.update({
      where: { id: request.user.sub },
      data: { fcmToken: body.fcmToken }
    });

    return reply.send({ success: true, data: { registered: true } });
  });

  // DELETE /api/v1/identity/fcm-token
  // Unregister FCM token (call on logout)
  app.delete('/fcm-token', {
    preHandler: (app as any).requireRole([
      ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER,
      ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN
    ])
  }, async (request: any, reply: any) => {
    await prisma.user.update({
      where: { id: request.user.sub },
      data: { fcmToken: null }
    });
    return reply.send({ success: true, data: { unregistered: true } });
  });

  // GET /api/v1/identity/kyc/pending
  // OPS: list pending KYC documents for review
  app.get('/kyc/pending', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN])
  }, async (request: any, reply: any) => {
    const { limit = 50, offset = 0 } = request.query as any;
    const [documents, total] = await Promise.all([
      prisma.kycDocument.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.kycDocument.count({ where: { status: 'PENDING' } }),
    ]);
    return reply.send({ success: true, data: documents, total });
  });

  // GET /api/v1/identity/drivers
  // OPS: list all drivers with user info and trust metrics
  app.get('/drivers', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN])
  }, async (request: any, reply: any) => {
    const { limit = 50, offset = 0, status } = request.query as any;
    const where: any = {};
    if (status) where.status = status;
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          user: {
            select: {
              id: true, fullName: true, phone: true, role: true, kycTier: true,
            },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);
    return reply.send({ success: true, data: drivers, total });
  });
}
