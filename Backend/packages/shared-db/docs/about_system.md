# ISUZET — Complete System Reference

## Ethiopian Medium-Haul Logistics Platform

---

### SECTION 1: WHO IS THIS PLATFORM FOR

This platform serves eleven distinct types of users, each with specific roles, capabilities, and restrictions within the Ethiopian logistics ecosystem.

#### Fleet Owner
**Who they are**: An individual or company that owns one or more trucks and provides freight services. This represents the supply side of the platform — the people who actually move cargo.

**What they can do**:
- Register trucks with complete specifications including plate number, capacity in kilograms and quintals, body type (flatbed, covered, refrigerated, tanker, tipper, livestock), fuel type, and axle count
- Add and manage drivers, linking each driver to specific trucks
- View a live dashboard showing all trucks in their fleet with current locations, zones, and statuses
- Accept or reject load assignments suggested by the platform
- Track trip progress in real time including GPS location, checkpoint logs, and delivery confirmations
- Manage financial dashboard showing escrow balances, pending payouts, and driver earnings
- Set preferred corridors where their trucks operate
- Set truck availability windows indicating when trucks are available for loads
- Pay driver bonuses including on-time bonuses, checkpoint bonuses, fuel report bonuses, backhaul bonuses, and perfect week bonuses

**What they cannot do**:
- Cannot create loads (only Orderers create loads)
- Cannot access other fleet owners' data
- Cannot override pricing set by the platform
- Cannot manually assign loads to drivers — assignment happens through the matching engine

**How they register**: Fleet owners register via mobile phone using OTP verification. They provide their name (in English and optionally Amharic), company name, TIN number, and business registration documents. Initial KYC tier is 0, advancing to tier 1 upon phone verification, tier 2 upon document submission, and tier 3 upon business verification.

#### Fleet Manager
**Who they are**: An employee or partner of a Fleet Owner who manages day-to-day operations but does not own the business. This role is for larger fleets where the owner delegates operational tasks.

**What they can do**:
- Everything a Fleet Owner can do EXCEPT financial actions (payouts, bonus payments, bank account management)
- View and manage trucks and drivers
- Accept or reject load assignments on behalf of the fleet
- Track trips and communicate with drivers
- Update truck availability and maintenance status

**What they cannot do**:
- Cannot access bank account or payout settings
- Cannot pay driver bonuses
- Cannot add or remove trucks from the fleet (only view and manage existing)

**How they register**: Fleet Managers are invited by a Fleet Owner. They receive a registration link via SMS and complete the same phone verification process. Their account is automatically linked to the inviting fleet owner.

#### Driver
**Who they are**: The person who actually drives the truck. In Ethiopian logistics, drivers may be employees of fleet owners or owner-operators who own both truck and driver accounts.

**What they can do**:
- Receive load offers via SMS or push notification
- Accept or reject load assignments through the mobile app
- Submit GPS location pings every 15 minutes during active trips
- Log checkpoints including police stops, weighbridges, tolls, fuel points, and city boundaries with optional fee reporting
- Report fuel prices at stations visited
- Submit weighbridge logs with actual weight, legal limit, and any fines paid
- Request breakdown recovery assistance when truck breaks down
- View earnings including trip payouts and bonus history
- Manage shift schedules indicating availability windows
- Upload Proof of Delivery (POD) including recipient signature and photo
- Report incidents including cargo damage, delays, or route deviations
- View recommended backhaul loads after completing a delivery

**What they cannot do**:
- Cannot negotiate pricing directly with orderers
- Cannot see other drivers' earnings or performance
- Cannot cancel an accepted load without penalty
- Cannot modify load details

**How they register**: Drivers register via mobile phone with OTP verification. They provide their full name, driver license number, license class, and license expiry date. Owner-operators indicate they own their truck during registration, which creates both a Driver and Fleet Owner profile linked to the same user account.

#### Orderer (Cargo Owner/Shipper)
**Who they are**: The demand side — businesses or individuals who need to move goods. This includes manufacturers, wholesalers, retailers, construction companies, agricultural producers, and trading companies.

**What they can do**:
- Create loads specifying origin, destination, cargo type, weight, volume, pickup date, and delivery deadline
- Request instant quotes from the system
- Accept, reject, or negotiate quotes (one round of negotiation allowed)
- Track assigned trucks in real time including current location and estimated arrival
- Confirm pickup and delivery with signature and photo
- Create load templates for recurring shipments with auto-post scheduling
- Raise disputes if cargo is damaged, short, or delivered late
- Pay via escrow, cash on delivery (COD), or rolling credit (for approved orderers)
- View complete shipment history and invoices
- Rate drivers and fleet owners after delivery
- Request fast-track matching for urgent loads (requires KYC tier 2)
- View trip economics including fuel cost estimates and checkpoint fee estimates

**What they cannot do**:
- Cannot directly select specific drivers — driver selection is algorithmic
- Cannot contact drivers directly until after assignment acceptance
- Cannot modify load details after a driver has accepted

**How they register**: Orderers register via mobile phone with OTP verification. They provide company name, business sector (FMCG, agriculture, manufacturing, construction, retail), and TIN certificate. KYC tier progression: tier 0 (phone only), tier 1 (basic business info), tier 2 (verified business documents — unlocks fast-track), tier 3 (high-volume shipper with credit line).

#### Broker
**Who they are**: Independent logistics professionals who match orderers needing trucks with fleet owners having available capacity. They operate on commission.

**What they can do**:
- View available loads in their operating zones and corridors
- View available trucks matching those loads
- Create broker suggestions linking a specific truck to a specific load
- Earn commission of ETB 20,000 per successful match (configurable)
- Track match status through the platform
- View earnings summary

**What they cannot do**:
- Cannot directly accept loads on behalf of fleet owners — both fleet and orderer must accept
- Cannot access financial flows — platform handles all money movement
- Cannot override platform pricing

**How they register**: Brokers apply through the platform and are verified by OPS Admin before activation. They specify their operating zones and corridors during registration.

#### Field Agent
**Who they are**: On-ground logistics professionals who assist with load verification, KYC document collection, and last-mile coordination. They typically work in specific zones.

**What they can do**:
- Verify load details at pickup locations
- Assist users with KYC document submission and verification
- Update truck and driver statuses in the field
- Help resolve disputes through on-ground verification
- View assigned zone loads and statuses

**What they cannot do**:
- Cannot approve KYC (only review and submit for approval)
- Cannot modify financial records
- Cannot override system decisions

**How they register**: Field agents are hired and onboarded by the platform's operations team. They receive special credentials and are assigned to specific zones.

#### OPS Admin (Operations Administrator)
**Who they are**: Platform employees who manage day-to-day operations, handle exceptions, and ensure smooth functioning of the logistics marketplace.

**What they can do**:
- Full system visibility including all trips, loads, users, and financial transactions
- Create and manage market shock events (fuel shortages, road closures, weather events, political events)
- Override zone demand indices manually if needed
- Process compliance updates for drivers and fleet owners
- Manage broker verification
- Handle incident escalation and resolution
- Manage recovery resources (mechanics, tow trucks)
- View and action fraud investigation tools
- Create liquidity incentives to stimulate demand on specific corridors
- Handle manual overrides for pricing and matching in exceptional circumstances
- Issue and manage digital vouchers
- Access complete analytics and reporting dashboards
- Manage Ethiopian calendar events
- Force assignment status changes when necessary

**What they cannot do**:
- Cannot directly access user passwords or payment information (encrypted)
- Cannot cancel loads without following proper dispute process
- Cannot override trust scores manually

**How they access**: OPS Admins are created by Super Admin. They receive dedicated credentials with role-based access control.

#### OPS Viewer
**Who they are**: Operations team members who need visibility into platform activity but do not have authority to make changes.

**What they can do**:
- View all dashboard data in read-only mode
- Monitor live operations including active trips, zone demand, and corridor health
- Generate reports
- View incident details and status

**What they cannot do**:
- Cannot make any changes to data
- Cannot approve or reject anything
- Cannot create or modify users

**How they access**: Created by OPS Admin or Super Admin with restricted permissions.

#### Finance OPS
**Who they are**: Financial operations specialists who manage payouts, vouchers, and money flows.

**What they can do**:
- Manage digital voucher issuance and redemption
- Process and approve fleet payouts
- Track commission calculations
- Create liquidity incentives
- Monitor escrow balances and releases
- Generate financial reports
- Handle COD reconciliation and discrepancy investigation

**What they cannot do**:
- Cannot modify trip or load data
- Cannot override driver or fleet trust scores
- Cannot access operational incident management

**How they access**: Created by Super Admin with financial permissions.

#### Super Admin
**Who they are**: Platform administrators with complete access to all systems and data.

**What they can do**:
- Everything any other user can do
- Create and manage all user types
- Access system configuration
- Manage strategy versions and algorithm weights
- Access database directly
- View audit logs of all system activity
- Force any state transition in emergency situations

**How they access**: Initial Super Admin is created during system setup. Additional Super Admins can be created by existing Super Admins.

#### System Service
**Who they are**: Not a human user but an automated service account that performs background operations.

**What it does**:
- Runs scheduled workers
- Processes events and triggers
- Manages automated trust score calculations
- Handles escrow releases on schedule
- Generates automated reports
- Sends system notifications

---

### SECTION 2: THE CORE JOURNEY — HOW A LOAD MOVES

The complete lifecycle of a single cargo shipment from creation to payment:

#### Stage 1: Load Creation and Quoting

The process begins when an Orderer needs to move goods.

**Step 1 — Load Details**: The orderer provides:
- Origin zone (from 13 predefined zones including Kality, Merkato, Mesalemia in Addis Ababa; Adama, Hawassa, Mekelle, Bahir Dar, Dire Dawa, Jimma for regional cities)
- Destination zone
- Cargo type (general, perishable, hazmat, livestock, FMCG, construction, agriculture)
- Weight in kilograms (converted to quintals for pricing: 100 kg = 1 quintal)
- Volume in cubic meters (optional)
- Pickup date and time
- Delivery deadline
- Special requirements (refrigeration, hazardous materials certification, insurance)
- Preferred truck body type (if any)

**Step 2 — System Quoting**: The pricing engine calculates:
- Base rate per kilometer from the corridor's rate card
- Fuel adjustment based on current diesel prices in the region
- Risk premium for cargo type and corridor
- Congestion factor based on pickup time (peak hours: 6-9 AM adds 8%, 3-6 PM adds 6%)
- Ethiopian calendar event adjustment (if applicable)
- Backhaul discount probability
- Liquidity premium if corridor has supply stress
- Market multiplier based on current supply/demand

The system returns: system quote amount, negotiation band minimum (typically 92% of quote), negotiation band maximum (capped by shock severity), fleet payout estimate, expected checkpoint fees, fuel cost estimate, and estimated transit time.

**Step 3 — Orderer Decision**: The orderer can:
- Accept the quote immediately
- Request negotiation (one round allowed with voice note explanation)
- Save as draft
- Cancel

If accepted, the load status changes from DRAFT to OPEN.

**Fast-Track Process**: Orderers with KYC tier 2 or higher can flag loads as "fast-track." These loads:
- Skip the standard matching queue
- Get priority assignment within 15 minutes
- Have acceptance window reduced to 10 minutes (vs. standard 20 minutes)
- Are offered to tier 4 and 5 drivers first

