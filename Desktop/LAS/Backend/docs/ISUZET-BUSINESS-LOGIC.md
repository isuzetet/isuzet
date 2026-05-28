# ISUZET — Ethiopian Inland Logistics Platform
## How the System Works: Complete Business Logic Guide

### 1. What ISUZET Does

ISUZET is the technology platform that connects cargo owners (orderers) with truck drivers and fleet owners across Ethiopian inland routes. It solves four critical problems in the market: (1) drivers can't easily find cargo loads, (2) cargo owners can't find reliable drivers, (3) both sides lack trust of each other, and (4) payment happens only after physical cash is exchanged—losing days and creating conflict. ISUZET puts escrow and digital trust at the center: cargo owners lock money when posting jobs, the platform matches them with trustworthy drivers, and payment is automatic upon delivery confirmation. This cuts delivery times, removes payment risk, and enables small traders to access professional logistics.

The platform works for all Ethiopian inland routes: Addis to regional cities (Hawassa, Bahir Dar, Jimma, Gondar), inter-regional corridors, and local consolidation runs. All prices, payments, and weights use standardized Ethiopian units (Ethiopian Birr, kilograms) for simplicity. The system is accessible—drivers without smartphones can use it via basic USSD phone menus and SMS, while fleet managers and large traders get a full app with real-time tracking, analytics, and automated scheduling.

---

### 2. Who Uses the Platform

**Orderer (Cargo Owner / Shipper)**  
Posts cargo loads and pays into escrow. Can be a large import/export company, FMCG distributor, agricultural exporter, or individual trader. Wants reliable pickup/delivery attestation, fair pricing vs. informal brokers, and reduced negotiation time. Access: smartphone app or web portal.

