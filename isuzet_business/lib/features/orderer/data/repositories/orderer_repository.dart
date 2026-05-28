import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/network/api_client.dart';
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/features/orderer/data/models/corridor_data.dart';
import 'package:isuzet_business/features/orderer/data/models/post_load_request.dart';

class OrdererRepository {
  final Dio _dio = ApiClient.dio;

  Future<List<CorridorData>> getCorridors() async {
    try {
      final response = await _dio.get(
        '${AppConfig.corridorBase}/corridors',
      );

      if (response.statusCode == 200) {
        final data = (response.data['data'] ?? response.data) as List;
        return data
            .map((corridor) =>
                CorridorData.fromJson(corridor as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception('Failed to load corridors: ${response.statusCode}');
      }
    } on DioException catch (e) {
      throw Exception('Network error: ${e.message}');
    }
  }

  /// POST to /api/v1/dispatch/loads
  /// Frontend sends: corridorId, originCity, destinationCity, cargoType, weightKg, pickupDate, deliveryDeadline
  /// Backend resolves: strategyVersionId, ordererId, status
  Future<String> postLoad(PostLoadRequest req) async {
    try {
      final response = await _dio.post(
        '${AppConfig.dispatchBase}/loads',
        data: {
          'corridorId': req.corridorId,
          'originCity': req.originCity,
          'originAddress': req.originAddress,
          'destinationCity': req.destinationCity,
          'destinationAddress': req.destinationAddress,
          'cargoType': req.cargoType,
          'cargoDescription': req.cargoDescription,
          'weightKg': req.weightKg,
          'pickupDate': req.pickupDate.toIso8601String(),
          'deliveryDeadline': req.deliveryDeadline.toIso8601String(),
          'paymentModel': req.paymentModel,
          'specialInstructions': req.specialInstructions,
          'requiresReefer': req.requiresReefer,
          'isHazardous': req.isHazardous,
        },
      );

      if (response.statusCode == 201) {
        final loadId = response.data['data']['id'] as String?;
        if (loadId == null) {
          throw Exception('No load ID in response');
        }
        return loadId;
      } else {
        throw Exception('Failed to post load: ${response.statusCode}');
      }
    } on DioException catch (e) {
      throw Exception('Network error: ${e.message}');
    }
  }
}

final ordererRepositoryProvider = Provider<OrdererRepository>(
  (ref) {
    return OrdererRepository();
  },
);
