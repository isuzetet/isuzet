import 'package:json_annotation/json_annotation.dart';

part 'agent_models.g.dart';

/// Agent profile model
@JsonSerializable(explicitToJson: true)
class AgentProfile {
  final String agentId;
  final String name;
  final String phone; // Agent's own phone
  final String email;
  final String status; // 'active', 'inactive', 'suspended'
  final String region;
  final int clientsManaged;
  final double commissionRate; // percentage
  final DateTime joinedAt;
  final DateTime lastActiveAt;

  AgentProfile({
    required this.agentId,
    required this.name,
    required this.phone,
    required this.email,
    required this.status,
    required this.region,
    required this.clientsManaged,
    required this.commissionRate,
    required this.joinedAt,
    required this.lastActiveAt,
  });

  factory AgentProfile.fromJson(Map<String, dynamic> json) =>
      _$AgentProfileFromJson(json);

  Map<String, dynamic> toJson() => _$AgentProfileToJson(this);
}

/// Client reference for agent - represents a client the agent works with
@JsonSerializable(explicitToJson: true)
class ClientReference {
  final String clientId;
  final String clientName;
  final String clientPhone; // CLIENT's phone - used when posting load on behalf
  final String clientEmail;
  final String? clientCompany;
  final bool isActive;
  final DateTime addedAt;

  ClientReference({
    required this.clientId,
    required this.clientName,
    required this.clientPhone,
    required this.clientEmail,
    this.clientCompany,
    required this.isActive,
    required this.addedAt,
  });

  factory ClientReference.fromJson(Map<String, dynamic> json) =>
      _$ClientReferenceFromJson(json);

  Map<String, dynamic> toJson() => _$ClientReferenceToJson(this);
}

/// Request model for posting load on behalf of client
@JsonSerializable(explicitToJson: true)
class PostLoadOnBehalfRequest {
  final String clientPhone; // CRITICAL: Client's phone as reference in backend
  final String corridorId;
  final String cargoType;
  final String cargoDescription;
  final int weightKg;
  final double? volumeCbm;
  final String originCity;
  final String? originAddress;
  final double? originLat;
  final double? originLng;
  final String destinationCity;
  final String? destinationAddress;
  final double? destinationLat;
  final double? destinationLng;
  final String pickupDate; // ISO 8601 string
  final String deliveryDeadline; // ISO 8601 string
  final String? specialInstructions;
  final bool requiresReefer;
  final String? hazmatClass;

  PostLoadOnBehalfRequest({
    required this.clientPhone,
    required this.corridorId,
    required this.cargoType,
    required this.cargoDescription,
    required this.weightKg,
    this.volumeCbm,
    required this.originCity,
    this.originAddress,
    this.originLat,
    this.originLng,
    required this.destinationCity,
    this.destinationAddress,
    this.destinationLat,
    this.destinationLng,
    required this.pickupDate,
    required this.deliveryDeadline,
    this.specialInstructions,
    this.requiresReefer = false,
    this.hazmatClass,
  });

  factory PostLoadOnBehalfRequest.fromJson(Map<String, dynamic> json) =>
      _$PostLoadOnBehalfRequestFromJson(json);

  Map<String, dynamic> toJson() => _$PostLoadOnBehalfRequestToJson(this);
}

/// Response from posting load
@JsonSerializable(explicitToJson: true)
class PostLoadResponse {
  final String loadId;
  final String status;
  final String message;
  final String clientPhone; // Echoed back for verification
  final String createdAt; // ISO 8601 string

  PostLoadResponse({
    required this.loadId,
    required this.status,
    required this.message,
    required this.clientPhone,
    required this.createdAt,
  });

  factory PostLoadResponse.fromJson(Map<String, dynamic> json) =>
      _$PostLoadResponseFromJson(json);

  Map<String, dynamic> toJson() => _$PostLoadResponseToJson(this);
}

/// Summary of agent's recent loads posted
@JsonSerializable(explicitToJson: true)
class AgentLoadSummary {
  final int totalLoadsThisMonth;
  final int successfulLoads;
  final int pendingLoads;
  final double totalCommissionThisMonth;
  final String currencyCode;

  AgentLoadSummary({
    required this.totalLoadsThisMonth,
    required this.successfulLoads,
    required this.pendingLoads,
    required this.totalCommissionThisMonth,
    this.currencyCode = 'ETB',
  });

  factory AgentLoadSummary.fromJson(Map<String, dynamic> json) =>
      _$AgentLoadSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$AgentLoadSummaryToJson(this);
}
