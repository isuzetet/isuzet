import 'package:json_annotation/json_annotation.dart';

part 'earnings_models.g.dart';

/// Earnings model for driver earnings dashboard
@JsonSerializable(explicitToJson: true)
class Earnings {
  final String driverId;
  final double totalEarnings; // in ETB
  final double weeklyEarnings;
  final double monthlyEarnings;
  final int totalTrips;
  final int thisWeekTrips;
  final int thisMonthTrips;
  final String lastEarningsUpdate; // ISO 8601 string
  final String? currency; // 'ETB' typically

  Earnings({
    required this.driverId,
    required this.totalEarnings,
    required this.weeklyEarnings,
    required this.monthlyEarnings,
    required this.totalTrips,
    required this.thisWeekTrips,
    required this.thisMonthTrips,
    required this.lastEarningsUpdate,
    this.currency,
  });

  factory Earnings.fromJson(Map<String, dynamic> json) =>
      _$EarningsFromJson(json);

  Map<String, dynamic> toJson() => _$EarningsToJson(this);
}

/// Trust breakdown model with 6 components (all nullable for safety)
@JsonSerializable(explicitToJson: true)
class TrustBreakdown {
  final String driverId;
  final double? safetyScore; // 0-100, nullable
  final double? reliabilityScore;
  final double? communicationScore;
  final double? integrityScore;
  final double? professionalismScore;
  final double? vehicleConditionScore;
  final double? overallTrustScore;
  final String lastUpdated; // ISO 8601 string

  TrustBreakdown({
    required this.driverId,
    this.safetyScore,
    this.reliabilityScore,
    this.communicationScore,
    this.integrityScore,
    this.professionalismScore,
    this.vehicleConditionScore,
    this.overallTrustScore,
    required this.lastUpdated,
  });

  /// Get list of all component scores with defaults
  List<double> getComponentScores() {
    return [
      safetyScore ?? 0.0,
      reliabilityScore ?? 0.0,
      communicationScore ?? 0.0,
      integrityScore ?? 0.0,
      professionalismScore ?? 0.0,
      vehicleConditionScore ?? 0.0,
    ];
  }

  factory TrustBreakdown.fromJson(Map<String, dynamic> json) =>
      _$TrustBreakdownFromJson(json);

  Map<String, dynamic> toJson() => _$TrustBreakdownToJson(this);
}

/// Incident types
enum IncidentType {
  medical,
  theft,
  accident,
  roadblock,
  harassment,
  other,
}

/// Incident model for incident reporting
@JsonSerializable(explicitToJson: true)
class Incident {
  final String id;
  final String tripId;
  final String driverId;
  final IncidentType type;
  final String description;
  final String? location;
  final double? latitude;
  final double? longitude;
  final String? photoUrl;
  final String reportedAt; // ISO 8601 string
  final String? status; // 'pending', 'investigating', 'resolved'
  final String? notes;

  Incident({
    required this.id,
    required this.tripId,
    required this.driverId,
    required this.type,
    required this.description,
    this.location,
    this.latitude,
    this.longitude,
    this.photoUrl,
    required this.reportedAt,
    this.status,
    this.notes,
  });

  factory Incident.fromJson(Map<String, dynamic> json) =>
      _$IncidentFromJson(json);

  Map<String, dynamic> toJson() => _$IncidentToJson(this);
}

/// Request for filing an incident
@JsonSerializable(explicitToJson: true)
class IncidentReportRequest {
  final String tripId;
  final String type; // 'medical', 'theft', 'accident', etc.
  final String description;
  final String? location;
  final double? latitude;
  final double? longitude;
  final String? proofUrl; // photo/video URL

  IncidentReportRequest({
    required this.tripId,
    required this.type,
    required this.description,
    this.location,
    this.latitude,
    this.longitude,
    this.proofUrl,
  });

  factory IncidentReportRequest.fromJson(Map<String, dynamic> json) =>
      _$IncidentReportRequestFromJson(json);

  Map<String, dynamic> toJson() => _$IncidentReportRequestToJson(this);
}

/// Response from incident report submission
@JsonSerializable(explicitToJson: true)
class IncidentReportResponse {
  final String incidentId;
  final String status;
  final String message;
  final String confirmedAt; // ISO 8601 string

  IncidentReportResponse({
    required this.incidentId,
    required this.status,
    required this.message,
    required this.confirmedAt,
  });

  factory IncidentReportResponse.fromJson(Map<String, dynamic> json) =>
      _$IncidentReportResponseFromJson(json);

  Map<String, dynamic> toJson() => _$IncidentReportResponseToJson(this);
}

/// Medical SOS immediate response (bypasses normal incident flow)
@JsonSerializable(explicitToJson: true)
class MedicalSosResponse {
  final String sosId;
  final String status; // 'received', 'dispatched', 'en_route'
  final String message;
  final String? ambulanceEta; // in minutes, e.g., "7 min"
  final String emergencyNumber;
  final String triggeredAt; // ISO 8601 string

  MedicalSosResponse({
    required this.sosId,
    required this.status,
    required this.message,
    this.ambulanceEta,
    required this.emergencyNumber,
    required this.triggeredAt,
  });

  factory MedicalSosResponse.fromJson(Map<String, dynamic> json) =>
      _$MedicalSosResponseFromJson(json);

  Map<String, dynamic> toJson() => _$MedicalSosResponseToJson(this);
}
