class CorridorData {
  final String id;
  final String fromCity;
  final String toCity;
  final int distanceKm;
  final String fromCode;
  final String toCode;

  CorridorData({
    required this.id,
    required this.fromCity,
    required this.toCity,
    required this.distanceKm,
    required this.fromCode,
    required this.toCode,
  });

  factory CorridorData.fromJson(Map<String, dynamic> json) {
    return CorridorData(
      id: json['id'],
      fromCity: json['fromCity'] ?? json['from_city'] ?? '',
      toCity: json['toCity'] ?? json['to_city'] ?? '',
      distanceKm: json['distanceKm'] ?? json['distance_km'] ?? 0,
      fromCode: json['fromCode'] ?? json['from_code'] ?? '',
      toCode: json['toCode'] ?? json['to_code'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fromCity': fromCity,
      'toCity': toCity,
      'distanceKm': distanceKm,
      'fromCode': fromCode,
      'toCode': toCode,
    };
  }
}
