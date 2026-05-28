import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@ruit/shared-db';

describe('Location Tracking and GPS Operations', () => {
  const baseUrl = 'http://localhost:3005/api/v1/location';
  let tripId: string;
  let driverId: string;
  const internalSecret = process.env.INTERNAL_SECRET || 'test-secret';

  beforeEach(async () => {
    // Create test trip
    const load = await prisma.load.create({
      data: {
        referenceId: `LOAD_${Date.now()}`,
        totalValue: 10000,
        itemCount: 5,
        status: 'ASSIGNED'
      }
    });

    const trip = await prisma.trip.create({
      data: {
        referenceId: `TRIP_${Date.now()}`,
        status: 'STARTED',
        driverId: 'drv_test123',
        loadId: load.id,
        startedAt: new Date()
      }
    });
    tripId = trip.id;
    driverId = 'drv_test123';
  });

  describe('GPS Ping Processing', () => {
    it('should process GPS ping from driver', async () => {
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 9.0320,
          longitude: 38.7469,
          accuracy: 10,
          speed: 45.5,
          bearing: 120,
          timestamp: new Date().toISOString()
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.locationId).toBeDefined();
      expect(data.recorded).toBe(true);
    });

    it('should validate GPS coordinates within Ethiopia bounds', async () => {
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 50.0, // Outside Ethiopia bounds (max 15.0)
          longitude: 38.7469,
          timestamp: new Date().toISOString()
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid GPS coordinates');
    });

    it('should reject GPS coordinates with insufficient precision', async () => {
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 9.0, // Only 1 decimal place
          longitude: 38.7,
          timestamp: new Date().toISOString()
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('GPS precision');
    });

    it('should process offline sync with multiple pings', async () => {
      const response = await fetch(`${baseUrl}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          pings: [
            {
              latitude: 9.0320,
              longitude: 38.7469,
              accuracy: 10,
              speed: 45.5,
              timestamp: new Date(Date.now() - 5 * 60000).toISOString()
            },
            {
              latitude: 9.0325,
              longitude: 38.7475,
              accuracy: 12,
              speed: 48.2,
              timestamp: new Date(Date.now() - 3 * 60000).toISOString()
            },
            {
              latitude: 9.0330,
              longitude: 38.7480,
              accuracy: 11,
              speed: 50.1,
              timestamp: new Date().toISOString()
            }
          ]
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processedCount).toBe(3);
      expect(data.skippedCount).toBe(0);
    });
  });

  describe('Trip Tracking', () => {
    it('should retrieve current trip location', async () => {
      // Send a ping first
      await fetch(`${baseUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 9.0320,
          longitude: 38.7469,
          timestamp: new Date().toISOString()
        })
      });

      // Get current location
      const response = await fetch(`${baseUrl}/trips/${tripId}/current-location`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.latitude).toBe(9.0320);
      expect(data.longitude).toBe(38.7469);
      expect(data.updatedAt).toBeDefined();
    });

    it('should retrieve location history for trip', async () => {
      // Send multiple pings
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId,
            tripId,
            latitude: 9.0320 + (i * 0.001),
            longitude: 38.7469 + (i * 0.001),
            timestamp: new Date(Date.now() - i * 10000).toISOString()
          })
        });
      }

      const response = await fetch(`${baseUrl}/trips/${tripId}/history?limit=10`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.locations)).toBe(true);
      expect(data.locations.length).toBeGreaterThan(0);
    });

    it('should calculate trip distance', async () => {
      const response = await fetch(`${baseUrl}/trips/${tripId}/distance`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.distanceKm).toBeDefined();
      expect(data.distanceKm).toBeGreaterThanOrEqual(0);
    });

    it('should estimate trip completion time', async () => {
      const response = await fetch(`${baseUrl}/trips/${tripId}/eta`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.estimatedArrivalTime).toBeDefined();
      expect(data.remainingDistanceKm).toBeDefined();
    });
  });

  describe('Geofencing', () => {
    it('should create geofence around pickup location', async () => {
      const response = await fetch(`${baseUrl}/geofences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          type: 'PICKUP',
          tripId,
          latitude: 9.0320,
          longitude: 38.7469,
          radiusMeters: 500,
          name: 'Test Pickup Location'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.geofenceId).toBeDefined();
      expect(data.radiusMeters).toBe(500);
    });

    it('should detect geofence entry', async () => {
      // Create geofence
      const geofenceResponse = await fetch(`${baseUrl}/geofences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          type: 'PICKUP',
          tripId,
          latitude: 9.0320,
          longitude: 38.7469,
          radiusMeters: 500
        })
      });

      const geofenceData = await geofenceResponse.json();

      // Send ping inside geofence
      const pingResponse = await fetch(`${baseUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 9.0321, // ~100m from center
          longitude: 38.7470,
          timestamp: new Date().toISOString()
        })
      });

      expect(pingResponse.status).toBe(200);
      const pingData = await pingResponse.json();
      expect(pingData.geofenceEvents).toBeDefined();
    });

    it('should detect delivery at geofence', async () => {
      // Create delivery geofence
      const geofenceResponse = await fetch(`${baseUrl}/geofences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          type: 'DELIVERY',
          tripId,
          latitude: 9.0500,
          longitude: 38.7600,
          radiusMeters: 100,
          requiresProof: true
        })
      });

      const geofenceData = await geofenceResponse.json();
      const geofenceId = geofenceData.geofenceId;

      // Send confirmation at geofence
      const response = await fetch(`${baseUrl}/geofences/${geofenceId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          tripId,
          latitude: 9.0500,
          longitude: 38.7600,
          proof: {
            type: 'PHOTO',
            url: 'https://example.com/delivery-photo.jpg'
          }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.deliveryConfirmed).toBe(true);
    });
  });

  describe('Location Analytics', () => {
    it('should retrieve heatmap data for region', async () => {
      const response = await fetch(`${baseUrl}/analytics/heatmap?bounds=9.0,38.7,9.1,38.8`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.heatmapPoints)).toBe(true);
    });

    it('should get common delivery routes', async () => {
      const response = await fetch(`${baseUrl}/analytics/common-routes`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.routes)).toBe(true);
    });

    it('should calculate traffic congestion', async () => {
      const response = await fetch(`${baseUrl}/analytics/congestion?bounds=9.0,38.7,9.1,38.8`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.congestionLevel).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(data.congestionLevel);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (tripId) {
      await prisma.trip.delete({ where: { id: tripId } }).catch(() => {});
    }
  });
});
