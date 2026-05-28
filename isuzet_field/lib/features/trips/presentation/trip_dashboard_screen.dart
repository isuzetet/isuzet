import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/services/gps_tracking_service.dart';
import 'package:isuzet_field/features/trips/data/models/trip_models.dart';
import 'package:isuzet_field/features/trips/data/trip_provider.dart';

class TripDashboardScreen extends ConsumerStatefulWidget {
  final String tripId;

  const TripDashboardScreen({
    Key? key,
    required this.tripId,
  }) : super(key: key);

  @override
  ConsumerState<TripDashboardScreen> createState() =>
      _TripDashboardScreenState();
}

class _TripDashboardScreenState extends ConsumerState<TripDashboardScreen> {
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    // Initialize GPS tracking for background location updates
    GpsTrackingService.initializeGps().then((_) {
      GpsTrackingService.startTracking(widget.tripId);
    });
  }

  @override
  void dispose() {
    GpsTrackingService.stopTracking();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(tripDetailProvider(widget.tripId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Progress'),
        elevation: 0,
        backgroundColor: AppColors.bgPrimary,
      ),
      backgroundColor: AppColors.bgPrimary,
      body: tripAsync.when(
        data: (trip) => _buildTripContent(context, trip),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.brandTeal),
        ),
        error: (error, st) => _buildError(error.toString()),
      ),
    );
  }

  Widget _buildTripContent(BuildContext context, Trip trip) {
    final nextStop = trip.nextStop;
    final completedCount = trip.completedStopsCount;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Map section
          _buildMapSection(trip),

          // Trip progress
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Progress indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Progress',
                      style: AppTextStyles.bodyMedium,
                    ),
                    Text(
                      '$completedCount/${trip.stops.length} completed',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: trip.stops.isEmpty
                        ? 0
                        : completedCount / trip.stops.length,
                    minHeight: 8,
                    backgroundColor: AppColors.borderDefault,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.statusDelivered,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Next stop info
          if (nextStop != null)
            _buildNextStopCard(context, nextStop)
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.statusDelivered.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      color: AppColors.statusDelivered,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'All stops delivered',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.statusDelivered,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Stops list
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Stops',
                  style: AppTextStyles.bodyMedium,
                ),
                const SizedBox(height: 12),
                _buildStopsList(trip),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapSection(Trip trip) {
    return Container(
      height: 250,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _buildMap(trip),
      ),
    );
  }

  Widget _buildMap(Trip trip) {
    // On web: Show static map with fallback message
    if (kIsWeb) {
      return _buildWebMapFallback(trip);
    }

    // On Android: Show Google Map with real GPS tracking
    return FutureBuilder(
      future: GpsTrackingService.getCurrentLocation(widget.tripId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.brandTeal),
          );
        }

        final location = snapshot.data!;
        final initialPosition = LatLng(location.latitude, location.longitude);

        return GoogleMap(
          onMapCreated: (controller) {
            _mapController = controller;
          },
          initialCameraPosition: CameraPosition(
            target: initialPosition,
            zoom: 15,
          ),
          markers: {
            // Driver marker
            Marker(
              markerId: const MarkerId('driver'),
              position: initialPosition,
              infoWindow: const InfoWindow(title: 'Your Location'),
              icon:
                  BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
            ),
            // Stop markers
            ...trip.stops.map((stop) {
              final isDelivered = stop.status == 'delivered';
              return Marker(
                markerId: MarkerId('stop_${stop.id}'),
                position: LatLng(stop.latitude, stop.longitude),
                infoWindow: InfoWindow(
                  title: stop.address,
                  snippet: stop.status,
                ),
                icon: BitmapDescriptor.defaultMarkerWithHue(
                  isDelivered
                      ? BitmapDescriptor.hueGreen
                      : BitmapDescriptor.hueRed,
                ),
              );
            }),
          },
          compassEnabled: true,
          zoomControlsEnabled: false,
        );
      },
    );
  }

  Widget _buildWebMapFallback(Trip trip) {
    return Container(
      color: AppColors.bgCard,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.location_off,
            size: 48,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 12),
          Text(
            'GPS tracking not available on web',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Use mobile app for real-time tracking',
            style: AppTextStyles.bodyXSmall.copyWith(
              color: AppColors.textSecondary.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNextStopCard(BuildContext context, Stop nextStop) {
    return GestureDetector(
      onTap: () {
        // Navigate to delivery confirmation screen
        context.push(
          '/trip/${widget.tripId}/deliver',
          extra: {
            'stopId': nextStop.id,
            'address': nextStop.address,
          },
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.brandTeal.withOpacity(0.1),
          border: Border.all(color: AppColors.brandTeal),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Next Stop',
              style: AppTextStyles.bodyXSmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              nextStop.address,
              style: AppTextStyles.bodySemibold,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Stop ${nextStop.sequenceNumber}',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                Icon(
                  Icons.arrow_forward,
                  color: AppColors.brandTeal,
                  size: 20,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStopsList(Trip trip) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: trip.stops.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final stop = trip.stops[index];
        final isDelivered = stop.status == 'delivered';

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(
              color:
                  isDelivered ? AppColors.success : AppColors.textSecondary,
              width: 0.5,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              // Stop number badge
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDelivered ? AppColors.success : AppColors.brandTeal,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Stop details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stop.address,
                      style: AppTextStyles.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isDelivered ? 'Delivered' : 'Pending',
                      style: AppTextStyles.bodyXSmall.copyWith(
                        color: isDelivered ? AppColors.statusDelivered : AppColors.statusOpen,
                      ),
                    ),
                  ],
                ),
              ),
              // Status icon
              Icon(
                isDelivered ? Icons.check_circle : Icons.radio_button_unchecked,
                color: isDelivered ? AppColors.statusDelivered : AppColors.textSecondary,
                size: 20,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 48,
            color: AppColors.danger,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load trip',
            style: AppTextStyles.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: AppTextStyles.bodyXSmall.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// Platform detection for web
const bool kIsWeb = bool.fromEnvironment('dart.library.js_util');
