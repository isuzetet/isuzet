import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@ruit/shared-db';

describe('Fleet Management Operations', () => {
  const baseUrl = 'http://localhost:3003/api/v1/fleet';
  let fleetOwnerId: string;
  let truckId: string;
  let driverId: string;

  beforeEach(async () => {
    // Create test fleet owner
    const fleetOwner = await prisma.fleetOwner.create({
      data: {
        businessName: `Test Fleet ${Date.now()}`,
        registrationNumber: `REG${Date.now()}`,
        userId: 'usr_test123',
        status: 'ACTIVE'
      }
    });
    fleetOwnerId = fleetOwner.id;
  });

  describe('Truck Management', () => {
    it('should create a new truck', async () => {
      const response = await fetch(`${baseUrl}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: `ET_${Date.now()}`,
          make: 'Hino',
          model: '700',
          year: 2020,
          capacity: 5000,
          fleetOwnerId,
          insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          annualInspectionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.plateNumber).toBeDefined();
      expect(data.status).toBe('ACTIVE');
      truckId = data.id;
    });

    it('should reject truck with invalid plate number format', async () => {
      const response = await fetch(`${baseUrl}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: 'invalid_plate',
          make: 'Hino',
          model: '700',
          year: 2020,
          fleetOwnerId
        })
      });

      expect(response.status).toBe(400);
    });

    it('should list trucks for fleet owner', async () => {
      // Create a truck first
      await fetch(`${baseUrl}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: `ET_${Date.now()}`,
          make: 'Hino',
          model: '700',
          year: 2020,
          fleetOwnerId
        })
      });

      // List trucks
      const response = await fetch(`${baseUrl}/trucks?fleetOwnerId=${fleetOwnerId}`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.trucks)).toBe(true);
      expect(data.trucks.length).toBeGreaterThan(0);
    });

    it('should update truck information', async () => {
      if (!truckId) {
        // Create a truck first
        const createResponse = await fetch(`${baseUrl}/trucks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plateNumber: `ET_${Date.now()}`,
            make: 'Hino',
            model: '700',
            year: 2020,
            fleetOwnerId
          })
        });
        const createData = await createResponse.json();
        truckId = createData.id;
      }

      const response = await fetch(`${baseUrl}/trucks/${truckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacity: 6000,
          status: 'MAINTENANCE'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.capacity).toBe(6000);
      expect(data.status).toBe('MAINTENANCE');
    });

    it('should deactivate a truck', async () => {
      if (!truckId) {
        // Create a truck first
        const createResponse = await fetch(`${baseUrl}/trucks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plateNumber: `ET_${Date.now()}`,
            make: 'Hino',
            model: '700',
            year: 2020,
            fleetOwnerId
          })
        });
        const createData = await createResponse.json();
        truckId = createData.id;
      }

      const response = await fetch(`${baseUrl}/trucks/${truckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('INACTIVE');
    });
  });

  describe('Driver Management', () => {
    it('should register a new driver', async () => {
      const response = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          phone: `+251911${Math.random().toString().slice(2, 8)}`,
          licenseNumber: `LIC${Date.now()}`,
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          fleetOwnerId
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.firstName).toBe('John');
      driverId = data.id;
    });

    it('should reject driver with invalid license number', async () => {
      const response = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+251911223344',
          licenseNumber: 'invalid',
          fleetOwnerId
        })
      });

      expect(response.status).toBe(400);
    });

    it('should assign driver to truck', async () => {
      if (!driverId) {
        // Create a driver first
        const driverResponse = await fetch(`${baseUrl}/drivers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe',
            phone: `+251911${Math.random().toString().slice(2, 8)}`,
            licenseNumber: `LIC${Date.now()}`,
            fleetOwnerId
          })
        });
        const driverData = await driverResponse.json();
        driverId = driverData.id;
      }

      if (!truckId) {
        // Create a truck first
        const truckResponse = await fetch(`${baseUrl}/trucks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plateNumber: `ET_${Date.now()}`,
            make: 'Hino',
            model: '700',
            year: 2020,
            fleetOwnerId
          })
        });
        const truckData = await truckResponse.json();
        truckId = truckData.id;
      }

      const response = await fetch(`${baseUrl}/drivers/${driverId}/assign-truck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assignedTruckId).toBe(truckId);
    });

    it('should list drivers for fleet owner', async () => {
      const response = await fetch(`${baseUrl}/drivers?fleetOwnerId=${fleetOwnerId}`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.drivers)).toBe(true);
    });
  });

  describe('Fleet Analytics', () => {
    it('should retrieve fleet overview', async () => {
      const response = await fetch(`${baseUrl}/analytics/overview?fleetOwnerId=${fleetOwnerId}`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalTrucks).toBeDefined();
      expect(data.totalDrivers).toBeDefined();
      expect(data.activeVehicles).toBeDefined();
      expect(data.completedTrips).toBeDefined();
    });

    it('should calculate fleet performance metrics', async () => {
      const response = await fetch(`${baseUrl}/analytics/performance?fleetOwnerId=${fleetOwnerId}&period=MONTHLY`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.averageDeliveryTime).toBeDefined();
      expect(data.onTimeDeliveryRate).toBeDefined();
      expect(data.incidentRate).toBeDefined();
      expect(data.revenue).toBeDefined();
    });

    it('should retrieve vehicle utilization metrics', async () => {
      const response = await fetch(`${baseUrl}/analytics/utilization?fleetOwnerId=${fleetOwnerId}`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.vehicles)).toBe(true);
      data.vehicles.forEach((vehicle: any) => {
        expect(vehicle.plateNumber).toBeDefined();
        expect(vehicle.utilizationPercentage).toBeDefined();
      });
    });
  });

  describe('Document Management', () => {
    it('should track truck document expiry', async () => {
      if (!truckId) {
        // Create a truck first
        const truckResponse = await fetch(`${baseUrl}/trucks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plateNumber: `ET_${Date.now()}`,
            make: 'Hino',
            model: '700',
            year: 2020,
            fleetOwnerId,
            insuranceExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
          })
        });
        const truckData = await truckResponse.json();
        truckId = truckData.id;
      }

      const response = await fetch(`${baseUrl}/trucks/${truckId}/documents`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toBeDefined();
      data.documents.forEach((doc: any) => {
        expect(doc.type).toBeDefined();
        expect(doc.expiryDate).toBeDefined();
      });
    });

    it('should alert on expiring documents', async () => {
      const response = await fetch(`${baseUrl}/alerts/expiring-documents?fleetOwnerId=${fleetOwnerId}`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.alerts)).toBe(true);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (fleetOwnerId) {
      await prisma.fleetOwner.delete({ where: { id: fleetOwnerId } }).catch(() => {});
    }
  });
});
