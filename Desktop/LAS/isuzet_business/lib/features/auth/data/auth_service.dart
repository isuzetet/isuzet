import 'package:dio/dio.dart';
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/core/network/api_client.dart';
import 'package:isuzet_business/core/services/notification_service.dart';
import 'package:isuzet_business/core/storage/secure_storage.dart';
import 'package:isuzet_business/features/auth/domain/auth_models.dart';

class AuthService {
  final Dio _dio = ApiClient.dio;

  /// Register new user — sends OTP as side effect.
  /// Role MUST be exactly "FLEET_OWNER" or "ORDERER".
  /// Returns userId from the backend response.
  Future<String> register({
    required String phone,
    required String fullName,
    required String role,
  }) async {
    final response = await _dio.post(
      '${AppConfig.identityBase}/auth/register',
      data: {'phone': phone, 'fullName': fullName, 'role': role},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return data['userId'] as String;
  }

  /// Verify OTP. On success saves tokens and returns the user's role.
  Future<String> verifyOtp(String phone, String otp) async {
    final response = await _dio.post(
      '${AppConfig.identityBase}/auth/verify-otp',
      data: {'phone': phone, 'otp': otp},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    await SecureStorage.saveTokens(
      data['access_token'] as String,
      data['refresh_token'] as String,
    );
    await SecureStorage.saveUserId(user['id'] as String);
    final role = user['role'] as String;
    await SecureStorage.saveUserRole(role);
    // Register FCM token with the backend (non-blocking)
    NotificationService.registerTokenAfterLogin();
    return role;
  }

  /// Get current user info
  Future<CurrentUserResponse> getCurrentUser() async {
    try {
      final response = await _dio.get(
        '${AppConfig.identityBase}/auth/me',
      );
      return CurrentUserResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Upload KYC document
  Future<KycUploadResponse> uploadKyc({
    required String documentType,
    required String imageBase64,
  }) async {
    try {
      final userId = await SecureStorage.getUserId();
      final response = await _dio.post(
        '${AppConfig.identityBase}/auth/kyc/upload',
        data: {
          'userId': userId ?? '',
          'documentType': documentType,
          'imageBase64': imageBase64,
        },
      );
      return KycUploadResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _dio.post('${AppConfig.identityBase}/auth/logout');
    } catch (e) {
      // Log error but don't throw — always clear local storage
    } finally {
      await SecureStorage.clearAll();
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await SecureStorage.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Get cached user role
  Future<String?> getCachedUserRole() async {
    return SecureStorage.getUserRole();
  }
}
