import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/services/gps_tracking_service.dart';
import 'package:isuzet_field/features/dashboard/data/dashboard_service.dart';
import 'dart:io';

class IncidentReportScreen extends ConsumerStatefulWidget {
  final String tripId;

  const IncidentReportScreen({
    Key? key,
    required this.tripId,
  }) : super(key: key);

  @override
  ConsumerState<IncidentReportScreen> createState() =>
      _IncidentReportScreenState();
}

class _IncidentReportScreenState extends ConsumerState<IncidentReportScreen> {
  String? _selectedIncidentType;
  File? _photoFile;
  String _description = '';
  bool _isSubmitting = false;
  bool _showMedicalSosConfirmation = false;
  final ImagePicker _imagePicker = ImagePicker();

  final List<Map<String, String>> incidentTypes = [
    {'id': 'medical', 'label': 'Medical Emergency (SOS)'},
    {'id': 'theft', 'label': 'Theft / Robbery'},
    {'id': 'accident', 'label': 'Traffic Accident'},
    {'id': 'roadblock', 'label': 'Roadblock / Checkpoint'},
    {'id': 'harassment', 'label': 'Harassment / Assault'},
    {'id': 'other', 'label': 'Other Incident'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Incident'),
        elevation: 0,
        backgroundColor: AppColors.bgPrimary,
      ),
      backgroundColor: AppColors.bgPrimary,
      body: _showMedicalSosConfirmation
          ? _buildMedicalSosConfirmation()
          : _buildIncidentForm(),
    );
  }

  /// Medical SOS confirmation dialog (bypasses normal form)
  /// CRITICAL: Immediate POST to /medical-sos endpoint, no form validation
  Widget _buildMedicalSosConfirmation() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.danger.withOpacity(0.1),
              ),
              child: const Icon(
                Icons.emergency,
                size: 60,
                color: AppColors.danger,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Medical Emergency Detected',
              style: AppTextStyles.headingMedium.copyWith(
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Emergency services are being contacted immediately. Ambulance is being dispatched to your location.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (_isSubmitting)
              const Column(
                children: [
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(
                      color: AppColors.danger,
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Contacting emergency services...',
                    style: AppTextStyles.bodyMedium,
                  ),
                ],
              )
            else
              Column(
                children: [
                  GestureDetector(
                    onTap: _isSubmitting ? null : _submitMedicalSos,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          'CONFIRM SOS',
                          style: AppTextStyles.bodySemibold.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () {
                      setState(() => _showMedicalSosConfirmation = false);
                      setState(() => _selectedIncidentType = null);
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.borderDefault),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          'Cancel',
                          style: AppTextStyles.bodySemibold.copyWith(
                            color: AppColors.brandTeal,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  /// Standard incident reporting form
  Widget _buildIncidentForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Incident type selector
          Text(
            'Incident Type',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          ...incidentTypes.map((type) {
            final isMedical = type['id'] == 'medical';
            final isSelected = _selectedIncidentType == type['id'];

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedIncidentType = type['id'];
                    // CRITICAL: Medical SOS bypasses form - show confirmation immediately
                    if (isMedical) {
                      _showMedicalSosConfirmation = true;
                    }
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected ? AppColors.brandTeal : AppColors.borderDefault,
                      width: isSelected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: isMedical ? AppColors.danger.withOpacity(0.05) : null,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              type['label']!,
                              style: AppTextStyles.bodyMedium,
                            ),
                            if (isMedical)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Emergency services contacted immediately',
                                  style: AppTextStyles.bodySmall.copyWith(
                                    color: AppColors.danger,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        const Icon(
                          Icons.check_circle,
                          color: AppColors.brandTeal,
                        ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
          const SizedBox(height: 24),

          // Show form only if non-medical type is selected
          if (_selectedIncidentType != null &&
              _selectedIncidentType != 'medical') ...[
            // Description field
            Text(
              'Description',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              onChanged: (value) => _description = value,
              maxLines: 4,
              style: AppTextStyles.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Describe what happened...',
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
              ),
            ),
            const SizedBox(height: 24),

            // Photo evidence
            Text(
              'Photo Evidence (Optional)',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            if (_photoFile != null)
              Column(
                children: [
                  Container(
                    height: 150,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(_photoFile!, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _capturePhoto,
                    child: Text(
                      'Retake photo',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.brandTeal,
                      ),
                    ),
                  ),
                ],
              )
            else
              GestureDetector(
                onTap: _capturePhoto,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 20),
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
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Take Photo',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.brandTeal,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Submit button
            GestureDetector(
              onTap: _isSubmitting ? null : _submitIncident,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: _description.isNotEmpty
                      ? AppColors.brandTeal
                      : AppColors.brandTeal.withOpacity(0.5),
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
                          'Report Incident',
                          style: AppTextStyles.bodySemibold.copyWith(
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _capturePhoto() async {
    final file = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );

    if (file != null) {
      setState(() => _photoFile = File(file.path));
    }
  }

  Future<void> _submitIncident() async {
    if (_selectedIncidentType == null || _selectedIncidentType == 'medical') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select incident type'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    if (_description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please describe the incident'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final location = await GpsTrackingService.getCurrentLocation(widget.tripId);

      await IncidentService.reportIncident(
        tripId: widget.tripId,
        type: _selectedIncidentType!,
        description: _description,
        latitude: location?.latitude,
        longitude: location?.longitude,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Incident reported successfully'),
            backgroundColor: AppColors.statusDelivered,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
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

  Future<void> _submitMedicalSos() async {
    setState(() => _isSubmitting = true);

    try {
      final location = await GpsTrackingService.getCurrentLocation(widget.tripId);

      final response = await IncidentService.triggerMedicalSos(
        tripId: widget.tripId,
        latitude: location?.latitude,
        longitude: location?.longitude,
      );

      if (mounted) {
        // Show SOS confirmation in modal
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.bgCard,
            title: Text(
              'SOS Received',
              style: AppTextStyles.headingSmall.copyWith(
                color: AppColors.statusDelivered,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  response.message,
                  style: AppTextStyles.bodyMedium,
                ),
                const SizedBox(height: 12),
                if (response.ambulanceEta != null)
                  Text(
                    'Ambulance ETA: ${response.ambulanceEta}',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.brandTeal,
                    ),
                  ),
                const SizedBox(height: 12),
                Text(
                  'Emergency Number: ${response.emergencyNumber}',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.pop();
                },
                child: const Text('Close'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('SOS Error: $e'),
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