**Driver (Truck Operator)**  
Accepts loads and earns freight charges. May own a truck outright, operate as part of a fleet under a fleet owner, or work on commission. Seeks transparency in earnings, boost to income, and protection from non-credible orderers. Access: smartphone app or USSD (*862#) if using basic phone.

**Fleet Owner (Truck Company)**  
Manages 2+ trucks and driver workforce. Owns the ISUZET account, sets driver access, collects payouts, and handles insurance/maintenance. Platform gives real-time visibility into truck location, driver behavior, and consolidated earnings reports. Access: app and admin dashboard.

**Community Agent / Delala (Field Agent)**  
Operates in rural zones, registers local farmers/traders as clients, creates loads on their behalf, collects cash, then settles via mobile money. Earns commission per quintal transported. Bridges the digital and cash-based economy. Access: smartphone app with simplified UX, SMS support.

**Transport Cooperative**  
Organization of truck owners/drivers in a region. Dispatcher (designated cooperative member) can accept loads on behalf of member trucks without offering to multiple drivers first. Cooperatives get volume discounts and consolidated reporting. Access: dedicated dispatcher portal.

**Operations Admin / OPS **  
Platform team members who monitor system health, investigate disputes, manage fraud, adjust config settings in real-time, and handle emergency escalations. This is internal staff and regional fleet liaison teams.

---

### 3. How a Load Gets From A to B

**Step 1: Orderer Posts a Load**  
Orderer logs in, selects origin/destination zones, specifies: cargo type (e.g., grains, vegetables, livestock), total weight, pickup date/time, special requirements (refrigeration, fragile), and estimated value. System calculates escrow hold amount and orderer funds it via mobile money or bank account. Load enters "OPEN" status and platform notifies available drivers.

**Step 2: Matching System Finds Drivers**  
The WDM (Weighted Driver Matching) engine scores all available drivers using an algorithm that considers: how far they are from pickup (proximity), their trust score (past delivery reliability), on-time track record, familiarity with this corridor, current load preferences, and whether the cargo type is in their specialty. Top 3 qualified drivers get a 20-minute offer window.

**Step 3: Driver Accepts or Declines**  
Driver sees the offer (destination, rate, special requirements, any bonus available) and accepts or declines. If driver accepts, they confirm pickup location, estimated time, and receive trip details. If all top 3 decline, system hits next batch of drivers. If still no takers after 2 hours, orderer is notified and can adjust price or change parameters.

**Step 4: Pickup & Trip Starts**  
Driver arrives at pickup zone/location (verified via GPS). Orderer or their agent confirms cargo is loaded with correct weight and condition. Driver reports "Trip Started" in app/SMS and heads toward destination. Platform begins tracking GPS location, ETA, and any deviations from planned route.

**Step 5: En-Route Monitoring**  
Driver sends location updates periodically or continuously (app-based drivers). Platform detects any significant deviation from planned route (> 5km off-route) and asks driver for explanation. Legitimate reasons (road closed, police redirect, fuel stop) don't trigger penalties. System alerts orderer if trip is behind expected ETA so they can notify recipients.

**Step 6: Delivery & Escrow Release**  
Driver arrives at destination. In app: driver takes photo of cargo with GPS geolocation recorded. In SMS/USSD: system sends OTP to orderer who confirms receipt and payment independently. Recipient or orderer scans/validates condition, signs off, and system automatically releases escrow payment to driver (minus platform commission) within minutes. Same-day or next-business-day bank transfer.

**Step 7: Driver Gets Paid**  
Platform transfers driver's earnings (escrow amount minus 8-12% platform commission) directly to driver's registered mobile money account or bank. For owner-operator or fleet drivers, payouts funnel through the fleet owner for accounting consolidation.

---

### 4. How the Matching System Works

The WDM (Weighted Driver Matching) system scores drivers using eight factors, each weighted based on real market research:

- **Route Familiarity** (22%): Has driver done this corridor before? Prior trips decrease uncertainty and guarantee faster pickup/delivery.
- **Trust Score** (16%): Past on-time deliveries, incident-free trips, no cancellations. Built over months of platform activity.
- **On-Time Rate** (18%): Percentage of deliveries within promised ETA. High performers get matched earlier.
- **Availability** (15%): Is driver currently free and not overloaded? Prevents over-commitment.
- **Load Preference** (8%): Does driver prefer this cargo type? E.g., some drivers specialize in perishables (cold) or hazmat.
- **Zone Coverage** (7%): Is driver home-based in or familiar with destination zone? Improves return-load probability.
- **Corridor Familiarity** (3%): Specific experience on this exact corridor (vs. general route knowledge).
- **Proximity** (11%): How close is driver to pickup? Saves time and fuel.

Each score is 0-1. Final WDM score multiplies each factor by its weight and sums to 0-1. Drivers with 0.80+ get preferred matching. If a driver has matched with an orderer before, there's a 0.15 bonus if they both rated each other highly ("Preferred" status). If they had a bad experience, that pairing is blocked forever ("Blocked" status).

**For new drivers**: System gives them "cold start" treatment—first 3 loads guaranteed match at 10% premium rate, auto-assigned to high-reliability corridors. This onboards new drivers without starving them during trust-building.

---

### 5. How Money Moves

**Escrow = Trust Ledger**  
When orderer posts a load, system calculates "escrow hold": the expected freight cost. Orderer locks this amount in a virtual account (no money leaves their bank immediately—stays with platform). It's held until delivery is confirmed. If delivery never happens, money is returned. If delivered, money is released to driver's account.

**Platform Commission**  
For each successful delivery, platform keeps 8-12% of the freight cost according to load value tiers:
- Under ETB 5,000: 12%
- ETB 5,000-30,000: 10%
- ETB 30,000-100,000: 8%
- Over ETB 100,000: 6%

This is deducted from escrow before driver payment.

**Agent Commission (Per-Quintal Model)**  
Community Agents earn by volume, not percentage. For each quintal (100kg) of cargo consolidated through them, they earn ETB 50-150 depending on corridor demand. E.g., consolidating 5 quintals on Addis-Hawassa earns ETB 400-750 gross. Agents keep 80%, platform takes 20% (revenue share).

**Bonuses & Incentives**  
- On-time delivery: ETB 100-500 bonus to driver
- Zero damage: ETB 50-300 bonus
- Perfect week (5+ trips 100% on-time): ETB 5,000 bonus
- Road alert verified: ETB 200 bonus (if driver reports closed road and others confirm)
- Referral: New driver referred and completes 3 trips: referrer gets ETB 500-1,500

**Micro-Credit (Ye Gara Neger Model)**  
Small traders can borrow up to ETB 20,000 to pay for first loads before customer payment arrives. Repayment: 7 days after delivery. Community Agent vouches for the trader as guarantor. If trader defaults, agent's next 3 commission payments are held in escrow as penalty. If too many agent-vouched loans default (>20%), agent loses vouching authority for 60 days.

**Cold-Start Subsidy**  
New drivers get first 3 loads at guaranteed rate (1.10x normal rate). Platform absorbs the cost to onboard trustworthy drivers faster. This ensures reliable matching pool even during growth phase.

---

### 6. Multi-Stop Deliveries (Partial Delivery)

Many loads don't go to one destination. Example: Addis distributor sends 40 bags of flour to Hawassa (10 bags), Konso (15 bags), Arba Minch (15 bags). One truck, three stops. How is payment split fairly?

**Proportional Escrow Release**  
Total load value = ETB 50,000. Split: Hawassa 20% = ETB 10,000, Konso 37.5% = ETB 18,750, Arba Minch 37.5% = ETB 18,750. When truck confirms each stop's delivery (photo + recipient name), that percentage releases immediately. Driver sees real-time earnings accumulation.

**Confirmation Methods (4 options for rural)**:
1. **OTP (Mobile Phone)** — System texts orderer a 4-digit code. Orderer texts back to confirm. Fastest.
2. **Photo + GPS** — Driver takes photo of cargo with location locked. Proof-capture for disputes.
3. **Agent Confirmation** — Local community agent physically verifies cargo. Used in remote areas.
4. **Voice Note** — Driver records voice confirmation of delivery with recipient name.

This flexibility enables rural areas without 24/7 cell coverage to still use the platform.

---

### 7. Consolidated Loads (LTL — Less Than Truckload)

**The Problem**: Single small trader has 5 quintals (500kg) of honey, but full truck holds 50 quintals. Impossible to charter alone. Traditionally pays informal broker 15% to wait and collect from 8 traders. Takes days, broker may disappear, no coordination.

**ISUZET Solution: Consolidation Hub Role**  
Community Agent (or platform-designated consolid agent) holds a "consolidation load" open for 6 hours. Accepts honey from 8 different small traders, each paying separately into escrow (proportional). Once consolidated, one truck picks up from the agent's warehouse, delivers to buyer. Each trader's portion is released at destination confirmation. Agent earns commission on consolidation fee (ETB 50/quintal).

**No-Show Penalty**  
If a trader posts cargo to consolidation, then doesn't show at pickup, they're charged ETH 500 no-show fee and can't create new loads for 7 days. Protects agent's timeline and other traders' on-time delivery.

---

### 8. Special Cargo Types

**Khat (Chat) — Time-Critical**  
Fresh khat leaves wilt in 6 hours. System automatically marks khat loads as "TIME_CRITICAL" and skips normal matching queue. Top 3 nearest drivers get 5-minute aggressive offer (not 20 min). 15% price premium auto-applied. Delivery deadline locked. 20% driver bonus on time. No exceptions—market demands this speed.

**Livestock — Per-Head Payment, Heat Restrictions**  
Payment basis switches from per-kg to per-head-delivered. Example: 100 cattle, ETB 5,000/head. If 5 die in transit, payout = 95 heads × ETB 5,000. Driver must upload veterinary certificate proving health at pickup. Platform blocks livestock departures 11am-3pm during May-September (peak heat) to prevent mortality. Truck must have certified livestock cage body type.

**Refrigerated Cargo (Dairy, Fresh Produce, Frozen Meat)**  
Driver logs temperature every 2 hours. System auto-calculates acceptable range per cargo type (e.g., dairy +2 to +6°C). If temp outside range for >30 min, auto-incident flag. At delivery, system generates "cold chain certificate" proving continuous compliance—required by buyer for food import/retail. Damages cold chain = payment reduced 20-40% plus incident mark.

**Hazmat (Fuel, Chemicals)**  
Requires certified driver, certified truck, and hazmat insurance. System verifies all three before matching. Price premium 25%. Emergency contact mandatory on shipment. One incident = hazmat driver permanently blocked.

---

### 9. Rural & Feature Phone Access

**40-60% of drivers don't have smartphones**. ISUZET works anyway via USSD.

**USSD Menu: *862#**  
1. **My Loads** — See pending/active offers (SMS sent: "Addis→Hawassa 8T 4500ETB: Reply 1 accept")
2. **Report Location** — Report current zone/GPS coordinates (text)
3. **Confirm Delivery** — Enter OTP code sent by platform to confirm arrival
4. **SOS** — Emergency panic button. OPS team auto-notified with last GPS
5. **Fuel Report** — Report fuel price, availability at current location (helps other drivers + gets ETB 500 bonus if verified)

**SMS Load Offer Flow**:  
System texts feature phone: "RUIT offer: Addis→Hawassa, 8T, ETB 4500. Reply 1 to accept, 2 to decline. 20 min expiry."  
Driver texts "1" → Load accepted, SMS confirms, shows pickup details.

**Offline Sync**:  
Driver updates (location, fuel, notes) can pile up in phone memory, then sync when back in coverage. No live tracking, but 2-hour reconciliation works for inland routes.

---

### 10. Trust and Reputation System

**Trust Score: 0-100**  
Calculated continuously from:
- On-time deliveries: ↑ (each +2-3 points)
- Late deliveries: ↓ (each -3-5 points)
- Cancellations: ↓ (each -15 points)
- Cargo damage claims: ↓ (each -10 points)
- Disputes filed against driver: ↓ (each -8 points)
- Perfect weeks (5+ on-time trips): ↑ (each +20 points)

Decay: Older incidents impact score less. A collision from 6 months ago matters less than one from last week.

**Tiers**: 
- Tier 5 (90+): Elite driver, first pick for premium loads, 5% rate bump
- Tier 4 (80-89): Reliable, standard matching priority
- Tier 3 (70-79): Acceptable, lower priority in matching
- Tier 2 (55-69): Probation—can still work but limited load access
- Tier 1 (40-54): Warned—flagged to fleet owner
- Tier 0 (<40): Suspended—no new loads until trust recovers

**How Trust Affects**: Which loads get offered first, eligibility for micro-credit, cooperative membership, prime route assignment, pricing (Tier 5 gets +5% surge pricing preference).

---

### 11. Safety & Emergency Features

**SOS (Medical Emergency)**  
Driver presses "SOS" button in app or texts "SOS" via USSD. Platform immediately:
- Records driver's last GPS location
- Alerts regional OPS center + closest medical facility
- Notifies fleet owner + driver's emergency contact
- Holds load in place (no further routing)
- Blocks other demand from matching until SOS resolved

**Road Alerts (Crowdsourced)**  
Driver reports: Road closed (landslide), flooding, police checkpoint delay, fuel shortage. Other drivers in that corridor see alert for 6 hours, can adjust route. Verified alert (3+ drivers confirm same issue) = ETB 200 bonus to first reporter.

**Checkpoint Detention**  
If police/customs hold truck at checkpoint >30 min, driver reports in app with expected release time. Platform doesn't penalize driver for delay (no trust score drop). OPS Admin marks detention as "no-fault" so trip timeline adjusts retroactively. Protects driver from false accusations.

---

### 12. Community Agent (Delala) Role

**What They Do**:  
- Register 20-50 farmer/trader clients with phone number only (no ID needed)
- Create loads on clients' behalf (client doesn't need smartphone)
- Collect cash from clients (ETB + 2% service fee)
- Settle with platform via mobile money every 2 hours
- Troubleshoot client issues (no cargo, late pickup, damaged goods)

