import 'package:dio/dio.dart';
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/core/network/api_client.dart';
import 'package:isuzet_business/features/fleet/domain/fleet_models.dart';

class FleetService {
  final Dio _dio = ApiClient.dio;

  dynamic _unwrap(dynamic responseData) {
    if (responseData is Map<String, dynamic> && responseData.containsKey('data')) {
      return responseData['data'];
    }
    return responseData;
  }

  // ===== FLEET METRICS =====
  
  /// Get fleet KPI metrics (total trucks, active trucks, revenue, drivers)
  Future<FleetMetrics> getFleetMetrics() async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/fleet/metrics',
      );
      return FleetMetrics.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  // ===== TRUCKS =====

  /// Get all trucks for fleet owner
  Future<List<Truck>> getTrucks() async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/fleet/trucks',
      );
      final List<dynamic> data = _unwrap(response.data) as List<dynamic>? ?? [];
      return data.map((t) => Truck.fromJson(t as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get single truck by ID
  Future<Truck> getTruck(String truckId) async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/fleet/trucks/$truckId',
      );
      return Truck.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Create new truck
  /// CRITICAL: capacityKg must be integer (kg, not tonnes)
  Future<Truck> createTruck({
    required String licensePlate,
    required int capacityKg, // ← MUST be integer in kg (30 tonnes = 30000)
    String? registrationNumber,
    String? driverId,
  }) async {
    try {
      final response = await _dio.post(
        '${AppConfig.dispatchBase}/fleet/trucks',
        data: {
          'licensePlate': licensePlate,
          'capacityKg': capacityKg, // ← Sent exactly as integer
          'registrationNumber': registrationNumber,
          'driverId': driverId,
          'status': 'active',
        },
      );
      return Truck.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Update truck (capacity change, status, etc.)
  Future<Truck> updateTruck(
    String truckId, {
    String? licensePlate,
    int? capacityKg,
    String? registrationNumber,
    String? driverId,
    String? status,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (licensePlate != null) data['licensePlate'] = licensePlate;
      if (capacityKg != null) data['capacityKg'] = capacityKg; // ← Integer
      if (registrationNumber != null) data['registrationNumber'] = registrationNumber;
      if (driverId != null) data['driverId'] = driverId;
      if (status != null) data['status'] = status;

      final response = await _dio.patch(
        '${AppConfig.dispatchBase}/fleet/trucks/$truckId',
        data: data,
      );
      return Truck.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Delete truck
  Future<void> deleteTruck(String truckId) async {
    try {
      await _dio.delete(
        '${AppConfig.dispatchBase}/fleet/trucks/$truckId',
      );
    } catch (e) {
      rethrow;
    }
  }

  // ===== DRIVERS =====

  /// Get all drivers for fleet owner
  Future<List<Driver>> getDrivers() async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/fleet/drivers',
      );
      final List<dynamic> data = _unwrap(response.data) as List<dynamic>? ?? [];
      return data.map((d) => Driver.fromJson(d as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get single driver
  Future<Driver> getDriver(String driverId) async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/fleet/drivers/$driverId',
      );
      return Driver.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Create new driver
  Future<Driver> createDriver({
    required String fullName,
    required String phone,
    String? licenseNumber,
  }) async {
    try {
      final response = await _dio.post(
        '${AppConfig.dispatchBase}/fleet/drivers/invite',
        data: {
          'fullName': fullName,
          'phone': phone,
          'licenseNumber': licenseNumber,
          'active': true,
        },
      );
      return Driver.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Update driver (status, license, etc.)
  Future<Driver> updateDriver(
    String driverId, {
    String? fullName,
    String? phone,
    String? licenseNumber,
    bool? active,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (fullName != null) data['fullName'] = fullName;
      if (phone != null) data['phone'] = phone;
      if (licenseNumber != null) data['licenseNumber'] = licenseNumber;
      if (active != null) data['active'] = active;

      final response = await _dio.patch(
        '${AppConfig.dispatchBase}/fleet/drivers/$driverId',
        data: data,
      );
      return Driver.fromJson(_unwrap(response.data) as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Deactivate/unlink driver from this fleet.
  Future<void> deleteDriver(String driverId) async {
    try {
      await _dio.delete(
        '${AppConfig.dispatchBase}/fleet/drivers/$driverId',
      );
    } catch (e) {
      rethrow;
    }
  }

  // ===== LOCATIONS (for map) =====

  /// Get current locations of all active trucks
  Future<List<TruckLocation>> getActiveTruckLocations() async {
    try {
      final response = await _dio.get(
        '${AppConfig.locationBase}/location/fleet/live',
      );
      final List<dynamic> data = _unwrap(response.data) as List<dynamic>? ?? [];
      return data
          .where((loc) =>
              loc is Map<String, dynamic> &&
              ((loc['latitude'] ?? loc['lat'] ?? loc['currentLat']) != null) &&
              ((loc['longitude'] ?? loc['lng'] ?? loc['currentLng']) != null))
          .map((loc) {
            final data = loc as Map<String, dynamic>;
            return TruckLocation.fromJson({
              'truckId': data['truckId'] ?? data['id'],
              'latitude': data['latitude'] ?? data['lat'] ?? data['currentLat'],
              'longitude': data['longitude'] ?? data['lng'] ?? data['currentLng'],
              'timestamp': data['timestamp'] ??
                  data['lastUpdated'] ??
                  data['updatedAt'] ??
                  DateTime.now().toIso8601String(),
              'status': data['status'],
            });
          })
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get location history for single truck
  Future<List<TruckLocation>> getTruckLocationHistory(
    String truckId, {
    int? limitDays = 7,
  }) async {
    try {
      final response = await _dio.get(
        '${AppConfig.locationBase}/location/truck/$truckId/history',
        queryParameters: {'days': limitDays},
      );
      final List<dynamic> data = _unwrap(response.data) as List<dynamic>? ?? [];
      return data
          .map((loc) => TruckLocation.fromJson(loc as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }
}
