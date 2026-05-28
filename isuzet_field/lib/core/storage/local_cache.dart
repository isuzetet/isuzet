import 'package:hive_flutter/hive_flutter.dart';

class GpsPoint {
  final double lat;
  final double lng;
  final int ts;

  GpsPoint({
    required this.lat,
    required this.lng,
    required this.ts,
  });

  Map<String, dynamic> toMap() => {
    'lat': lat,
    'lng': lng,
    'ts': ts,
  };

  factory GpsPoint.fromMap(Map<String, dynamic> map) => GpsPoint(
    lat: map['lat'] as double,
    lng: map['lng'] as double,
    ts: map['ts'] as int,
  );
}

class PendingDelivery {
  final String tripId;
  final String stopId;
  final String otp;
  final String? photoUrl;
  final String? driverNote;

  PendingDelivery({
    required this.tripId,
    required this.stopId,
    required this.otp,
    this.photoUrl,
    this.driverNote,
  });

  Map<String, dynamic> toMap() => {
    'tripId': tripId,
    'stopId': stopId,
    'otp': otp,
    'photoUrl': photoUrl,
    'driverNote': driverNote,
  };

  factory PendingDelivery.fromMap(Map<String, dynamic> map) => PendingDelivery(
    tripId: map['tripId'] as String,
    stopId: map['stopId'] as String,
    otp: map['otp'] as String,
    photoUrl: map['photoUrl'] as String?,
    driverNote: map['driverNote'] as String?,
  );
}

class LocalCache {
  static late Box _gpsQueue;
  static late Box _pendingDeliveries;
  static late Box _loadOffers;

  static Future<void> initialize() async {
    await Hive.initFlutter();
    _gpsQueue = await Hive.openBox('gps_queue');
    _pendingDeliveries = await Hive.openBox('pending_deliveries');
    _loadOffers = await Hive.openBox('load_offers');
  }

  static Future<void> queueGpsPoint(GpsPoint point) async {
    final points = await getPendingGpsPoints();
    points.add(point);
    await _gpsQueue.put('points', points.map((p) => p.toMap()).toList());
  }

  static Future<List<GpsPoint>> getPendingGpsPoints() async {
    final data = _gpsQueue.get('points', defaultValue: []) as List;
    return data.cast<Map>().map((m) => GpsPoint.fromMap(m.cast())).toList();
  }

  static Future<void> clearGpsQueue() async {
    await _gpsQueue.delete('points');
  }

  static Future<void> queuePendingDelivery(PendingDelivery delivery) async {
    final deliveries = await getPendingDeliveries();
    deliveries.add(delivery);
    await _pendingDeliveries.put(
      'deliveries',
      deliveries.map((d) => d.toMap()).toList(),
    );
  }

  static Future<List<PendingDelivery>> getPendingDeliveries() async {
    final data = _pendingDeliveries.get('deliveries', defaultValue: []) as List;
    return data.cast<Map>().map((m) => PendingDelivery.fromMap(m.cast())).toList();
  }

  static Future<void> cacheLoadOffers(List<dynamic> offers) async {
    await _loadOffers.put('offers', offers);
    await _loadOffers.put('cached_at', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<void> clearPendingDeliveries() async {
    await _pendingDeliveries.delete('deliveries');
  }

  static Future<List<dynamic>> getCachedLoadOffers() async {
    final offers = _loadOffers.get('offers', defaultValue: []) as List;
    final cachedAt = _loadOffers.get('cached_at', defaultValue: 0) as int;
    
    // Check if cache is older than 30 minutes
    if (DateTime.now().millisecondsSinceEpoch - cachedAt > 30 * 60 * 1000) {
      return [];
    }
    
    return offers;
  }
}
