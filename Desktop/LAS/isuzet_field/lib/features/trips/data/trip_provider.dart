import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/features/trips/data/models/trip_models.dart';
import 'package:isuzet_field/features/trips/data/trip_service.dart';

// Trip detail provider with family for tripId parameter
final tripDetailProvider =
    FutureProvider.family<Trip, String>((ref, tripId) async {
  final trip = await TripService.fetchTripDetail(tripId);
  return trip;
});

// Deliver stop state provider
final deliverStopProvider =
    FutureProvider.family<DeliverStopResponse, Map<String, dynamic>>(
  (ref, params) async {
    final tripId = params['tripId'] as String;
    final stopId = params['stopId'] as String;
    final latitude = params['latitude'] as double;
    final longitude = params['longitude'] as double;
    final notes = params['notes'] as String?;

    final response = await TripService.deliverStop(
      tripId: tripId,
      stopId: stopId,
      latitude: latitude,
      longitude: longitude,
      notes: notes,
    );

    return response;
  },
);

// Simple loading state for delivery submission
final deliveryLoadingProvider = StateProvider<bool>((ref) => false);
