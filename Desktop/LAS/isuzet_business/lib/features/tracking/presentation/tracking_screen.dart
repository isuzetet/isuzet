import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/features/tracking/data/services/tracking_service.dart';

class TrackShipmentScreen extends StatefulWidget {
  final String tripId;
  const TrackShipmentScreen({Key? key, required this.tripId}) : super(key: key);

  @override
  State<TrackShipmentScreen> createState() => _TrackShipmentScreenState();
}

class _TrackShipmentScreenState extends State<TrackShipmentScreen> {
  final _mapController = MapController();
  StreamSubscription<LocationUpdate>? _sub;

  // State
  LocationUpdate? _latest;
  final List<LatLng> _trail = [];
  bool _connecting = true;
  String? _error;
  bool _followDriver = true;

  // Ethiopia center as default
  static const LatLng _defaultCenter = LatLng(9.03, 38.74);
  static const double _defaultZoom = 12.0;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  void _connect() {
    setState(() {
      _connecting = true;
      _error = null;
    });

    _sub = TrackingService.track(widget.tripId).listen(
      (update) {
        final point = LatLng(update.lat, update.lng);
        setState(() {
          _connecting = false;
          _latest = update;
          _trail.add(point);
          if (_trail.length > 500) _trail.removeAt(0);
        });
        if (_followDriver) {
          _mapController.move(point, _mapController.camera.zoom);
        }
      },
      onError: (Object err) {
        setState(() {
          _connecting = false;
          _error = err.toString();
        });
      },
      onDone: () {
        if (mounted) {
          setState(() => _connecting = false);
        }
      },
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live Tracking', style: AppTextStyles.h3),
            Text(
              'Trip ${widget.tripId.length > 12 ? widget.tripId.substring(0, 12) : widget.tripId}…',
              style: AppTextStyles.caption,
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _followDriver ? 'Following driver' : 'Follow driver',
            icon: Icon(
              _followDriver ? Icons.my_location : Icons.location_searching,
              color: _followDriver ? AppColors.brandTeal : AppColors.textSecondary,
            ),
            onPressed: () => setState(() => _followDriver = !_followDriver),
          ),
        ],
      ),
      body: Stack(
        children: [
          // ── Map ─────────────────────────────────────────────────────────
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _trail.isNotEmpty ? _trail.last : _defaultCenter,
              initialZoom: _defaultZoom,
              backgroundColor: AppColors.bgPrimary,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.isuzet.business',
              ),
              if (_trail.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: List.from(_trail),
                      color: AppColors.brandTeal,
                      strokeWidth: 4,
                    ),
                  ],
                ),
              if (_trail.isNotEmpty)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _trail.last,
                      width: 48,
                      height: 48,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.brandTeal,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.brandTeal.withValues(alpha: 0.4),
                              blurRadius: 12,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.local_shipping,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // ── Status banner ────────────────────────────────────────────────
          if (_connecting)
            Positioned(
              top: 12,
              left: 16,
              right: 16,
              child: _StatusBanner(
                color: AppColors.brandAmber,
                icon: Icons.satellite_alt,
                message: 'Connecting to live feed…',
              ),
            ),

          if (_error != null)
            Positioned(
              top: 12,
              left: 16,
              right: 16,
              child: _StatusBanner(
                color: AppColors.danger,
                icon: Icons.wifi_off,
                message: 'Connection lost — pull to reconnect',
                onTap: () {
                  _sub?.cancel();
                  _connect();
                },
              ),
            ),

          if (!_connecting && _error == null && _latest == null)
            Positioned(
              top: 12,
              left: 16,
              right: 16,
              child: _StatusBanner(
                color: AppColors.info,
                icon: Icons.gps_not_fixed,
                message: 'Waiting for first GPS ping…',
              ),
            ),

          // ── Bottom info card ─────────────────────────────────────────────
          if (_latest != null)
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: _LocationInfoCard(update: _latest!),
            ),
        ],
      ),
    );
  }
}

// ── Sub-widgets ─────────────────────────────────────────────────────────────

class _StatusBanner extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String message;
  final VoidCallback? onTap;

  const _StatusBanner({
    required this.color,
    required this.icon,
    required this.message,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: AppTextStyles.body2.copyWith(color: Colors.white),
              ),
            ),
            if (onTap != null)
              const Icon(Icons.refresh, color: Colors.white, size: 16),
          ],
        ),
      ),
    );
  }
}

class _LocationInfoCard extends StatelessWidget {
  final LocationUpdate update;
  const _LocationInfoCard({required this.update});

  @override
  Widget build(BuildContext context) {
    final speed = update.speed != null
        ? '${update.speed!.toStringAsFixed(1)} km/h'
        : '—';
    final time = _formatTime(update.timestamp);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_shipping, color: AppColors.brandTeal, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Live Position', style: AppTextStyles.subtitle1),
                const SizedBox(height: 4),
                Text(
                  '${update.lat.toStringAsFixed(5)}, ${update.lng.toStringAsFixed(5)}',
                  style: AppTextStyles.body2,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _Chip(label: speed, icon: Icons.speed),
              const SizedBox(height: 4),
              _Chip(label: time, icon: Icons.access_time),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final IconData icon;
  const _Chip({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}
