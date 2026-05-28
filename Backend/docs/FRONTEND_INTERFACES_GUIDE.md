# ISUZET Frontend Interfaces Guide
> How to build every frontend for the ISUZET backend — Flutter mobile app + web dashboards via Dyad

---

## OVERVIEW OF INTERFACES NEEDED

| Interface | User Type | Platform | Tool |
|-----------|-----------|----------|------|
| Driver App | Driver | Mobile (Android/iOS) | Flutter |
| Fleet Owner App | Fleet Owner / Manager | Mobile + Web | Flutter + Dyad |
| Orderer App | Cargo Owner / Trader | Mobile + Web | Flutter + Dyad |
| Agent App | Community Agent | Mobile (feature-phone friendly) | Flutter |
| OPS Admin Dashboard | Internal Operations Team | Web | Dyad |
| Logistics Intelligence Dashboard | OPS / Analytics | Web | Dyad |
| KYC / Compliance Review Portal | OPS Admin | Web | Dyad |
| Public Rate Calculator | Anyone | Web | Dyad |

---

## PART 1: FLUTTER MOBILE APP

### Architecture Recommendations

**State Management:** Riverpod 2.x (best for complex async + auth state)

**Key Packages:**
```yaml
dependencies:
  riverpod: ^2.5.0
  flutter_riverpod: ^2.5.0
  dio: ^5.4.0              # HTTP client with interceptors
  shared_preferences: ^2.2.0
  flutter_secure_storage: ^9.0.0  # Store JWT securely
  geolocator: ^11.0.0     # GPS
  google_maps_flutter: ^2.6.0    # OR openstreetmap_flutter
  socket_io_client: ^2.0.3       # Real-time updates
  firebase_messaging: ^14.7.0    # Push notifications
  image_picker: ^1.0.7    # KYC document photos
  intl: ^0.19.0           # i18n, date formatting
  flutter_local_notifications: ^17.0.0
  qr_flutter: ^4.1.0      # QR codes for delivery
  camera: ^0.10.5         # Live camera for delivery photos
  connectivity_plus: ^5.0.0  # Offline detection
  hive: ^2.2.0            # Local cache for offline
  phone_numbers_parser: ^7.0.0   # Ethiopian phone format
```

**Base URL Configuration:**
```dart
class AppConfig {
  static const String baseUrl = 'http://your-server.com';
  static const String identityBase = '$baseUrl:3001/api/v1';
  static const String optimizerBase = '$baseUrl:3002/api/v1';
  static const String corridorBase = '$baseUrl:3003/api/v1';
  static const String liquidityBase = '$baseUrl:3004/api/v1';
  static const String shockBase = '$baseUrl:3005/api/v1';
  static const String incidentBase = '$baseUrl:3006/api/v1';
  static const String locationBase = '$baseUrl:3014/api/v1';
  static const String notificationBase = '$baseUrl:3013/api/v1';
  static const String dispatchBase = '$baseUrl:3001/api/v1'; // via dispatch engine
}
```

**Auth Interceptor:**
```dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = SecureStorage.get('accessToken');
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try refresh token
      final refreshed = await AuthService.refresh();
      if (refreshed) {
        // Retry with new token
        handler.resolve(await Dio().fetch(err.requestOptions));
        return;
      }
      // Navigate to login
    }
    handler.next(err);
  }
}
```

---

### DRIVER APP SCREENS

#### Screen 1: Splash & Onboarding
- Logo + tagline in Amharic and English
- Language selection (Amharic / English / Oromifa)
- "Get Started" → Registration

**API:** None

---

#### Screen 2: Registration
**Fields:** Full name, phone (+251 format), select role (Driver)
**Validation:** Ethiopian phone format (+2519XXXXXXXX or 09XXXXXXXX)

```dart
// POST /api/v1/auth/register
{
  "phone": "+251912345678",
  "fullName": "Abebe Girma",
  "role": "DRIVER",
  // Optional: if fleet owner invited driver
  "fleetOwnerId": "fleet_01..."
}
// Response: { success: true, message: "OTP sent" }
```

---

#### Screen 3: OTP Verification
**UI:** 6-digit input, countdown timer (5 minutes), resend button
**Error states:** OTP_EXPIRED, OTP_INVALID, OTP_LOCKOUT (30 min)

