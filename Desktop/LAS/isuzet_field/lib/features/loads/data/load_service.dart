import 'package:dio/dio.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/network/api_endpoints.dart';
import 'package:isuzet_field/features/loads/data/models/load_models.dart';

AppException _mapLoadException(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.sendTimeout:
      return NetworkException(message: 'ኢንተርኔት ቅንጅት ችግር');
    case DioExceptionType.badResponse:
      if (error.response?.statusCode == 401) {
        return UnauthorizedException(message: 'ለOffer አገዛዝ ለ re-login ያስፈልግዎ ይሆናል።');
      }
      if (error.response?.statusCode == 404) {
        return ValidationException(
          message: 'Load ተገኝቷል አይደለም።',
          code: 'LOAD_NOT_FOUND',
        );
      }
      if (error.response?.statusCode == 409) {
        return ValidationException(
          message: 'Load ቀድሞ ተቀበሉት ወይም ጊዜውሰሰ።',
          code: 'LOAD_ALREADY_ACCEPTED',
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

class LoadService {
  static final _dio = ApiClient.dio;

  static Future<LoadsListResponse> fetchAvailableLoads({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}${ApiEndpoints.loadsList}',
        queryParameters: {
          'page': page,
          'limit': limit,
          'status': 'active',
        },
      );

      return LoadsListResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapLoadException(e);
    }
  }

  static Future<LoadItem> fetchLoadDetail(String loadId) async {
    try {
      final response = await _dio.get(
        '${AppConfig.dispatchBase}${ApiEndpoints.loadDetail.replaceFirst(':id', loadId)}',
      );

      return LoadItem.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapLoadException(e);
    }
  }

  static Future<AcceptOfferResponse> acceptLoad(String loadId) async {
    try {
      // CRITICAL: Empty body — Dio sends null by default which becomes {}
      // Explicitly passing null ensures truly empty body
      final response = await _dio.post(
        '${AppConfig.dispatchBase}${ApiEndpoints.acceptOffer.replaceFirst(':loadId', loadId)}',
        data: null, // Empty body — crucial for backend compatibility
      );

      return AcceptOfferResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapLoadException(e);
    }
  }

  static Future<void> declineLoad(String loadId) async {
    try {
      await _dio.post(
        '${AppConfig.dispatchBase}${ApiEndpoints.declineOffer.replaceFirst(':loadId', loadId)}',
      );
    } on DioException catch (e) {
      throw _mapLoadException(e);
    }
  }
}
