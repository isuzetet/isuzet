import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/storage/local_cache.dart';
import 'package:isuzet_field/core/utils/connectivity_monitor.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';

/// Tracks whether an offline sync is currently in progress.
final syncInProgressProvider = StateProvider<bool>((ref) => false);

/// Tracks the result of the most recent sync attempt.
final lastSyncResultProvider = StateProvider<OfflineSyncResult?>((ref) => null);

class OfflineSyncResult {
  final int gpsFlushed;
  final int deliveriesFlushed;
  final int gpsFailed;
  final int deliveriesFailed;
  final DateTime syncedAt;

  const OfflineSyncResult({
    required this.gpsFlushed,
    required this.deliveriesFlushed,
    required this.gpsFailed,
    required this.deliveriesFailed,
    required this.syncedAt,
  });

  bool get hadErrors => gpsFailed > 0 || deliveriesFailed > 0;
}

/// Watches connectivity and triggers sync when coming online.
final offlineSyncWatcherProvider = Provider<void>((ref) {
  ConnectivityMonitor.isOnline.listen((isOnline) {
    if (isOnline) {
      ref.read(offlineSyncServiceProvider).syncAll(ref);
    }
  });
});

/// Service that performs the actual flush of queued offline data.
final offlineSyncServiceProvider = Provider<OfflineSyncService>((ref) {
  return OfflineSyncService();
});

class OfflineSyncService {
  Future<void> syncAll(Ref ref) async {
    final inProgress = ref.read(syncInProgressProvider);
    if (inProgress) return;

    ref.read(syncInProgressProvider.notifier).state = true;

    int gpsFlushed = 0;
    int deliveriesFlushed = 0;
    int gpsFailed = 0;
    int deliveriesFailed = 0;

    try {
      // 1. Flush pending GPS points (offline tracking queue)
      final tripId = await SecureStorage.getActiveTripId();
      if (tripId != null) {
        final gpsPoints = await LocalCache.getPendingGpsPoints();
        if (gpsPoints.isNotEmpty) {
          // Send as offline batch via the ping endpoint
          final offlinePings = gpsPoints
              .map((p) => {
                    'lat': p.lat,
                    'lng': p.lng,
                    'timestamp': DateTime.fromMillisecondsSinceEpoch(p.ts)
                        .toIso8601String(),
                  })
              .toList();

          try {
            await ApiClient.dio.post(
              '${AppConfig.locationBase}/location/ping',
              data: {
                'tripId': tripId,
                'lat': gpsPoints.last.lat,
                'lng': gpsPoints.last.lng,
                'offlinePings': offlinePings,
              },
            );
            gpsFlushed = gpsPoints.length;
            await LocalCache.clearGpsQueue();
          } catch (_) {
            gpsFailed = gpsPoints.length;
          }
        }
      }

      // 2. Flush pending deliveries
      final pendingDeliveries = await LocalCache.getPendingDeliveries();
      for (final delivery in pendingDeliveries) {
        try {
          await ApiClient.dio.post(
            '${AppConfig.tripsBase}/trips/${delivery.tripId}/deliver-stop',
            data: {
              'stopId': delivery.stopId,
              if (delivery.otp.isNotEmpty) 'otp': delivery.otp,
              if (delivery.photoUrl != null) 'proofOfDeliveryUrl': delivery.photoUrl,
              if (delivery.driverNote != null) 'notes': delivery.driverNote,
            },
          );
          deliveriesFlushed++;
        } catch (_) {
          deliveriesFailed++;
        }
      }

      // Remove successfully synced deliveries
      if (deliveriesFlushed > 0 && deliveriesFailed == 0) {
        // All synced — clear the queue
        await LocalCache.clearPendingDeliveries();
      }

      ref.read(lastSyncResultProvider.notifier).state = OfflineSyncResult(
        gpsFlushed: gpsFlushed,
        deliveriesFlushed: deliveriesFlushed,
        gpsFailed: gpsFailed,
        deliveriesFailed: deliveriesFailed,
        syncedAt: DateTime.now(),
      );
    } finally {
      ref.read(syncInProgressProvider.notifier).state = false;
    }
  }
}
