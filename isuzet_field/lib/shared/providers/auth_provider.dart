import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/core/services/notification_service.dart';
import 'package:isuzet_field/features/auth/data/auth_service.dart';
import 'package:isuzet_field/features/auth/data/models/auth_models.dart';

// Auth state
final authUserProvider = StateNotifierProvider<AuthUserNotifier, AuthUser?>((ref) {
  return AuthUserNotifier();
});

class AuthUserNotifier extends StateNotifier<AuthUser?> {
  AuthUserNotifier() : super(null);

  void setUser(AuthUser user) {
    state = user;
  }

  void clearUser() {
    state = null;
  }
}

// Register mutation
final registerProvider = FutureProvider.autoDispose.family<void, RegisterRequest>((ref, request) async {
  await AuthService.register(
    phone: request.phone,
    fullName: request.fullName,
    role: request.role,
  );
});

// Verify OTP mutation
final verifyOtpProvider = FutureProvider.autoDispose.family<VerifyOtpResponse, VerifyOtpRequest>((ref, request) async {
  final response = await AuthService.verifyOtp(
    phone: request.phone,
    otp: request.otp,
  );

  if (response.user != null) {
    ref.read(authUserProvider.notifier).setUser(response.user!);
    // Register FCM push token with the backend after successful login
    await NotificationService.registerTokenAfterLogin();
  }

  return response;
});

// Logout
final logoutProvider = FutureProvider.autoDispose<void>((ref) async {
  await AuthService.logout();
  ref.read(authUserProvider.notifier).clearUser();
});
