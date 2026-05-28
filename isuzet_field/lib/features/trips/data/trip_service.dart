import 'package:dio/dio.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/network/api_endpoints.dart';
import 'package:isuzet_field/features/trips/data/models/trip_models.dart';

AppException _mapTripException(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.sendTimeout:
      return NetworkException(message: 'ኢንተርኔት ቅንጅት ችግር');
    case DioExceptionType.badResponse:
      if (error.response?.statusCode == 401) {
        return UnauthorizedException(message: 'ለTrip አገዛዝ ለ re-login ያስፈልግዎ ይሆናል።');
      }
      if (error.response?.statusCode == 404) {
        return ValidationException(
          message: 'Trip ተገኝቷል አይደለም።',
          code: 'TRIP_NOT_FOUND',
        );
      }
      if (error.response?.statusCode == 410) {
        return ValidationException(
          message: 'Trip ናቁ ወይም ቀርቶታል።',
          code: 'TRIP_EXPIRED',
        );
      }
      return ServerException(
        message: error.response?.data['message'] ?? 'Server error',
      );
    case DioExceptionType.cancel:
      return NetworkException(message: 'Request cancelled');
    default:
      return NetworkException(message: error.message ?? 'Unknown error');
  }
}

class TripService {
  static final _dio = ApiClient.dio;

  static Future<Trip> fetchTripDetail(String tripId) async {
    try {
      final response = await _dio.get(
        '${AppConfig.tripsBase}${ApiEndpoints.tripDetail.replaceFirst(':tripId', tripId)}',
      );

      return Trip.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapTripException(e);
    }
  }

  /// CRITICAL: stopId must come from trip.stops, not hardcoded
  static Future<DeliverStopResponse> deliverStop({
    required String tripId,
    required String stopId, // From trip model
    required double latitude,
    required double longitude,
    String? notes,
  }) async {
    try {
      // Verify stopId is not empty (should come from trip model)
      if (stopId.isEmpty) {
        throw ValidationException(
          message: 'Stop ID missing from trip data',
          code: 'INVALID_STOP_ID',
        );
      }

      final request = DeliverStopRequest(
        stopId: stopId,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
      );

      final response = await _dio.post(
        '${AppConfig.tripsBase}${ApiEndpoints.deliverStop.replaceFirst(':tripId', tripId)}',
        data: request.toJson(),
      );

      return DeliverStopResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapTripException(e);
    }
  }

  static Future<void> postGpsLocation({
    required double latitude,
    required double longitude,
    required double accuracy,
    required double altitude,
    required double speedMps,
    required double headingDegrees,
    required String tripId,
  }) async {
    try {
      final location = GpsLocation(
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        altitude: altitude,
        speedMps: speedMps,
        headingDegrees: headingDegrees,
        timestamp: DateTime.now(),
        tripId: tripId,
      );

      await _dio.post(
        '${AppConfig.locationBase}${ApiEndpoints.gpsTrack}',
        data: location.toJson(),
      );
    } on DioException {
      // Silently fail GPS tracking - don't block main flow
    }
  }
}
