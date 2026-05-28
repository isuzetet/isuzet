# Known Technical Debt - isuzet_business

## Critical Issues (Must Fix Before Release)

### 1. SSE Tracking Implementation
**Status:** ❌ NOT IMPLEMENTED  
**Severity:** CRITICAL  
**Scope:** Orderer Feature - Load Tracking  
**Effort:** 4-6 hours  

**What It Does:**
Live Server-Sent Events (SSE) streaming for load status updates. Orderers see real-time status changes (PENDING → DISPATCHED → IN_TRANSIT → DELIVERED) without polling. Connection loss triggers visible "Live tracking unavailable" alert — no silent fallback to polling.

**Implementation Guide:**

1. **Backend Requirement:**
   - Endpoint: `GET /api/v1/dispatch/loads/:loadId/events`
   - Returns: Event stream with status, location, ETA updates
   - Auth: Bearer token with ORDERER/OPS_ADMIN role
   - Format: Server-Sent Events (text/event-stream)

2. **Create SSE Service** (`lib/features/tracking/data/services/tracking_service.dart`):
   ```dart
   import 'dart:html' as html;
   
   class TrackingService {
     Stream<TrackingUpdate> subscribeToLoad(String loadId) async* {
       try {
         final eventSource = html.EventSource(
           '${AppConfig.dispatchBase}/loads/$loadId/events',
         );
         
         eventSource.onMessage?.listen((event) {
           final update = TrackingUpdate.fromJson(jsonDecode(event.data));
           yield update;
         });
         
         eventSource.onError?.listen((_) {
           // Emit error event - do not reconnect
           yield TrackingUpdate.error('Live tracking connection lost');
         });
       } catch (e) {
         yield TrackingUpdate.error('Failed to connect: $e');
       }
     }
   }
   ```

3. **Create Tracking Provider** (`lib/features/tracking/presentation/providers/load_tracking_provider.dart`):
   - Watch `selectedLoadIdProvider`
   - Listen to `TrackingService.subscribeToLoad()`
   - Expose stream state: CONNECTING, LIVE, ERROR_DISCONNECTED
   - Provide location, status, eta, lastUpdate timestamp

4. **Update Tracking Screen** (`lib/features/tracking/presentation/tracking_screen.dart`):
   - Show connection status badge (green = LIVE, red = ERROR)
   - Display "Live tracking unavailable. Refresh manually." when disconnected
   - Show last status timestamp for offline data
   - Add manual refresh button that polls single status endpoint

5. **Error Handling:**
   - Do NOT auto-reconnect on SSE failure
   - Must show visible error state
   - Provide manual refresh button with feedback
   - Log all disconnections for support debugging

**Files to Create/Modify:**
- `lib/features/tracking/data/services/tracking_service.dart` (new)
- `lib/features/tracking/presentation/providers/load_tracking_provider.dart` (new)
- `lib/features/tracking/presentation/tracking_screen.dart` (update)
- `lib/features/tracking/data/models/tracking_update.dart` (new - model for SSE events)

**Test Plan:**
- Unit: SSE event parsing, error handling
- Integration: Connect to backend, verify event stream
- E2E: Orderer opens tracking, receives live updates, loses connection, sees error

**Blocked Until:** Backend `/api/v1/dispatch/loads/:loadId/events` SSE endpoint implemented

---

### 2. Offline Sync Queue
**Status:** ❌ NOT IMPLEMENTED  
**Severity:** HIGH  
**Scope:** All Features - Network Resilience  
**Effort:** 6-8 hours  

**What It Does:**
Captures failed network requests (POST/PUT) in a local queue, re-syncs when connection restored. Users can continue posting loads, updating profiles, etc. without network. Sync status visible in UI.

**Implementation Guide:**

1. **Create Sync Queue Model** (`lib/core/data/models/sync_queue_item.dart`):
   ```dart
   class SyncQueueItem {
     final String id;
     final String operation; // CREATE_LOAD, UPDATE_PROFILE, etc.
     final String endpoint;
     final Map<String, dynamic> payload;
     final DateTime createdAt;
     final int retryCount;
     final SyncStatus status; // PENDING, RETRYING, FAILED, SUCCESS
   }
   ```

2. **Create Sync Manager** (`lib/core/data/services/sync_manager.dart`):
   - Store queue in `sqflite` (local SQL database)
   - On network loss: queue all POST/PUT requests
   - On network restore: retry all PENDING items in order
   - Max 3 retries per item with exponential backoff
   - Mark SUCCESS after 2xx response
   - Move FAILED items after 3 retries to manual review queue

3. **Create Sync Provider** (`lib/core/providers/sync_provider.dart`):
   - Watch connectivity status (using `connectivity_plus` package)
   - Expose: `queuedItemsProvider`, `syncStatusProvider`
   - Trigger `syncManager.syncAll()` when online
   - Show sync progress in UI

4. **Create Sync UI Widget** (`lib/shared/widgets/sync_status_indicator.dart`):
   - Show queue count badge when items pending
   - Display sync progress during retry
   - Show "Sync Failed - Tap to Retry" when disconnected

5. **Integration Points:**
   - Wrap all `_dio.post()` and `_dio.put()` calls with sync queue fallback
   - In repositories: catch DioException, enqueue request, show "Queued for sync" toast
   - Update Riverpod providers to watch sync status

**Files to Create/Modify:**
- `lib/core/data/models/sync_queue_item.dart` (new)
- `lib/core/data/services/sync_manager.dart` (new - main sync engine)
- `lib/core/providers/sync_provider.dart` (new)
- `lib/shared/widgets/sync_status_indicator.dart` (new)
- `lib/features/*/data/repositories/*.dart` (update - integrate sync)
- `pubspec.yaml` (add: connectivity_plus, sqflite)

6. **Sync Queue Priority:**
   - CreateLoad → UpdateProfile → UpdateSettings
   - Process in timestamp order within category
   - Display count: "3 items syncing..."

**Test Plan:**
- Unit: Queue storage, retry logic, backoff calculation
- Integration: Disable network, post load, enable network, verify sync
- E2E: Multiple operations offline, sync on reconnect, verify all completed

**Files Involved:**
- Network connectivity detection
- Request interception at Dio level
- Local database persistence (SQLite)
- Background sync on app resume

**Note:** Requires backend to support idempotent requests (identical requests return same result)

---

## Phase 3 Completion Checklist
- ✅ 4-step Post Load wizard implemented (corridor → cargo → pickup/delivery dates → review)
- ✅ Backend endpoint: `POST http://localhost:3015/api/v1/dispatch/loads`
- ✅ APK debug build: ✓ Built successfully
- ✅ Web debug build: ✓ Built successfully (WASM warnings are pre-existing, non-blocking)
- ❌ SSE tracking implementation: NOT IMPLEMENTED (added to debt)
- ⏳ Phase 4 (Shared Profile + Final Polish) can proceed with tracking as known debt
