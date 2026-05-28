class Stop {
  final String id; // CRITICAL: stopId for delivery confirmation
  final String location;
  final String address;
  final double latitude;
  final double longitude;
  final int sequenceNumber;
  final String status; // 'pending', 'in_progress', 'delivered'
  final DateTime? deliveredAt;

  Stop({
    required this.id,
    required this.location,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.sequenceNumber,
    required this.status,
    this.deliveredAt,
  });

  factory Stop.fromJson(Map<String, dynamic> json) {
    return Stop(
      id: json['id'] as String,
      location: json['location'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      sequenceNumber: json['sequenceNumber'] as int? ?? 0,
      status: json['status'] as String? ?? 'pending',
      deliveredAt: json['deliveredAt'] != null ? DateTime.parse(json['deliveredAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'location': location,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
    'sequenceNumber': sequenceNumber,
    'status': status,
    'deliveredAt': deliveredAt?.toIso8601String(),
  };
}

class Trip {
  final String id;
  final String loadId;
  final String driverId;
  final String status; // 'active', 'in_progress', 'delivered', 'cancelled'
  final double pickupLatitude;
  final double pickupLongitude;
  final DateTime pickupTime;
  final List<Stop> stops;
  final double totalDistance;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? notes;

  Trip({
    required this.id,
    required this.loadId,
    required this.driverId,
    required this.status,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.pickupTime,
    required this.stops,
    required this.totalDistance,
    required this.createdAt,
    this.completedAt,
    this.notes,
  });

  // Get next pending stop
  Stop? get nextStop {
    try {
      return stops.firstWhere((s) => s.status == 'pending');
    } catch (e) {
      return null;
    }
  }

  // Get current progress
  int get completedStopsCount => stops.where((s) => s.status == 'delivered').length;

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'] as String,
      loadId: json['loadId'] as String,
      driverId: json['driverId'] as String,
      status: json['status'] as String? ?? 'active',
      pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
      pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
      pickupTime: DateTime.parse(json['pickupTime'] as String),
      stops: (json['stops'] as List<dynamic>?)
          ?.map((s) => Stop.fromJson(s as Map<String, dynamic>))
          .toList() ??
          [],
      totalDistance: (json['totalDistance'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt'] as String) : null,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'loadId': loadId,
    'driverId': driverId,
    'status': status,
    'pickupLatitude': pickupLatitude,
    'pickupLongitude': pickupLongitude,
    'pickupTime': pickupTime.toIso8601String(),
    'stops': stops.map((s) => s.toJson()).toList(),
    'totalDistance': totalDistance,
    'createdAt': createdAt.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'notes': notes,
  };
}

class GpsLocation {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double altitude;
  final double speedMps;
  final double headingDegrees;
  final DateTime timestamp;
  final String tripId;

  GpsLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.altitude,
    required this.speedMps,
    required this.headingDegrees,
    required this.timestamp,
    required this.tripId,
  });

  factory GpsLocation.fromJson(Map<String, dynamic> json) {
    return GpsLocation(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0.0,
      altitude: (json['altitude'] as num?)?.toDouble() ?? 0.0,
      speedMps: (json['speedMps'] as num?)?.toDouble() ?? 0.0,
      headingDegrees: (json['headingDegrees'] as num?)?.toDouble() ?? 0.0,
      timestamp: DateTime.parse(json['timestamp'] as String),
      tripId: json['tripId'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'tripId': tripId,
    'lat': latitude,
    'lng': longitude,
    'accuracy': accuracy,
    'altitudeM': altitude,
    'speedKmh': speedMps * 3.6, // convert m/s to km/h
    'headingDeg': headingDegrees,
  };
}

class DeliverStopRequest {
  final String stopId; // CRITICAL: must be from trip model, not hardcoded
  final double latitude;
  final double longitude;
  final String? proofOfDeliveryUrl;
  final int? deliveryPhoto;
  final String? notes;

  DeliverStopRequest({
    required this.stopId,
    required this.latitude,
    required this.longitude,
    this.proofOfDeliveryUrl,
    this.deliveryPhoto,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
    'stopId': stopId,
    'latitude': latitude,
    'longitude': longitude,
    if (proofOfDeliveryUrl != null) 'proofOfDeliveryUrl': proofOfDeliveryUrl,
    if (deliveryPhoto != null) 'deliveryPhoto': deliveryPhoto,
    if (notes != null) 'notes': notes,
  };
}

class DeliverStopResponse {
  final String stopId;
  final String status;
  final DateTime deliveredAt;
  final String? proofUrl;

  DeliverStopResponse({
    required this.stopId,
    required this.status,
    required this.deliveredAt,
    this.proofUrl,
  });

  factory DeliverStopResponse.fromJson(Map<String, dynamic> json) {
    return DeliverStopResponse(
      stopId: json['stopId'] as String,
      status: json['status'] as String? ?? 'delivered',
      deliveredAt: DateTime.parse(json['deliveredAt'] as String),
      proofUrl: json['proofUrl'] as String?,
    );
  }
}
