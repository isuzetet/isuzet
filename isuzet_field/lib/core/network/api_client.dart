import 'package:dio/dio.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';

class ApiClient {
  static final _dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: Duration(milliseconds: AppConfig.connectTimeoutMs),
      receiveTimeout: Duration(milliseconds: AppConfig.receiveTimeoutMs),
    ),
  );

  static Dio get dio {
    _setupInterceptors();
    return _dio;
  }

  static void _setupInterceptors() {
    // Remove existing interceptors to avoid duplicates
    _dio.interceptors.clear();

    // Add auth interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            try {
              final refreshToken = await SecureStorage.getRefreshToken();
              if (refreshToken != null) {
                final response = await _refreshToken(refreshToken);
                if (response != null) {
                  // Retry original request
                  final options = error.requestOptions;
                  options.headers['Authorization'] =
                      'Bearer ${response['access_token']}';
                  return handler.resolve(await _dio.request(
                    options.path,
                    options: Options(
                      method: options.method,
                      headers: options.headers,
                    ),
                    data: options.data,
                    queryParameters: options.queryParameters,
                  ));
                }
              }
              // If refresh fails, clear tokens and redirect to login
              await SecureStorage.clearAll();
            } catch (e) {
              await SecureStorage.clearAll();
            }
          }
          return handler.next(error);
        },
      ),
    );

    // Add error interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) {
          final exception = _mapException(error);
          return handler.next(
            DioException(
              requestOptions: error.requestOptions,
              error: exception,
              type: error.type,
            ),
          );
        },
      ),
    );
  }

  static Future<Map<String, dynamic>?> _refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post(
        '${AppConfig.identityBase}/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final data = response.data['data'] as Map<String, dynamic>?;
      if (data?['access_token'] != null) {
        await SecureStorage.saveTokens(
          data!['access_token'] as String,
          (data['refresh_token'] ?? refreshToken) as String,
        );
        return data;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  static AppException _mapException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return NetworkException(message: 'Connection timeout');
      case DioExceptionType.badResponse:
        if (error.response?.statusCode == 401) {
          return UnauthorizedException();
        }
        if (error.response?.statusCode == 400) {
          return ValidationException(
            message: error.response?.data['message'] ?? 'Validation error',
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
}
