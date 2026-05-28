import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/features/loads/data/load_service.dart';
import 'package:isuzet_field/features/loads/data/models/load_models.dart';

// Fetch available loads (paginated)
final loadsListProvider = FutureProvider.family<LoadsListResponse, int>((ref, page) async {
  return LoadService.fetchAvailableLoads(page: page, limit: 20);
});

// Fetch specific load detail
final loadDetailProvider = FutureProvider.family<LoadItem, String>((ref, loadId) async {
  return LoadService.fetchLoadDetail(loadId);
});

// Accept load state
final acceptLoadProvider = FutureProvider.family<AcceptOfferResponse, String>((ref, loadId) async {
  final response = await LoadService.acceptLoad(loadId);
  // Invalidate loads list to refresh
  ref.invalidate(loadsListProvider);
  return response;
});

// Currently selected load (for detail view)
final selectedLoadProvider = StateProvider<LoadItem?>((ref) => null);

// Accept loading state
final acceptingLoadProvider = StateProvider<String?>((ref) => null); // Stores loadId being accepted
