// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'agent_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AgentProfile _$AgentProfileFromJson(Map<String, dynamic> json) => AgentProfile(
      agentId: json['agentId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String,
      status: json['status'] as String,
      region: json['region'] as String,
      clientsManaged: (json['clientsManaged'] as num).toInt(),
      commissionRate: (json['commissionRate'] as num).toDouble(),
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      lastActiveAt: DateTime.parse(json['lastActiveAt'] as String),
    );

Map<String, dynamic> _$AgentProfileToJson(AgentProfile instance) =>
    <String, dynamic>{
      'agentId': instance.agentId,
      'name': instance.name,
      'phone': instance.phone,
      'email': instance.email,
      'status': instance.status,
      'region': instance.region,
      'clientsManaged': instance.clientsManaged,
      'commissionRate': instance.commissionRate,
      'joinedAt': instance.joinedAt.toIso8601String(),
      'lastActiveAt': instance.lastActiveAt.toIso8601String(),
    };

ClientReference _$ClientReferenceFromJson(Map<String, dynamic> json) =>
    ClientReference(
      clientId: json['clientId'] as String,
      clientName: json['clientName'] as String,
      clientPhone: json['clientPhone'] as String,
      clientEmail: json['clientEmail'] as String,
      clientCompany: json['clientCompany'] as String?,
      isActive: json['isActive'] as bool,
      addedAt: DateTime.parse(json['addedAt'] as String),
    );

Map<String, dynamic> _$ClientReferenceToJson(ClientReference instance) =>
    <String, dynamic>{
      'clientId': instance.clientId,
      'clientName': instance.clientName,
      'clientPhone': instance.clientPhone,
      'clientEmail': instance.clientEmail,
      'clientCompany': instance.clientCompany,
      'isActive': instance.isActive,
      'addedAt': instance.addedAt.toIso8601String(),
    };

PostLoadOnBehalfRequest _$PostLoadOnBehalfRequestFromJson(
        Map<String, dynamic> json) =>
    PostLoadOnBehalfRequest(
      clientPhone: json['clientPhone'] as String,
      corridorId: json['corridorId'] as String,
      cargoType: json['cargoType'] as String,
      cargoDescription: json['cargoDescription'] as String,
      weightKg: (json['weightKg'] as num).toInt(),
      volumeCbm: (json['volumeCbm'] as num?)?.toDouble(),
      originCity: json['originCity'] as String,
      originAddress: json['originAddress'] as String?,
      originLat: (json['originLat'] as num?)?.toDouble(),
      originLng: (json['originLng'] as num?)?.toDouble(),
      destinationCity: json['destinationCity'] as String,
      destinationAddress: json['destinationAddress'] as String?,
      destinationLat: (json['destinationLat'] as num?)?.toDouble(),
      destinationLng: (json['destinationLng'] as num?)?.toDouble(),
      pickupDate: json['pickupDate'] as String,
      deliveryDeadline: json['deliveryDeadline'] as String,
      specialInstructions: json['specialInstructions'] as String?,
      requiresReefer: json['requiresReefer'] as bool? ?? false,
      hazmatClass: json['hazmatClass'] as String?,
    );

Map<String, dynamic> _$PostLoadOnBehalfRequestToJson(
        PostLoadOnBehalfRequest instance) =>
    <String, dynamic>{
      'clientPhone': instance.clientPhone,
      'corridorId': instance.corridorId,
      'cargoType': instance.cargoType,
      'cargoDescription': instance.cargoDescription,
      'weightKg': instance.weightKg,
      'volumeCbm': instance.volumeCbm,
      'originCity': instance.originCity,
      'originAddress': instance.originAddress,
      'originLat': instance.originLat,
      'originLng': instance.originLng,
      'destinationCity': instance.destinationCity,
      'destinationAddress': instance.destinationAddress,
      'destinationLat': instance.destinationLat,
      'destinationLng': instance.destinationLng,
      'pickupDate': instance.pickupDate,
      'deliveryDeadline': instance.deliveryDeadline,
      'specialInstructions': instance.specialInstructions,
      'requiresReefer': instance.requiresReefer,
      'hazmatClass': instance.hazmatClass,
    };

PostLoadResponse _$PostLoadResponseFromJson(Map<String, dynamic> json) =>
    PostLoadResponse(
      loadId: json['loadId'] as String,
      status: json['status'] as String,
      message: json['message'] as String,
      clientPhone: json['clientPhone'] as String,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$PostLoadResponseToJson(PostLoadResponse instance) =>
    <String, dynamic>{
      'loadId': instance.loadId,
      'status': instance.status,
      'message': instance.message,
      'clientPhone': instance.clientPhone,
      'createdAt': instance.createdAt,
    };

AgentLoadSummary _$AgentLoadSummaryFromJson(Map<String, dynamic> json) =>
    AgentLoadSummary(
      totalLoadsThisMonth: (json['totalLoadsThisMonth'] as num).toInt(),
      successfulLoads: (json['successfulLoads'] as num).toInt(),
      pendingLoads: (json['pendingLoads'] as num).toInt(),
      totalCommissionThisMonth:
          (json['totalCommissionThisMonth'] as num).toDouble(),
      currencyCode: json['currencyCode'] as String? ?? 'ETB',
    );

Map<String, dynamic> _$AgentLoadSummaryToJson(AgentLoadSummary instance) =>
    <String, dynamic>{
      'totalLoadsThisMonth': instance.totalLoadsThisMonth,
      'successfulLoads': instance.successfulLoads,
      'pendingLoads': instance.pendingLoads,
      'totalCommissionThisMonth': instance.totalCommissionThisMonth,
      'currencyCode': instance.currencyCode,
    };
