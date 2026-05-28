# Schema Change Log — Sprint 2 (Prompt 9)
# This documents every change being made to the database schema
# and WHY each change exists

## Why These Changes Exist

This sprint adds features required for real Ethiopian freight operations:
1. Multi-leg loads (multi-pickup, multi-dispatch combinations)
2. Fleet manager RBAC (fleet owners need staff accounts)
3. Dynamic supply-demand pricing engine
4. Comprehensive KYC for all user types
5. Driver-fleet affiliation (drivers work with multiple fleet owners)
6. Owner-operator support (driver who is also fleet owner)
7. Fleet management features (expenses, maintenance, loans, performance)
8. ERP integration support (API keys, webhooks)
9. Operational features (fuel advance, checkpoints, SOS, cancellation)
10. Multi-role accounts (orderer who also owns fleet)

## Changes to Existing Tables

### users table
New fields (ALL nullable or with defaults — NEVER breaks existing data):
- linkedAccountIds String[] @default([])
  WHY: One phone number can have fleet owner + orderer accounts
- accountType String @default("PERSONAL")
  WHY: PERSONAL or BUSINESS account distinction
- referralCode String? @unique
  WHY: Growth mechanic — referrer gets trust boost
- referredByCode String?
  WHY: Track who referred this user
- isOwnerOperator Boolean @default(false)
  WHY: Driver who also owns their own truck

### drivers table
New fields:
- homeBaseCityId String?
  WHY: Show drivers loads near their home base first
- preferredCorridorIds String[] @default([])
  WHY: Driver sees preferred corridor loads first
- availabilityStatus String @default("AVAILABLE")
  WHY: AVAILABLE | ON_TRIP | RESTING | UNAVAILABLE
- licenseNumber String?
  WHY: KYC requirement
- licenseCategory String?
  WHY: CE for heavy trucks, B for light
- licenseExpiry DateTime?
  WHY: Alert when driving license expires
- emergencyContactName String?
  WHY: Safety — notify on SOS
- emergencyContactPhone String?
  WHY: Safety — call on SOS or breakdown
- telebirrNumber String?
  WHY: Payment destination for driver earnings

### fleet_owners table
New fields:
- businessRegistrationNumber String?
  WHY: KYC — trade license
- tinNumber String?
  WHY: Tax ID — required for CBE loan facility
- tradeLicenseExpiry DateTime?
  WHY: Alert when trade license expires
- cbeBankAccount String?
  WHY: Required for CBE loan facility
- monthlyRevenueEstimate Int?
  WHY: Credit scoring input for CBE loan
- kycTier Int @default(0)
  WHY: Fleet owner has separate KYC tier from user

### trucks table  
New fields:
- libreNumber String?
  WHY: Vehicle registration book number — KYC
- chassisNumber String?
  WHY: Vehicle identity verification
- engineNumber String?
  WHY: Vehicle identity verification
- manufacturingYear Int?
  WHY: Age affects insurance and maintenance
- bodyType String @default("FLATBED")
  WHY: FLATBED|COVERED|REFRIGERATED|TANKER|TIPPER|LOWBED|LIVESTOCK
- payloadQuintals Decimal?
  WHY: Ethiopian unit (1 quintal = 100kg)
- insurancePolicyNumber String?
  WHY: KYC — insurance verification
- insuranceCompany String?
  WHY: KYC — who to contact for claims
- insuranceType String?
  WHY: THIRD_PARTY | COMPREHENSIVE
- insuranceExpiry DateTime?
  WHY: CRITICAL — truck cannot accept loads if expired
- inspectionNumber String?
  WHY: Yetebeqe (annual inspection) number
- inspectionExpiry DateTime?
  WHY: CRITICAL — truck cannot accept loads if expired
- odometer Int @default(0)
  WHY: Maintenance scheduling by km
- lastServiceDate DateTime?
  WHY: Maintenance scheduling
- nextServiceDate DateTime?
  WHY: Alert 7 days before service due
- kycTier Int @default(0)
  WHY: Truck has its own KYC tier (0-3)
- isEligibleForLoads Boolean @default(false)
  WHY: Only true when insurance + inspection verified

### orderers table
New fields:
- tinNumber String?
  WHY: Tax ID — KYC for business orderers
- businessRegistrationNumber String?
  WHY: KYC — trade license
- industrySector String?
  WHY: AGRICULTURE|MANUFACTURING|DISTRIBUTION|CONSTRUCTION|NGO|GOVERNMENT
