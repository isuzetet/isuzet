# KNOWN DEBT ITEMS

## Phase 6 - Offline Sync Flush Mechanism Missing

**Issue:** GPS points are queued in Hive when offline (via `LocalCache.queueGpsPoint()`), and the backend supports offline sync via `offlinePings` array in location ping endpoint. However, the **flush mechanism is not implemented** — no code watches connectivity status and sends queued points when connection is restored.

**Current State:**
- ✅ GPS queue storage: `_gpsQueue` Hive box initialized in `LocalCache.initialize()`
- ✅ Queue methods: `queueGpsPoint()`, `getPendingGpsPoints()`, `clearGpsQueue()` implemented
- ✅ Backend endpoint: `/api/v1/location/ping` accepts `offlinePings` array with lat/lng/timestamp/accuracy
- ✅ Connectivity monitoring: `ConnectivityMonitor` tracks online/offline state
- ❌ **Sync trigger missing:** No code subscribes to connectivity changes and calls flush

**Implementation Required:**
1. Create `OfflineSyncService` in `lib/core/services/offline_sync_service.dart`
2. In `OfflineSyncService`:
   - Watch `ConnectivityMonitor.isOnline` stream
   - When transition from offline→online detected, retrieve pending GPS points via `LocalCache.getPendingGpsPoints()`
   - Post batch to backend: `POST /api/v1/location/ping` with `offlinePings` array
   - Clear queue after successful sync: `LocalCache.clearGpsQueue()`
3. Initialize `OfflineSyncService` in `main.dart` after `ConnectivityMonitor.initialize()`
4. Handle sync failures gracefully (retry logic with exponential backoff)

**Code Locations:**
- Queue storage: [lib/core/storage/local_cache.dart](lib/core/storage/local_cache.dart#L71-L83)
- Connectivity monitor: [lib/core/utils/connectivity_monitor.dart](lib/core/utils/connectivity_monitor.dart)
- GPS tracking: [lib/core/services/gps_tracking_service.dart](lib/core/services/gps_tracking_service.dart)
- Trip service (has GPS post): [lib/features/trips/data/trip_service.dart](lib/features/trips/data/trip_service.dart#L96-L119)

**Estimated Effort:** 2-3 hours (connectivity listener + batch post + error handling)

**Status:** IDENTIFIED (Phase 6) - Does NOT block release; can be enabled post-launch

---

## Phase 6 - Push Notifications (FCM) Not Initialized

**Issue:** Firebase Cloud Messaging is imported in `pubspec.yaml` and `flutter_local_notifications` is now added, but **Firebase initialization is commented out** in `main.dart` with a TODO. No FCM handlers are registered for incoming messages, so push notifications will not work at launch.

**Current State:**
- ✅ `firebase_core: ^3.3.0` in `pubspec.yaml`
- ✅ `firebase_messaging: ^15.1.0` in `pubspec.yaml`
- ✅ `flutter_local_notifications: ^18.0.1` added in Phase 6
- ✅ `GoogleService-Info.plist` generated and included (iOS)
- ✅ `google-services.json` generated and included (Android)
- ❌ `Firebase.initializeApp()` commented out in `main.dart` line 13
- ❌ No FCM message handlers registered (`onMessage`, `onMessageOpenedApp`, `onBackgroundMessage`)
- ❌ No notification display service implementation

**Implementation Required:**

### 1. Uncomment Firebase init in `main.dart`:
```dart
// In main() async block:
await Firebase.initializeApp();

// Get FCM token for backend registration:
final fcmToken = await FirebaseMessaging.instance.getToken();
await apiClient.registerFcmToken(fcmToken);
```

### 2. Create `NotificationService` in `lib/core/services/notification_service.dart`:
```dart
class NotificationService {
  static final _localNotifications = FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    // Platform-specific config for local notifications
    // Setup iOS and Android channels
    await _localNotifications.initialize(
      InitializationSettings(iOS: ..., android: ...),
    );

    // Handle FCM background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    
    // Handle notification taps
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    // Display local notification via flutter_local_notifications
    // Route to appropriate screen based on message data
  }

  static Future<void> _handleNotificationTap(RemoteMessage message) {
    // Handle user tapping notification (navigate to relevant screen)
  }
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background messages (when app is killed)
}
```

### 3. Initialize in `main.dart`:
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalCache.initialize();
  await ConnectivityMonitor.initialize();
  await Firebase.initializeApp();  // ← Uncomment and add this
  await NotificationService.initialize();  // ← Add this
  
  runApp(...);
}
```

### 4. Register FCM token on login:
- In auth service after successful login, call backend endpoint to register token
- Endpoint: `POST /api/v1/user/fcm-token` with `{ fcmToken: string }`

**Message Handling Strategy:**
- **Load offers:** Route to load detail screen, highlight as new offer
- **Trip updates:** Route to trip dashboard, refresh status
- **Delivery confirmation:** Route to trip, scroll to relevant stop
- **SOS alerts:** High-priority notification with action button
- **Background:** Store message data, let user review in app

**Estimated Effort:** 4-5 hours (setup + handlers + platform config + error handling)

**Status:** IDENTIFIED (Phase 6) - Does NOT block release; can be enabled post-launch with backend coordination

---

## Phase 5 - Agent Module Post-Load Feature Deferred

**Issue:** Agent load posting feature disabled pending backend support. See [PHASE_5_COMPLETION_REPORT.md](PHASE_5_COMPLETION_REPORT.md) for details.

---

## Phase 6 - Desugaring Implementation Status

**Status:** ✅ RESOLVED

Added `isCoreLibraryDesugaringEnabled = true` and `coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.3")` to `android/app/build.gradle.kts`. Release APK builds successfully with flutter_local_notifications (18.0.1) included.

**Correct Package Name:** `com.android.tools:desugar_jdk_libs:2.0.3` (not the earlier 2.0.4 attempt)

---

## Summary

- **Total Identified Debt Items:** 3 (Phase 5: 1, Phase 6: 2)
- **Blocking Release:** NO (all are post-launch enablement)
- **High Priority (launch + 1 week):** Offline sync flush mechanism (critical for trip tracking in poor connectivity areas)
- **Medium Priority (launch + 2 weeks):** FCM push notifications (coordinated with backend deployment)

**Phase 6 Completion Status:**
- ✅ flutter_local_notifications: Added with desugaring support
- ✅ Offline sync infrastructure: Ready (queue/flush/connectivity monitoring)
- ✅ Push notification infrastructure: Ready (firebase_core/messaging added)
- ⏳ Offline sync flush implementation: Deferred to Phase 6+ (post-launch)
- ⏳ FCM handler implementation: Deferred to Phase 6+ (post-launch)

