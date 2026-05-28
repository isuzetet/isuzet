// Auth models — simplified for Phase 1 (no code generation dependency)

/// Role enum — exact strings sent to backend
enum UserRole {
  fleetOwner,
  orderer,
}

extension UserRoleExt on UserRole {
  String get value {
    switch (this) {
      case UserRole.fleetOwner:
        return 'FLEET_OWNER';
      case UserRole.orderer:
        return 'ORDERER';
    }
  }

  String get label {
    switch (this) {
      case UserRole.fleetOwner:
        return 'Fleet Owner';
      case UserRole.orderer:
        return 'Cargo Owner';
    }
  }

  String get amharic {
    switch (this) {
      case UserRole.fleetOwner:
        return 'የፍሊት ባለቤት';
      case UserRole.orderer:
        return 'ጭነት ባለቤት';
    }
  }

  String get subtitle {
    switch (this) {
      case UserRole.fleetOwner:
        return 'Track trucks, manage drivers, see earnings';
      case UserRole.orderer:
        return 'Post loads, find trucks, track shipments';
    }
  }

  String get amharicSubtitle {
    switch (this) {
      case UserRole.fleetOwner:
        return 'መኪኖችዎን ይከታተሉ፣ ሹፌሮቹን ያስተዳድሩ';
      case UserRole.orderer:
        return 'ጭነት ይለጥፉ፣ መኪና ያግኙ፣ ጭነቱን ይከታተሉ';
    }
  }
}

/// Response from send OTP endpoint
class SendOtpResponse {
  final String sessionId;
  final int expiresIn;

  SendOtpResponse({
    required this.sessionId,
    required this.expiresIn,
  });

  factory SendOtpResponse.fromJson(Map<String, dynamic> json) {
    return SendOtpResponse(
      sessionId: json['sessionId'] as String,
      expiresIn: json['expiresIn'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
    'sessionId': sessionId,
    'expiresIn': expiresIn,
  };
}

/// Response from auth endpoint (login/register)
class AuthResponse {
  final String userId;
  final String phone;
  final String fullName;
  final String role;
  final String accessToken;
  final String refreshToken;
  final int kycTier;

  AuthResponse({
    required this.userId,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.accessToken,
    required this.refreshToken,
    required this.kycTier,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;
    final user = data['user'] as Map<String, dynamic>? ?? data;
    return AuthResponse(
      userId: (user['id'] ?? user['userId']) as String,
      phone: (user['phone'] ?? '') as String,
      fullName: (user['fullName'] ?? '') as String,
      role: user['role'] as String,
      accessToken: (data['access_token'] ?? data['accessToken']) as String,
      refreshToken: (data['refresh_token'] ?? data['refreshToken']) as String,
      kycTier: user['kycTier'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'phone': phone,
    'fullName': fullName,
    'role': role,
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'kycTier': kycTier,
  };
}

/// Current user info
class CurrentUserResponse {
  final String id;
  final String phone;
  final String fullName;
  final String role;
  final int kycTier;
  final DateTime createdAt;

  CurrentUserResponse({
    required this.id,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.kycTier,
    required this.createdAt,
  });

  factory CurrentUserResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;
    return CurrentUserResponse(
      id: data['id'] as String,
      phone: data['phone'] as String? ?? '',
      fullName: data['fullName'] as String? ?? '',
      role: data['role'] as String,
      kycTier: data['kycTier'] as int? ?? 0,
      createdAt: DateTime.tryParse(data['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'phone': phone,
    'fullName': fullName,
    'role': role,
    'kycTier': kycTier,
    'createdAt': createdAt.toIso8601String(),
  };
}

/// KYC upload response
class KycUploadResponse {
  final bool success;
  final int newKycTier;

  KycUploadResponse({
    required this.success,
    required this.newKycTier,
  });

  factory KycUploadResponse.fromJson(Map<String, dynamic> json) {
    return KycUploadResponse(
      success: json['success'] as bool,
      newKycTier: json['newKycTier'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'success': success,
    'newKycTier': newKycTier,
  };
}
