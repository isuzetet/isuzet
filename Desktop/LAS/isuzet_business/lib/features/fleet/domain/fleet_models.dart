// Fleet domain models (PODO — no code generation)

/// Truck representation
class Truck {
  final String id;
  final String? registrationNumber;
  final String licensePlate;
  final int capacityKg;
  final String? driverId;
  final String status; // active, inactive, maintenance
  final DateTime createdAt;
  final String fleetOwnerId;

  Truck({
    required this.id,
    this.registrationNumber,
    required this.licensePlate,
    required this.capacityKg,
    this.driverId,
    required this.status,
    required this.createdAt,
    required this.fleetOwnerId,
  });

  factory Truck.fromJson(Map<String, dynamic> json) {
    return Truck(
      id: json['id'] as String,
      registrationNumber:
          json['registrationNumber'] as String? ?? json['libreNumber'] as String?,
      licensePlate: json['licensePlate'] as String? ??
          json['plateNumber'] as String? ??
          '',
      capacityKg: (json['capacityKg'] as num?)?.toInt() ?? 0,
      driverId:
          json['driverId'] as String? ?? json['currentDriverId'] as String?,
      status: (json['status'] as String? ?? 'active').toLowerCase(),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      fleetOwnerId: json['fleetOwnerId'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'registrationNumber': registrationNumber,
    'licensePlate': licensePlate,
    'capacityKg': capacityKg, // ← CRITICAL: Always sent as integer kg
    'driverId': driverId,
    'status': status,
    'createdAt': createdAt.toIso8601String(),
    'fleetOwnerId': fleetOwnerId,
  };
}

/// Driver representation
class Driver {
  final String id;
  final String fullName;
  final String phone;
  final String? licenseNumber;
  final int trustTier; // 0-5: T0, T1, T2, T3, T4, T5
  final bool active;
  final DateTime createdAt;
  final String fleetOwnerId;

  Driver({
    required this.id,
    required this.fullName,
    required this.phone,
    this.licenseNumber,
    required this.trustTier,
    required this.active,
    required this.createdAt,
    required this.fleetOwnerId,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] as String,
      fullName: json['fullName'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      licenseNumber: json['licenseNumber'] as String?,
      trustTier: (json['trustTier'] as num?)?.toInt() ?? 0,
      active: json['active'] as bool? ?? true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      fleetOwnerId: json['fleetOwnerId'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'phone': phone,
    'licenseNumber': licenseNumber,
    'trustTier': trustTier,
    'active': active,
    'createdAt': createdAt.toIso8601String(),
    'fleetOwnerId': fleetOwnerId,
  };
}

/// Fleet KPI metrics
class FleetMetrics {
  final int totalTrucks;
  final int activeTrucks;
  final double monthlyRevenueEtb;
  final int availableDrivers;

  FleetMetrics({
    required this.totalTrucks,
    required this.activeTrucks,
    required this.monthlyRevenueEtb,
    required this.availableDrivers,
  });

  factory FleetMetrics.fromJson(Map<String, dynamic> json) {
    return FleetMetrics(
      totalTrucks: (json['totalTrucks'] as num?)?.toInt() ?? 0,
      activeTrucks: (json['activeTrucks'] as num?)?.toInt() ?? 0,
      monthlyRevenueEtb: (json['monthlyRevenueEtb'] ?? 0.0).toDouble(),
      availableDrivers: (json['availableDrivers'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Truck location snapshot
class TruckLocation {
  final String truckId;
  final double latitude;
  final double longitude;
  final DateTime timestamp;
  final String? status; // active, idle, offline

  TruckLocation({
    required this.truckId,
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    this.status,
  });

  factory TruckLocation.fromJson(Map<String, dynamic> json) {
    return TruckLocation(
      truckId: json['truckId'] as String,
      latitude: (json['latitude'] ?? json['lat'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? json['lng'] ?? 0.0).toDouble(),
      timestamp: DateTime.tryParse(
            json['timestamp'] as String? ??
                json['lastUpdated'] as String? ??
                '',
          ) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      status: json['status'] as String?,
    );
  }
}
