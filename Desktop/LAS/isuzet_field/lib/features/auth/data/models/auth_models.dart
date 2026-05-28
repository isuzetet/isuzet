class AuthUser {
  final String id;
  final String phone;
  final String fullName;
  final String role; // "DRIVER" for the fleet-management launch
  final int trustTier; // 0-5
  final int kycTier; // 0-1
  final double trustScore; // 0-100

  AuthUser({
    required this.id,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.trustTier,
    required this.kycTier,
    required this.trustScore,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      phone: json['phone'] as String,
      fullName: json['fullName'] as String,
      role: json['role'] as String,
      trustTier: json['trustTier'] as int? ?? 0,
      kycTier: json['kycTier'] as int? ?? 0,
      trustScore: (json['trustScore'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'phone': phone,
    'fullName': fullName,
    'role': role,
    'trustTier': trustTier,
    'kycTier': kycTier,
    'trustScore': trustScore,
  };
}

class AuthTokens {
  final String accessToken;
  final String refreshToken;

  AuthTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
    );
  }
}

class RegisterRequest {
  final String phone;
  final String fullName;
  final String role;

  RegisterRequest({
    required this.phone,
    required this.fullName,
    required this.role,
  });

  Map<String, dynamic> toJson() => {
    'phone': phone,
    'fullName': fullName,
    'role': role,
  };
}

class VerifyOtpRequest {
  final String phone;
  final String otp;

  VerifyOtpRequest({
    required this.phone,
    required this.otp,
  });

  Map<String, dynamic> toJson() => {
    'phone': phone,
    'otp': otp,
  };
}

class VerifyOtpResponse {
  final bool success;
  final String? message;
  final AuthTokens? tokens;
  final AuthUser? user;
  final String? error;

  VerifyOtpResponse({
    this.success = false,
    this.message,
    this.tokens,
    this.user,
    this.error,
  });

  factory VerifyOtpResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    return VerifyOtpResponse(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String?,
      tokens: data?['access_token'] != null ? AuthTokens.fromJson(data!) : null,
      user: data?['user'] != null ? AuthUser.fromJson(data!['user'] as Map<String, dynamic>) : null,
      error: (json['error'] as Map<String, dynamic>?)?['message'] as String?,
    );
  }
}