**How They Earn**:  
Per-quintal commission: ETB 50-150/quintal depending on corridor demand. Consolidating 10 quintals Addis→Jimma = ETB 800-1,500 gross. Agent keeps 80%, platform takes 20%.

**Trust & Accountability**:  
- If agent consolidates cargo from 3 traders and 1 no-shows, agent pays no-show fee
- Agent can vouch for micro-credit borrowing (guarantor), but if borrower defaults 3x, agent loses vouching right for 2 months
- Agent gets 1-star feedback from any client = deactivated until reviewed by OPS

**Training & Support**:  
Platform provides SMS guides and weekly updates. Agents access support line via phone. Literacy/language support provided in local languages.

---

### 13. Transport Cooperatives

**What They Are**:  
Organized group of 5-20 truck owners in a region, legally registered, with elected dispatcher (treasurer/logistics person). Cooperative gets bulk account, volume pricing, and load routing preference.

**Dispatcher Authority**:  
Instead of offering load to many drivers (WDM), load goes to cooperative dispatcher first. Dispatcher knows member drivers, assigns to most suitable one based on relationship + truck availability. This gives cooperatives "family first" priority without sacrificing responsiveness.

**Economics**:  
- Load offer goes to cooperative dispatcher
- Dispatcher assigns to member truck/driver
- Member receives load at 95% of standard rate (cooperative takes 5%)
- Cooperative buys fuel in bulk, shares discounts with members
- Cooperative liability: 40% of individual penalty if member driver causes issue (damage, late, etc.) — protects members from reputational collapse

