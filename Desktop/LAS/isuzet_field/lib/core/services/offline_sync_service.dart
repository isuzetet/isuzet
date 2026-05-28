import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/storage/local_cache.dart';
import 'package:isuzet_field/core/utils/connectivity_monitor.dart';
import 'package:flutter/foundation.dart';

class OfflineSyncService {
  static final OfflineSyncService _instance = OfflineSyncService._internal();

  factory OfflineSyncService() {
    return _instance;
  }

  OfflineSyncService._internal();

  bool _isSyncing = false;
  DateTime? _lastSyncTime;

  /// Initialize the offline sync service.
  /// Watches connectivity changes and triggers sync when connection is restored.
  Future<void> initialize() async {
    // Watch for connectivity changes
    ConnectivityMonitor.isOnline.listen((isOnline) async {
      if (isOnline && !_isSyncing) {
        debugPrint('[OfflineSync] Connection restored, flushing queue...');
        await flushOfflineQueue();
      }
    });
  }

  /// Flush all pending offline data to the backend.
  Future<bool> flushOfflineQueue() async {
    if (_isSyncing) {
      debugPrint('[OfflineSync] Already syncing, skipping...');
      return false;
    }

    _isSyncing = true;
    try {
      // 1. Get all pending GPS points from local cache
      final pendingGpsPoints = await LocalCache.getPendingGpsPoints();

      if (pendingGpsPoints.isEmpty) {
        debugPrint('[OfflineSync] No pending GPS points to sync');
        _lastSyncTime = DateTime.now();
        return true;
      }

      debugPrint('[OfflineSync] Syncing ${pendingGpsPoints.length} GPS points...');

      // 2. Convert to the format expected by backend
      final offlinePings = pendingGpsPoints
          .map((point) => {
                'lat': point['lat'],
                'lng': point['lng'],
                'timestamp': point['timestamp'],
                'accuracy': point['accuracy'],
              })
          .toList();

      // 3. Post batch to backend
      final client = ApiClient();
      final response = await client.post(
        '/location/ping',
        data: {
          'offlinePings': offlinePings,
        },
      );

      if (response['success'] == true) {
        debugPrint('[OfflineSync] Successfully synced ${pendingGpsPoints.length} GPS points');
        
        // 4. Clear the queue after successful sync
        await LocalCache.clearGpsQueue();
        _lastSyncTime = DateTime.now();
        return true;
      } else {
        debugPrint('[OfflineSync] Sync failed: ${response['error']}');
        return false;
      }
    } catch (e) {
      debugPrint('[OfflineSync] Error during sync: $e');
      return false;
    } finally {
      _isSyncing = false;
    }
  }

  /// Get sync status info
  Map<String, dynamic> getSyncStatus() {
    return {
      'isSyncing': _isSyncing,
      'lastSyncTime': _lastSyncTime?.toIso8601String(),
      'isOnline': ConnectivityMonitor.currentlyOnline,
    };
  }

  /// Get current sync progress
  Future<Map<String, dynamic>> getSyncProgress() async {
    final pendingPoints = await LocalCache.getPendingGpsPoints();
    return {
      'pendingPointsCount': pendingPoints.length,
      'isSyncing': _isSyncing,
    };
  }

  /// Manually trigger sync (useful for testing or UI actions)
  Future<bool> manualSync() async {
    if (!ConnectivityMonitor.currentlyOnline) {
      debugPrint('[OfflineSync] Cannot sync while offline');
      return false;
    }
    return flushOfflineQueue();
  }
}
