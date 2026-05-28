# PHASE 6 USSD EXTENSIONS - TEST SCENARIOS

## ✅ Implementation Complete

### NEW FEATURES ADDED

#### 1. Option 6: Report Road Alert
**Flow:**
- Main Menu → 6. Report Road Alert
- Select alert type (1-5):
  - 1. Police checkpoint
  - 2. Road damage
  - 3. Flooding
  - 4. Fuel shortage
  - 5. Security
- Enter severity (1-3):
  - 1. Normal → Maps to "LOW"
  - 2. High → Maps to "HIGH"
  - 3. Critical → Maps to "CRITICAL"
- Confirmation: "Report submitted. Thank you. Verification bonus: 200 ETB if confirmed by 2 drivers."
- Creates `RoadAlert` record with:
  - `alertType` (POLICE_CHECKPOINT, ROAD_DAMAGE, FLOODING, FUEL_SHORTAGE, SECURITY)
  - `severity` (LOW, HIGH, CRITICAL)
  - `lat`, `lng` from driver's current location
  - `expiresAt` set to 6 hours from creation
  - `source`: "USSD_REPORT"
  - `reportedByUserId`: Driver's user ID
  - `reportedByRole`: "DRIVER"

#### 2. Option 7: Check Market Rate
**Flow:**
- Main Menu → 7. Market Rate
- Enter origin city (e.g., "Addis")
- Enter destination city (e.g., "Hawassa")
- Select cargo type (1-4):
  - 1. Grain → "GRAIN"
  - 2. Coffee → "COFFEE"
  - 3. Livestock → "LIVESTOCK"
  - 4. General → "GENERAL"
- System returns: "Rate: X-Y ETB/quintal (Based on N recent trips)"
- Query logic:
  - Searches `Load` records matching route and cargo type
  - Filters for completed trips from last 30 days
  - Takes up to 10 most recent trips
  - Calculates rate per quintal (100kg) from `finalRateEtb` / (weightKg / 100)
  - Returns min-max range

### TEST SCENARIOS

#### Test 1: Road Alert - Police Checkpoint (Normal Severity)
```
Input Sequence:
1. No input (initial load) → Main Menu shown
2. Input: "6" → Alert type menu
3. Input: "6*1" → Severity menu for Police checkpoint
4. Input: "6*1*1" → Confirmation (Normal severity)
Expected Output: "END Report submitted. Thank you. Verification bonus: 200 ETB if confirmed by 2 drivers."
Expected DB: RoadAlert created with alertType=POLICE_CHECKPOINT, severity=LOW
```

#### Test 2: Road Alert - Flooding (Critical Severity)
```
Input Sequence:
1. Input: "6" → Alert type menu
2. Input: "6*3" → Severity menu for Flooding
3. Input: "6*3*3" → Confirmation (Critical severity)
Expected Output: "END Report submitted. Thank you. Verification bonus: 200 ETB if confirmed by 2 drivers."
Expected DB: RoadAlert created with alertType=FLOODING, severity=CRITICAL
```

#### Test 3: Market Rate - Addis to Hawassa, Grain
```
Input Sequence:
1. Input: "7" → Origin city prompt
2. Input: "7*Addis" → Destination city prompt
3. Input: "7*Addis*Hawassa" → Cargo type menu
4. Input: "7*Addis*Hawassa*1" → Rate lookup (Grain)
Expected Output: "END Rate: X-Y ETB/quintal (Based on N recent trips)"
(If no data: "END No recent rates found for Addis→Hawassa GRAIN. Try other route.")
```

#### Test 4: Market Rate - Invalid Inputs
```
Input Sequence:
1. Input: "7" → Origin city prompt
2. Input: "7*Ad" → Short city name (< 2 chars)
Expected Output: "CON Enter valid origin city:"
```

#### Test 5: Navigation - Back from Road Alert
```
Input Sequence:
1. Input: "6" → Alert type menu
2. Input: "6*0" → Cancel (back to main menu)
Expected Output: Main menu displayed with all 7 options
```

#### Test 6: Navigation - Back from Market Rate
```
Input Sequence:
1. Input: "7" → Origin city prompt
2. Input: "7*Addis" → Destination city prompt
3. Input: "7*Addis*0" → Cancel (back to main menu)
Expected Output: Main menu displayed with all 7 options
```

### MAIN MENU VERIFICATION
✅ Updated menu displays all 8 options:
```
CON ISUZET Loads Platform
1. My Loads
2. Report Location
3. Confirm Delivery
4. SOS
5. Fuel Report
6. Report Road Alert
7. Market Rate
0. Exit
```

### CODE VERIFICATION

#### Files Modified:
- ✅ `apps/notification-engine/src/services/ussd.service.ts`
  - Added `handleReportRoadAlert()` function
  - Added `handleMarketRate()` function
  - Updated `handleMainMenu()` with options 6 & 7
  - Updated `handleUssdCallback()` routing for new options

#### Session States Added:
- ROAD_ALERT_TYPE
- ROAD_ALERT_SEVERITY
- MARKET_RATE_ORIGIN
- MARKET_RATE_DESTINATION
- MARKET_RATE_CARGO

#### Database Operations:
- `prisma.roadAlert.create()` - Create new road alerts
- `prisma.load.findMany()` - Query completed loads for market rates

### EXISTING FLOWS NOT BROKEN
✅ All 5 original flows remain functional:
1. My Loads (Option 1)
2. Report Location (Option 2)
3. Confirm Delivery (Option 3)
4. SOS (Option 4)
5. Fuel Report (Option 5)

### BUILD STATUS
✅ TypeScript compilation: **SUCCESS**
- No type errors
- All imports resolved
- Prisma types properly used
- Session management pattern consistent with existing flows

### IMPLEMENTATION NOTES

1. **Road Alert Bonus Configuration**:
   - Uses existing config: `roadAlertBonusCents: 20000 (ETB 200)`
   - Min verifications for bonus: 2 drivers
   - Expiry: 6 hours

2. **Market Rate Calculation**:
   - Converts final rate to per-quintal (100kg standard)
   - Searches last 30 days of completed trips
   - Case-insensitive city matching
   - Handles missing data gracefully

3. **Session Management**:
   - All new states follow existing 5-minute expiry pattern
   - Session data persisted across steps
   - Proper navigation with "0. Cancel" option throughout

4. **User Experience**:
   - Clear prompts for each input
   - Error handling for invalid selections
   - Bonus information displayed to drivers
   - Graceful fallback messages when data unavailable
