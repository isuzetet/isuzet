import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/shared/providers/fleet_provider.dart';

class FleetMapScreen extends ConsumerWidget {
  const FleetMapScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationsAsync = ref.watch(activeTruckLocationsProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgSecondary,
        title: Text(
          'Active Trucks Map',
          style: AppTextStyles.h3,
        ),
        elevation: 0,
      ),
      body: locationsAsync.when(
        data: (locations) {
          if (locations.isEmpty) {
            return Center(
              child: Text(
                'No active trucks to display',
                style: AppTextStyles.body1.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            );
          }

          // Calculate map bounds from all truck locations
          final bounds = _calculateBounds(locations);

          return Stack(
            children: [
              // CRITICAL: Using flutter_map (OpenStreetMap), NOT google_maps_flutter
              FlutterMap(
                options: MapOptions(
                  initialCenter: LatLng(
                    bounds.center.latitude,
                    bounds.center.longitude,
                  ),
                  initialZoom: 10,
                  minZoom: 2,
                  maxZoom: 18,
                ),
                children: [
                  // OpenStreetMap tile layer
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.isuzet.isuzet_business',
                    maxNativeZoom: 19,
                  ),
                  // Truck markers with last known GPS coordinates
                  MarkerLayer(
                    markers: locations
                        .map((location) => _buildTruckMarker(location))
                        .toList(),
                  ),
                ],
              ),
              // Legend
              Positioned(
                bottom: AppLayout.paddingMedium,
                left: AppLayout.paddingMedium,
                child: _MapLegend(truckCount: locations.length),
              ),
            ],
          );
        },
        loading: () {
          return Center(
            child: CircularProgressIndicator(
              color: AppColors.brandTeal,
            ),
          );
        },
        error: (error, stack) {
          return Center(
            child: Text(
              'Failed to load truck locations: $error',
              style: AppTextStyles.body1.copyWith(
                color: AppColors.danger,
              ),
            ),
          );
        },
      ),
    );
  }

  /// Build marker for each truck using last known GPS coordinates
  Marker _buildTruckMarker(dynamic location) {
    final isActive = location.status == 'active';
    final markerColor = isActive ? Colors.green : Colors.orange;

    return Marker(
      point: LatLng(location.latitude, location.longitude),
      child: GestureDetector(
        onTap: () {
          // Show truck info popup
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: markerColor,
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 4,
                  ),
                ],
              ),
              child: Text(
                location.truckId.substring(0, 4).toUpperCase(),
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Icon(
              Icons.location_on,
              color: markerColor,
              size: 32,
            ),
          ],
        ),
      ),
      width: 40,
      height: 40,
    );
  }

  /// Calculate bounds from all locations
  LatLngBounds _calculateBounds(List<dynamic> locations) {
    if (locations.isEmpty) {
      // Default to Addis Ababa if no locations
      return LatLngBounds(
        LatLng(9.0320, 38.7469),
        LatLng(9.0320, 38.7469),
      );
    }

    double minLat = locations[0].latitude;
    double maxLat = locations[0].latitude;
    double minLng = locations[0].longitude;
    double maxLng = locations[0].longitude;

    for (var loc in locations) {
      minLat = (loc.latitude < minLat) ? loc.latitude : minLat;
      maxLat = (loc.latitude > maxLat) ? loc.latitude : maxLat;
      minLng = (loc.longitude < minLng) ? loc.longitude : minLng;
      maxLng = (loc.longitude > maxLng) ? loc.longitude : maxLng;
    }

    return LatLngBounds(
      LatLng(minLat, minLng),
      LatLng(maxLat, maxLng),
    );
  }
}

class _MapLegend extends StatelessWidget {
  final int truckCount;

  const _MapLegend({required this.truckCount});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.borderColor,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 4,
          ),
        ],
      ),
      padding: EdgeInsets.all(AppLayout.paddingSmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Active Trucks: $truckCount',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on, color: Colors.green, size: 16),
              SizedBox(width: 4),
              Text(
                'Active',
                style: AppTextStyles.caption,
              ),
            ],
          ),
          SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on, color: Colors.orange, size: 16),
              SizedBox(width: 4),
              Text(
                'Idle',
                style: AppTextStyles.caption,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