---

### 14. Market Day Intelligence

Market-to-market routes have seasonal spikes. Example: Addis-to-Hawassa flower market Mondays and Thursdays. System tracks 15+ major weekly markets, knows typical demand surge on those dates, and auto-adjusts pricing 15% up on high-demand days ($ETH 4,500 becomes ETB 5,175). Orderers can still post, but drivers prefer to work market-day spikes for higher earnings.

---

### 15. Seasonal Pricing (Rainy Season)

June-September (rainy season) affects road conditions on specific corridors. System auto-applies:
- **Transit time multiplier** (1.10-1.20x): Routes take longer due to mud, flooding
- **Risk premium** (1.08-1.15x): Insurance and accident risk up; more breakdowns
- **Price adjustment**: Addis-Hawassa normal ETB 4,500 becomes ETB 5,200-5,400 June-Sep

Roads self-heal October-May; pricing returns to normal. Orderers see this transparently: "Rainy season active—expect longer transit, elevated road conditions on this corridor."

---

### 16. Fraud & Integrity Mechanisms

**Shadow Broker Detection**:  
If driver cancels load 3+ times on same corridor within 3 weeks AND orderer doesn't re-post (meaning driver might be negotiating off-platform), AND driver's GPS shows them at destination anyway (suggesting they took job direct), system flags for OPS review. Not automated suspension—human review required to confirm fraud.

