import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/core/storage/secure_storage.dart';

class LocationUpdate {
  final double lat;
  final double lng;
  final double? speed;
  final double? heading;
  final DateTime timestamp;

  const LocationUpdate({
    required this.lat,
    required this.lng,
    this.speed,
    this.heading,
    required this.timestamp,
  });

  factory LocationUpdate.fromJson(Map<String, dynamic> json) {
    return LocationUpdate(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      speed: (json['speed'] as num?)?.toDouble(),
      heading: (json['heading'] as num?)?.toDouble(),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class TrackingService {
  /// Open SSE stream for [tripId].
  static Stream<LocationUpdate> track(String tripId) {
    final controller = StreamController<LocationUpdate>.broadcast();
    if (kIsWeb) {
      _trackWeb(tripId, controller);
    } else {
      _trackMobile(tripId, controller);
    }
    return controller.stream;
  }

  // ── Web: XHR / fetch stream via Dio (avoids dart:html deprecation) ───────
  // We use Dio with responseType stream on web too — the dart:io path is
  // guarded by kIsWeb so it won't compile for web, and Dio handles both.
  static Future<void> _trackWeb(
    String tripId,
    StreamController<LocationUpdate> controller,
  ) async {
    // On web, use a server-sent events polyfill via fetch/XHR through Dio.
    // This sidesteps dart:html entirely.
    await _streamViaDio(tripId, controller);
  }

  // ── Mobile: Dio ResponseType.stream ─────────────────────────────────────

  static Future<void> _trackMobile(
    String tripId,
    StreamController<LocationUpdate> controller,
  ) async {
    await _streamViaDio(tripId, controller);
  }

  static Future<void> _streamViaDio(
    String tripId,
    StreamController<LocationUpdate> controller,
  ) async {
    final token = await SecureStorage.getAccessToken() ?? '';
    final url = '${AppConfig.locationBase}/location/track/$tripId';

    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: Duration.zero, // streaming — no receive timeout
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      responseType: ResponseType.stream,
    ));

    try {
      final response = await dio.get<ResponseBody>(url);
      final body = response.data!;
      final buffer = StringBuffer();

      body.stream.listen(
        (chunk) {
          final decoded = utf8.decode(chunk, allowMalformed: true);
          buffer.write(decoded);
          // SSE frames are delimited by double newlines
          final text = buffer.toString();
          final frames = text.split('\n\n');
          // last element may be an incomplete frame
          buffer.clear();
          buffer.write(frames.last);
          for (int i = 0; i < frames.length - 1; i++) {
            final frame = frames[i].trim();
            if (frame.startsWith('data:')) {
              final raw = frame.substring(5).trim();
              if (raw.isNotEmpty) {
                try {
                  final json = jsonDecode(raw) as Map<String, dynamic>;
                  if (json['type'] == 'location' || json['lat'] != null) {
                    if (!controller.isClosed) {
                      controller.add(LocationUpdate.fromJson(json));
                    }
                  }
                } catch (_) {
                  // skip unparseable frames (heartbeats, etc.)
                }
              }
            }
          }
        },
        onError: (Object err) {
          if (!controller.isClosed) {
            controller.addError(err);
            controller.close();
          }
        },
        onDone: () {
          if (!controller.isClosed) controller.close();
        },
        cancelOnError: true,
      );
    } on DioException catch (e) {
      if (!controller.isClosed) {
        controller.addError(Exception('Failed to connect: ${e.message}'));
        controller.close();
      }
    }
  }
}