#### Stage 2: Driver Matching (WDM Algorithm)

Once a load is OPEN, the Weighted Driver Matching (WDM) algorithm runs.

**Matching Factors and Weights**:
The WDM algorithm calculates a composite score from eight factors:

1. **Proximity Score (15%)**: Distance from truck's current location to pickup location
   - Under 2 km = 1.0 (full score)
   - 2-5 km = 0.8
   - 5-10 km = 0.6
   - 10-20 km = 0.4
   - 20-50 km = 0.2
   - Over 50 km = 0.0

2. **Trust Score (20%)**: Driver's current trust score normalized to 0-1 scale

3. **On-Time Rate (18%)**: Historical percentage of on-time deliveries

4. **Availability (15%)**: Whether driver status is AVAILABLE (1.0) or not (0.0)

5. **Route Familiarity (12%)**: Frequency of trips on this corridor

6. **Load Preference (8%)**: Match between cargo requirements and truck specifications

7. **Zone Match (7%)**: For intracity loads, whether truck is currently in pickup zone (1.0), adjacent zone (0.5), or neither (0.0)

8. **Corridor Familiarity (5%)**: Whether this corridor is in driver's preferred corridors list (1.0) or not (0.0)

**Night Driving Restriction**: For intercity corridors with isNightTimeRestricted = true (all corridors except Addis-Adama), trucks arriving after 19:30 (7:30 PM) receive a 50% penalty on their match score. This reflects Ethiopian road safety regulations prohibiting heavy truck night driving on most highways.

**Backhaul Suggestion Window**: A driver who just completed a trip becomes eligible for backhaul suggestions for 20 minutes. During this window, the system looks for loads originating from the driver's current zone or adjacent zones. Match scores get urgency decay — a 10% bonus if accepted within 5 minutes, decreasing to 0% at 20 minutes.

**No Match Scenario**: If no suitable driver is found after 5 attempts:
- The load is flagged for broker intervention
- The system creates a broker suggestion
- If still unmatched after 24 hours, OPS Admin is alerted
- The quote may be automatically increased to attract drivers

#### Stage 3: Assignment and Acceptance

**Suggestion Creation**: The top 5 matching drivers receive notifications via SMS and push notification.

**Acceptance Window**: Each driver has 20 minutes to accept (10 minutes for fast-track). The window includes decaying urgency — higher bonuses for faster acceptance.

**Driver Acceptance**: When a driver accepts:
- Assignment status changes from SUGGESTED to ACCEPTED
- Load status changes to MATCHED
- The orderer receives notification with driver and truck details
- The trip is created with status PENDING
- Other suggestions are automatically rejected

**Driver Rejection**: If rejected, the system records the reason (optional voice note) and moves to the next candidate.

**Fleet Owner Notification**: Fleet owners receive notification of assignment acceptance and can track in their dashboard.

#### Stage 4: Pre-Trip Preparation

**Escrow Funding**: Orderer must fund escrow before pickup. Payment options:
- **Escrow**: Full amount held by platform until delivery (standard)
- **COD**: Driver collects cash on delivery (requires driver and orderer COD approval)
- **Rolling Credit**: Approved orderers pay net-30 (requires credit line approval)

**Truck Availability Check**: System verifies truck is eligible (insurance valid, inspection current, not in maintenance).

**Driver Hours Check**: System verifies driver has not exceeded 10 hours driving in the last 24 hours.

**Route Planning**: System calculates optimal route considering checkpoint locations, road conditions, and estimated delays.

#### Stage 5: Pickup

**Pickup Window**: Driver must arrive within pickup time window.

**GPS Check-In**: Upon arrival at pickup zone, driver submits GPS ping. System verifies location is within zone bounding box.

**Cargo Verification**: Driver and orderer verify:
- Actual weight matches declared weight (5% tolerance)
- Cargo condition (good, damaged, partial)
- Number of units (bags, boxes, pallets, etc.)

**Pickup Confirmation**: Both parties sign digital confirmation via mobile app. System records:
- Actual pickup time
- GPS coordinates
- Cargo condition photo
- Both party signatures

**Overload Detection**: If actual weight exceeds legal limit by more than 5%, system triggers OVERLOAD_DETECTED event. Driver can still proceed but must acknowledge risk.

**Trip Status**: Changes from PENDING to EN_ROUTE.

#### Stage 6: In Transit

**Location Tracking**: Driver submits GPS pings every 15 minutes.

**Checkpoint Logging**: Driver logs each checkpoint:
- Type (police, weighbridge, toll, fuel point, city boundary, customs)
- GPS coordinates
- Fee paid (if any)
- Delay encountered (minutes)
- Notes

Checkpoint fees are tracked per corridor and averaged over time to provide estimates for future quotes.

**Route Deviation Detection**: System compares actual route to planned route. If deviation exceeds 5 km:
- Trust score penalty applied
- Orderer notified
- OPS Admin alerted if deviation exceeds 10 km

**Breakdown Recovery**: If truck breaks down, driver can request recovery assistance. System finds nearest recovery resources within 30 km radius:
- Mechanic
- Tow truck
- Replacement truck
- Fuel delivery

Driver selects resource, system notifies provider, and tracks resolution.

**Idle Alert**: If truck is stationary for more than 4 hours during transit (excluding scheduled rest), system triggers idle alert and suggests backhaul loads.

**Delay Prediction**: System continuously updates estimated arrival based on current location, remaining distance, and historical checkpoint delays.

#### Stage 7: Delivery

**Arrival Window**: Driver must arrive within delivery time window.

**GPS Check-In**: System verifies arrival at destination zone.

**Cargo Handover**: Driver and recipient verify:
- Cargo condition matches pickup condition (or note damage)
- Weight matches (within tolerance)
- All units accounted for

**Proof of Delivery**: Driver collects:
- Recipient name
- Digital signature
- Delivery photo
- GPS coordinates
- Timestamp

**Delivery Confirmation**: Recipient confirms via mobile app or USSD (for non-smartphone recipients).

**Trip Status**: Changes from EN_ROUTE to DELIVERED.

#### Stage 8: Payment and Closure

**Escrow Release**: Upon confirmed delivery:
- Escrow hold released to fleet owner
- Platform commission deducted (typically 10%, can vary)
- Payment processed according to fleet owner's preference:
  - T0: Instant (requires telebirr)
  - T1: Next business day
  - T3: Within 3 business days
  - T7: Within 7 business days (default for new fleet owners)

Payout speed is determined by trust tier: Tier 1 = T7, Tier 2 = T3, Tier 3 = T3, Tier 4 = T1, Tier 5 = T0.

**Driver Earnings**: Fleet owner receives payout and is responsible for paying driver:
- Base trip earnings (agreed rate minus expenses)
- Bonuses earned during trip (on-time, checkpoint reporting, fuel reporting)
- Status: PENDING until fleet owner marks as paid

**Bonus Calculation**:
- On-Time Bonus: ETB 1,000 per trip delivered within scheduled window
- Checkpoint Bonus: ETB 500 per checkpoint logged
- Fuel Report Bonus: ETB 500 per fuel price report
- Backhaul Bonus: ETB 2,000 for accepting backhaul load within 20 minutes
- Perfect Week: ETB 5,000 for 7 consecutive on-time deliveries

**Trip Closure**:
- Financial transaction completed
- Trip rated by both parties (optional)
- Driver and truck status returns to AVAILABLE
- Load closed

**Backhaul Suggestion**: Immediately after delivery, system searches for return loads and notifies driver if matches found.

#### Stage 9: Dispute Resolution

**Raising a Dispute**: Either party can raise dispute within 72 hours of delivery.

**Dispute Types**:
- Late delivery
- Cargo damage at pickup
- Cargo damage at delivery
- Cargo shortage
- Wrong delivery
- Checkpoint fee disputes
- Breakdown recovery disputes

**Dispute Timeline**:
- **Hours 0-72**: Negotiation period between orderer and fleet owner
- **Hour 72**: Auto-escalation to OPS Admin if unresolved
- **Day 7**: OPS Admin must resolve
- **Day 14**: Auto-close with liability split if still unresolved

**Evidence Submission**: Both parties can submit photos, documents, voice notes, and written statements.

**Resolution Options**:
- Full refund to orderer
- Partial refund
- Additional payment to fleet
- No action
- Penalty applied to at-fault party

**Trust Impact**: Losing a dispute reduces trust score based on severity and frequency.

---

### SECTION 3: THE MATCHING ENGINE — HOW DRIVERS ARE SELECTED

The Weighted Driver Matching (WDM) system is the core algorithm that connects orderers needing loads with drivers having capacity.

#### How Matching Is Triggered

Matching initiates when:
1. Orderer accepts a quote (load moves from QUOTING to OPEN)
2. A driver completes a trip and becomes available for backhaul (within 20-minute window)
3. OPS Admin manually triggers matching for a specific load
4. A truck has been idle for more than 4 hours (idle alert triggers backhaul search)

#### Matching Process

**Step 1 — Load Requirements Analysis**: System determines required truck specifications:
- Minimum capacity in kg/quintals
- Body type constraint (if cargo requires refrigeration, hazardous materials handling, etc.)
- Corridor capability (some corridors have restrictions)
- Driver license class requirements

**Step 2 — Candidate Pool Generation**: System queries for available trucks where:
- Truck status is AVAILABLE or LOADED (for backhaul)
- Truck capacity >= load weight
- Truck body type matches cargo requirements
- Truck is currently in origin zone or adjacent zone (for intracity)
- Truck's preferred corridors include the load corridor (if driver has preferences set)
- Driver has not exceeded 10 hours driving in last 24 hours
- Driver license is not expired
- Truck insurance and inspection are current

**Step 3 — WDM Score Calculation**: For each candidate, calculate:

| Factor | Weight | How Calculated | Score Range |
|--------|--------|----------------|---------------|
| Proximity Score | 15% | Distance to first pickup stop | 0.0 - 1.0 |
| Trust Score | 20% | Driver's trust score / 100 | 0.0 - 1.0 |
| On-Time Rate | 18% | Historical on-time percentage | 0.0 - 1.0 |
| Availability | 15% | 1.0 if AVAILABLE, 0.0 otherwise | 0.0 or 1.0 |
| Route Familiarity | 12% | Frequency on this corridor | 0.0 - 1.0 |
| Load Preference | 8% | Cargo type match | 0.0 - 1.0 |
| Zone Match | 7% | Zone compatibility | 0.0 - 1.0 |
| Corridor Familiarity | 5% | Preferred corridor match | 0.0 or 1.0 |

**Proximity Scoring Detail**:
- < 2 km = 1.0
- 2-5 km = 0.8
- 5-10 km = 0.6
- 10-20 km = 0.4
- 20-50 km = 0.2
- > 50 km = 0.0

**Zone Match Scoring** (for INTRACITY loads only):
- Same zone as pickup: 1.0
- Adjacent zone: 0.5
- Different zone: 0.0
- For INTERCITY loads: always 0.5 (neutral)

**Night Driving Penalty**: For restricted corridors (isNightTimeRestricted = true), if estimated arrival at pickup is after 19:30, match score is multiplied by 0.5.

**Final Score Calculation**:
```
Final Score = (Proximity × 0.15) + (Trust × 0.20) + (OnTime × 0.18) + 
              (Availability × 0.15) + (RouteFam × 0.12) + (LoadPref × 0.08) +
              (Zone × 0.07) + (Corridor × 0.05)
```