```dart
// POST /api/v1/auth/verify-otp
{
  "phone": "+251912345678",
  "otp": "123456"
}
// Response: { accessToken, refreshToken, user: { id, role, trustTier, kycTier } }
// Store both tokens securely in flutter_secure_storage
```

---

#### Screen 4: KYC Document Upload
**Purpose:** Upload driver license, kebele ID or national ID
**Shows current kycTier and what's needed for each tier**

```dart
// POST /api/v1/identity/kyc/upload
// Multipart form-data: { docType: "DRIVER_LICENSE", file: <image> }
// Response: { success: true, document: { id, status: "PENDING" } }
```

**Status display:** PENDING (yellow), APPROVED (green), REJECTED (red + reason)

---

#### Screen 5: Home / Dashboard
**Driver home shows:**
- Trust tier badge (T0–T5) with score circle
- Active trip card (if in trip)
- "Find Loads" button (if available)
- Recent earnings widget
- HOS (Hours of Service) indicator bar
- Notifications bell

```dart
// GET /api/v1/identity/me
// GET /api/v1/identity/trust-breakdown
```

---

#### Screen 6: Available Loads (Marketplace)
**List of open loads matching driver profile:**
- Corridor (origin → destination)
- Cargo type with icon
- Weight (tons)
- Price (ETB)
- Time-critical badge if applicable
- Distance to pickup
- Acceptance window countdown (20 min / 5 min for time-critical)

```dart
// GET /api/v1/optimizer/loads?status=OPEN&driverId=...
// Returns WDM-ranked list of available loads
```

**Filters:** Cargo type, corridor, date, weight range

---

#### Screen 7: Load Detail + Accept
**Full load details:**
- Cargo description and special requirements
- Pickup location on map
- All stops with addresses
- Payment breakdown (freight + driver payout)
- Orderer rating
- Accept / Decline buttons

```dart
// GET /api/v1/optimizer/loads/:id  (pricing breakdown included)
// POST /api/v1/assignments/accept
{ "assignmentId": "asgn_01..." }
```

---

#### Screen 8: Active Trip Dashboard
**Real-time trip management:**
- Map showing current location + route
- Next stop with ETA
- GPS tracking status (green/yellow/red dot)
- Call orderer button
- Report incident button
- Checkpoint logging

```dart
// POST /api/v1/location/gps (batch every 10 minutes)
{ "tripId": "trip_01...", "points": [{ "lat": 9.145, "lng": 40.489, "ts": "..." }] }

// POST /api/v1/location/checkpoint
{ "tripId": "...", "type": "POLICE", "note": "Routine check, 15 min delay" }
```

**Offline GPS:** Store GPS points in Hive (local DB) when offline, batch-upload when reconnected.

---

#### Screen 9: Delivery Confirmation
**At delivery stop:**
- Camera to take cargo photo
- OTP input field (recipient provides code)
- Digital signature pad (optional)
- Submit button → escrow released

```dart
// POST /api/v1/location/trip/:id/deliver-stop
{
  "stopId": "stop_01...",
  "otp": "789012",
  "photoUrl": "https://minio.../delivery-photo.jpg",
  "driverNote": "Cargo delivered in good condition"
}
```

---

#### Screen 10: Trip Complete + Rating
**After all stops delivered:**
- Trip summary (distance, time, earnings)
- ETB earned display with breakdown
- Rate orderer (1–5 stars, optional comment)
- "Find Next Load" button

---

#### Screen 11: Earnings Dashboard
**Financial overview:**
- Current balance
- Pending settlements (7-day cycle)
- Earnings breakdown (this week, this month)
- Trip history list
- Settlement history
- Bank/Telebirr account info

```dart
// GET /api/v1/identity/earnings (or liquidity endpoint)
```

---

#### Screen 12: Incident Reporting
**Report types:** Cargo damage, road accident, theft, vehicle breakdown, medical emergency

```dart
// POST /api/v1/incidents
{
  "tripId": "trip_01...",
  "type": "CARGO_DAMAGE",
  "severity": "MEDIUM",
  "description": "...",
  "evidenceUrls": ["https://..."]
}

// POST /api/v1/medical-sos (for emergencies — direct to OPS)
{ "tripId": "...", "message": "Driver needs medical help", "location": { "lat": 9.1, "lng": 40.5 } }
```

