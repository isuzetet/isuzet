import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/services/gps_tracking_service.dart';
import 'package:isuzet_field/features/trips/data/trip_provider.dart';
import 'package:isuzet_field/features/trips/data/trip_service.dart';

class DeliveryConfirmScreen extends ConsumerStatefulWidget {
  final String tripId;
  // CRITICAL: stopId must come from trip data, not hardcoded
  final String stopId;
  final String address;

  const DeliveryConfirmScreen({
    Key? key,
    required this.tripId,
    required this.stopId, // From trip.stops[index].id, never hardcoded
    required this.address,
  }) : super(key: key);

  @override
  ConsumerState<DeliveryConfirmScreen> createState() =>
      _DeliveryConfirmScreenState();
}

class _DeliveryConfirmScreenState
    extends ConsumerState<DeliveryConfirmScreen> {
  File? _deliveryPhoto;
  String _notes = '';
  bool _isSubmitting = false;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Confirm Delivery'),
        elevation: 0,
        backgroundColor: AppColors.bgPrimary,
      ),
      backgroundColor: AppColors.bgPrimary,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stop info
            _buildStopInfo(),
            const SizedBox(height: 24),

            // Current location
            _buildCurrentLocation(),
            const SizedBox(height: 24),

            // Proof of delivery photo
            _buildPhotoSection(),
            const SizedBox(height: 24),

            // Delivery notes
            _buildNotesSection(),
            const SizedBox(height: 32),

            // Submit button
            _buildSubmitButton(context),
          ],
        ),
      ),
    );
  }

  Widget _buildStopInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Delivery Location',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.borderDefault),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                Icons.location_on,
                color: AppColors.brandTeal,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.address,
                      style: AppTextStyles.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Stop ID: ${widget.stopId}',
                      style: AppTextStyles.bodyXSmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCurrentLocation() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Current Location',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        FutureBuilder(
          future: GpsTrackingService.getCurrentLocation(widget.tripId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.borderDefault),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(AppColors.brandTeal),
                        strokeWidth: 2,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Getting location...',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }

            if (snapshot.hasError) {
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.danger),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber,
                      color: AppColors.danger,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Location error',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.danger,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Please enable GPS',
                            style: AppTextStyles.bodyXSmall.copyWith(
                              color: AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }

            final location = snapshot.data;
            if (location == null) {
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.statusOpen),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info,
                      color: AppColors.statusOpen,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'GPS not available (web or service disabled)',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.statusOpen,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }

            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.statusDelivered),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        color: AppColors.statusDelivered,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'GPS Available',
                        style: AppTextStyles.bodySemibold.copyWith(
                          color: AppColors.statusDelivered,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildLocationDetail(
                          'Latitude',
                          location.latitude.toStringAsFixed(6),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildLocationDetail(
                          'Longitude',
                          location.longitude.toStringAsFixed(6),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _buildLocationDetail(
                    'Accuracy',
                    '${location.accuracy.toStringAsFixed(1)} m',
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildLocationDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.bodyXSmall.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.bodyMedium,
        ),
      ],
    );
  }

  Widget _buildPhotoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Proof of Delivery',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        if (_deliveryPhoto != null)
          _buildPhotoPreview()
        else
          _buildPhotoUploadButton(),
      ],
    );
  }

  Widget _buildPhotoPreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 200,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.file(
              _deliveryPhoto!,
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: _capturePhoto,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.borderDefault),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt,
                        color: AppColors.brandTeal,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Retake',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.brandTeal,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPhotoUploadButton() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: _capturePhoto,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                border: Border.all(
                  color: AppColors.brandTeal,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_alt,
                    color: AppColors.brandTeal,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Take Photo',
                    style: AppTextStyles.bodySemibold.copyWith(
                      color: AppColors.brandTeal,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _capturePhoto() async {
    final file = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );

    if (file != null) {
      setState(() {
        _deliveryPhoto = File(file.path);
      });
    }
  }

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Delivery Notes (Optional)',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          onChanged: (value) {
            _notes = value;
          },
          maxLines: 3,
          maxLength: 200,
          style: AppTextStyles.bodyMedium,
          decoration: InputDecoration(
            hintText: 'Add any notes about the delivery...',
            hintStyle: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary.withOpacity(0.5),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(
                color: AppColors.brandTeal,
                width: 1.5,
              ),
            ),
            filled: true,
            fillColor: AppColors.bgCard,
            counter: Text(
              '',
              style:
                  AppTextStyles.bodyXSmall.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton(BuildContext context) {
    final isEnabled = _deliveryPhoto != null && !_isSubmitting;

    return GestureDetector(
      onTap: isEnabled ? () => _submitDelivery(context) : null,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isEnabled ? AppColors.brandTeal : AppColors.brandTeal.withOpacity(0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    strokeWidth: 2,
                  ),
                )
              : Text(
                  'Confirm Delivery',
                  style: AppTextStyles.bodySemibold.copyWith(
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }

  Future<void> _submitDelivery(BuildContext context) async {
    if (_deliveryPhoto == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please take a photo as proof of delivery'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Get current location
      final location = await GpsTrackingService.getCurrentLocation(widget.tripId);
      final lat = location?.latitude ?? 0.0;
      final lon = location?.longitude ?? 0.0;

      // CRITICAL: Use stopId from parameter (from trip model), not hardcoded
      await TripService.deliverStop(
        tripId: widget.tripId,
        stopId: widget.stopId, // From trip.stops[index].id
        latitude: lat,
        longitude: lon,
        notes: _notes,
      );

      // Refresh trip status
      ref.invalidate(tripDetailProvider(widget.tripId));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Delivery confirmed successfully'),
            backgroundColor: AppColors.statusDelivered,
          ),
        );

        // Return to trip dashboard
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Delivery error: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}
