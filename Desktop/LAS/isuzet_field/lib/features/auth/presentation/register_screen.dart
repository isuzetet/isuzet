import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/constants/amharic_strings.dart';
import 'package:isuzet_field/core/utils/phone_normalizer.dart';
import 'package:isuzet_field/features/auth/data/models/auth_models.dart';
import 'package:isuzet_field/shared/providers/auth_provider.dart';
import 'package:isuzet_field/shared/widgets/buttons.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  String? _formError;
  bool _isLoading = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    setState(() {
      _formError = null;
      _isLoading = true;
    });

    try {
      final name = _fullNameController.text.trim();
      final phone = _phoneController.text.trim();

      if (name.isEmpty) {
        setState(() {
          _formError = 'Full name is required';
          _isLoading = false;
        });
        return;
      }

      final normalized = PhoneNormalizer.normalize(phone);
      if (!PhoneNormalizer.isValid(normalized)) {
        setState(() {
          _formError = 'Enter a valid Ethiopian phone number';
          _isLoading = false;
        });
        return;
      }

      await ref.read(
        registerProvider(
          RegisterRequest(
            phone: normalized,
            fullName: name,
            role: 'DRIVER',
          ),
        ).future,
      );

      if (!mounted) return;
      context.go('/auth/otp?phone=$normalized');
    } catch (e) {
      setState(() {
        _formError = e.toString();
        _isLoading = false;
      });
      _showErrorSnackbar(_formError ?? 'Registration failed');
    }
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Text(
                    Am.appName,
                    style: AppTextStyles.headingMedium.copyWith(
                      color: AppColors.brandTeal,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Driver fleet app',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Full Name',
              style: AppTextStyles.labelSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _fullNameController,
              decoration: InputDecoration(
                hintText: 'Abebe Girma',
                filled: true,
                fillColor: AppColors.bgInput,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDefault),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Phone Number',
              style: AppTextStyles.labelSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                hintText: '09 12 345 678',
                filled: true,
                fillColor: AppColors.bgInput,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDefault),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Role',
              style: AppTextStyles.labelSmall,
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.brandTeal,
                border: Border.all(
                  color: AppColors.brandTeal,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.local_shipping,
                    color: Colors.white,
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Driver',
                    style: AppTextStyles.labelLarge.copyWith(
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'Fleet management launch',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            PrimaryButton(
              label: 'Send OTP',
              onPressed: _submitForm,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
