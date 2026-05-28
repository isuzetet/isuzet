import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';
import 'package:isuzet_field/features/dashboard/data/models/earnings_models.dart';

class EarningsService {
  /// Fetch driver earnings from backend
  /// CRITICAL: Uses userId from SecureStorage (not from local state that might be stale after token refresh)
  static Future<Earnings> fetchEarnings() async {
    // Get userId from SecureStorage - this is the authoritative source
    final userId = await SecureStorage.getUserId();
    if (userId == null || userId.isEmpty) {
      throw Exception('User ID not found in SecureStorage');
    }

    try {
      final response = await ApiClient.dio.get(
        '/api/v1/liquidity/drivers/$userId/earnings',
      );

      return Earnings.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Get weekly earnings trend (last 7 days)
  /// Also uses userId from SecureStorage
  static Future<List<double>> fetchWeeklyTrend() async {
    final userId = await SecureStorage.getUserId();
    if (userId == null || userId.isEmpty) {
      throw Exception('User ID not found in SecureStorage');
    }

    try {
      final response = await ApiClient.dio.get(
        '/api/v1/liquidity/drivers/$userId/earnings/weekly-trend',
      );

      final List<dynamic> data = response.data['trend'] ?? [];
      return data.map((e) => (e as num).toDouble()).toList();
    } catch (e) {
      rethrow;
    }
  }
}

class TrustScoreService {
  /// Fetch trust breakdown from backend
  /// CRITICAL: Handles null values for all 6 components - defaults to 0.0
  static Future<TrustBreakdown> fetchTrustBreakdown() async {
    try {
      final response = await ApiClient.dio.get(
        '/api/v1/identity/trust-breakdown',
      );

      return TrustBreakdown.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }
}

class IncidentService {
  /// Report a standard incident (accident, theft, roadblock, etc.)
  static Future<IncidentReportResponse> reportIncident({
    required String tripId,
    required String type,
    required String description,
    String? location,
    double? latitude,
    double? longitude,
    String? proofUrl,
  }) async {
    try {
      final request = IncidentReportRequest(
        tripId: tripId,
        type: type,
        description: description,
        location: location,
        latitude: latitude,
        longitude: longitude,
        proofUrl: proofUrl,
      );

      final response = await ApiClient.dio.post(
        '/api/v1/incident/report',
        data: request.toJson(),
      );

      return IncidentReportResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// CRITICAL: Medical SOS - immediate endpoint without form submission
  /// This bypasses normal incident flow and goes directly to emergency services
  /// No form validation, no user confirmation beyond initial selection
  static Future<MedicalSosResponse> triggerMedicalSos({
    required String tripId,
    double? latitude,
    double? longitude,
  }) async {
    try {
      // Get current user location if not provided
      final currentLat = latitude;
      final currentLon = longitude;

      final request = {
        'tripId': tripId,
        'latitude': currentLat,
        'longitude': currentLon,
        'timestamp': DateTime.now().toIso8601String(),
      };

      final response = await ApiClient.dio.post(
        '/api/v1/medical-sos',
        data: request,
      );

      return MedicalSosResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Get incident status by incident ID
  static Future<Incident> getIncidentStatus(String incidentId) async {
    try {
      final response = await ApiClient.dio.get(
        '/api/v1/incident/$incidentId',
      );

      return Incident.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }
}