---

#### Screen 13: Road Alerts (Phase 9)
**Submit and view road conditions:**
- Active alerts on current route
- Submit new alert (pothole, flood, road closure, police checkpoint)
- Earn bonus ETB for verified alerts

```dart
// GET /api/v1/road-intelligence/alerts/:corridorId
// POST /api/v1/road-intelligence/alerts
{
  "corridorId": "corr_01...",
  "type": "ROAD_FLOOD",
  "severity": "HIGH",
  "location": { "lat": ..., "lng": ... },
  "description": "Road flooded at km 145"
}
```

---

#### Screen 14: Fuel Reporting (Phase 9)
**Help community with fuel intelligence:**
- Station name + location
- Price per liter (ETB)
- Availability (available / limited / empty)
- Diesel/petrol selector

```dart
// POST /api/v1/fuel/report
```

---

#### Screen 15: Trust Profile
**Driver's public profile:**
- Trust tier badge with explanation
- Score breakdown chart (on-time, disputes, deviations, etc.)
- Trip history count
- Reviews from orderers
- Progress to next tier (trips remaining, score needed)

```dart
// GET /api/v1/identity/trust-breakdown
```

---

#### Screen 16: Settings & Profile
- Update full name, language preference
- Notification preferences (SMS, push, Telegram link)
- Truck details (if owner-operator)
- Change phone number (requires new OTP)
- Link Telegram account

```dart
// PUT /api/v1/identity/me
// POST /api/v1/telegram-link/link
// PUT /api/v1/notifications/preferences
```

---

### FLEET OWNER APP SCREENS

#### Screen 1–3: Same registration/OTP as driver (role: FLEET_OWNER)

#### Screen 4: Fleet Dashboard
- Total trucks (active/on-trip/maintenance)
- Fleet utilization gauge
- Today's earnings
- Active trips map
- Alerts (documents expiring, incidents)

#### Screen 5: Add/Manage Trucks
```dart
// POST /api/v1/identity/trucks
{
  "licensePlate": "AA 12345",
  "bodyType": "FLATBED",
  "capacityKg": 30000,
  "makeModel": "ISUZU FTR",
  "year": 2018
}
// GET /api/v1/identity/trucks
// PUT /api/v1/identity/trucks/:id
```

#### Screen 6: Driver Management
- List of assigned drivers
- Driver trust scores
- Hours of Service status
- Add/remove drivers
- View driver's trip history

#### Screen 7: Load Posting (Fleet Owner)
- Post load as fleet owner (orderer-facing side)
- Or view loads available to their drivers

#### Screen 8: Financial Dashboard
- Commission earnings
- Pending payouts by driver
- Commission config setup
- Exposure cap status

---

### ORDERER APP SCREENS

#### Screen 1: Post Load
**Form fields:**
- Origin zone / pickup address
- Destination zone / delivery address
- Cargo type (dropdown with icons)
- Weight (kg or quintals)
- Pickup date/time
- Payment model (ESCROW, COD, ROLLING_CREDIT)
- Special requirements (cold chain, livestock permit, etc.)
- Stops (multi-stop up to 5)

```dart
// POST /api/v1/loads (dispatch engine)
{
  "originCorridorId": "corr_01...",
  "pickupAddress": "Merkato, Addis Ababa",
  "destAddress": "Hawassa Bus Station",
  "cargoType": "BAGGED_GRAIN",
  "weightKg": 12000,
  "pickupAt": "2024-06-15T08:00:00Z",
  "paymentModel": "ESCROW",
  "stops": [{ "address": "...", "contactPhone": "..." }]
}
```

**Price estimate:** Call `/api/v1/public-calculator/estimate` in real-time as user fills form.

#### Screen 2: Track Shipment
- Live map showing driver location
- ETA to each stop
- Status timeline
- Call driver button
- Report issue button

```dart
// SSE stream: GET /api/v1/location/trip/:id
// Receive real-time GPS events, update map marker
```

#### Screen 3: My Loads (History)
- Filter by status (OPEN, IN_TRANSIT, DELIVERED, DISPUTED)
- Load card with key info + quick actions

#### Screen 4: Rate Driver / Complete Delivery
- 5-star rating
- Written review
- Confirm delivery receipt (if needed)

