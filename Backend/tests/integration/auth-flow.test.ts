import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@ruit/shared-db';
import crypto from 'crypto';

describe('Authentication Flow - User Registration and OTP Verification', () => {
  const baseUrl = 'http://localhost:3001/api/v1/identity';
  let testPhone: string;
  let userId: string;

  beforeEach(() => {
    testPhone = `+251${Math.random().toString().slice(2, 11)}`;
  });

  describe('User Registration', () => {
    it('should register a new user with phone number', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          fullName: 'Test User',
          role: 'DRIVER'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.phone).toBe(testPhone);
      expect(data.otpSent).toBe(true);
      userId = data.id;
    });

    it('should reject registration with invalid phone number', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 'invalid-phone',
          fullName: 'Test User',
          role: 'DRIVER'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid phone');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone
          // Missing fullName and role
        })
      });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate phone registration', async () => {
      // First registration
      await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          fullName: 'Test User',
          role: 'DRIVER'
        })
      });

      // Attempt duplicate
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          fullName: 'Another User',
          role: 'DRIVER'
        })
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already registered');
    });
  });

  describe('OTP Verification', () => {
    let registeredUserId: string;
    let otpCode: string;

    beforeEach(async () => {
      // Register user first
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          fullName: 'Test User',
          role: 'DRIVER'
        })
      });
      
      const registerData = await registerResponse.json();
      registeredUserId = registerData.id;

      // Get OTP from database (in test environment)
      const user = await prisma.user.findUnique({
        where: { id: registeredUserId },
        select: { otpCode: true }
      });
      otpCode = user?.otpCode || '000000';
    });

    it('should verify OTP and issue JWT tokens', async () => {
      const response = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: registeredUserId,
          otp: otpCode
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user.id).toBe(registeredUserId);
    });

    it('should reject invalid OTP', async () => {
      const response = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: registeredUserId,
          otp: '999999'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid OTP');
    });

    it('should reject expired OTP', async () => {
      // Set OTP as expired
      await prisma.user.update({
        where: { id: registeredUserId },
        data: { otpExpiresAt: new Date(Date.now() - 1000) }
      });

      const response = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: registeredUserId,
          otp: otpCode
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('OTP expired');
    });

    it('should reject OTP after max attempts exceeded', async () => {
      // Try wrong OTP 5 times
      for (let i = 0; i < 5; i++) {
        await fetch(`${baseUrl}/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: registeredUserId,
            otp: '999999'
          })
        });
      }

      // Next attempt should fail
      const response = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: registeredUserId,
          otp: otpCode
        })
      });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Too many attempts');
    });
  });

  describe('Token Management', () => {
    let accessToken: string;
    let refreshToken: string;
    let registeredUserId: string;

    beforeEach(async () => {
      // Register and get tokens
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          fullName: 'Test User',
          role: 'DRIVER'
        })
      });
      
      const registerData = await registerResponse.json();
      registeredUserId = registerData.id;

      // Get OTP and verify
      const user = await prisma.user.findUnique({
        where: { id: registeredUserId },
        select: { otpCode: true }
      });

      const verifyResponse = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: registeredUserId,
          otp: user?.otpCode || '000000'
        })
      });

      const verifyData = await verifyResponse.json();
      accessToken = verifyData.accessToken;
      refreshToken = verifyData.refreshToken;
    });

    it('should use access token to authenticate requests', async () => {
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(registeredUserId);
    });

    it('should reject request with invalid token', async () => {
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      expect(response.status).toBe(401);
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    });

    it('should refresh token using refresh token', async () => {
      const response = await fetch(`${baseUrl}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accessToken).toBeDefined();
      expect(data.accessToken).not.toBe(accessToken);
    });

    it('should reject expired access token', async () => {
      // Set token as expired
      await prisma.token.update({
        where: { accessToken },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('DRIVER role should only access driver endpoints', async () => {
      // Create driver user
      const driverPhone = `+251${Math.random().toString().slice(2, 11)}`;
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: driverPhone,
          fullName: 'Driver User',
          role: 'DRIVER'
        })
      });

      const registerData = await registerResponse.json();
      const driverId = registerData.id;

      // Get OTP and verify
      const user = await prisma.user.findUnique({
        where: { id: driverId },
        select: { otpCode: true }
      });

      const verifyResponse = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: driverId,
          otp: user?.otpCode || '000000'
        })
      });

      const verifyData = await verifyResponse.json();
      const driverToken = verifyData.accessToken;

      // Try to access fleet management endpoint (should fail)
      const fleetResponse = await fetch('http://localhost:3003/api/v1/fleet/trucks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });

      expect(fleetResponse.status).toBe(403);
      const data = await fleetResponse.json();
      expect(data.error).toContain('Insufficient permissions');
    });

    it('FLEET_OWNER role should access fleet endpoints', async () => {
      // Create fleet owner user
      const ownerPhone = `+251${Math.random().toString().slice(2, 11)}`;
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: ownerPhone,
          fullName: 'Fleet Owner',
          role: 'FLEET_OWNER'
        })
      });

      const registerData = await registerResponse.json();
      const ownerId = registerData.id;

      // Get OTP and verify
      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { otpCode: true }
      });

      const verifyResponse = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerId,
          otp: user?.otpCode || '000000'
        })
      });

      const verifyData = await verifyResponse.json();
      const ownerToken = verifyData.accessToken;

      // Should be able to access fleet endpoint
      const fleetResponse = await fetch('http://localhost:3003/api/v1/fleet/trucks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${ownerToken}` }
      });

      expect([200, 404]).toContain(fleetResponse.status); // 404 if no trucks, 200 if has trucks
    });
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });
});