Final scores range from 0.0 to 1.0.

**Step 4 — Ranking and Selection**: Candidates sorted by final score descending. Top 5 receive notifications simultaneously.

**Step 5 — Notification**: Each candidate receives SMS and push notification with:
- Load summary (origin, destination, weight, cargo type)
- Estimated payout
- Distance to pickup
- Expiration time (20 minutes standard, 10 minutes fast-track)

**Step 6 — Acceptance Handling**: First driver to accept gets the load. Others receive "load no longer available" notification.

**Step 7 — No Acceptance**: If no driver accepts within the window:
- System moves to next 5 candidates
- After 5 attempts, load escalated to broker system
- If broker cannot match within 24 hours, OPS Admin alerted

#### Backhaul Matching Specifics

After trip completion, the backhaul worker runs:

**Trigger Condition**: Trip status changes to DELIVERED.

**Search Radius**: Looks for loads where pickupZoneId = truck's current zone OR adjacent zones.

**Load Status Filter**: Only OPEN or READY_TO_MATCH loads.

**Weight Compatibility**: Load weight <= truck payload capacity.

**Urgency Bonus**: Initial match score gets +0.10 bonus, decaying to 0 over 20 minutes.

**Notification**: Driver receives push notification: "Backhaul opportunity available near your location." Expires in 20 minutes.

** Acceptance**: Same process as standard matching.

---

### SECTION 4: CORRIDORS AND ZONES — THE GEOGRAPHY OF THE PLATFORM

The platform operates across a defined geography of zones, terminals, and corridors optimized for Ethiopian medium-haul logistics.

#### Zones (13 Total)

Zones are geographic service areas defined by GPS bounding boxes.

**Addis Ababa Zones (7)**:

1. **KALITY** (ቃሊቲ)
   - Bounding Box: North 8.94°, South 8.90°, East 38.78°, West 38.74°
   - Center: 8.92°N, 38.76°E
   - Demand Index: 0.8 (high supply, moderate demand)
   - Adjacent Zones: AKAKI, SARIS
   - Primary Use: Industrial zone freight, manufacturing shipments

2. **MERKATO** (መርካቶ)
   - Bounding Box: North 9.035°, South 9.005°, East 38.755°, West 38.725°
   - Center: 9.02°N, 38.74°E
   - Demand Index: 0.9 (highest demand in Addis)
   - Adjacent Zones: MESALEMIA, LEGEHAR, SARIS
   - Primary Use: Wholesale distribution, retail restocking

3. **MESALEMIA** (መሳለሚያ)
   - Bounding Box: North 9.02°, South 8.99°, East 38.78°, West 38.75°
   - Center: 9.005°N, 38.765°E
   - Demand Index: 0.85
   - Adjacent Zones: MERKATO
   - Primary Use: Customs clearance, import distribution

4. **AKAKI** (አቃቂ)
   - Bounding Box: North 8.90°, South 8.86°, East 38.81°, West 38.77°
   - Center: 8.88°N, 38.79°E
   - Demand Index: 0.6 (oversupply common)
   - Adjacent Zones: KALITY
   - Primary Use: Agricultural collection point, livestock

5. **MEGENAGNA** (መገናኛ)
   - Bounding Box: North 9.05°, South 9.02°, East 38.815°, West 38.785°
   - Center: 9.035°N, 38.80°E
   - Demand Index: 0.5 (low demand, high competition)
   - Adjacent Zones: MESALEMIA
    - Primary Use: Residential deliveries, small commercial

6. **SARIS** (ሳሪስ)
   - Bounding Box: North 8.975°, South 8.945°, East 38.735°, West 38.705°
   - Center: 8.96°N, 38.72°E
   - Demand Index: 0.55
   - Adjacent Zones: MERKATO
   - Primary Use: Local distribution

7. **LEGEHAR** (ለገሃር)
   - Bounding Box: North 9.03°, South 9.00°, East 38.77°, West 38.74°
   - Center: 9.015°N, 38.755°E
   - Demand Index: 0.7
   - Adjacent Zones: MERKATO
   - Primary Use: Business district deliveries

**Regional City Zones (6)**:

8. **ADAMA** (አዳማ)
   - City: Adama
   - Center: 8.54°N, 39.27°E
   - Demand Index: 0.65
   - Primary Use: Manufacturing hub, agricultural processing

9. **HAWASSA** (ሃዋሳ)
   - City: Hawassa
   - Center: 7.06°N, 38.475°E
   - Demand Index: 0.6
   - Primary Use: Industrial park freight, textiles

10. **MEKELLE** (መቀሌ)
    - City: Mekelle
    - Center: 13.4967°N, 39.4767°E
    - Demand Index: 0.45 (underserved, opportunity)
    - Primary Use: Northern corridor freight, humanitarian logistics

11. **BAHIR_DAR** (ባህር ዳር)
    - City: Bahir Dar
    - Center: 11.5931°N, 37.3908°E
    - Demand Index: 0.5
    - Primary Use: Tourism freight, agricultural exports

12. **DIRE_DAWA** (ድሬዳዋ)
    - City: Dire Dawa
    - Center: 9.5931°N, 41.8661°E
    - Demand Index: 0.55
    - Primary Use: Eastern gateway, Djibouti corridor

13. **JIMMA** (ጅማ)
    - City: Jimma
    - Center: 7.6667°N, 36.8333°E
    - Demand Index: 0.4 (lowest demand, high opportunity)
    - Primary Use: Coffee region freight, agricultural

#### Zone Demand Index

The demand index ranges from 0.1 to 1.0 and indicates supply/demand balance:

- **1.0**: Extreme shortage of trucks, premium pricing applies
- **0.8-0.9**: High demand, favorable for drivers
- **0.5-0.7**: Balanced market
- **0.3-0.4**: Oversupply, competitive for drivers
- **0.2 or lower**: Heavy oversupply, platform may incentivize demand

The zone demand worker updates these indices every 15 minutes based on:
- Available trucks in zone
- Open loads originating from zone
- Historical demand patterns

#### Terminals (5 Total)

Terminals are physical truck staging areas where drivers wait for loads.

1. **KALITY_FREIGHT** (ቃሊቲ ጭነት ተርሚናል)
   - Zone: KALITY
   - Location: 8.918°N, 38.762°E
   - Average Wait: 45 minutes
   - Features: Major interchange, overnight parking available, fuel nearby, mechanic available
   - Queue Radius: 400 meters (driver must be within 400m to check in)
   - Operating Hours: 06:00 - 20:00
   - Presence Ping: Every 15 minutes required
   - Grace Period: 30 minutes absence before auto-drop from queue

2. **MERKATO_TRUCK** (መርካቶ ትራክ ተርሚናል)
   - Zone: MERKATO
   - Location: 9.018°N, 38.742°E
   - Average Wait: 30 minutes
   - Features: Central location, moderate facilities
   - Queue Radius: 400 meters
   - Operating Hours: 06:00 - 20:00

3. **MESALEMIA_CLEARING** (መሳለሚያ ማጽጃ ተርሚናል)
   - Zone: MESALEMIA
   - Location: 9.003°N, 38.767°E
   - Average Wait: 60 minutes
   - Features: Customs clearance focus, documentation support
   - Queue Radius: 400 meters
   - Operating Hours: 06:00 - 20:00

4. **ADAMA_HUB** (አዳማ ሎጂስቲክስ ማዕከል)
   - Zone: ADAMA
   - Location: 8.542°N, 39.272°E
   - Average Wait: 20 minutes
   - Features: Regional hub, faster turnaround
   - Queue Radius: 400 meters
   - Operating Hours: 06:00 - 20:00

5. **HAWASSA_INDUSTRIAL** (ሃዋሳ ኢንዱስትሪ ተርሚናል)
   - Zone: HAWASSA
   - Location: 7.062°N, 38.477°E
   - Average Wait: 25 minutes
   - Features: Industrial park access
   - Queue Radius: 400 meters
   - Operating Hours: 06:00 - 20:00

**Terminal Queue Process**:
1. Driver arrives within 400m of terminal center
2. System auto-detects presence or driver manually checks in
3. Driver added to queue at position N
4. Every 15 minutes, system pings driver's GPS to verify presence
5. If driver absence exceeds 30 minutes, automatically dropped from queue
6. When load matches, driver at position 1 gets first notification
7. Queue reorders as drivers accept loads or drop out

#### Corridors (8 Total)

**Intercity Corridors (6)**:

1. **ADDIS_ADAMA** (Addis Ababa ↔ Adama)
   - Distance: 99 km
   - Average Transit Time: 120 minutes
   - Type: INTERCITY
   - Region: CENTRAL
   - Road Condition Score: 85/100 (best in network)
   - Peak Hour Multiplier: 1.3 (30% longer during peak)
   - Night Restricted: No (trucks can operate at night)
   - Expected Checkpoint Fees: Minimal (ETB 0 official, occasional informal)
   - Origin Zone: KALITY
   - Destination Zone: ADAMA
   - Key Checkpoints: Kality Weighbridge (average fee ETB 50,000 for overweight), Mojo Police Check (average ETB 20,000 informal)

2. **ADDIS_HAWASSA** (Addis Ababa ↔ Hawassa)
   - Distance: 275 km
   - Average Transit Time: 240 minutes
   - Type: INTERCITY
   - Region: SOUTH
   - Road Condition Score: 78/100
   - Peak Hour Multiplier: 1.2
   - Night Restricted: Yes (after 19:30 penalty applies)
   - Expected Checkpoint Fees: ETB 30,000 toll at Hawassa entrance
   - Origin Zone: KALITY
   - Destination Zone: HAWASSA
   - Key Checkpoints: Modjo Junction Police (average ETB 15,000), Hawassa Entrance Toll (fixed ETB 30,000)

3. **ADDIS_DIRE_DAWA** (Addis Ababa ↔ Dire Dawa)
   - Distance: 515 km
   - Average Transit Time: 420 minutes (7 hours)
   - Type: INTERCITY, REGIONAL
   - Region: EAST
   - Road Condition Score: 72/100
   - Peak Hour Multiplier: 1.2
   - Night Restricted: Yes
   - Expected Checkpoint Fees: City boundary fees
   - Origin Zone: KALITY
   - Destination Zone: DIRE_DAWA
   - Key Checkpoints: Dire Dawa City Boundary (average ETB 10,000)

4. **ADDIS_BAHIR_DAR** (Addis Ababa ↔ Bahir Dar)
   - Distance: 565 km
   - Average Transit Time: 480 minutes (8 hours)
   - Type: INTERCITY
   - Region: NORTH
   - Road Condition Score: 70/100
   - Peak Hour Multiplier: 1.2
   - Night Restricted: Yes
   - Expected Checkpoint Fees: Weighbridge fees
   - Origin Zone: MERKATO
   - Destination Zone: BAHIR_DAR
   - Key Checkpoints: Sendafa Weighbridge (average ETB 50,000 if overweight)

5. **ADDIS_MEKELLE** (Addis Ababa ↔ Mekelle)
   - Distance: 783 km
   - Average Transit Time: 600 minutes (10 hours)
   - Type: INTERCITY
   - Region: NORTH
   - Road Condition Score: 65/100 (mountainous terrain)
   - Peak Hour Multiplier: 1.2
   - Night Restricted: Yes
   - Expected Checkpoint Fees: Multiple mountain checkpoints
   - Origin Zone: MERKATO
   - Destination Zone: MEKELLE

