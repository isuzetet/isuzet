# ISUZET Platform API Reference

## Engine: engine-dispatch
### POST /api/v1/loads
**Auth:** ORDERER, OPS_ADMIN   
**Summary:** Create a new cargo load for matching
**Body:** `{ corridorId, cargoType, weightKg, pickupDate, pickupZoneId, isTimeCritical?, ... }`  
**Response:** `{ success: true, data: { loadId, status, estimatedRate } }`

### POST /api/v1/loads/bulk
**Auth:** ORDERER, OPS_ADMIN   
**Summary:** Create multiple loads with bulk escrow funding
**Body:** `{ loads: [{ corridorId, cargoType, weightKg, ... }], fundingRailId }`  
**Response:** `{ success: true, data: { batchId, loadIds, totalEscrowCents } }`

### POST /api/v1/consolidated-loads
**Auth:** ORDERER, AGENT   
**Summary:** Create a consolidated (LTL) load
**Body:** `{ corridorId, cargoType, consolidationAgentId, ... }`  
**Response:** `{ success: true, data: { loadId } }`

### POST /api/v1/loads/:loadId/no-show/driver
**Auth:** ORDERER, OPS_ADMIN   
**Summary:** Report driver no-show
**Params:** `{ loadId }`  
**Body:** `{ reportedByUserId }`  
**Response:** `{ success: true, data: { incidentId, compensationGenerated } }`

### POST /api/v1/trips/:tripId/stops/:stopId/deliver
**Auth:** DRIVER   
**Summary:** Confirm delivery at a stop with OTP or photo+GPS
**Params:** `{ tripId, stopId }`  
**Body:** `{ otp?, photoUrl?, lat?, lng?, recipientName? }`  
**Response:** `{ success: true, data: { stopId, escrowReleased, nextStop } }`

---

## Engine: engine-identity  
### POST /api/v1/auth/register
**Auth:** PUBLIC   
**Summary:** Register new user (driver, fleet, orderer, agent)
**Body:** `{ phone, fullName, role, referredByCode?, licenseNumber?, companyName?, ... }`  
**Response:** `{ success: true, data: { userId, referralCode, otp_sent } }`

### POST /api/v1/auth/verify-otp
**Auth:** PUBLIC   
**Summary:** Verify OTP and get JWT tokens
**Body:** `{ phone, otp }`  
**Response:** `{ success: true, data: { userId, accessToken, refreshToken } }`

### POST /api/v1/identity/kyc/upload
**Auth:** DRIVER, FLEET_OWNER, ORDERER   
**Summary:** Upload KYC document (license, insurance, etc.)
**Body:** `{ docType, fileBase64, expiryDate? }`  
**Response:** `{ success: true, data: { docId, uploadUrl } }`

### POST /api/v1/referrals/apply
**Auth:** PUBLIC/at registration   
**Summary:** Apply a referral code during registration
**Body:** `{ referralCode }`  
**Response:** `{ success: true, data: { referrerId, expectedBonus } }`

---

## Engine: engine-liquidity
### POST /api/v1/loads/:loadId/insurance
**Auth:** ORDERER   
**Summary:** Purchase cargo insurance
**Params:** `{ loadId }`  
**Body:** `{ cargoValueCents, provider? }`  
**Response:** `{ success: true, data: { premiumCents, policyRef } }`

### POST /api/v1/loads/:loadId/insurance/claim
**Auth:** ORDERER   
**Summary:** File an insurance claim
**Params:** `{ loadId }`  
**Body:** `{ description, evidenceUrls[] }`  
**Response:** `{ success: true, data: { claimId, status } }`

### POST /api/v1/agents/:agentId/wallet/topup
**Auth:** COMMUNITY_AGENT   
**Summary:** Top up agent wallet via mobile money
**Params:** `{ agentId }`  
**Body:** `{ amountCents, paymentRailId }`  
**Response:** `{ success: true, data: { newBalance, pendingSettlement } }`

### GET /api/v1/agents/:agentId/wallet
**Auth:** COMMUNITY_AGENT, ADMIN   
**Summary:** Get agent wallet balance and transaction history
**Response:** `{ success: true, data: { balanceCents, settlements[], topups[] } }`

---

## Engine: engine-optimizer  
### POST /api/v1/pricing/quote
**Auth:** PUBLIC   
**Summary:** Get price estimate without creating a load
**Body:** `{ corridorId, cargoType, weightKg }`  
**Response:** `{ success: true, data: { platformRateCents, estimatedBrokerRateCents, savingsPct } }`