#### Screen 5: Disputes & Incidents
```dart
// POST /api/v1/incidents (open dispute)
// POST /api/v1/incidents/:id/evidence (upload photos)
```

---

### AGENT APP SCREENS

**Key difference:** Agents work on behalf of farmers/traders who may not have smartphones. USSD integration is critical.

#### Screen 1: Agent Dashboard
- Wallet balance (ETB)
- Active client loads
- Pending collections
- Clients needing attention

#### Screen 2: Register Client
- Phone + name only (no KYC needed for basic)
- Assign to agent's zone

#### Screen 3: Post Load for Client
- Same as orderer load posting
- Payment from agent wallet
- Client phone number as reference

#### Screen 4: Wallet Top-up
- Top-up agent wallet via Telebirr/CBE

#### Screen 5: Settlement
- Confirm cash collections
- View commission earned
- Request payout

---

### OFFLINE STRATEGY (Critical for Ethiopia)

**Ethiopia connectivity reality:**
- Tigray, Gambela, rural Oromia: 2G/EDGE only
- Frequent drops during trips in remote areas
- Average 3G speeds outside major cities

**Implementation:**
```dart
// 1. Hive local database for offline storage
// 2. Store GPS points locally when offline
// 3. Upload batch when connection restored
// 4. Cache load offers for 30 minutes (show even if offline)
// 5. Show cached trip data if API unreachable
// 6. Queue delivery confirmation if no connection (upload with timestamp when online)

class OfflineSyncService {
  // On connectivity restored:
  Future<void> syncPendingGPS() async { ... }
  Future<void> uploadPendingPhotos() async { ... }
  Future<void> submitPendingDeliveries() async { ... }
}
```

---

### AMHARIC LANGUAGE SUPPORT

```dart
// Key Amharic strings needed:
const Map<String, String> amharicStrings = {
  'load_available': 'ጭነት ይፈልጋሉ',
  'accept_load': 'ጭነት ተቀበሉ',
  'trip_started': 'ጉዞ ጀምሯል',
  'delivery_confirmed': 'ደረሰ',
  'payment_released': 'ክፍያ ተለቋል',
  'trust_tier': 'የእምነት ደረጃ',
  'earnings': 'ገቢ',
  'otp_sent': 'OTP ተልኳል',
};

// Use flutter_localizations + arb files
// Supported languages: Amharic (am), English (en), Oromifa (om), Tigrinya (ti)
```

---

### ETHIOPIAN PHONE NUMBER HANDLING

```dart
String normalizeEthiopianPhone(String input) {
  // Remove spaces, dashes
  String cleaned = input.replaceAll(RegExp(r'[\s\-]'), '');
  // Handle 09XXXXXXXX → +2519XXXXXXXX
  if (cleaned.startsWith('09')) return '+251' + cleaned.substring(1);
  // Handle 2519XXXXXXXX → +2519XXXXXXXX
  if (cleaned.startsWith('251')) return '+' + cleaned;
  // Already +251
  if (cleaned.startsWith('+251')) return cleaned;
  return cleaned;
}
```

---

### ETB CURRENCY DISPLAY

```dart
String formatEtb(int cents) {
  // Input is integer cents (1 ETB = 100 cents)
  final etb = cents / 100;
  return 'ብር ${etb.toStringAsFixed(2)}';
  // Or: 'ETB ${NumberFormat('#,##0.00').format(etb)}'
}
```

---

## PART 2: WEB INTERFACES (DYAD PROMPTS)

---

### DYAD PROMPT 1: OPS ADMIN DASHBOARD

