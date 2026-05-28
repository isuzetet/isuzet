import 'dart:async';
import 'dart:io';
import 'package:geolocator/geolocator.dart';
import 'package:isuzet_field/features/trips/data/models/trip_models.dart';
import 'package:isuzet_field/features/trips/data/trip_service.dart';

class GpsTrackingService {
  static const int updateIntervalMs = 5000; // 5 seconds
  static StreamSubscription<Position>? _positionStream;
  
  /// Initialize GPS tracking (Android background location permission)
  static Future<void> initializeGps() async {
    // Skip on web - will be handled with graceful degradation
    if (kIsWeb) return;
    
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      await Geolocator.requestPermission();
    } else if (permission == LocationPermission.deniedForever) {
      // Permission permanently denied, can't track
      return;
    }
    
    // For Android: request background location permission
    // This must be declared in AndroidManifest.xml
    if (Platform.isAndroid) {
      // geolocator plugin will handle this if permission is declared in manifest
      // Manifest must contain: <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    }
  }

  /// Start real-time GPS tracking for a trip
  /// Posts locations to backend every updateIntervalMs
  static void startTracking(String tripId) {
    if (kIsWeb) {
      // Web doesn't support geolocator GPS tracking
      return;
    }
    
    _positionStream = Geolocator.getPositionStream().listen((Position position) {
      // Send GPS data to backend (fire and forget)
      TripService.postGpsLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speedMps: position.speed,
        headingDegrees: position.heading,
        tripId: tripId,
      );
    });
  }

  /// Stop GPS tracking
  static void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
  }

  /// Get current position (for initial map positioning)
  static Future<GpsLocation?> getCurrentLocation(String tripId) async {
    if (kIsWeb) {
      // Web: return null for graceful degradation
      return null;
    }
    
    try {
      final position = await Geolocator.getCurrentPosition();
      
      return GpsLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speedMps: position.speed,
        headingDegrees: position.heading,
        timestamp: DateTime.now(),
        tripId: tripId,
      );
    } catch (e) {
      return null;
    }
  }

  /// Check if GPS is available (on web, always false)
  static Future<bool> isGpsAvailable() async {
    if (kIsWeb) return false;
    return await Geolocator.isLocationServiceEnabled();
  }
}

// Platform detection for web
const bool kIsWeb = bool.fromEnvironment('dart.library.js_util');
