import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/features/auth/data/auth_service.dart';
import 'package:isuzet_business/features/auth/domain/auth_models.dart';

// Service provider
final authServiceProvider = Provider((ref) => AuthService());

// OTP session state
final otpSessionProvider = StateProvider<String?>((ref) => null);

// User verification token
final verificationTokenProvider = StateProvider<String?>((ref) => null);

// Current user role (cached)
final userRoleProvider = FutureProvider<String?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return authService.getCachedUserRole();
});

// Auth state for registration flow
final registrationStateProvider = StateNotifierProvider<
    RegistrationStateNotifier,
    RegistrationState>((ref) {
  return RegistrationStateNotifier(ref.watch(authServiceProvider));
});

class RegistrationState {
  final String phone;
  final String fullName;
  final UserRole? selectedRole;
  final String? otpSessionId;
  final bool isLoading;
  final String? error;

  RegistrationState({
    this.phone = '',
    this.fullName = '',
    this.selectedRole,
    this.otpSessionId,
    this.isLoading = false,
    this.error,
  });

  RegistrationState copyWith({
    String? phone,
    String? fullName,
    UserRole? selectedRole,
    String? otpSessionId,
    bool? isLoading,
    String? error,
  }) {
    return RegistrationState(
      phone: phone ?? this.phone,
      fullName: fullName ?? this.fullName,
      selectedRole: selectedRole ?? this.selectedRole,
      otpSessionId: otpSessionId ?? this.otpSessionId,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class RegistrationStateNotifier extends StateNotifier<RegistrationState> {
  final AuthService _authService;

  RegistrationStateNotifier(this._authService)
      : super(RegistrationState());

  Future<void> setPhone(String phone) async {
    state = state.copyWith(phone: phone);
  }

  Future<void> setFullName(String fullName) async {
    state = state.copyWith(fullName: fullName);
  }

  Future<void> setRole(UserRole role) async {
    state = state.copyWith(selectedRole: role);
  }

  Future<bool> completeRegistration() async {
    if (state.phone.isEmpty || state.fullName.isEmpty || state.selectedRole == null) {
      state = state.copyWith(error: 'Phone, full name and role are required');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      await _authService.register(
        phone: state.phone,
        fullName: state.fullName,
        role: state.selectedRole!.value,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}
