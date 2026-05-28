import 'package:dio/dio.dart';
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/core/network/api_client.dart';
import 'package:isuzet_business/features/orderer/domain/orderer_models.dart';

class OrdererService {
  final Dio _dio = ApiClient.dio;

  // ===== METRICS =====

  /// Get orderer home metrics
  Future<OrdererMetrics> getOrdererMetrics() async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/orderer/metrics',
      );
      return OrdererMetrics.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  // ===== LOADS / TRIPS =====

  /// Get all loads posted by orderer
  Future<List<Load>> getMyLoads() async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/loads',
      );
      final List<dynamic> data = response.data['data'] ?? response.data ?? [];
      return data.map((l) => Load.fromJson(l as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get single load details
  Future<Load> getLoad(String loadId) async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}/loads/$loadId',
      );
      return Load.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Post new load to network
  /// CRITICAL: Field names MUST match backend exactly (corridorId, cargoType, weightKg, pickupDate, estimatedValueCents)
  /// fundingRailId is required for escrow funding
  Future<Load> postLoad({
    required String corridorId,
    required String cargoType,
    required int weightKg,
    required DateTime pickupDate,
    required int estimatedValueCents,
    String? specialInstructions,
    required String fundingRailId,
  }) async {
    try {
      final body = {
        'loads': [
          {
            'corridorId': corridorId,
            'cargoType': cargoType,
            'weightKg': weightKg,
            'pickupDate': pickupDate.toIso8601String(),
            'estimatedValueCents': estimatedValueCents,
            if (specialInstructions != null) 'specialInstructions': specialInstructions,
          }
        ],
        'fundingRailId': fundingRailId,
      };

      final response = await _dio.post(
        '${AppConfig.dispatchBase}/loads/bulk',
        data: body,
      );

      // Response contains multiple loads, return first one
      final result = response.data['data'] as List?;
      if (result != null && result.isNotEmpty) {
        return Load.fromJson(result[0] as Map<String, dynamic>);
      }
      throw Exception('No load returned from server');
    } catch (e) {
      rethrow;
    }
  }

  // ===== PRICE ESTIMATE =====

  /// Get price estimate for load (PUBLIC endpoint — NO AUTH HEADER)
  /// CRITICAL: This endpoint requires NO authentication header
  /// The auth interceptor must NOT add Bearer token to this call
  Future<PriceEstimate> getEstimate({
    required String corridorId,
    required int weightKg,
  }) async {
    try {
      // Create a new Dio instance WITHOUT auth interceptor for this call
      final publicDio = Dio(
        BaseOptions(
          baseUrl: AppConfig.identityBase, // Base URL for constructor
          connectTimeout: Duration(seconds: 10),
          receiveTimeout: Duration(seconds: 10),
        ),
      );

      final response = await publicDio.get(
        '${AppConfig.corridorBase}/public-calculator/estimate',
        queryParameters: {
          'corridorId': corridorId,
          'weightKg': weightKg,
        },
      );

      return PriceEstimate.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  // ===== CORRIDORS =====

  /// Get available corridors (routes)
  Future<List<Corridor>> getCorridors() async {
    try {
      final response = await _dio.get(
        '${AppConfig.corridorBase}/corridors',
      );
      final List<dynamic> data = response.data['data'] ?? response.data ?? [];
      return data
          .map((c) => Corridor.fromJson(c as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }
}