**Duplicate Account Detection**:  
Same phone registered twice = auto-reject. Same name + license number across accounts = flagged. Prevents one person gaming referral bonuses or trust manipulation.

**Trust Cross-Restriction**:  
If driver has 3+ damage claims from different orderers in 3 months, system restricts them to "monitored trips only"—lower-value loads, manual OPS oversight. Protects ecosystem without permanent ban.

---

### 17. Key Business Numbers (Configuration)

| Setting | Value | What It Means |
|---------|-------|--------------|
| **Pricing** | | |
| Base rate | ETB 90/kg/100km | Starting point; corridor (demand) can adjust ±20% |
| Commission floor | ETB 1,500 | Minimum per-delivery fee to platform |
| Commission ceiling | ETB 30,000 | Maximum per-delivery fee to platform |
| Commission tiers | 12%/10%/8%/6% | By load value: under 5K / up to 30K / up to 100K / over 100K |
| Cargo class premium | 1.0-1.5x | Multiplier: livestock +35%, khat +40%, hazmat +40% |
| Rainy season markup | +8-15% | Additive during June-Sep on certain corridors |
| **Incentives** | | |
| On-time bonus | ETB 50-500 | Per completed trip, tier-dependent |
| Perfect week bonus | ETB 5,000 | Five consecutive on-time trips |
| Road alert verified bonus | ETB 200 | First alert reporter (3+ confirmations) |
| Referral driver bonus | ETB 500 | Referred driver completes 3 trips |
| New driver premium | +10% | First 3 loads at above-market rate |
| **Operations** | | |
| Acceptance window | 20 minutes | Time driver has to accept offer |
| Fast-track window | 10 minutes | Preferred/high-priority loads |
| No-show grace period | 30 minutes | Before driver flagged absent |
| No-show driver fee | ETB 1,000 | Charged to driver for absence |
| No-show orderer fee | ETB 500 | Charged to orderer for absence |
| Auto-release escrow | 24 hours | If delivery not confirmed, money auto-returns |
| **Financial** | | |
| Micro-credit max | ETB 20,000 | Per small trader, 7-day repay |
| Cold-start guarantee | First 3 trips | New drivers get matched auto-assign at premium |
| Escrow default | 100% + commission | Platform holds full value + 8-12% fee estimate |
| **Trust Mechanics** | | |
| On-time incident weight | -3 to -5 points | Per late delivery (tiered) |
| Cancellation weight | -15 points | Per abandoned load |
| Perfect week bonus | +20 points | Per perfect week (5+ on-time) |
| Trust recalc frequency | Real-time | Updates after each event |
| **USSD Features** | | |
| Feature phone offer window | 20 minutes | SMS offer; 2-hour retry loop for "Feature phone" drivers |
| Offline sync frequency | 2 hours | Location/status reconciliation for non-real-time phones |
| | | |

---

EOF
