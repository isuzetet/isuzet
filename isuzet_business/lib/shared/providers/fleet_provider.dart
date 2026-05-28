import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/features/fleet/data/fleet_service.dart';
import 'package:isuzet_business/features/fleet/domain/fleet_models.dart';

const Object _unset = Object();

// Fleet service provider
final fleetServiceProvider = Provider((ref) => FleetService());

// ===== FLEET METRICS =====
final fleetMetricsProvider = FutureProvider<FleetMetrics>((ref) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getFleetMetrics();
});

// ===== TRUCKS =====
final trucksProvider = FutureProvider<List<Truck>>((ref) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getTrucks();
});

final singleTruckProvider =
    FutureProvider.family<Truck, String>((ref, truckId) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getTruck(truckId);
});

// Add truck form state
final addTruckFormProvider =
    StateNotifierProvider<AddTruckFormNotifier, AddTruckFormState>((ref) {
  return AddTruckFormNotifier(ref.watch(fleetServiceProvider));
});

class AddTruckFormState {
  final String licensePlate;
  final String registrationNumber;
  final double capacity; // user input (kg or tonnes)
  final bool capacityInTonnes; // true = tonnes, false = kg
  final String? driverId;
  final bool isLoading;
  final String? error;

  AddTruckFormState({
    this.licensePlate = '',
    this.registrationNumber = '',
    this.capacity = 0,
    this.capacityInTonnes = false,
    this.driverId,
    this.isLoading = false,
    this.error,
  });

  AddTruckFormState copyWith({
    String? licensePlate,
    String? registrationNumber,
    double? capacity,
    bool? capacityInTonnes,
    String? driverId,
    bool? isLoading,
    Object? error = _unset,
  }) {
    return AddTruckFormState(
      licensePlate: licensePlate ?? this.licensePlate,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      capacity: capacity ?? this.capacity,
      capacityInTonnes: capacityInTonnes ?? this.capacityInTonnes,
      driverId: driverId ?? this.driverId,
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }

  /// Convert capacity to kg (always sent as integer to API)
  int getCapacityKg() {
    if (capacityInTonnes) {
      return (capacity * 1000).toInt(); // tonnes to kg
    }
    return capacity.toInt(); // kg as-is
  }
}

class AddTruckFormNotifier extends StateNotifier<AddTruckFormState> {
  final FleetService _service;

  AddTruckFormNotifier(this._service) : super(AddTruckFormState());

  void setLicensePlate(String value) {
    state = state.copyWith(licensePlate: value);
  }

  void setRegistrationNumber(String value) {
    state = state.copyWith(registrationNumber: value);
  }

  void setCapacity(double value) {
    state = state.copyWith(capacity: value);
  }

  void toggleCapacityUnit() {
    state = state.copyWith(capacityInTonnes: !state.capacityInTonnes);
  }

  void setDriverId(String? value) {
    state = state.copyWith(driverId: value);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  Future<bool> submitForm() async {
    if (state.licensePlate.isEmpty) {
      state = state.copyWith(error: 'License plate required');
      return false;
    }
    if (state.capacity <= 0) {
      state = state.copyWith(error: 'Capacity must be greater than 0');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      // CRITICAL: Convert to kg integer before sending
      final capacityKg = state.getCapacityKg();
      await _service.createTruck(
        licensePlate: state.licensePlate,
        capacityKg: capacityKg, // ← Always sent as integer kg
        registrationNumber:
            state.registrationNumber.isEmpty ? null : state.registrationNumber,
        driverId: state.driverId,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  void reset() {
    state = AddTruckFormState();
  }
}

// ===== DRIVERS =====
final driversProvider = FutureProvider<List<Driver>>((ref) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getDrivers();
});

final singleDriverProvider =
    FutureProvider.family<Driver, String>((ref, driverId) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getDriver(driverId);
});

final addDriverFormProvider =
    StateNotifierProvider<AddDriverFormNotifier, AddDriverFormState>((ref) {
  return AddDriverFormNotifier(ref.watch(fleetServiceProvider));
});

class AddDriverFormState {
  final String fullName;
  final String phone;
  final String licenseNumber;
  final bool isLoading;
  final String? error;

  const AddDriverFormState({
    this.fullName = '',
    this.phone = '',
    this.licenseNumber = '',
    this.isLoading = false,
    this.error,
  });

  AddDriverFormState copyWith({
    String? fullName,
    String? phone,
    String? licenseNumber,
    bool? isLoading,
    Object? error = _unset,
  }) {
    return AddDriverFormState(
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }
}

class AddDriverFormNotifier extends StateNotifier<AddDriverFormState> {
  final FleetService _service;

  AddDriverFormNotifier(this._service) : super(const AddDriverFormState());

  void setFullName(String value) {
    state = state.copyWith(fullName: value, error: null);
  }

  void setPhone(String value) {
    state = state.copyWith(phone: value, error: null);
  }

  void setLicenseNumber(String value) {
    state = state.copyWith(licenseNumber: value, error: null);
  }

  Future<bool> submitForm() async {
    if (state.fullName.trim().length < 2) {
      state = state.copyWith(error: 'Driver name required');
      return false;
    }
    if (state.phone.trim().length < 9) {
      state = state.copyWith(error: 'Valid phone number required');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      await _service.createDriver(
        fullName: state.fullName.trim(),
        phone: state.phone.trim(),
        licenseNumber:
            state.licenseNumber.trim().isEmpty ? null : state.licenseNumber.trim(),
      );
      state = const AddDriverFormState();
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  void reset() {
    state = const AddDriverFormState();
  }
}

// ===== LOCATIONS (for map) =====
final activeTruckLocationsProvider = FutureProvider<List<TruckLocation>>((ref) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getActiveTruckLocations();
});

final truckLocationHistoryProvider =
    FutureProvider.family<List<TruckLocation>, String>((ref, truckId) async {
  final service = ref.watch(fleetServiceProvider);
  return service.getTruckLocationHistory(truckId);
});
