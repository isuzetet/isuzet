// Orderer domain models (PODO — no code generation)

/// Load (trip) representation
class Load {
  final String id;
  final String orderId;
  final String corridorId;
  final String cargoType;
  final int weightKg;
  final DateTime pickupDate;
  final int estimatedValueCents;
  final String? specialInstructions;
  final String status; // OPEN, MATCHING, OFFERED, ACCEPTED, IN_TRANSIT, DELIVERED
  final DateTime createdAt;
  final String ordererId;

  Load({
    required this.id,
    required this.orderId,
    required this.corridorId,
    required this.cargoType,
    required this.weightKg,
    required this.pickupDate,
    required this.estimatedValueCents,
    this.specialInstructions,
    required this.status,
    required this.createdAt,
    required this.ordererId,
  });

  factory Load.fromJson(Map<String, dynamic> json) {
    return Load(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? '',
      corridorId: json['corridorId'] as String,
      cargoType: json['cargoType'] as String,
      weightKg: json['weightKg'] as int,
      pickupDate: DateTime.parse(json['pickupDate'] as String),
      estimatedValueCents: json['estimatedValueCents'] as int,
      specialInstructions: json['specialInstructions'] as String?,
      status: json['status'] as String? ?? 'OPEN',
      createdAt: DateTime.parse(json['createdAt'] as String),
      ordererId: json['ordererId'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'corridorId': corridorId,
    'cargoType': cargoType,
    'weightKg': weightKg,
    'pickupDate': pickupDate.toIso8601String(),
    'estimatedValueCents': estimatedValueCents,
    'specialInstructions': specialInstructions,
    'status': status,
    'createdAt': createdAt.toIso8601String(),
    'ordererId': ordererId,
  };
}

/// Price estimate response
class PriceEstimate {
  final int estimatedValueCents;
  final String currencyCode;

  PriceEstimate({
    required this.estimatedValueCents,
    required this.currencyCode,
  });

  factory PriceEstimate.fromJson(Map<String, dynamic> json) {
    return PriceEstimate(
      estimatedValueCents: json['estimatedValueCents'] as int,
      currencyCode: json['currencyCode'] as String? ?? 'ETB',
    );
  }
}

/// Corridor (route) info
class Corridor {
  final String id;
  final String fromCity;
  final String toCity;
  final double distanceKm;

  Corridor({
    required this.id,
    required this.fromCity,
    required this.toCity,
    required this.distanceKm,
  });

  factory Corridor.fromJson(Map<String, dynamic> json) {
    return Corridor(
      id: json['id'] as String,
      fromCity: json['fromCity'] as String,
      toCity: json['toCity'] as String,
      distanceKm: (json['distanceKm'] ?? 0.0).toDouble(),
    );
  }
}

/// Orderer home metrics
class OrdererMetrics {
  final int totalLoads;
  final int activeLoads;
  final double totalValueEtb;

  OrdererMetrics({
    required this.totalLoads,
    required this.activeLoads,
    required this.totalValueEtb,
  });

  factory OrdererMetrics.fromJson(Map<String, dynamic> json) {
    return OrdererMetrics(
      totalLoads: json['totalLoads'] as int? ?? 0,
      activeLoads: json['activeLoads'] as int? ?? 0,
      totalValueEtb: (json['totalValueEtb'] ?? 0.0).toDouble(),
    );
  }
}
