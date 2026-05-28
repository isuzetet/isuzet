class LoadItem {
  final String id;
  final String origin;
  final String destination;
  final String pickupLocation; // District or area
  final String destinationLocation;
  final DateTime pickupTime;
  final double distance; // km
  final double weight; // kg
  final double offeredPrice; // ETB
  final DateTime expiresAt; // When offer expires
  final String status; // 'active', 'accepted', 'completed', 'expired'
  final String vehicleType; // 'truck', 'van', etc.
  final List<String>? tags; // 'fragile', 'perishable', etc.
  final int trustRequired; // minimum trustTier needed
  final String? agentId; // Who posted the load
  final String? agentName;
  final double? agentRating; // 0-5

  LoadItem({
    required this.id,
    required this.origin,
    required this.destination,
    required this.pickupLocation,
    required this.destinationLocation,
    required this.pickupTime,
    required this.distance,
    required this.weight,
    required this.offeredPrice,
    required this.expiresAt,
    required this.status,
    required this.vehicleType,
    this.tags,
    required this.trustRequired,
    this.agentId,
    this.agentName,
    this.agentRating,
  });

  // Time remaining before expiry (in seconds)
  int get secondsRemaining {
    final now = DateTime.now();
    if (now.isAfter(expiresAt)) return 0;
    return expiresAt.difference(now).inSeconds;
  }

  // Whether offer has expired
  bool get hasExpired => secondsRemaining <= 0;

  factory LoadItem.fromJson(Map<String, dynamic> json) {
    return LoadItem(
      id: json['id'] as String,
      origin: json['origin'] as String,
      destination: json['destination'] as String,
      pickupLocation: json['pickupLocation'] as String? ?? json['origin'] as String,
      destinationLocation: json['destinationLocation'] as String? ?? json['destination'] as String,
      pickupTime: DateTime.parse(json['pickupTime'] as String),
      distance: (json['distance'] as num).toDouble(),
      weight: (json['weight'] as num).toDouble(),
      offeredPrice: (json['offeredPrice'] as num).toDouble(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      status: json['status'] as String? ?? 'active',
      vehicleType: json['vehicleType'] as String? ?? 'truck',
      tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
      trustRequired: json['trustRequired'] as int? ?? 0,
      agentId: json['agentId'] as String?,
      agentName: json['agentName'] as String?,
      agentRating: (json['agentRating'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'origin': origin,
    'destination': destination,
    'pickupLocation': pickupLocation,
    'destinationLocation': destinationLocation,
    'pickupTime': pickupTime.toIso8601String(),
    'distance': distance,
    'weight': weight,
    'offeredPrice': offeredPrice,
    'expiresAt': expiresAt.toIso8601String(),
    'status': status,
    'vehicleType': vehicleType,
    'tags': tags,
    'trustRequired': trustRequired,
    'agentId': agentId,
    'agentName': agentName,
    'agentRating': agentRating,
  };
}

class LoadsListResponse {
  final List<LoadItem> loads;
  final int total;

  LoadsListResponse({required this.loads, required this.total});

  factory LoadsListResponse.fromJson(Map<String, dynamic> json) {
    return LoadsListResponse(
      loads: (json['loads'] as List<dynamic>?)
          ?.map((e) => LoadItem.fromJson(e as Map<String, dynamic>))
          .toList() ??
          [],
      total: json['total'] as int? ?? 0,
    );
  }
}

class AcceptOfferRequest {
  // Empty body request - no fields needed
  AcceptOfferRequest();

  Map<String, dynamic> toJson() => {}; // Empty body for Dio
}

class AcceptOfferResponse {
  final String tripId;
  final String status;
  final DateTime acceptedAt;

  AcceptOfferResponse({
    required this.tripId,
    required this.status,
    required this.acceptedAt,
  });

  factory AcceptOfferResponse.fromJson(Map<String, dynamic> json) {
    return AcceptOfferResponse(
      tripId: json['tripId'] as String,
      status: json['status'] as String? ?? 'accepted',
      acceptedAt: DateTime.parse(json['acceptedAt'] as String? ?? DateTime.now().toIso8601String()),
    );
  }
}
