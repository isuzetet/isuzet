import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/features/orderer/data/orderer_service.dart';
import 'package:isuzet_business/features/orderer/domain/orderer_models.dart';

// Orderer service provider
final ordererServiceProvider = Provider((ref) => OrdererService());

// ===== METRICS =====
final ordererMetricsProvider = FutureProvider<OrdererMetrics>((ref) async {
  final service = ref.watch(ordererServiceProvider);
  return service.getOrdererMetrics();
});

// ===== LOADS =====
final myLoadsProvider = FutureProvider<List<Load>>((ref) async {
  final service = ref.watch(ordererServiceProvider);
  return service.getMyLoads();
});

final singleLoadProvider = FutureProvider.family<Load, String>((ref, loadId) async {
  final service = ref.watch(ordererServiceProvider);
  return service.getLoad(loadId);
});

// ===== CORRIDORS =====
final corridorsProvider = FutureProvider<List<Corridor>>((ref) async {
  final service = ref.watch(ordererServiceProvider);
  return service.getCorridors();
});

// ===== POST LOAD WIZARD =====
final postLoadWizardProvider =
    StateNotifierProvider<PostLoadWizardNotifier, PostLoadWizardState>((ref) {
  return PostLoadWizardNotifier(ref.watch(ordererServiceProvider));
});

class PostLoadWizardState {
  final int currentStep; // 0-3
  final String? corridorId;
  final String? cargoType;
  final int weightKg;
  final DateTime? pickupDate;
  final String specialInstructions;
  final int? estimatedValueCents;
  final bool isLoadingEstimate;
  final bool isSubmitting;
  final String? error;

  PostLoadWizardState({
    this.currentStep = 0,
    this.corridorId,
    this.cargoType,
    this.weightKg = 0,
    this.pickupDate,
    this.specialInstructions = '',
    this.estimatedValueCents,
    this.isLoadingEstimate = false,
    this.isSubmitting = false,
    this.error,
  });

  PostLoadWizardState copyWith({
    int? currentStep,
    String? corridorId,
    String? cargoType,
    int? weightKg,
    DateTime? pickupDate,
    String? specialInstructions,
    int? estimatedValueCents,
    bool? isLoadingEstimate,
    bool? isSubmitting,
    String? error,
  }) {
    return PostLoadWizardState(
      currentStep: currentStep ?? this.currentStep,
      corridorId: corridorId ?? this.corridorId,
      cargoType: cargoType ?? this.cargoType,
      weightKg: weightKg ?? this.weightKg,
      pickupDate: pickupDate ?? this.pickupDate,
      specialInstructions: specialInstructions ?? this.specialInstructions,
      estimatedValueCents: estimatedValueCents ?? this.estimatedValueCents,
      isLoadingEstimate: isLoadingEstimate ?? this.isLoadingEstimate,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error ?? this.error,
    );
  }

  bool get canProceedToStep3 =>
      corridorId != null && cargoType != null && weightKg > 0;

  bool get canEstimate =>
      corridorId != null && weightKg > 0 && pickupDate != null;

  bool get canSubmit =>
      estimatedValueCents != null &&
      pickupDate != null &&
      corridorId != null &&
      cargoType != null;
}

class PostLoadWizardNotifier extends StateNotifier<PostLoadWizardState> {
  final OrdererService _service;

  PostLoadWizardNotifier(this._service) : super(PostLoadWizardState());

  void setCorridorId(String id) {
    state = state.copyWith(corridorId: id);
  }

  void setCargoType(String type) {
    state = state.copyWith(cargoType: type);
  }

  void setWeightKg(int weight) {
    state = state.copyWith(weightKg: weight);
  }

  void setPickupDate(DateTime date) {
    state = state.copyWith(pickupDate: date);
  }

  void setSpecialInstructions(String instructions) {
    state = state.copyWith(specialInstructions: instructions);
  }

  void nextStep() {
    if (state.currentStep < 3) {
      state = state.copyWith(currentStep: state.currentStep + 1, error: null);
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1, error: null);
    }
  }

  Future<bool> fetchEstimate() async {
    if (!state.canEstimate) {
      state = state.copyWith(error: 'Missing corridor or weight');
      return false;
    }

    state = state.copyWith(isLoadingEstimate: true, error: null);
    try {
      final estimate = await _service.getEstimate(
        corridorId: state.corridorId!,
        weightKg: state.weightKg,
      );
      state = state.copyWith(
        estimatedValueCents: estimate.estimatedValueCents,
        isLoadingEstimate: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoadingEstimate: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> submitLoad() async {
    if (!state.canSubmit) {
      state = state.copyWith(error: 'Missing required fields');
      return false;
    }

    state = state.copyWith(isSubmitting: true, error: null);
    try {
      // Use default fundingRailId 'default' — can be customized per user
      await _service.postLoad(
        corridorId: state.corridorId!,
        cargoType: state.cargoType!,
        weightKg: state.weightKg,
        pickupDate: state.pickupDate!,
        estimatedValueCents: state.estimatedValueCents!,
        specialInstructions:
            state.specialInstructions.isEmpty ? null : state.specialInstructions,
        fundingRailId: 'default',
      );
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  void reset() {
    state = PostLoadWizardState();
  }
}