6. **ADDIS_JIMMA** (Addis Ababa ↔ Jimma)
   - Distance: 346 km
   - Average Transit Time: 300 minutes (5 hours)
   - Type: INTERCITY
   - Region: WEST
   - Road Condition Score: 68/100
   - Peak Hour Multiplier: 1.2
   - Night Restricted: Yes
   - Expected Checkpoint Fees: Moderate
   - Origin Zone: MERKATO
   - Destination Zone: JIMMA

**Intracity Corridors (2)**:

7. **KALITY_MERKATO** (Within Addis Ababa)
   - Distance: 12 km
   - Average Transit Time: 35 minutes (off-peak), 63 minutes (peak)
   - Type: INTRACITY
   - Region: CENTRAL
   - Road Condition Score: 90/100
   - Peak Hour Multiplier: 1.8 (80% longer during rush hour)
   - Night Restricted: No
   - Expected Checkpoint Fees: None
   - Origin Zone: KALITY
   - Destination Zone: MERKATO

8. **MERKATO_MESALEMIA** (Within Addis Ababa)
   - Distance: 4 km
   - Average Transit Time: 20 minutes (off-peak), 40 minutes (peak)
   - Type: INTRACITY
   - Region: CENTRAL
   - Road Condition Score: 88/100
   - Peak Hour Multiplier: 2.0 (double during rush hour)
   - Night Restricted: No
   - Expected Checkpoint Fees: None
   - Origin Zone: MERKATO
   - Destination Zone: MESALEMIA

#### Road Condition Scores Explained

The road condition score (0-100) affects pricing and route recommendations:

- **90-100**: Excellent asphalt, minimal delays, standard pricing
- **80-89**: Good condition, occasional potholes, standard pricing
- **70-79**: Fair condition, frequent slowdowns, slight risk premium
- **60-69**: Poor condition, significant delays, higher risk premium
- **Below 60**: Very poor, may require alternate routing, highest premiums

#### Checkpoint Types and Ethiopian Context

Checkpoints are a reality of Ethiopian trucking. The platform tracks six types:

1. **Police**: Roadside police checks for documentation, load documentation, driver license. Informal fees common (ETB 500-5,000).

2. **Weighbridge**: Official weigh stations checking axle weights. Fines for overweight: ETB 50,000-150,000. System tracks 5% tolerance rule.

3. **Toll**: Official road tolls, fixed prices (ETB 10,000-30,000 typically).

4. **Fuel Point**: Gas stations along route. Platform incentivizes fuel price reporting.

5. **City Boundary**: Entry/exit points for cities. Informal fees common.

6. **Customs**: For cross-border freight (limited current implementation).

**Checkpoint Intelligence**: Drivers report checkpoint fees, creating a crowdsourced database of average fees per corridor. This feeds into pricing estimates and protects drivers by showing orderers what costs to expect.

---

### SECTION 5: PRICING AND ECONOMICS

The pricing system is designed to be transparent, fair, and responsive to market conditions while protecting both orderers and drivers.

#### Quote Components

Every quote consists of the following components calculated in sequence:

**1. Base Rate**
- Retrieved from corridor's active RateCardVersion
- Formula: baseRatePerKm × distanceKm
- Example: If base rate is ETB 25/km and distance is 99 km, base = ETB 2,475

**2. Fuel Adjustment**
- Formula: base × fuelIndexMultiplier
- Multiplier derived from current diesel prices in the corridor's region
- Five regions with potentially different fuel prices: CENTRAL, NORTH, SOUTH, EAST, WEST
- Current Central region diesel price: ETB 85.50/liter (seeded)
- Prices can vary by region (North highest at ETB 87.00, East at ETB 88.50 due to transport costs)

**3. Risk Premium**
- Formula: base × (riskPremiumPct / 100)
- Premium varies by cargo type (hazmat higher, general cargo lower)
- Corridor risk factors (mountain roads, seasonal closures)

**4. Congestion Factor**
- Time-based adjustments:
  - Morning peak (6-9 AM): +8%
  - Afternoon peak (3-6 PM): +6%
  - Night (10 PM - 5 AM): -2% (discount for off-peak)
  - Weekends (Saturday, Monday): +4%
  - Friday: +3%
- Density adjustment: If load-to-truck ratio > 1.5, add up to 15% based on severity

**5. Ethiopian Calendar Event Adjustment**
- Fixed multipliers based on the event:
  - HARVEST_MEHER: +20%
  - HARVEST_BELG: +12%
  - TIMKAT: +8%
  - FASIKA: +10%
  - ENKUTATASH: +7%
  - IRREECHA: +6%
  - Other events: 3-8%
- These reflect increased demand during holidays and harvest seasons

**6. Backhaul Discount**
- Probability-based: backhaulProbability × backhaulConfidence × 10%
- Reduces quote if system believes a return load is likely
- Smooth curve function (not binary)

**7. Liquidity Premium**
- Formula: base × liquidityStressLevel × 5%
- Added when corridor has insufficient supply
- Encourages drivers to serve underserved routes

**8. Market Multiplier**
- Dynamic supply/demand adjustment
- Range: 0.8 to 1.5
- Based on current zone demand index and corridor load-to-truck ratio

**9. Floor and Ceiling Prices**
- Floor: ETB 0.50 per km per quintal (minimum sustainable price)
- Ceiling: ETB 5.00 per km per quintal (maximum to prevent gouging)
- Margin floor: Rate card minimum ensures platform viability

**Final Quote Calculation**:
```
Raw Total = (Base + Fuel + Risk + Congestion + Seasonal - Backhaul + Liquidity) × MarketMultiplier
capped at Ceiling
floored at (MarginFloor OR FloorPrice per km per quintal)
```

#### Negotiation Band

Every quote includes a negotiation range:
- **Minimum**: Quote × 0.92 (orderer can propose down to 8% below quote)
- **Maximum**: Capped by shock severity:
  - Shock severity 0-1: Quote × 1.15
  - Shock severity 2: Quote × 1.10
  - Shock severity 3: Quote × 1.05
  - Shock severity 4+: Quote × 1.00 (no negotiation upward during crisis)

#### Cost Breakdown Shown to Orderers

