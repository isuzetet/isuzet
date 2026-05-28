import 'package:dio/dio.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/services/notification_service.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';
import 'package:isuzet_field/features/auth/data/models/auth_models.dart';

AppException _mapAuthException(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.sendTimeout:
      return NetworkException(message: 'ኢንተርኔት ቅንጅት ችግር'); // Connection issue
    case DioExceptionType.badResponse:
      if (error.response?.statusCode == 401) {
        return UnauthorizedException(message: 'ስልክ ቁጥር ወይም OTP ስህተት'); // Wrong phone or OTP
      }
      if (error.response?.statusCode == 400) {
        final msg = error.response?.data['message'] as String?;
        if (msg?.contains('OTP_EXPIRED') ?? false) {
          return ValidationException(
            message: 'OTP ጊዜው አልፏል',
            code: 'OTP_EXPIRED',
          );
        }
        if (msg?.contains('OTP_LOCKOUT') ?? false) {
          return ValidationException(
            message: 'ብዙ ሙከራ። 30 ደቂቃ ውስጥ እንደገና ሞክር።',
            code: 'OTP_LOCKOUT',
          );
        }
        return ValidationException(message: msg ?? 'Validation error');
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

class AuthService {
  static final _dio = ApiClient.dio;

  static Future<void> register({
    required String phone,
    required String fullName,
    required String role,
  }) async {
    try {
      final request = RegisterRequest(
        phone: phone,
        fullName: fullName,
        role: role,
      );

      await _dio.post(
        '${AppConfig.identityBase}/auth/register',
        data: request.toJson(),
      );
    } on DioException catch (e) {
      throw _mapAuthException(e);
    }
  }

  static Future<VerifyOtpResponse> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    try {
      final request = VerifyOtpRequest(phone: phone, otp: otp);

      final response = await _dio.post(
        '${AppConfig.identityBase}/auth/verify-otp',
        data: request.toJson(),
      );

      final verifyResponse = VerifyOtpResponse.fromJson(response.data);

      if (verifyResponse.tokens != null) {
        await SecureStorage.saveTokens(
          verifyResponse.tokens!.accessToken,
          verifyResponse.tokens!.refreshToken,
        );
      }

      if (verifyResponse.user != null) {
        await SecureStorage.saveUserId(verifyResponse.user!.id);
        await SecureStorage.saveUserRole(verifyResponse.user!.role);
      }

      // Register FCM token with the backend (non-blocking)
      if (verifyResponse.tokens != null) {
        NotificationService.registerTokenAfterLogin();
      }

      return verifyResponse;
    } on DioException catch (e) {
      throw _mapAuthException(e);
    }
  }

  static Future<void> logout() async {
    // Unregister FCM token before clearing credentials
    await NotificationService.unregisterToken();
    try {
      await _dio.post('${AppConfig.identityBase}/auth/logout');
    } catch (_) {
      // Logout always succeeds locally
    } finally {
      await SecureStorage.clearAll();
    }
  }

  static Future<AuthUser> getProfile() async {
    try {
      final response = await _dio.get('${AppConfig.identityBase}/identity/me');
      return AuthUser.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapAuthException(e);
    }
  }
}