```
Build a production-grade Operations Admin Dashboard for ISUZET — an Ethiopian freight logistics platform.

TECH STACK:
- React 18 with TypeScript
- shadcn/ui component library
- Tailwind CSS
- TanStack Query (React Query) for data fetching
- TanStack Table for data grids
- Recharts for charts/analytics
- React Router for navigation
- Zustand for global state

AUTHENTICATION:
- Login form with phone number + OTP flow
- POST http://localhost:3001/api/v1/auth/register (for initial setup)
- POST http://localhost:3001/api/v1/auth/verify-otp
- Store accessToken/refreshToken in localStorage
- Auto-refresh token on 401 responses using refreshToken

ROLE REQUIRED: OPS_ADMIN or SUPER_ADMIN

PAGES AND FEATURES:

1. OVERVIEW DASHBOARD (/dashboard)
   - Live KPIs: active loads, active drivers, loads in transit, incidents open
   - Platform health status bar (green/yellow/red per engine) from GET http://localhost:3011/api/v1/health/engines
   - Today's load volume bar chart
   - Active corridors map (use react-simple-maps or similar)
   - Recent events feed (last 20 events from events table)
   - Shock mode banner — if active, show red banner with severity and reason

2. LOAD MANAGEMENT (/loads)
   - Full-page table of all loads with filters: status, corridor, cargo type, date range
   - Status badges: DRAFT, OPEN, MATCHED, IN_TRANSIT, DELIVERED, CANCELLED, DISPUTED
   - Click row to see load detail drawer
   - Actions: cancel load, force-assign driver, escalate to incident
   - Search by load ID, orderer name, corridor

3. DRIVER MANAGEMENT (/drivers)
   - Table of all drivers with: name, phone, trust tier badge, HOS status, current trip
   - Filter by tier, status, corridor
   - Click to open driver profile modal showing: trust breakdown chart, trip history, documents, incidents
   - Actions: suspend driver, approve KYC tier, add to whitelist

4. INCIDENT MANAGEMENT (/incidents)
   - Table with SLA countdown timers (color: green >50%, yellow 20-50%, red <20% time remaining)
   - Incident state machine visualization (step indicator)
   - Severity badges: LOW (gray), MEDIUM (yellow), HIGH (orange), CRITICAL (red)
   - Bulk actions: assign investigator, mark resolved
   - Evidence viewer (photo gallery per incident)
   API: GET http://localhost:3006/api/v1/incidents

5. FRAUD FLAGS (/fraud)
   - List of fraud flags with confidence scores
   - Shadow broker detection results
   - Duplicate account alerts
   - One-click investigate / dismiss
   API: GET http://localhost:3009/api/v1/fraud/flags

6. KYC REVIEW (/kyc)
   - Queue of pending KYC documents to review
   - Split view: list + document preview (PDF/image)
   - Approve / Reject with rejection reason
   - Auto-notify driver via SMS on decision

7. FINANCIAL OVERSIGHT (/finance)
   - Exposure cap status per corridor (progress bars)
   - Pending escrow releases
   - COD discrepancies
   - Commission revenue chart (daily/weekly/monthly)
   API: GET http://localhost:3004/api/v1/liquidity/exposure

8. CORRIDOR MANAGEMENT (/corridors)
   - Table of all corridors with health score badges
   - Health score chart (line chart, 7-day history from corridor_snapshots)
   - Toggle corridor freeze
   - Road alerts per corridor
   API: GET http://localhost:3003/api/v1/corridor/health

9. SYSTEM STRATEGY (/strategy) — SUPER_ADMIN only
   - List strategy versions with active badge
   - Create new version form (WDM weights, commission tiers, pricing params)
   - Validate weights sum to 1.0 before submitting
   - Activate version with confirmation dialog
   API: GET/POST http://localhost:3010/api/v1/strategy/versions

10. OPS WORKQUEUE (/workqueue)
    - Prioritized queue of items needing OPS attention
    - Document expirations, incidents, fraud flags, anomalies
    - One-click actions per item type

DESIGN REQUIREMENTS:
- Ethiopian flag color accents (green, yellow, red)
- Dark mode support
- Mobile responsive (tablet minimum)
- Real-time updates via polling every 30 seconds
- Ethiopian date display alongside Gregorian (show both)
- ETB currency formatting (commas, 2 decimal places)
- Loading skeletons while data fetches
- Error boundaries with retry buttons
- Toast notifications for all actions

NAVIGATION: Sidebar with icons, collapsible. Top bar with user profile, shock mode indicator, and notification bell.
```

---

### DYAD PROMPT 2: FLEET OWNER WEB PORTAL