- monthlyFreightSpend Int?
  WHY: Credit scoring — how much they typically spend
- creditLineApproved Boolean @default(false)
  WHY: CBE credit line for post-payment terms
- creditLineLimitEtb Int @default(0)
  WHY: Approved credit limit in ETB cents
- preferredTruckBodyTypes String[] @default([])
  WHY: "Always give me covered trucks for my electronics"
- apiAccessEnabled Boolean @default(false)
  WHY: ERP integration — some orderers connect programmatically
- webhookUrl String?
  WHY: ERP integration — where to send status updates
- kycTier Int @default(0)
  WHY: Orderer has separate KYC tier

### loads table
New fields:
- loadType String @default("SIMPLE")
  WHY: SIMPLE|MULTI_PICKUP|MULTI_DISPATCH|MULTI_BOTH
- preferredTruckBodyType String?
  WHY: Orderer can request specific truck type
- requiresRefrigeration Boolean @default(false)
  WHY: Cold chain cargo flag
- isHazardous Boolean @default(false)
  WHY: Hazardous cargo requires special permits
- insuranceRequired Boolean @default(false)
  WHY: High-value cargo may need insurance
- idempotencyKey String? @unique
  WHY: ERP systems retry requests — prevent duplicate loads
- templateId String?
  WHY: Created from a saved template
- totalStops Int @default(2)
  WHY: How many stops total (pickups + deliveries)
- fuelAdvanceAmount Int @default(0)
  WHY: Pre-trip fuel advance from escrow
- fuelAdvanceApproved Boolean @default(false)
  WHY: OPS must approve fuel advance

### strategy_versions table
New fields (all pricing engine parameters):
- highDemandThreshold Decimal @default(1.5)
  WHY: When demand/supply ratio exceeds this → surcharge applies
- lowDemandThreshold Decimal @default(0.5)
  WHY: When ratio below this → discount applies
- demandSurchargeRate Decimal @default(0.15)
  WHY: Max 15% surcharge at peak demand
- supplyDiscountRate Decimal @default(0.10)
  WHY: Max 10% discount when trucks outnumber loads
- maxDemandMultiplier Decimal @default(1.5)
  WHY: Price can never exceed 1.5x base regardless of demand
- minDemandMultiplier Decimal @default(0.8)
  WHY: Price can never drop below 0.8x base
- floorPricePerKmPerQuintal Decimal @default(0.5)
  WHY: Absolute minimum price — protects fleet owners
- ceilingPricePerKmPerQuintal Decimal @default(5.0)
  WHY: Absolute maximum price — protects orderers
- cancellationCompensationRatePerKm Decimal @default(2.0)
  WHY: ETB per km driven before cancelled load — compensates driver
- checkpointFeeReimbursementEnabled Boolean @default(true)
  WHY: Whether platform reimburses checkpoint fees from escrow
- seasonalPricingRules Json @default("{}")
  WHY: {"11": 1.15, "12": 1.20} — month number to multiplier map

## New Tables

### load_stops
Replaces the single pickup/delivery concept with multiple stops.
One SIMPLE load has exactly 2 stops (1 pickup + 1 delivery).
MULTI loads have 3+ stops.

### expenses
Fleet owner logs all costs: fuel, maintenance, salary, checkpoint fees.
Enables true profit calculation per truck and per trip.

### truck_maintenance
Service history and scheduling. Alerts when service is due.

### fleet_loans
CBE loan tracking. Links loan repayments to platform earnings.

### driver_performance_snapshots
Monthly calculated metrics per driver per fleet owner.
Cached calculation — updated by worker monthly.

### driver_fleet_affiliations
Many-to-many: driver can work with multiple fleet owners.
Each affiliation has: status, paymentType (SALARY/PERCENTAGE/RENTAL), 
paymentAmount, isActive.

### api_keys
For ERP integration. Orderers can generate API keys.
Rate limited. Scoped permissions.

### proof_of_delivery
Generated after dual confirmation (driver + orderer both confirm).
Stored as generated PDF reference. Downloadable.

### load_templates
Orderer saves a load configuration as template.
"Every Monday, Addis to Hawassa, 200 quintals teff" → save as template.

### checkpoint_logs
Driver logs checkpoint passages with GPS and timestamp.
Evidence in disputes. Orderer sees real progress.

### cancellation_records
When load is cancelled: who cancelled, when, what compensation is owed.
Feeds into trust score penalty for the cancelling party.