### GET /api/v1/calculator/estimate
**Auth:** PUBLIC   
**Summary:** Public price calculator - no login required
**Query:** `corridorId, cargoType, weightKg`  
**Response:** `{ platformRate, brokerEstimate, savings }`

---

## Engine: engine-location  
### POST /api/v1/trips/:tripId/location/ping
**Auth:** DRIVER   
**Summary:** Report current GPS location during trip
**Params:** `{ tripId }`  
**Body:** `{ lat, lng, speed?, accuracy? }`  
**Response:** `{ success: true, data: { distanceToNextStop, eta } }`

### POST /api/v1/trips/:tripId/cold-chain
**Auth:** DRIVER   
**Summary:** Record temperature reading for refrigerated cargo
**Params:** `{ tripId }`  
**Body:** `{ temperatureCelsius, cargoType, checkpointId? }`  
**Response:** `{ success: true, data: { logId, isExcursion, excursionAlertSent } }`

### GET /api/v1/trips/:tripId/cold-chain/certificate
**Auth:** DRIVER, ORDERER, ADMIN   
**Summary:** Get cold chain compliance certificate
**Response:** `{ tripId, compliance: { compliantTimePct, totalExcursionMin } }`

---

## Engine: engine-incident  
### POST /api/v1/incidents/road-alert
**Auth:** DRIVER   
**Summary:** Report a road condition (flooding, closed road, etc.)
**Body:** `{ corridorId, lat, lng, alertType, description, photoUrl? }`  
**Response:** `{ success: true, data: { alertId, bonusPending } }`

### POST /api/v1/incidents/detention
**Auth:** DRIVER   
**Summary:** Report checkpoint detention
**Body:** `{ tripId, driverId, checkpointId, detainedAt, estimatedReleaseHours? }`  
**Response:** `{ success: true, data: { incidentId } }`

### POST /api/v1/incidents/medical-sos
**Auth:** DRIVER   
**Summary:** Emergency SOS - medical
**Body:** `{ tripId, lat, lng, description? }`  
**Response:** `{ success: true, data: { sosId, emergencyTeam_notified } }`

---

## Engine: engine-corridor  
### GET /api/v1/corridors
**Auth:** PUBLIC   
**Summary:** List all available corridors
**Query:** `page?, limit?, search?`  
**Response:** `{ corridors: [{ id, originZone, destinationZone, distanceKm, demandTier }] }`

### POST /api/v1/corridors/:corridorId/market-days
**Auth:** ORDERER   
**Summary:** Get market day schedule and demand adjustments
**Params:** `{ corridorId }`  
**Response:** `{ marketDays: [{ day, date, demandBoost%, priceMultiplier }] }`

---

## Engine: engine-behavior  
### GET /api/v1/drivers/:driverId/trust-score
**Auth:** DRIVER, FLEET_OWNER, ADMIN   
**Summary:** Get driver trust score breakdown
**Response:** `{ trustScore: 0-100, tier: 0-5, breakdown: { onTime%, dispute%, ... } }`

### POST /api/v1/feedback
**Auth:** ORDERER, FLEET_OWNER   
**Summary:** Leave feedback/rating after delivery
**Body:** `{ tripId, rating: 1-5, comment?, issues[]? }`  
**Response:** `{ success: true, data: { feedbackId } }`

---

## Engine: engine-strategy  
### GET /api/v1/strategy/config
**Auth:** OPS_ADMIN, SUPER_ADMIN   
**Summary:** Get current active configuration
**Response:** `{ wdmWeights, commissionTiers, bonuses, thresholds, ... }`

### POST /api/v1/strategy/config/version
**Auth:** SUPER_ADMIN   
**Summary:** Create new strategy config version
**Body:** `{ versionName, configJson (override any fields) }`  
**Response:** `{ success: true, data: { versionId, isActive } }`

---

## Engine: workers (Background Jobs)
No public API endpoints. Workers process queued jobs:
- LOAD_MATCHING: WDM matching for open loads
- ESCROW_SETTLEMENT: Release escrow on delivery confirmation
- MICRO_CREDIT_DUE: Process overdue loans
- AGENT_CASH_SETTLEMENT: Settle agent cash collections
- HOS_CHECK: Hours of service monitoring
- SHADOW_BROKER_DETECTION: Fraud detection

---

EOF