```
Build a Fleet Owner Web Portal for ISUZET — Ethiopian freight logistics platform.

TECH STACK: React 18, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, Recharts, React Router

AUTHENTICATION:
- Phone + OTP login (same as mobile app)
- POST http://localhost:3001/api/v1/auth/verify-otp
- Role: FLEET_OWNER or FLEET_MANAGER

PAGES:

1. FLEET DASHBOARD (/dashboard)
   - Fleet utilization donut chart (active/idle/maintenance trucks)
   - Today's earnings vs yesterday
   - Active trips on mini-map
   - Alerts sidebar: expiring documents, idle trucks, HOS violations
   - Recent driver actions feed

2. TRUCKS (/trucks)
   - Card grid of all trucks with status badges
   - Truck detail: specs, current driver, trip history, maintenance logs
   - Add truck form
   - Document expiry indicators (days remaining)
   POST/GET/PUT http://localhost:3001/api/v1/identity/trucks

3. DRIVERS (/drivers)
   - List of fleet drivers with trust tiers
   - Driver performance dashboard: on-time rate, trips this month, earnings
   - HOS status (compliant / warning / blocked)
   - Invite new driver via phone

4. LOAD OPPORTUNITIES (/loads)
   - Loads available for fleet trucks
   - Quick-assign: select load → select driver → assign
   - Filter by corridor, cargo type, price

5. EARNINGS & FINANCE (/finance)
   - Revenue by driver, by truck, by corridor
   - Commission breakdown
   - Settlement history
   - Download CSV reports

6. COMPLIANCE (/compliance)
   - All documents (truck insurance, inspection, driver licenses) in one view
   - Color-coded by expiry: green (>90 days), yellow (30-90), red (<30 days)
   - Upload/update documents

DESIGN: Professional, clean, Ethiopian business aesthetic. Mobile responsive. Amharic/English toggle.
```

---

### DYAD PROMPT 3: LOGISTICS INTELLIGENCE DASHBOARD

```
Build a Logistics Intelligence Dashboard for ISUZET — a corridor analytics and market intelligence tool for Ethiopian freight.

TECH STACK: React 18, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, Recharts, Mapbox GL JS or Leaflet

AUTHENTICATION: OPS_ADMIN role required, same JWT auth flow.

PAGES:

1. CORRIDOR ANALYTICS (/corridors)
   - Interactive Ethiopia map with corridors as colored lines
   - Line thickness = load volume, color = health score (green/yellow/red)
   - Click corridor → side panel with: health trend chart, incident history, rate history, active loads
   - Time range selector (today, 7d, 30d, 90d)
   API: GET http://localhost:3003/api/v1/corridor/health

2. MARKET RATES (/rates)
   - Rate benchmark table: corridor → min/avg/max price per km
   - Rate trend charts (30-day history)
   - Compare corridors
   - Seasonal adjustment visualization (rainy season multiplier display)
   API: GET http://localhost:3003/api/v1/rates/benchmark

3. DEMAND HEATMAP (/demand)
   - Zone-level demand heatmap on Ethiopia map
   - Time animation (show demand changes hour by hour)
   - Top demand zones table
   - Demand vs supply ratio per zone

4. SHOCK MONITOR (/shock)
   - Current shock mode status (big status card)
   - Shock event history (timeline view)
   - Trigger indicators: incident spikes, fuel price spikes
   - Manual activation/deactivation controls
   API: GET http://localhost:3005/api/v1/shock/status

5. FUEL INTELLIGENCE (/fuel)
   - Fuel price map (last reported price at stations)
   - Shortage alerts by zone
   - Price trend chart (ETB/liter over time)
   - Top reporting drivers leaderboard

6. PLATFORM KPIs (/kpis)
   - Key metrics: daily active drivers, loads posted/completed, revenue, avg trust score
   - Cohort analysis (new vs returning drivers/orderers)
   - Geographic breakdown
   API: GET http://localhost:3008/api/v1/data/platform-summary

DESIGN: Dark theme preferred (intelligence/analytics aesthetic), rich charts, Ethiopia-focused map projection, responsive.
```

---

### DYAD PROMPT 4: KYC & COMPLIANCE REVIEW PORTAL

