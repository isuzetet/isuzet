import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/shared/widgets/buttons.dart';

class KycUploadScreen extends ConsumerStatefulWidget {
  const KycUploadScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<KycUploadScreen> createState() => _KycUploadScreenState();
}

class _KycUploadScreenState extends ConsumerState<KycUploadScreen> {
  String? _selectedDocType; // 'national_id', 'kebele_id', 'driver_license', 'passport'
  File? _selectedImage;
  bool _isUploading = false;
  final ImagePicker _imagePicker = ImagePicker();

  final List<Map<String, String>> _docTypes = [
    {'id': 'national_id', 'label': 'ብሔራዊ መታወቂያ'},
    {'id': 'kebele_id', 'label': 'ቀበሌ መታወቂያ'},
    {'id': 'driver_license', 'label': '운전면허증'},
    {'id': 'passport', 'label': 'ፓ})sport'},
  ];

  void _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
        });
      }
    } catch (e) {
      _showErrorSnackbar('ምስል መምረጥ ከ$e ውስጥ ล');
    }
  }

  void _showImagePickerBottomSheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        color: AppColors.bgCard,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'ምስል ምረጥ',
                style: AppTextStyles.headingSmall,
              ),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('ካሜራ'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('ሰዓት'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _submitKyc() async {
    if (_selectedDocType == null || _selectedImage == null) {
      _showErrorSnackbar('ወረቀቱ እና ምስሉን ይምረጡ');
      return;
    }

    setState(() => _isUploading = true);

    try {
      final fileName = _selectedImage!.path.split('/').last;
      final formData = FormData.fromMap({
        'docType': _selectedDocType,
        'file': await MultipartFile.fromFile(
          _selectedImage!.path,
          filename: fileName,
        ),
      });

      await ApiClient.dio.post(
        '${AppConfig.identityBase}/identity/kyc/upload',
        data: formData,
      );

      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _isUploading = false);
      _showErrorSnackbar('KYC upload failed: $e');
    }
  }

  void _skipKyc() {
    context.go('/home');
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.danger,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),
            Text(
              'የንግሥት አረጋግጥ',
              style: AppTextStyles.headingMedium,
            ),
            const SizedBox(height: 12),
            Text(
              'ለመጀመር ያለብህ ወረቀታችንን ለ confirm.',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Document type selector
            Text(
              'ወረቀተ አይነት ምረጥ',
              style: AppTextStyles.bodyMedium,
            ),
            const SizedBox(height: 12),
            ..._docTypes.map(
              (doc) => RadioListTile<String>(
                title: Text(doc['label']!),
                value: doc['id']!,
                groupValue: _selectedDocType,
                onChanged: (value) {
                  setState(() => _selectedDocType = value);
                },
              ),
            ),
            const SizedBox(height: 24),

            // Photo upload section
            Text(
              'ምስል ግቤ',
              style: AppTextStyles.bodyMedium,
            ),
            const SizedBox(height: 12),

            if (_selectedImage != null)
              Column(
                children: [
                  Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: Image.file(_selectedImage!, fit: BoxFit.cover),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _showImagePickerBottomSheet,
                    child: const Text('ምስል ቀይር'),
                  ),
                ],
              )
            else
              GestureDetector(
                onTap: _showImagePickerBottomSheet,
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppColors.bgCard,
                    border: Border.all(
                      color: AppColors.borderDefault,
                      style: BorderStyle.solid,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.image_not_supported,
                        size: 48,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'ካሜራ ወይም ሰዓት ምስል ምረጥ',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodyMedium
                            .copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 32),

            // Submit button
            PrimaryButton(
              label: 'KYC አስገባ',
              onPressed: _submitKyc,
              isLoading: _isUploading,
              isDisabled: _selectedDocType == null || _selectedImage == null,
            ),
            const SizedBox(height: 16),

            // Skip button
            TextButton(
              onPressed: _skipKyc,
              child: Text(
                'አሁን ዝለል',
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
