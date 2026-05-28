// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'earnings_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Earnings _$EarningsFromJson(Map<String, dynamic> json) => Earnings(
      driverId: json['driverId'] as String,
      totalEarnings: (json['totalEarnings'] as num).toDouble(),
      weeklyEarnings: (json['weeklyEarnings'] as num).toDouble(),
      monthlyEarnings: (json['monthlyEarnings'] as num).toDouble(),
      totalTrips: (json['totalTrips'] as num).toInt(),
      thisWeekTrips: (json['thisWeekTrips'] as num).toInt(),
      thisMonthTrips: (json['thisMonthTrips'] as num).toInt(),
      lastEarningsUpdate: json['lastEarningsUpdate'] as String,
      currency: json['currency'] as String?,
    );

Map<String, dynamic> _$EarningsToJson(Earnings instance) => <String, dynamic>{
      'driverId': instance.driverId,
      'totalEarnings': instance.totalEarnings,
      'weeklyEarnings': instance.weeklyEarnings,
      'monthlyEarnings': instance.monthlyEarnings,
      'totalTrips': instance.totalTrips,
      'thisWeekTrips': instance.thisWeekTrips,
      'thisMonthTrips': instance.thisMonthTrips,
      'lastEarningsUpdate': instance.lastEarningsUpdate,
      'currency': instance.currency,
    };

TrustBreakdown _$TrustBreakdownFromJson(Map<String, dynamic> json) =>
    TrustBreakdown(
      driverId: json['driverId'] as String,
      safetyScore: (json['safetyScore'] as num?)?.toDouble(),
      reliabilityScore: (json['reliabilityScore'] as num?)?.toDouble(),
      communicationScore: (json['communicationScore'] as num?)?.toDouble(),
      integrityScore: (json['integrityScore'] as num?)?.toDouble(),
      professionalismScore: (json['professionalismScore'] as num?)?.toDouble(),
      vehicleConditionScore:
          (json['vehicleConditionScore'] as num?)?.toDouble(),
      overallTrustScore: (json['overallTrustScore'] as num?)?.toDouble(),
      lastUpdated: json['lastUpdated'] as String,
    );

Map<String, dynamic> _$TrustBreakdownToJson(TrustBreakdown instance) =>
    <String, dynamic>{
      'driverId': instance.driverId,
      'safetyScore': instance.safetyScore,
      'reliabilityScore': instance.reliabilityScore,
      'communicationScore': instance.communicationScore,
      'integrityScore': instance.integrityScore,
      'professionalismScore': instance.professionalismScore,
      'vehicleConditionScore': instance.vehicleConditionScore,
      'overallTrustScore': instance.overallTrustScore,
      'lastUpdated': instance.lastUpdated,
    };

Incident _$IncidentFromJson(Map<String, dynamic> json) => Incident(
      id: json['id'] as String,
      tripId: json['tripId'] as String,
      driverId: json['driverId'] as String,
      type: $enumDecode(_$IncidentTypeEnumMap, json['type']),
      description: json['description'] as String,
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      photoUrl: json['photoUrl'] as String?,
      reportedAt: json['reportedAt'] as String,
      status: json['status'] as String?,
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$IncidentToJson(Incident instance) => <String, dynamic>{
      'id': instance.id,
      'tripId': instance.tripId,
      'driverId': instance.driverId,
      'type': _$IncidentTypeEnumMap[instance.type]!,
      'description': instance.description,
      'location': instance.location,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'photoUrl': instance.photoUrl,
      'reportedAt': instance.reportedAt,
      'status': instance.status,
      'notes': instance.notes,
    };

const _$IncidentTypeEnumMap = {
  IncidentType.medical: 'medical',
  IncidentType.theft: 'theft',
  IncidentType.accident: 'accident',
  IncidentType.roadblock: 'roadblock',
  IncidentType.harassment: 'harassment',
  IncidentType.other: 'other',
};

IncidentReportRequest _$IncidentReportRequestFromJson(
        Map<String, dynamic> json) =>
    IncidentReportRequest(
      tripId: json['tripId'] as String,
      type: json['type'] as String,
      description: json['description'] as String,
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      proofUrl: json['proofUrl'] as String?,
    );

Map<String, dynamic> _$IncidentReportRequestToJson(
        IncidentReportRequest instance) =>
    <String, dynamic>{
      'tripId': instance.tripId,
      'type': instance.type,
      'description': instance.description,
      'location': instance.location,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'proofUrl': instance.proofUrl,
    };

IncidentReportResponse _$IncidentReportResponseFromJson(
        Map<String, dynamic> json) =>
    IncidentReportResponse(
      incidentId: json['incidentId'] as String,
      status: json['status'] as String,
      message: json['message'] as String,
      confirmedAt: json['confirmedAt'] as String,
    );

Map<String, dynamic> _$IncidentReportResponseToJson(
        IncidentReportResponse instance) =>
    <String, dynamic>{
      'incidentId': instance.incidentId,
      'status': instance.status,
      'message': instance.message,
      'confirmedAt': instance.confirmedAt,
    };

MedicalSosResponse _$MedicalSosResponseFromJson(Map<String, dynamic> json) =>
    MedicalSosResponse(
      sosId: json['sosId'] as String,
      status: json['status'] as String,
      message: json['message'] as String,
      ambulanceEta: json['ambulanceEta'] as String?,
      emergencyNumber: json['emergencyNumber'] as String,
      triggeredAt: json['triggeredAt'] as String,
    );

Map<String, dynamic> _$MedicalSosResponseToJson(MedicalSosResponse instance) =>
    <String, dynamic>{
      'sosId': instance.sosId,
      'status': instance.status,
      'message': instance.message,
      'ambulanceEta': instance.ambulanceEta,
      'emergencyNumber': instance.emergencyNumber,
      'triggeredAt': instance.triggeredAt,
    };
