class PostLoadRequest {
  final String corridorId;
  final String originCity;
  final String? originAddress;
  final String destinationCity;
  final String? destinationAddress;
  final String cargoType;
  final String? cargoDescription;
  final int weightKg;
  final String? specialInstructions;
  final DateTime pickupDate;
  final DateTime deliveryDeadline;
  final String paymentModel;
  final bool requiresReefer;
  final bool isHazardous;

  PostLoadRequest({
    required this.corridorId,
    required this.originCity,
    this.originAddress,
    required this.destinationCity,
    this.destinationAddress,
    required this.cargoType,
    this.cargoDescription,
    required this.weightKg,
    this.specialInstructions,
    required this.pickupDate,
    required this.deliveryDeadline,
    required this.paymentModel,
    required this.requiresReefer,
    required this.isHazardous,
  });
}
