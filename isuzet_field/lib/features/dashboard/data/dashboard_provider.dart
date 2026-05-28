import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/features/dashboard/data/models/earnings_models.dart';
import 'package:isuzet_field/features/dashboard/data/dashboard_service.dart';

// Earnings provider - fetches latest earnings data
final earningsProvider = FutureProvider<Earnings>((ref) async {
  return EarningsService.fetchEarnings();
});

// Weekly earnings trend provider
final weeklyEarningsTrendProvider = FutureProvider<List<double>>((ref) async {
  return EarningsService.fetchWeeklyTrend();
});

// Trust breakdown provider - fetches and handles null components
final trustBreakdownProvider = FutureProvider<TrustBreakdown>((ref) async {
  return TrustScoreService.fetchTrustBreakdown();
});

// Incident report provider - for submitting incidents
final incidentReportProvider =
    FutureProvider.family<IncidentReportResponse, Map<String, dynamic>>(
  (ref, params) async {
    return IncidentService.reportIncident(
      tripId: params['tripId'] as String,
      type: params['type'] as String,
      description: params['description'] as String,
      location: params['location'] as String?,
      latitude: params['latitude'] as double?,
      longitude: params['longitude'] as double?,
      proofUrl: params['proofUrl'] as String?,
    );
  },
);

// Medical SOS provider - immediate emergency trigger
final medicalSosProvider =
    FutureProvider.family<MedicalSosResponse, Map<String, dynamic>>(
  (ref, params) async {
    return IncidentService.triggerMedicalSos(
      tripId: params['tripId'] as String,
      latitude: params['latitude'] as double?,
      longitude: params['longitude'] as double?,
    );
  },
);

// Incident status provider
final incidentStatusProvider =
    FutureProvider.family<Incident, String>((ref, incidentId) async {
  return IncidentService.getIncidentStatus(incidentId);
});