```
Build a KYC and Compliance Review Portal for ISUZET — for OPS staff to review and approve identity documents.

TECH STACK: React 18, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query

AUTHENTICATION: OPS_ADMIN role required.

FEATURES:

1. DOCUMENT REVIEW QUEUE (/kyc/queue)
   - Prioritized list of pending KYC documents
   - Sort by: submission date, document type, user trust tier
   - Status filters: PENDING, UNDER_REVIEW, APPROVED, REJECTED
   - Batch operations (approve/reject multiple)

2. DOCUMENT VIEWER (/kyc/:documentId)
   - Split-pane: left = document image (zoomable), right = user profile
   - Document details: type, submitted at, user info
   - Approve button → POST to update status
   - Reject button → modal to select rejection reason + custom message
   - "Flag for Manual Review" for suspicious documents
   API: PUT http://localhost:3001/api/v1/identity/kyc/:id/decision

3. USER SEARCH (/users)
   - Search by phone number, name
   - View full user profile (all documents, trust history, trip history)
   - Manual trust tier adjustment
   - Suspend / Blacklist / Reinstate actions

4. EXPIRY CALENDAR (/expiry)
   - Calendar view of upcoming document expirations (next 90 days)
   - Filter by document type
   - Bulk-send reminder SMS to drivers/fleet owners

5. AUDIT LOG (/audit)
   - Every OPS action logged (who approved what, when)
   - Filter by reviewer, user, date range
   - Export to CSV

DESIGN: Functional, minimal, focused on rapid review workflow. Table density high. Keyboard shortcuts for approve/reject (A/R keys).
```

---

### DYAD PROMPT 5: PUBLIC RATE CALCULATOR (Marketing / Embedded Widget)

```
Build a Public Rate Calculator widget and landing page for ISUZET.

TECH STACK: React 18, TypeScript, Tailwind CSS — no auth required

FEATURES:

1. RATE CALCULATOR
   - Origin dropdown (all Ethiopian zones)
   - Destination dropdown
   - Cargo type selector (with icons for each type)
   - Weight input (kg or quintals)
   - Pickup date (shows seasonal multiplier warning if rainy season)
   - "Calculate" button

   API: GET http://localhost:3003/api/v1/public-calculator/estimate
   Params: { originZone, destZone, cargoType, weightKg, pickupDate }

   Display results:
   - Estimated price range (min/max ETB)
   - Distance in km
   - Estimated transit time
   - Seasonal multiplier applied (if any)
   - "Get Exact Quote" CTA → redirect to app download

2. EMBEDDED WIDGET MODE
   - Compact version embeddable in any website via <iframe> or web component
   - Mobile responsive

DESIGN: Ethiopian colors (green/gold), simple and clean, works without any account. Amharic and English.
```

---

## PART 3: API INTEGRATION REFERENCE FOR FRONTEND

### Authentication Headers
```javascript
// Every authenticated request:
headers: {
  'Authorization': 'Bearer <accessToken>',
  'Content-Type': 'application/json'
}
```

### Token Refresh Logic
```javascript
async function apiCall(endpoint, options) {
  let response = await fetch(endpoint, { ...options, headers: authHeaders() });

  if (response.status === 401) {
    // Try refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      response = await fetch(endpoint, { ...options, headers: authHeaders() });
    } else {
      redirectToLogin();
    }
  }

  return response.json();
}
```

### Real-time GPS Updates (SSE)
```javascript
// Server-Sent Events for live tracking
const eventSource = new EventSource(
  `http://server:3014/api/v1/location/trip/${tripId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.lat, data.lng, data.speed, data.timestamp
  updateMapMarker(data);
};
```

### Ethiopian Date Utility (JavaScript)
```javascript
// All APIs return Gregorian dates + ethiopianDate string
// Display: "ሰኞ ፯ ሰኔ ፳፻፲፬" (Ethiopian) next to "Mon Jun 15, 2024"
function formatEthiopianDate(ethDateStr) {
  // ethiopianDate field from API: "2016-10-09" (Ethiopian calendar)
  return ethDateStr; // Already formatted by backend
}
```

### Error Handling Pattern
```javascript
// All APIs return:
// Success: { success: true, data: {...} }
// Error: { success: false, error: "ERROR_CODE", message: "..." }

function handleApiError(error) {
  const messages = {
    OTP_EXPIRED: 'Your verification code has expired. Please request a new one.',
    OTP_LOCKOUT: 'Too many attempts. Please wait 30 minutes.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    VALIDATION_ERROR: error.message,
  };
  return messages[error.error] || error.message;
}
```
