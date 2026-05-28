import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@ruit/shared-db';

describe('Payment and Escrow Operations', () => {
  const baseUrl = 'http://localhost:3007/api/v1/liquidity';
  const internalSecret = process.env.INTERNAL_SECRET || 'test-secret';
  let orderId: string;
  let loadId: string;
  let driverId: string;

  beforeEach(async () => {
    // Create test load
    const load = await prisma.load.create({
      data: {
        referenceId: `LOAD_${Date.now()}`,
        totalValue: 10000,
        itemCount: 5,
        status: 'OPEN',
        source: 'MOBILE'
      }
    });
    loadId = load.id;
  });

  describe('Escrow Hold and Release', () => {
    it('should hold funds in escrow for delivery', async () => {
      const response = await fetch(`${baseUrl}/escrow/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          amount: 10000,
          currency: 'ETB',
          reason: 'DELIVERY_GUARANTEE'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.escrowId).toBeDefined();
      expect(data.status).toBe('HELD');
      expect(data.amount).toBe(10000);
    });

    it('should reject escrow hold without authorization', async () => {
      const response = await fetch(`${baseUrl}/escrow/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadId,
          amount: 10000,
          currency: 'ETB'
        })
      });

      expect(response.status).toBe(403);
    });

    it('should release held funds after delivery completion', async () => {
      // First, hold funds
      const holdResponse = await fetch(`${baseUrl}/escrow/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          amount: 10000,
          currency: 'ETB',
          reason: 'DELIVERY_GUARANTEE'
        })
      });

      const holdData = await holdResponse.json();
      const escrowId = holdData.escrowId;

      // Then release
      const releaseResponse = await fetch(`${baseUrl}/escrow/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          escrowId,
          releasedAmount: 10000,
          reason: 'DELIVERY_COMPLETED'
        })
      });

      expect(releaseResponse.status).toBe(200);
      const releaseData = await releaseResponse.json();
      expect(releaseData.status).toBe('RELEASED');
    });

    it('should handle partial release of escrow', async () => {
      // Hold funds
      const holdResponse = await fetch(`${baseUrl}/escrow/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          amount: 10000,
          currency: 'ETB',
          reason: 'DELIVERY_GUARANTEE'
        })
      });

      const holdData = await holdResponse.json();
      const escrowId = holdData.escrowId;

      // Release partial
      const releaseResponse = await fetch(`${baseUrl}/escrow/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          escrowId,
          releasedAmount: 5000,
          reason: 'PARTIAL_DELIVERY'
        })
      });

      expect(releaseResponse.status).toBe(200);
      const releaseData = await releaseResponse.json();
      expect(releaseData.remainingBalance).toBe(5000);
    });
  });

  describe('Commission Calculation', () => {
    it('should calculate commission correctly', async () => {
      const response = await fetch(`${baseUrl}/commission/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          grossAmount: 10000,
          serviceType: 'FULL_DELIVERY',
          riskLevel: 'LOW'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.grossAmount).toBe(10000);
      expect(data.commission).toBeDefined();
      expect(data.commission).toBeGreaterThan(0);
      expect(data.netAmount).toBe(10000 - data.commission);
    });

    it('should apply higher commission for high-risk deliveries', async () => {
      // Low risk
      const lowRiskResponse = await fetch(`${baseUrl}/commission/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          grossAmount: 10000,
          serviceType: 'FULL_DELIVERY',
          riskLevel: 'LOW'
        })
      });

      const lowRiskData = await lowRiskResponse.json();

      // High risk
      const highRiskResponse = await fetch(`${baseUrl}/commission/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          grossAmount: 10000,
          serviceType: 'FULL_DELIVERY',
          riskLevel: 'HIGH'
        })
      });

      const highRiskData = await highRiskResponse.json();

      // High risk should have higher commission
      expect(highRiskData.commission).toBeGreaterThan(lowRiskData.commission);
    });
  });

  describe('Payment Rail Settlement', () => {
    it('should settle payment via bank transfer', async () => {
      const response = await fetch(`${baseUrl}/settlement/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          amount: 5000,
          paymentRail: 'BANK_TRANSFER',
          recipientAccountNumber: '1234567890',
          recipientBankCode: 'CBE001'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settlementId).toBeDefined();
      expect(['INITIATED', 'PENDING']).toContain(data.status);
    });

    it('should settle payment via Chapa', async () => {
      const response = await fetch(`${baseUrl}/settlement/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          amount: 5000,
          paymentRail: 'CHAPA',
          recipientPhoneNumber: '+251911223344'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settlementId).toBeDefined();
    });

    it('should settle payment via TeleBirr', async () => {
      const response = await fetch(`${baseUrl}/settlement/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          amount: 5000,
          paymentRail: 'TELEBIRR',
          recipientPhoneNumber: '+251911223344'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settlementId).toBeDefined();
    });

    it('should reject settlement with invalid payment rail', async () => {
      const response = await fetch(`${baseUrl}/settlement/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          amount: 5000,
          paymentRail: 'INVALID_RAIL'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('COD (Cash on Delivery) Management', () => {
    it('should hold COD amount in escrow', async () => {
      const response = await fetch(`${baseUrl}/cod/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          codAmount: 8000,
          driverId: 'drv_test123'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.codEscrowId).toBeDefined();
      expect(data.amount).toBe(8000);
    });

    it('should verify COD collection before release', async () => {
      // Hold COD
      const holdResponse = await fetch(`${baseUrl}/cod/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          codAmount: 8000,
          driverId: 'drv_test123'
        })
      });

      const holdData = await holdResponse.json();
      const codEscrowId = holdData.codEscrowId;

      // Verify COD collection
      const verifyResponse = await fetch(`${baseUrl}/cod/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          codEscrowId,
          collectedAmount: 8000,
          driverId: 'drv_test123'
        })
      });

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.status).toBe('VERIFIED');
    });
  });

  describe('Insurance Settlement', () => {
    it('should hold insurance amount', async () => {
      const response = await fetch(`${baseUrl}/insurance/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          insuranceAmount: 1000,
          coverage: 'FULL'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.insuranceEscrowId).toBeDefined();
      expect(data.amount).toBe(1000);
    });

    it('should claim insurance on incident', async () => {
      // Hold insurance
      const holdResponse = await fetch(`${baseUrl}/insurance/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          loadId,
          insuranceAmount: 1000,
          coverage: 'FULL'
        })
      });

      const holdData = await holdResponse.json();
      const insuranceEscrowId = holdData.insuranceEscrowId;

      // Claim insurance
      const claimResponse = await fetch(`${baseUrl}/insurance/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret
        },
        body: JSON.stringify({
          insuranceEscrowId,
          incidentType: 'CARGO_DAMAGE',
          claimAmount: 750
        })
      });

      expect(claimResponse.status).toBe(200);
      const claimData = await claimResponse.json();
      expect(claimData.status).toBe('CLAIMED');
      expect(claimData.approvedAmount).toBeLessThanOrEqual(1000);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (loadId) {
      await prisma.load.delete({ where: { id: loadId } }).catch(() => {});
    }
  });
});
