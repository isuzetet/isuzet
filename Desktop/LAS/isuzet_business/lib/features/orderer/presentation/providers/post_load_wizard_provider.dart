import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/features/orderer/data/models/post_load_request.dart';
import 'package:isuzet_business/features/orderer/data/repositories/orderer_repository.dart';

class PostLoadWizardState {
  final int currentStep;
  final String? corridorId;
  final String? originCity;
  final String? destinationCity;
  final String? cargoType;
  final int? weightKg;
  final DateTime? pickupDate;
  final DateTime? deliveryDeadline;
  final String? specialInstructions;
  final bool isLoadingEstimate;
  final bool isSubmitting;
  final String? error;

  PostLoadWizardState({
    this.currentStep = 0,
    this.corridorId,
    this.originCity,
    this.destinationCity,
    this.cargoType,
    this.weightKg,
    this.pickupDate,
    this.deliveryDeadline,
    this.specialInstructions,
    this.isLoadingEstimate = false,
    this.isSubmitting = false,
    this.error,
  });

  bool get canProceedToStep3 =>
      cargoType != null && cargoType!.isNotEmpty && weightKg != null && weightKg! > 0;

  bool get canProceedToStep4 =>
      pickupDate != null && 
      deliveryDeadline != null && 
      deliveryDeadline!.isAfter(pickupDate!);

  bool get canSubmit =>
      corridorId != null &&
      originCity != null &&
      destinationCity != null &&
      cargoType != null &&
      weightKg != null &&
      pickupDate != null &&
      deliveryDeadline != null;

  PostLoadWizardState copyWith({
    int? currentStep,
    String? corridorId,
    String? originCity,
    String? destinationCity,
    String? cargoType,
    int? weightKg,
    DateTime? pickupDate,
    DateTime? deliveryDeadline,
    String? specialInstructions,
    bool? isLoadingEstimate,
    bool? isSubmitting,
    String? error,
  }) {
    return PostLoadWizardState(
      currentStep: currentStep ?? this.currentStep,
      corridorId: corridorId ?? this.corridorId,
      originCity: originCity ?? this.originCity,
      destinationCity: destinationCity ?? this.destinationCity,
      cargoType: cargoType ?? this.cargoType,
      weightKg: weightKg ?? this.weightKg,
      pickupDate: pickupDate ?? this.pickupDate,
      deliveryDeadline: deliveryDeadline ?? this.deliveryDeadline,
      specialInstructions: specialInstructions ?? this.specialInstructions,
      isLoadingEstimate: isLoadingEstimate ?? this.isLoadingEstimate,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error ?? this.error,
    );
  }
}

class PostLoadWizardNotifier extends StateNotifier<PostLoadWizardState> {
  final OrdererRepository _ordererRepository;

  PostLoadWizardNotifier(this._ordererRepository)
      : super(PostLoadWizardState());

  void setCorridorId(String corridorId, {String? originCity, String? destinationCity}) {
    state = state.copyWith(
      corridorId: corridorId,
      originCity: originCity,
      destinationCity: destinationCity,
    );
  }

  void setCargoType(String cargoType) {
    state = state.copyWith(cargoType: cargoType, error: null);
  }

  void setWeightKg(int weightKg) {
    state = state.copyWith(weightKg: weightKg, error: null);
  }

  void setPickupDate(DateTime pickupDate) {
    state = state.copyWith(pickupDate: pickupDate, error: null);
  }

  void setDeliveryDeadline(DateTime deliveryDeadline) {
    state = state.copyWith(deliveryDeadline: deliveryDeadline, error: null);
  }

  void setSpecialInstructions(String instructions) {
    state = state.copyWith(specialInstructions: instructions);
  }

  void nextStep() {
    if (state.currentStep < 3) {
      state = state.copyWith(currentStep: state.currentStep + 1);
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1);
    }
  }

  void reset() {
    state = PostLoadWizardState();
  }

  Future<bool> submitLoad() async {
    if (!state.canSubmit) {
      state = state.copyWith(
        error: 'Please complete all required fields',
      );
      return false;
    }

    if (state.deliveryDeadline != null && 
        state.pickupDate != null && 
        !state.deliveryDeadline!.isAfter(state.pickupDate!)) {
      state = state.copyWith(
        error: 'Delivery deadline must be after pickup date',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, error: null);

    try {
      final request = PostLoadRequest(
        corridorId: state.corridorId!,
        originCity: state.originCity!,
        destinationCity: state.destinationCity!,
        cargoType: state.cargoType!,
        weightKg: state.weightKg!,
        pickupDate: state.pickupDate!,
        deliveryDeadline: state.deliveryDeadline!,
        paymentModel: 'ESCROW',
        specialInstructions: state.specialInstructions ?? '',
        requiresReefer: false,
        isHazardous: false,
      );

      await _ordererRepository.postLoad(request);

      state = state.copyWith(
        isSubmitting: false,
        error: null,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to post load: ${e.toString()}',
      );
      return false;
    }
  }
}

final postLoadWizardProvider =
    StateNotifierProvider<PostLoadWizardNotifier, PostLoadWizardState>(
  (ref) {
    final ordererRepository = ref.watch(ordererRepositoryProvider);
    return PostLoadWizardNotifier(ordererRepository);
  },
);