The quote interface shows orderers:
- System quote amount (what they'll pay)
- Expected fleet payout (what the driver/owner receives)
- Platform commission (typically 10%, shown transparently)
- Estimated checkpoint fees (based on corridor intelligence)
- Estimated fuel cost (based on distance and current prices)
- Net trip cost to fleet (fuel + checkpoint fees)

#### Trip Economics for Fleet Owners

After a trip completes, the system calculates:

**Revenue Side**:
- Gross revenue: Final agreed rate
- Bonuses earned: On-time, checkpoint, fuel report, backhaul, perfect week

**Cost Side**:
- Fuel cost: Actual or estimated based on distance and consumption
- Checkpoint fees: Actual fees logged by driver
- Platform commission: 10% or per custom configuration
- Driver earnings: Base pay + bonuses (paid by fleet owner, not platform)

**Net Payout**:
```
Fleet Payout = Gross Revenue - Platform Commission
Driver Payment = Base Rate + Eligible Bonuses
Fleet Net = Fleet Payout - Driver Payment - Fuel Cost - Checkpoint Fees
```

Per-unit economics:
- Revenue per km: Fleet Payout / Distance
- Revenue per quintal: Fleet Payout / Cargo Weight in Quintals

#### Commission Structure

Platform commission is configurable per orderer, corridor, or cargo type:

**Commission Config Types**:
1. **Flat Rate**: Fixed percentage (default 10%)
2. **Fixed Amount**: ETB amount per load
3. **Tiered**: Different rates based on volume (e.g., first 10 trips 12%, volume discount 8%)

**Priority**: Orderer-specific > Corridor-specific > Cargo-type > Global default

#### Checkpoint Fee Reimbursement

By default, checkpoint fees are:
- Estimated in the quote and shown to orderer
- Paid by driver during trip
- Reimbursed to driver by fleet owner (part of trip settlement)
- NOT separately reimbursed by platform (built into fleet payout)

---

### SECTION 6: MONEY — ESCROW, PAYOUTS, VOUCHERS, EARNINGS

The financial system ensures secure, transparent money movement with multiple payment options.

#### Escrow System

**When Money Is Held**:
- Upon orderer acceptance of quote and assignment acceptance by driver
- Full trip amount held in platform escrow
- Held until delivery confirmation OR dispute resolution

**Escrow States**:
1. **PENDING**: Load created but not funded
2. **HELD**: Orderer funded, trip in progress
3. **RELEASED**: Delivery confirmed, money transferred
4. **DISPUTED**: Delivery disputed, held until resolution
5. **REFUNDED**: Cancelled or dispute resolved in favor of orderer

**Release Triggers**:
- Delivery confirmed by recipient with signature
- POD uploaded and verified
- No dispute raised within 72 hours of delivery

**Payout Timing**:
- Trust Tier 1: T+7 days (7 days after delivery)
- Trust Tier 2: T+3 days
- Trust Tier 3: T+3 days
- Trust Tier 4: T+1 day
- Trust Tier 5: T+0 (instant via telebirr)

**Cancellation Compensation**:
If orderer cancels after driver has traveled:
- Distance < 20 km: ETB 500 flat compensation
- Distance 20-50 km: ETB 1,000
- Distance 50-100 km: ETB 2,000
- Distance > 100 km: ETB 5,000 OR 50% of agreed rate, whichever is lower
Compensation paid from orderer's payment to driver via platform.

#### Payment Models

**1. Escrow (Standard)**
- Orderer pays full amount upfront
- Platform holds until delivery
- Fleet owner receives after trust-appropriate delay
- Safest for both parties

**2. Cash on Delivery (COD)**
- Driver collects cash from recipient at delivery
- Driver must be COD-verified (separate approval process)
- Orderer must request COD at load creation
- System tracks expected COD amount
- Discrepancy detection if actual amount differs from expected
- COD handler can be driver or designated collector

**3. Rolling Credit**
- Approved orderers only (requires credit line approval)
- Orderer pays net-30 (within 30 days of delivery)
- Platform pays fleet owner immediately (or per trust tier)
- Platform carries credit risk
- Automatic invoicing on monthly cycle
- Late fees apply after 30 days

**4. Partial Advance**
- Orderer pays percentage upfront (e.g., 30%) via escrow
- Remaining paid on delivery
- Used for large loads to demonstrate commitment

#### Digital Vouchers

Vouchers are prepaid credits that can be issued and redeemed.

**Voucher Creation**:
- Minimum amount: ETB 100
- Can be general purpose or corridor/zone-specific
- Expiry: Default 90 days
- Status: ACTIVE until redeemed or expired

**Issuance**:
- Finance OPS can issue vouchers for:
  - Customer service compensation
  - Marketing promotions
  - Driver incentives
  - Referral rewards
- Requires recipient user ID
- Optional notes for tracking

**Redemption**:
- Recipient enters voucher code in mobile app
- System validates code, expiry, and status
- Credit applied to user's wallet immediately
- Voucher status changes to REDEEMED

**Voucher Status Flow**:
ACTIVE → REDEEMED (successful use)
ACTIVE → EXPIRED (past expiry date)
ACTIVE → CANCELLED (revoked by issuer)

#### Driver Earnings and Bonuses

Drivers earn through multiple channels, all tracked in system:

**Base Earnings**: Per-trip payment from fleet owner (agreed rate, not platform-set).

**Bonus Types**:

1. **On-Time Bonus**: ETB 1,000
   - Qualification: Delivery within scheduled window
   - Verification: GPS timestamp + delivery confirmation
   - Payer: Fleet owner
   - Status: PENDING until fleet marks paid

2. **Checkpoint Bonus**: ETB 500 per checkpoint
   - Qualification: Log checkpoint with fee report
   - Verification: GPS coordinates + photo (optional)
   - Limit: One bonus per checkpoint type per trip
   - Payer: Fleet owner

3. **Fuel Report Bonus**: ETB 500
   - Qualification: Submit fuel price snapshot
   - Verification: Photo of fuel station price board
   - Cooldown: Once per hour per driver
   - Payer: Fleet owner

4. **Backhaul Bonus**: ETB 2,000
   - Qualification: Accept backhaul suggestion within 20 minutes
   - Verification: Assignment acceptance timestamp
   - Payer: Fleet owner

5. **Perfect Week Bonus**: ETB 5,000
   - Qualification: 7 consecutive on-time deliveries
   - Counter: Resets after any late delivery
   - Payer: Fleet owner

**Earning Status Tracking**:
- PENDING: Bonus calculated but not yet paid
- PAID: Fleet owner has marked as paid
- Payment records include paidAt timestamp and payer reference

**Driver Wallet**: Drivers can view:
- Current pending bonuses
- Paid bonus history
- Trip earnings summary
- Total lifetime earnings

#### Fleet Payout Summary

Fleet owners see a financial dashboard including:

**Current Balances**:
- Escrow held (in-progress trips)
- Pending payouts (delivered trips, waiting for release)
- Available for withdrawal (released funds)

**Payout History**:
- Date, amount, trip reference for each payout
- Payout method used (bank, mobile money)
- Status (pending, processed, failed)

**Driver Earnings Management**:
- Total bonuses owed to drivers
- Per-driver bonus breakdown
- Mark-as-paid interface
- Driver payment history

**Expense Tracking**: (Optional feature)
- Fuel expenses per trip
- Checkpoint fees logged
- Maintenance costs
- Driver salaries

---

### SECTION 7: TRUST, COMPLIANCE AND DRIVER QUALITY

Trust is the foundation of the platform. The trust system ensures reliable service for orderers and fair treatment of quality drivers.

#### Trust Score System

**Scale**: 0.0 to 100.0, with tier-based thresholds.

**Calculation Method**: Decay-weighted scoring. Recent events matter more than old events. Uses exponential decay formula where:
```
Penalty = eventPenalty × severityWeight × e^(-lambda × daysSince)
```

Lambda values (decay rates):
- Disputes: 0.023 (30-day half-life)
- Incidents: 0.008 (90-day half-life)
- Deviations: 0.003 (effectively persistent)
- Cancellations: 0.023

**Driver Weight Factors** (Phase 2):
- On-time performance: 28%
- Dispute history: 18%
- Route deviations: 20%
- Cancellation rate: 14%
- Incidents: 10%
- Anomaly flags: 5%
- COD discrepancies: 5%

**Fleet Owner Weight Factors**:
- On-time performance: 25%
- Dispute history: 20%
- Route deviations: 10%
- Cancellation rate: 20%
- Payment reliability: 20%
- Incidents: 5%

**Score Impact Events**:

| Event | Driver Impact | Fleet Owner Impact |
|-------|---------------|-------------------|
| On-time delivery | +variable (improves rate) | +variable |
| Late delivery (15-60 min) | -3 to -5 points | -2 to -4 points |
| Late delivery (>60 min) | -5 to -10 points | -5 to -8 points |
| Dispute filed against | -10 to -20 points | -8 to -15 points |
| Dispute lost | -15 to -25 points | -12 to -20 points |
| Route deviation detected | -5 points | -3 points |
| Unauthorized deviation | -10 to -15 points | -5 to -8 points |
| Cancellation (legitimate) | 0 points | 0 points |
| Cancellation (no show) | -8 points | -6 points |
| Incident involvement | -5 to -15 points | -5 to -10 points |
| FAA violation report | -5 to -20 points | -3 to -10 points |
| COD discrepancy | -10 to -20 points | -5 to -10 points (if applicable) |
| Anomaly detected | -5 to -10 points | N/A |

**Positive Events**:
- On-time streak: Bonus points every 10 consecutive on-time deliveries
- High rating from orderer: +2 points (capped per trip)
- Perfect load acceptance rate: +5 points (monthly)
- No disputes quarter: +10 points
- Checkpoint reporting consistency: +1 point per week

#### Trust Tiers

**Tier 0 (0-39 points)**:
- Status: New or problematic user
- Payout speed: T+7
- Matching priority: Lowest
- Load access: Restricted to local corridors
- Action: Requires supervision; may face temporary suspension if score < 20

**Tier 1 (40-54 points)**:
- Status: Developing user
- Payout speed: T+7
- Matching priority: Low
- Load access: Regional corridors only
- Requirement: Minimum 3 completed trips to advance

**Tier 2 (55-69 points)**:
- Status: Approved user
- Payout speed: T+3
- Matching priority: Medium
- Load access: All standard corridors
- Requirement: Minimum 10 completed trips

**Tier 3 (70-79 points)**:
- Status: Preferred user
- Payout speed: T+3
- Matching priority: High
- Load access: All corridors including premium
- Requirement: Minimum 25 completed trips

**Tier 4 (80-89 points)**:
- Status: Premium user
- Payout speed: T+1
- Matching priority: Very high
- Load access: All corridors
- Unlock: Priority customer support, quarterly performance reports
- Requirement: Minimum 100 completed trips

**Tier 5 (90-100 points)**:
- Status: Elite user
- Payout speed: T+0 (instant)
- Matching priority: Highest
- Load access: All corridors, first access to high-value loads
- Unlock: Instant payouts, invitation-only loads, priority backhaul
- Requirement: Minimum 100 trips + manual review approval
- Special: Tier 5 requires manual verification; automated system flags for OPS review

#### Compliance Score

Separate from trust score, compliance tracks regulatory adherence:

**Driver Compliance** (max 100 points):
- Valid driver license (not expired): 40 points
- Medical certificate current: 20 points
- No moving violations (last 6 months): 20 points
- Annual safety training completed: 20 points

**Fleet Owner Compliance** (max 100 points):
- Trade license valid: 30 points
- TIN certificate current: 20 points
- Insurance valid for all trucks: 30 points
- Annual inspection current: 20 points

**Truck Compliance** (affects load eligibility):
- Insurance not expired: Required (blocks if expired)
- Inspection not expired: Required (blocks if expired)
- Road worthiness certificate: Required
- Overdue maintenance: Warning, may reduce matching priority

**Hours of Service Tracking**:
- Maximum 10 hours driving in any 24-hour period
- System tracks via location pings and trip timestamps
- Warning at 8 hours
- Soft block at 10 hours (cannot accept new loads until rest)
- Hard block at 12 hours (platform temporarily suspends driver)

#### KYC Tier System

KYC (Know Your Customer) tiers determine access level, separate from trust scoring:

**KYC Tier 0**:
- Phone only
- Can: Browse platform, view pricing
- Cannot: Create loads, accept loads, receive payouts

**KYC Tier 1**:
- Phone verified + basic profile
- Can: Create loads (limited value), accept loads (limited corridors)
- Cannot: Use fast-track, access premium corridors, receive instant payouts

**KYC Tier 2**:
- Document verified (ID + business documents)
- Can: Create loads (standard value), use fast-track for urgent loads
- Required Documents:
  - For Orderers: Trade license, TIN certificate, bank statement
  - For Fleet Owners: Trade license, TIN, vehicle log books
  - For Drivers: National ID, driver license, kebele ID

**KYC Tier 3**:
- Full verification (Tier 2 + credit check for orderers, fleet inspection for owners)
- Can: Access rolling credit (orderers), instant payouts (fleet), priority matching

**KYC Tier 4+**:
- Reserved for enterprise accounts
- Custom limits and features

**Document Expiry Tracking**: Document expiry worker runs nightly, sending alerts at 30 days and 7 days before expiry. Trucks with expired insurance or inspection are automatically made ineligible for loads.

---

### SECTION 8: INCIDENTS AND RECOVERY

The platform handles disruptions as a normal part of logistics operations, with clear processes for each scenario.

#### Incident Types

**Late Delivery**:
- **Definition**: Delivery after scheduled window
- **Reporting**: Automatic (system detection) or manual (orderer report)
- **Platform Action**: Records delay, applies trust penalty, adjusts on-time rate
- **Human Intervention**: Escalation if > 3 hours late

**Cargo Damage**:
- **Definition**: Cargo condition degraded between pickup and delivery
- **Reporting**: Driver or orderer within 24 hours
- **Platform Action**: Creates incident, requests evidence photos
- **Human Intervention**: OPS reviews if damage > ETB 50,000 value

**Route Deviation**:
- **Definition**: Driver travels > 5 km from planned route
- **Reporting**: Automatic via GPS comparison
- **Platform Action**: Trust penalty, orderer notification
- **Human Intervention**: OPS review for deviation > 20 km or unauthorized purpose

**Breakdown**:
- **Definition**: Truck mechanical failure during trip
- **Reporting**: Driver via SOS feature
- **Platform Action**: Recovery resource matching, ETA adjustment
- **Human Intervention**: OPS assistance for extended breakdown (> 4 hours)

**Checkpoint Fee Dispute**:
- **Definition**: Driver and orderer disagree on checkpoint fee reimbursement
- **Reporting**: Either party
- **Platform Action**: References checkpoint intelligence database average
- **Resolution**: Orderer pays average; driver acknowledges any excess

**Cargo Shortage**:
- **Definition**: Units delivered < units picked up
- **Reporting**: Orderer at delivery
- **Platform Action**: Incident creation, evidence collection
- **Escalation**: OPS review required

**Wrong Delivery**:
- **Definition**: Cargo delivered to incorrect recipient
- **Reporting**: Orderer or intended recipient
- **Platform Action**: Immediate escalation to OPS
- **Severity**: Always HIGH

**Overload Detection**:
- **Definition**: Actual weight exceeds legal limit by > 5%
- **Reporting**: Weighbridge worker or driver log
- **Platform Action**: Warning in system, may block driver until acknowledged
- **Compliance**: Records for potential regulatory review

**SOS Trigger**:
- **Definition**: Emergency assistance request from driver
- **Reporting**: Driver app SOS button
- **Platform Action**: Immediate OPS alert, location sharing with nearest authorities
- **Response**: OPS contacts driver within 5 minutes

#### Incident Resolution Workflow

**Stage 1 — Reporting** (0-24 hours):
- Incident created with OPEN status
- Reporter provides description and initial evidence
- System assigns incident ID
- Notifications sent to involved parties

**Stage 2 — Evidence Collection** (0-72 hours):
- Both parties can submit evidence (photos, documents, voice notes)
- Evidence deadline: 72 hours from incident creation
- System stores evidence securely
- Parties can communicate through platform (monitored)

**Stage 3 — Negotiation** (0-72 hours):
- Parties attempt to resolve directly
- Platform provides mediation tools
- If resolved: Incident status → RESOLVED
- If not resolved: Auto-escalation at 72 hours

**Stage 4 — OPS Investigation** (72 hours - 7 days):
- Incident status → UNDER_INVESTIGATION
- OPS assigned
- Evidence review
- Interviews (via phone if necessary)
- Liability determination

**Stage 5 — Resolution** (Day 7):
- OPS decides:
  - Liability party (orderer, driver, fleet owner, third party)
  - Liability breakdown (if shared fault)
  - Financial compensation (if applicable)
  - Penalty (if applicable)
- Incident status → RESOLVED
- Financial transactions executed
- Trust scores updated

**Stage 6 — Closure** (7-14 days):
- 7-day appeal window
- If no appeal: Incident status → CLOSED
- If appealed: Super Admin review (rare)
- Final closure at 14 days (no further changes)

#### SLA Timelines

| Severity | First Response | Resolution Target | Escalation Trigger |
|----------|---------------|-------------------|-------------------|
| CRITICAL | 1 hour | 24 hours | Immediate |
| HIGH | 4 hours | 72 hours | 24 hours |
| MEDIUM | 24 hours | 5 days | 72 hours |
| LOW | 48 hours | 14 days | 7 days |

#### Recovery Resource Marketplace

When a driver reports breakdown, the system finds help:

**Search Radius**: 30 kilometers from breakdown location

**Resource Types**:
1. Mechanic: Mobile repair service
2. Tow Truck: Vehicle recovery to nearest garage
3. Replacement Truck: Alternative vehicle to complete delivery
4. Fuel Delivery: Emergency fuel supply

**Selection Process**:
1. Driver initiates recovery request
2. System queries RecoveryResource database for matches
3. Sorts by: Distance, response time, rating
4. Returns top 3 options
5. Driver selects resource
6. System notifies resource provider
7. Driver and provider coordinate directly
8. Driver logs resolution in system

**Provider Management**:
- Resources verified by OPS before inclusion
- Ratings tracked from driver feedback
- Average response time monitored
- Service fees capped at corridor averages

---

### SECTION 9: ETHIOPIAN-SPECIFIC FEATURES

The platform is built specifically for Ethiopian medium-haul logistics, accounting for unique local conditions.

#### Ethiopian Calendar Events

Four major events are pre-seeded and automatically affect pricing:

**GENNA** (ገና) — Ethiopian Christmas:
- Gregorian Date: January 7
- Impact: -40% demand (reduced freight activity)
- Affected Regions: All regions
- Pricing: Reduced quotes to maintain demand

**FASIKA** (ፋሲካ) — Ethiopian Easter:
- Gregorian Date: April 19
- Impact: -50% demand (highest disruption)
- Affected Regions: All regions
- Pricing: Maximum event multiplier (+10%)
- Note: Many drivers unavailable for several days

**MESKEL** (መስቀል) — Finding of the True Cross:
- Gregorian Date: September 27
- Impact: -30% demand
- Affected Regions: Central, South
- Pricing: Minor adjustment

**MAWLID** (ማውሊድ) — Prophet Muhammad's Birthday:
- Gregorian Date: June 7
- Impact: -35% demand
- Affected Regions: East, Central
- Pricing: Moderate adjustment

**Recurring Events**:
- Timkat, Enkutatash, Irreecha, and other events also tracked
- System automatically adjusts quotes during event periods
- Region-specific effects (e.g., harvest seasons vary by region)

**Wednesday and Friday Fasting**:
- Orthodox Christian fasting days
- System accounts for reduced demand on these days
- Perishable cargo pricing adjusted

#### Fuel Price Variability

Ethiopia has regional fuel price variations due to transport costs.

**Regional Fuel Prices** (seeded baseline):
- CENTRAL: ETB 85.50/liter
- NORTH: ETB 87.00/liter (+1.8%)
- SOUTH: ETB 86.00/liter (+0.6%)
- EAST: ETB 88.50/liter (+3.5%)
- WEST: ETB 86.50/liter (+1.2%)

**Driver Fuel Reporting**:
- Drivers incentivized to report current fuel prices
- Bonus: ETB 500 per validated report
- Cooldown: Once per hour
- Verification: Photo of station price board

**Price Surge Detection**:
- System detects price changes > 10%
- Triggers corridor surcharge adjustment
- Notifies affected orderers of quote changes
- Incentive creation for drivers to accept affected corridors

**Fuel Cost Estimation**:
- Default consumption: 25 liters per 100 km
- Calculated per corridor based on distance and regional price
- Shown to orderers in trip economics breakdown

#### Road Conditions and Night Restrictions

Most intercity corridors in Ethiopia prohibit heavy truck night driving.

**Night Driving Rules**:
- Restriction applies: 19:30 (7:30 PM) onwards
- Only exceptions:
  - Addis-Adama corridor (new highway, well-lit)
  - Intracity corridors (within city limits)
- **Penalty**: 50% match score reduction for night starts
- **Surcharge**: Peak hour multipliers account for day-only operation

**Road Condition Scores**:
- Live tracking based on driver reports
- Seasonal adjustments (rainy season = degraded roads)
- Affects pricing (worse roads = higher risk premium)
- Alternative routing suggestions for very poor conditions

#### Checkpoint Culture

Ethiopian trucking involves numerous checkpoints — official and informal.

**Checkpoint Intelligence System**:
- 6 checkpoints pre-seeded with average fees:
  - Kality Weighbridge: ETB 50,000 average (if overweight, up to ETB 150,000)
  - Mojo Police Check: ETB 20,000 average (informal)
  - Hawassa Entrance Toll: ETB 30,000 fixed
  - Modjo Junction Police: ETB 15,000-40,000
  - Dire Dawa City Boundary: ETB 10,000
  - Sendafa Weighbridge: ETB 50,000 average

**Driver Reporting**:
- Each checkpoint log contributes to database
- Rolling average calculated over time
- Outlier detection (fees far above average flagged)

**Fee Transparency**:
- Orderers see expected checkpoint fees in quote
- Protects drivers from unpredictable costs
- Orderers can dispute unusual fees through platform

**Weighbridge Process**:
- 5% tolerance rule: Within 5% of legal limit = pass
- Over 5% = overweight warning, potential fine
- Driver must log actual weight and legal limit
- System tracks patterns of overweight loads

#### Regional Demand Differences

Ethiopia's regions have distinct freight patterns:

**Central Region** (Addis Ababa area):
- Highest demand
- Best road conditions
- Most competitive rates
- Highest checkpoint concentration

**North** (Mekelle, Bahir Dar):
- Underserved (low supply of trucks)
- Mountainous terrain
- Longer transit times
- Opportunity for premium pricing

**South** (Hawassa):
- Industrial park demand
- Seasonal agricultural fluctuations
- Moderate supply/demand balance

**East** (Dire Dawa):
- Djibouti corridor gateway
- Strategic importance
- Higher prices due to distance

**West** (Jimma):
- Coffee region
- Seasonal harvest peaks
- Lower baseline demand

#### Amharic Language Support

Critical data supports Amharic:

**Amharic Names**:
- All 13 zones have Amharic names (e.g., KALITY → ቃሊቲ)
- All 5 terminals have Amharic names
- All 8 corridors have Amharic names
- All 4 seeded calendar events have Amharic names

**User Interface**:
- Drivers can register in Amharic
- SMS notifications sent in Amharic by default
- Push notifications support Amharic
- Customer support available in Amharic

**Default Language**: Amharic ("am") is the default preferred language for all users.

---

### SECTION 10: FRAUD AND SHADOW BROKER DETECTION

The platform protects against fraud schemes common in logistics markets.

#### Shadow Broker Detection

**What is a Shadow Broker**: A fraudster who:
1. Accepts a load through legitimate platform
2. Cancels the assignment before pickup
3. Contacts the orderer directly
4. Offers to do the job off-platform for cash
5. Completes delivery privately
6. Avoids platform commission
7. May repeat with multiple stolen loads

**Detection Method**:
- System monitors cancelled assignments
- For 6 hours after cancellation, tracks truck GPS
- If truck appears on same corridor as cancelled load:
  - Compares route to original load destination
  - Calculates match probability
  - Triggers SHADOW_BROKER_SUSPECTED event

**Flagging Threshold**:
- GPS proximity: Within 5 km of original pickup
- Time window: Within 6 hours of cancellation
- Route correlation: > 70% match to original destination

**Action on Detection**:
- Driver account flagged for fraud review
- OPS Admin notified
- Driver cannot accept new loads during investigation
- Driver receives SMS: "Account under review. Contact support."

**Investigation**:
- OPS reviews trip history
- Pattern analysis (multiple cancellations on same corridors)
- Communications with orderers (if any platform messaging)
- Final delivery location vs. original destination

**Penalties**:
- Confirmed shadow brokering: Permanent ban
- Trust score: Set to 0
- Financial penalties: Recovery of lost commission
- Blacklist: Shared with partner platforms

#### Fraud Flags

**Automatic Fraud Monitoring**:
- System monitors behavioral patterns
- Unusual activity triggers FRAUD_FLAG_RAISED event
- Flags include: severity level, confidence score, evidence

**Fraud Types Monitored**:
- Abnormal cancellation patterns
- Collusion (driver and orderer colluding to cancel and go offline)
- GPS spoofing location data
- Duplicate accounts
- Fake delivery confirmations
- COD theft or misreporting

**Severity Levels**:
- LOW: Suspicious pattern, monitoring
- MEDIUM: Likely fraud, temporary restrictions
- HIGH: Strong evidence, account suspension
- CRITICAL: Confirmed fraud, ban and legal referral

**Review Process**:
1. Flag raised by system
2. OPS investigator assigned
3. Evidence collection (48 hours)
4. Decision: Clear flag, suspend, or ban
5. Trust score adjusted accordingly

---

### SECTION 11: MARKET SHOCK SYSTEM

The platform adapts to market disruptions that affect logistics operations.

#### What Constitutes a Market Shock

**Shock Types**:

1. **Fuel Shortage**: National or regional fuel supply disruption
2. **Road Closure**: Highway or corridor blocked by landslide, flood, protest, construction
3. **Political Event**: Election periods, demonstrations, regional unrest
4. **Weather**: Heavy rains, flooding affecting road conditions
5. **Payment Crisis**: Bank system outages, liquidity shortages
6. **Manual**: OPS-created shocks for special circumstances

**Shock Severity** (0-4):
- **0**: No shock, normal operations
- **1**: Minor disruption, quotes unchanged
- **2**: Moderate disruption, reduced negotiation band
- **3**: Significant disruption, matching restricted to high-tier users
- **4**: Severe crisis, corridor frozen, matching paused

#### Shock Creation and Management

**Who Can Create**: OPS Admin or higher

**Required Fields**:
- Shock type (from enumerated list)
- Severity level (1-4)
- Affected corridors (one or many)
- Description and expected duration
- Triggered by (user ID)

**Shock State**:
```
ACTIVE → EXPIRED (when endedAt set or duration passed)
```

**Automatic Actions by Severity**:

**Severity 1**:
- Increased monitoring
- Checkpoint intelligence update frequency increased
- No pricing changes

**Severity 2**:
- Negotiation band max capped at 10%
- Matching includes tier 2+ drivers only
- Backhaul suggestions disabled (unreliable)

**Severity 3**:
- Negotiation band max capped at 5%
- Matching restricted to tier 3+ drivers
- Liquidity incentives auto-created for affected corridors
- OPS manual approval required for high-value loads

**Severity 4**:
- Corridor status: FROZEN
- No new loads accepted for affected corridors
- Active trips: OPS contacted for alternative routing
- Shock mode activated globally if > 50% of corridors affected

**Pricing Impact**:
- Band caps: Enforced per severity (Final Edit 9)
- Liquidity premium: Auto-applied if shock affects supply
- Backhaul discount: Suspended during shocks

**Shock Expiration**:
- Manual expiration by OPS Admin when conditions normalize
- Auto-expiration based on set end time
- 15-minute recheck via shock monitor worker

---

### SECTION 12: AUTOMATED BACKGROUND WORK (WORKERS)

Seventeen background workers run continuously to maintain platform operations.

#### Worker Schedule Summary

| Worker | Trigger | Frequency | Purpose |
|--------|---------|-----------|---------|
| Trust Worker | Event queue | Real-time | Recalculate trust scores on incidents |
| Escrow Worker | Trip delivery | Real-time | Process escrow releases |
| Notification Worker | Any event | Real-time | Send SMS/Push notifications |
| Incident Escalation | Incident age | Hourly check | Auto-escalate unresolved incidents |
| Corridor Snapshot | Timer | Every 6 hours | Capture corridor performance metrics |
| Shock Monitor | Timer | Every 15 minutes | Check for shock conditions |
| Document Expiry | Timer | Daily at 2 AM | Notify of expiring licenses/inspections |
| Rating Processor | Post-delivery | Event-triggered | Calculate and apply ratings |
| Pod Generator | Delivery | Event-triggered | Generate proof of delivery PDF |
| Webhook Delivery | Any event | Event-triggered | Send webhooks to orderer ERP systems |
| Performance Snapshot | Timer | Monthly | Generate monthly driver/fleet reports |
| Backhaul Matching | Trip complete | Event-triggered | Find return loads for empty trucks |
| Weighbridge Intelligence | Log submitted | Event-triggered | Update checkpoint fee averages |
| Fuel Intelligence | Snapshot created | Event-triggered | Track fuel prices, alert on surges |
| Route Deviation | GPS check | Continuous | Detect off-route driving |
| Zone Demand | Timer | Every 15 minutes | Recalculate supply/demand per zone |
| Idle Alert | Timer | Every hour | Find idle trucks, trigger backhaul |
| Broker Commission | Load delivered | Event-triggered | Calculate broker fees |

#### Detailed Worker Descriptions

**1. Trust Worker** (Priority: High)
- **Trigger**: Events affecting trust (incidents, delays, disputes, completions)
- **Frequency**: Real-time via event queue
- **Actions**:
  - Recalculate trust score using decay-weighted formula
  - Check for tier promotion/demotion
  - Update KYC tier based on document status
  - Emit TRUST_SCORE_UPDATED event
  - Handle Tier 5 manual review trigger

**2. Escrow Worker** (Priority: Critical)
- **Trigger**: Delivery confirmation events
- **Frequency**: Real-time
- **Actions**:
  - Verify delivery conditions met
  - Calculate payout amount (less commission)
  - Apply trust-appropriate delay (T+0 to T+7)
  - Schedule payout job
  - Update financial transaction records
  - Handle dispute holds

**3. Notification Worker** (Priority: High)
- **Trigger**: Any user-facing event
- **Frequency**: Real-time
- **Actions**:
  - Check user notification preferences
  - Send SMS via Africa's Talking integration
  - Send push via Firebase
  - Email for OPS events
  - Queue failed notifications for retry

**4. Incident Escalation Worker** (Priority: Medium)
- **Trigger**: Timer job
- **Frequency**: Every hour
- **Actions**:
  - Find incidents in OPEN status older than SLA threshold
  - Auto-escalate to next status if evidence deadline passed
  - Notify OPS Admin of overdue incidents
  - Update incident status to ESCALATED if auto-escalation

**5. Corridor Snapshot Worker** (Priority: Medium)
- **Trigger**: Timer
- **Frequency**: Every 6 hours (00:00, 06:00, 12:00, 18:00)
- **Actions**:
  - Capture load-to-truck ratio per corridor
  - Calculate health scores from road quality reports
  - Store historical snapshots
  - Flag corridors with insufficient stats
  - Determine expansion eligibility

**6. Shock Monitor Worker** (Priority: High)
- **Trigger**: Timer
- **Frequency**: Every 15 minutes
- **Actions**:
  - Check for active shock events
  - Evaluate expiration
  - Apply shock-based restrictions
  - Calculate shock pricing multipliers
  - Update corridor frozen status

**7. Document Expiry Worker** (Priority: Medium)
- **Trigger**: Timer
- **Frequency**: Daily at 2:00 AM
- **Actions**:
  - Find expiring documents (30-day warning)
  - Find recently expired documents (immediate block)
  - Send SMS alerts to users
  - Set truck isEligibleForLoads = false if insurance expired
  - Log expiry events

**8. Rating Processor Worker** (Priority: Low)
- **Trigger**: Post-delivery event
- **Frequency**: Delayed queue (24 hours after delivery)
- **Actions**:
  - Calculate average ratings for drivers
  - Update fleet owner ratings
  - Process rating impacts on trust scores
  - Store rating history

**9. POD Generator Worker** (Priority: Medium)
- **Trigger**: Delivery confirmation
- **Frequency**: Event-triggered
- **Actions**:
  - Generate PDF proof of delivery
  - Include trip summary, signatures, photos
  - Upload to S3
  - Generate download URL
  - Email to orderer

**10. Webhook Delivery Worker** (Priority: Medium)
- **Trigger**: Any event with webhooks enabled
- **Frequency**: Real-time
- **Actions**:
  - Find orderer webhook URLs
  - POST event payload
  - Retry on failure (exponential backoff)
  - Deactivate after 5 consecutive failures
  - Log delivery status

**11. Performance Snapshot Worker** (Priority: Low)
- **Trigger**: Timer
- **Frequency**: Monthly (1st of month at 3:00 AM)
- **Actions**:
  - Generate monthly performance reports
  - Calculate trips completed, on-time rate, earnings
  - Store in DriverPerformanceSnapshot table
  - Available for fleet dashboards

**12. Backhaul Worker** (Priority: High)
- **Trigger**: Trip completion events
- **Frequency**: Real-time
- **Actions**:
  - Find available loads near truck's current location
  - Filter by zone and adjacent zones
  - Check weight compatibility
  - Calculate match scores with urgency bonus
  - Create BackhaulSuggestion records
  - Notify driver via push/SMS
  - Expire suggestions after 20 minutes

**13. Weighbridge Intelligence Worker** (Priority: Medium)
- **Trigger**: Weighbridge log submitted
- **Frequency**: Event-triggered
- **Actions**:
  - Validate weight vs. legal limit
  - Calculate 5% tolerance check
  - Update average checkpoint fees for corridor
  - Flag consistent overloading patterns
  - Emit OVERLOAD_DETECTED if outside tolerance

**14. Fuel Intelligence Worker** (Priority: Medium)
- **Trigger**: Fuel price snapshot created
- **Frequency**: Event-triggered
- **Actions**:
  - Compare to previous snapshots
  - Detect price surges (> 10% change)
  - Update corridor fuel multipliers
  - Create DriverEarning for fuel report bonus (ETB 500)
  - Emit FUEL_PRICE_UPDATED event

**15. Route Deviation Worker** (Priority: High)
- **Trigger**: Continuous GPS processing
- **Frequency**: Every GPS ping
- **Actions**:
  - Compare actual location to planned route
  - Detect deviation > 5 km threshold
  - Apply trust penalty
  - Notify orderer
  - Log deviation to RouteDeviation table
  - Escalate if > 20 km or > 30 minutes deviation

**16. Zone Demand Worker** (Priority: Medium)
- **Trigger**: Timer
- **Frequency**: Every 15 minutes
- **Actions**:
  - Count available trucks per zone
  - Count open loads per zone
  - Calculate demandPressure = openLoads / max(availableTrucks, 1)
  - Update zone.truckDemandIndex:
    - demandPressure > 2.0: 1.0
    - demandPressure > 1.0: 0.7
    - demandPressure > 0.5: 0.4
    - else: 0.2
  - Create ZoneDemandSnapshot record

**17. Idle Alert Worker** (Priority: Medium)
- **Trigger**: Timer
- **Frequency**: Every hour
- **Actions**:
  - Find trucks stationary > 4 hours
  - Verify not in terminal queue (different status)
  - Check if driver is AVAILABLE
  - Trigger backhaul suggestion if match found
  - Emit TRUCK_IDLE_ALERT event
  - Notify fleet owner

**18. Broker Commission Worker** (Priority: Low)
- **Trigger**: Load delivered
- **Frequency**: Event-triggered (with delay for dispute window)
- **Actions**:
  - Find broker who created match
  - Calculate commission: ETB 20,000 per match (configurable)
  - Credit broker account
  - Update broker total earnings
  - Emit BROKER_SUGGESTION_ACCEPTED event

---

### SECTION 13: WHAT EACH INTERFACE NEEDS FROM THIS BACKEND


The backend provides data and capabilities to multiple user-facing interfaces.

#### Driver Mobile App

**Real-Time Capabilities**:
- GPS location ping submission every 15 minutes during active trips
- Online/offline status management
- Push notification receive and acknowledge

**Load Management**:
- View available load offers with WDM scores
- Accept/reject assignments with one tap
- View load details: origin, destination, cargo, weight, payout estimate
- See pickup and delivery window times

**Trip Execution**:
- Start trip with GPS verification
- Log checkpoints with type, fee, delay
- Report fuel prices with photo upload
- Submit weighbridge logs: actual weight, legal limit, fine paid
- Breakdown recovery request with nearest help location
- Upload Proof of Delivery: photo, signature, recipient name
- Report incidents with severity and description
- Trigger SOS emergency

**Financial View**:
- Current trip earnings (base + expected bonuses)
- Bonus history: on-time, checkpoint, fuel report, backhaul, perfect week
- Pending vs. paid status
- Fleet owner payment history

**Schedule Management**:
- Set availability windows
- Set preferred corridors
- Set home zone
- View shift hours remaining (10-hour daily limit)
- Manage rest periods

#### Fleet Owner Web Dashboard

**Fleet Live View**:
- Map view of all trucks with current GPS
- Status indicators: AVAILABLE, EN_ROUTE, AT_PICKUP, DELIVERED
- Zone locations per truck
- Driver names and contact info
- Last ping timestamp

**Load and Trip Management**:
- View suggested assignments per truck
- Accept/reject on behalf of drivers
- Track trip progress in real time
- View estimated arrival times
- Access trip history and delivery confirmations

**Driver Management**:
- Driver trust scores and tier levels
- Compliance status (license, medical, training)
- Performance metrics: on-time rate, trip count
- Driver earnings and bonus management

**Financial Dashboard**:
- Escrow balance: total held across active trips
- Pending payouts by expected date
- Recent payouts with transaction IDs
- Commission breakdown
- Driver earnings owed (pending bonuses)
- Expense logging: fuel, maintenance, checkpoint fees

**Alert Center**:
- Idle truck alerts (> 4 hours)
- Document expiry warnings (30, 7 days)
- Incident notifications involving fleet
- Trust score changes
- Maintenance due alerts

**Reporting**:
- Corridor performance (trips per corridor)
- Revenue per kilometer/quintal
- Driver utilization rates
- Monthly performance metrics
- Export to Excel/PDF

#### Orderer Web/Mobile Interface

**Load Creation**:
- Corridor selection from map or list
- Cargo type, weight, volume inputs
- Pickup and delivery scheduling with calendar
- Special requirements: refrigeration, hazardous, insurance
- Save load templates for recurring shipments
- Template auto-post scheduling

**Pricing and Quotes**:
- Instant quote display with breakdown
- Accept, reject, or negotiate
- View price history for corridor
- Compare to historical averages

**Trip Tracking**:
- Real-time truck location on map
- Current status and estimated arrival
- Checkpoint logs with timestamps
- Delivery confirmation status

**Financial Management**:
- Escrow funding status
- Payment history (escrow, COD, credit)
- Invoice generation and download
- Credit line status (if approved)

**Dispute Management**:
- Raise dispute with reason selection
- Upload evidence photos, documents
- View dispute status and timeline
- Communication with fleet via platform messaging
- Resolution outcome and financial adjustments

**Fast-Track Access**:
- KYC tier display
- Fast-track toggle for urgent loads
- Eligibility confirmation

#### OPS Admin Dashboard

**System Overview**:
- Active trips count and map
- Zone demand heat map
- Corridor health scores
- Open incidents by severity
- Recent events feed

**Market Shock Management**:
- Create/edit shock events
- View active shocks with affected corridors
- Accept/reject manual override requests
- Review automatic shock detection

**Zone Management**:
- Override demand indices
- View zone snapshots
- Terminal queue monitoring
- Zone performance analytics

**Compliance Management**:
- KYC review queue
- Document verification workflow
- Tier upgrade/downgrade approval
- Trust score manual review (Tier 5)

**Fraud Investigation**:
- Fraud flags inbox
- Shadow broker detection alerts
- Pattern analysis tools
- Account suspension/reinstatement
- Evidence review panel

**Broker/Agent Management**:
- Broker verification queue
- Commission rate configuration
- Broker performance tracking
- Field agent assignment to zones

**Recovery Resources**:
- Add/edit mechanic and tow truck providers
- Verify provider credentials
- Monitor response times
- Provider rating review

#### Finance OPS Interface

**Voucher Management**:
- Create vouchers: amount, recipient, expiry
- View voucher status: active, redeemed, expired
- Redemption history
- Bulk voucher creation for marketing

**Payout Processing**:
- Pending payouts queue
- Manual payout triggers
- Payout failure investigation
- Bank integration management

**Commission Tracking**:
- Commission configuration
- Per-orderer rates
- Per-corridor rates
- Transaction-level commission view

**Liquidity Incentives**:
- Create corridor-specific incentives
- Set incentive types: guaranteed minimum, fuel subsidy, driver bonus
- Monitor incentive effectiveness (usage count)
- Target specific supply/demand imbalances

**COD Reconciliation**:
- COD discrepancy reports
- Driver collection vs. expected amounts
- Investigation workflow
- Settlement adjustments

#### Field Agent Mobile App

**Load Verification**:
- Access assigned loads
- Verify load details at pickup
- Document actual weight and condition
- Photo capture for verification

**KYC Assistance**:
- Help users complete registration
- Document photo capture
- ID verification checklist
- Submit documents for OPS review

**On-Ground Support**:
- View delivery disputes in zone
- Take verification photos
- Interview parties
- Submit field reports

---

### SECTION 14: GAPS AND FLAGS

This section identifies what is missing from the system and potential issues requiring attention.

#### MISSING FROM THE SYSTEM

**1. Weightbridge Integration**
- **Gap**: Weighbridge logs are manually entered by drivers
- **Impact**: Potential for misreporting, no real-time overload prevention
- **Ethiopian Context**: Official weighbridges exist with digital outputs
- **Recommendation**: API integration with major weighbridges for automatic weight logging

**2. Truck Association Integration**
- **Gap**: No integration with Ethiopian Truck Owners Association or regional associations
- **Impact**: Missed opportunity for fleet recruitment, industry data sharing
- **Recommendation**: Partnership integration for association member onboarding

**3. Ethiopian Revenue Authority (ERA) Integration**
- **Gap**: No TIN verification against ERA database
- **Impact**: Cannot verify TIN certificates are valid
- **Regulatory Risk**: KYC may be incomplete
- **Recommendation**: API integration with ERA for TIN validation

**4. E-way Bill System**
- **Gap**: No integration with Ethiopian e-way bill system for cargo tracking
- **Impact**: Duplication of documentation, regulatory compliance gap
- **Recommendation**: Research Ethiopian Customs e-way bill requirements for freight platforms

**5. Amharic OCR**
- **Gap**: Document processing does not support Amharic text extraction
- **Impact**: Manual review required for all Amharic documents
- **Recommendation**: Add Amharic OCR support for faster KYC processing

**6. Offline Mode for Rural Areas**
- **Gap**: Driver app requires constant internet connection
- **Impact**: Poor functionality in areas with weak mobile data (common on rural corridors)
- **Recommendation**: Implement offline-first architecture with sync queue

**7. Ethiopian Calendar Religious Holidays**
- **Gap**: Only 4 major holidays seeded
- **Impact**: Missing dozens of fast days and regional holidays affecting demand
- **Recommendation**: Expand to include Timkat, Enkutatash, Irreecha, regional holidays

**8. Load Consolidation UI**
- **Gap**: Backend supports consolidation, but no dedicated UI for consolidation agents
- **Impact**: Feature underutilized
- **Recommendation**: Build consolidation agent dashboard for managing aggregated loads

**9. Fleet Insurance Claims**
- **Gap**: No integration with insurance providers for claim filing
- **Impact**: Manual process for cargo damage claims
- **Recommendation**: Partner with insurance companies for digital claim submission

**10. Multi-Language Support**
- **Gap**: Only Amharic and English supported
- **Impact**: Excludes drivers from Oromo, Somali, Tigray regions
- **Recommendation**: Add Oromigna, Tigrinya, Somali language support

**11. USSD for Feature Phones**
- **Gap**: Requires smartphone for full functionality
- **Impact**: Excludes drivers with basic phones (still common in Ethiopia)
- **Recommendation**: USSD interface for load acceptance, location sharing

**12. Fixer/Loader Network**
- **Gap**: No support for loading and unloading labor
- **Impact**: Drivers and orderers arrange loading labor separately
- **Recommendation**: Add fixer (loader) marketplace with fixed pricing

**13. Ethiopian Transport Law Compliance**
- **Gap**: Hours of service tracking is system-only, not integrated with official driver logbooks
- **Impact**: May not satisfy regulatory requirements
- **Recommendation**: Align with Ethiopian Ministry of Transport driver time regulations

#### PRESENT BUT UNCLEAR

**1. Shadow Broker Geography Matching**
- **Observation**: Shadow broker detection requires truck GPS on same corridor within 6 hours
- **Question**: Is 5 km proximity threshold too wide for Ethiopian highways?
- **Risk**: False positives on busy corridors

**2. Night Restriction Logic**
- **Observation**: System applies 50% match penalty for night starts
- **Question**: Does this align with Ethiopian Federal Transport Authority regulations?
- **Risk**: If Ethiopian law prohibits night driving for heavy trucks, penalty should be 100%

**3. Corridor Health Score**
- **Observation**: Score exists in schema but calculation method unclear
- **Question**: What factors contribute to health score?
- **Impact**: Not used in pricing or matching logic currently

**4. Ethiopian Calendar Day Calculations**
- **Observation**: Events seeded by Gregorian date
- **Question**: System doesn't convert Ethiopian calendar dates automatically
- **Risk**: May miss events if only Ethiopian date is known

**5. Zone Demand Index Granularity**
- **Observation**: Index updated every 15 minutes
- **Question**: Is this too infrequent for real-time pricing?
- **Impact**: May lag actual demand spikes

#### POTENTIAL ISSUES

**1. Five Percent Overload Tolerance**
- **Rule**: System allows 5% weight overage before flagging
- **Ethiopian Law**: Ethiopian weighbridge law may have different tolerance
- **Risk**: If Ethiopian law has stricter limits, system encourages non-compliance
- **Recommendation**: Verify and align with Federal Transport Authority regulations

**2. Backhaul Bonus Timing**
- **Rule**: 20-minute window for backhaul acceptance
- **Issue**: In Ethiopian terminal culture, drivers may need more time to arrange return loads
- **Risk**: Too short may reduce utilization; too long loses opportunity

**3. Checkpoint Fee Reimbursement**
- **Question**: Who pays checkpoint fines for overweight?
- **Current**: Implied fleet owner pays
- **Issue**: If orderer declared weight incorrectly, should orderer pay?
- **Risk**: Unfair burden on drivers/fleet

**4. COD Handler Verification**
- **Observation**: COD requires separate driver verification
- **Question**: How is cash handling security managed?
- **Risk**: Driver safety carrying large cash amounts
- **Recommendation**: Mandatory cash deposit points, telebirr integration

**5. Foreign Exchange Risk**
- **Observation**: Prices in Ethiopian Birr only
- **Gap**: No hedging for clients with USD expenses
- **Risk**: If USD approvals delayed, fleet owners may face forex issues
- **Note**: This may be out of platform scope

**6. Peak Hour Multipliers**
- **Rule**: Peak hours 6-9 AM, 3-6 PM Ethiopian time
- **Question**: Are these accurate for Ethiopian urban traffic patterns?
- **Suggestion**: Validate against actual Addis Ababa congestion data

**7. Terminal Queue GPS Radius**
- **Rule**: 400 meter radius for terminal check-in
- **Question**: Is this appropriate for large truck terminals?
- **Risk**: Trucks parked just outside radius excluded

**8. Fuel Price Bonuses**
- **Rule**: ETB 500 for valid fuel price report
- **Question**: Sufficient incentive for regular reporting?
- **Risk**: Low participation affects pricing accuracy

**9. Driver Hours of Service**
- **Rule**: 10 hours driving maximum per 24 hours
- **Ethiopian Law**: Verify alignment with Ethiopian regulations
- **Current**: System warning at 8, soft block at 10, hard block at 12
- **Question**: Ethiopian law may have different thresholds

**10. Mobile Money Integration**
- **Observation**: Only telebirr mentioned for instant payouts
- **Gap**: No CBE Birr, M-Birr, HelloCash integration
- **Impact**: Limited payout options for fleet owners
- **Recommendation**: Add major Ethiopian mobile money providers

**11. Network Timeout Handling**
- **Observation**: Location pings require 15-minute intervals
- **Question**: What happens if driver loses signal for > 30 minutes?
- **Risk**: False idle alerts, trust penalties
- **Recommendation**: Grace period for signal loss, offline queue

**12. Broker Commission Model**
- **Rule**: Fixed ETB 20,000 per match
- **Question**: Is this competitive with traditional brokerage?
- **Risk**: May not attract experienced brokers
- **Suggestion**: Tiered commission based on load value

---

END OF DOCUMENT
