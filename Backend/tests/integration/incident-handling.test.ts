import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@ruit/shared-db';

describe('Incident Handling and Escalation', () => {
  const baseUrl = 'http://localhost:3011/api/v1/incident';
  const internalSecret = process.env.INTERNAL_SECRET || 'test-secret';
  let tripId: string;
  let driverId: string;
  let loadId: string;

  beforeEach(async () => {
    // Create test load and trip
    const load = await prisma.load.create({
      data: {
        referenceId: `LOAD_${Date.now()}`,
        totalValue: 10000,
        itemCount: 5,
        status: 'ASSIGNED'
      }
    });
    loadId = load.id;

    // Create trip record (simplified)
    const trip = await prisma.trip.create({
      data: {
        referenceId: `TRIP_${Date.now()}`,
        status: 'IN_PROGRESS',
        driverId: 'drv_test123',
        loadId
      }
    });
    tripId = trip.id;
  });

  describe('Incident Creation', () => {
    it('should create a new incident', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'ACCIDENT',
          severity: 'MEDIUM',
          description: 'Minor vehicle collision at intersection',
          location: {
            latitude: 9.0320,
            longitude: 38.7469
          },
          reporterPhone: '+251911223344'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.incidentId).toBeDefined();
      expect(data.status).toBe('REPORTED');
      expect(data.createdAt).toBeDefined();
    });

    it('should reject incident creation without authorization', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          type: 'ACCIDENT',
          severity: 'MEDIUM',
          description: 'Test incident'
        })
      });

      expect(response.status).toBe(403);
    });

    it('should create incident with evidence', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'CARGO_DAMAGE',
          severity: 'HIGH',
          description: 'Cargo partially damaged during transit',
          evidence: [
            {
              type: 'PHOTO',
              url: 'https://example.com/incident-photo-1.jpg',
              description: 'Damaged cargo'
            },
            {
              type: 'PHOTO',
              url: 'https://example.com/incident-photo-2.jpg',
              description: 'Packaging damage'
            }
          ]
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.evidenceCount).toBe(2);
    });
  });

  describe('Incident Escalation', () => {
    let incidentId: string;

    beforeEach(async () => {
      // Create initial incident
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'ACCIDENT',
          severity: 'MEDIUM',
          description: 'Minor accident'
        })
      });

      const data = await response.json();
      incidentId = data.incidentId;
    });

    it('should escalate incident to higher severity', async () => {
      const response = await fetch(`${baseUrl}/${incidentId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          newSeverity: 'HIGH',
          reason: 'Additional injuries reported'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.severity).toBe('HIGH');
      expect(data.escalatedAt).toBeDefined();
    });

    it('should notify stakeholders on escalation', async () => {
      const response = await fetch(`${baseUrl}/${incidentId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          newSeverity: 'CRITICAL',
          reason: 'Severe cargo damage',
          notifyParties: ['FLEET_OWNER', 'OPS_TEAM', 'INSURANCE']
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.notificationsSent).toBeGreaterThan(0);
    });
  });

  describe('Incident Resolution', () => {
    let incidentId: string;

    beforeEach(async () => {
      // Create incident
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'CARGO_DAMAGE',
          severity: 'MEDIUM',
          description: 'Damaged cargo'
        })
      });

      const data = await response.json();
      incidentId = data.incidentId;
    });

    it('should resolve incident with resolution details', async () => {
      const response = await fetch(`${baseUrl}/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          resolutionType: 'COMPENSATION',
          amount: 5000,
          description: 'Compensation paid to shipper',
          notes: 'Cargo replacement approved'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('RESOLVED');
      expect(data.resolutionAmount).toBe(5000);
    });

    it('should close resolved incident', async () => {
      // Resolve first
      await fetch(`${baseUrl}/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          resolutionType: 'COMPENSATION',
          amount: 5000
        })
      });

      // Then close
      const response = await fetch(`${baseUrl}/${incidentId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          reason: 'All stakeholders satisfied'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('CLOSED');
    });
  });

  describe('Notification Dispatch on Incident', () => {
    it('should send SMS notification on incident creation', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'ACCIDENT',
          severity: 'HIGH',
          description: 'Severe accident',
          notificationChannels: ['SMS']
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.notificationStatus).toBeDefined();
    });

    it('should send push notification to fleet owner on high-severity incident', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          tripId,
          type: 'CARGO_DAMAGE',
          severity: 'CRITICAL',
          description: 'Total cargo loss',
          notificationChannels: ['PUSH', 'SMS']
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.pushNotificationsSent).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (tripId) {
      await prisma.trip.delete({ where: { id: tripId } }).catch(() => {});
    }
    if (loadId) {
      await prisma.load.delete({ where: { id: loadId } }).catch(() => {});
    }
  });
});
