import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';

class KycUploadScreen extends StatefulWidget {
  const KycUploadScreen({Key? key}) : super(key: key);

  @override
  State<KycUploadScreen> createState() => _KycUploadScreenState();
}

class _KycUploadScreenState extends State<KycUploadScreen> {
  String? _selectedDocumentType;
  bool _isImageSelected = false;

  final List<String> _documentTypes = [
    'National ID',
    'Passport',
    'Business License',
    'Tax ID',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC Verification'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 40),
            Text(
              'Verify Your Identity',
              style: AppTextStyles.h2,
            ),
            const SizedBox(height: 8),
            Text(
              'Upload a document to complete registration',
              style: AppTextStyles.subtitle1,
            ),
            const SizedBox(height: 40),
            Text(
              'Document Type',
              style: AppTextStyles.h4,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _selectedDocumentType,
              items: _documentTypes
                  .map((doc) => DropdownMenuItem(
                        value: doc,
                        child: Text(doc),
                      ))
                  .toList(),
              onChanged: (value) {
                setState(() => _selectedDocumentType = value);
              },
              decoration: InputDecoration(
                hintText: 'Select document type',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 40),
            Text(
              'Document Image',
              style: AppTextStyles.h4,
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _isImageSelected
                      ? AppColors.brandTeal
                      : AppColors.borderDefault,
                  width: _isImageSelected ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8),
                color: AppColors.bgCard,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.image,
                    size: 48,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      // For Phase 1, just mark as selected
                      setState(() => _isImageSelected = true);
                    },
                    icon: const Icon(Icons.photo_camera),
                    label: const Text('Take Photo'),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () {
                      // For Phase 1, just mark as selected
                      setState(() => _isImageSelected = true);
                    },
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Choose from Gallery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.borderDefault,
                      foregroundColor: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed:
                    _selectedDocumentType != null && _isImageSelected
                        ? () {
                            // Navigate based on stored role
                            // For Phase 1, default to fleet owner
                            context.go('/fleet');
                          }
                        : null,
                child: const Text('Complete Registration'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
