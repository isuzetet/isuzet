import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/features/auth/domain/auth_models.dart';
import 'package:isuzet_business/shared/providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  late PageController _pageController;
  int _currentStep = 0;

  final _phoneController = TextEditingController();
  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(registrationStateProvider.notifier).setRole(UserRole.fleetOwner);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _phoneController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final registrationState = ref.watch(registrationStateProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('ISUZET Business'),
        centerTitle: true,
        elevation: 0,
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        onPageChanged: (index) {
          setState(() => _currentStep = index);
        },
        children: [
          // Step 1: Phone
          _buildPhoneStep(context, registrationState),
          // Step 2: Role Selection
          _buildRoleStep(context, registrationState),
          // Step 3: Full Name
          _buildNameStep(context, registrationState),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (_currentStep > 0)
              ElevatedButton.icon(
                onPressed: _prevStep,
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.borderDefault,
                  foregroundColor: AppColors.textPrimary,
                ),
              )
            else
              const SizedBox(width: 100),
            if (_currentStep < 2)
              ElevatedButton.icon(
                onPressed: _validateStep() ? _nextStep : null,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Next'),
              )
            else
              ElevatedButton(
                onPressed: _validateStep()
                    ? () => _completeRegistration(context, ref)
                    : null,
                child: registrationState.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Complete'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhoneStep(
    BuildContext context,
    RegistrationState state,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 40),
          Text(
            'Welcome to ISUZET',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: 8),
          Text(
            'Let\'s get you registered',
            style: AppTextStyles.subtitle1,
          ),
          const SizedBox(height: 40),
          Text(
            'Phone Number',
            style: AppTextStyles.h4,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: '+251 911 234 567',
              prefixIcon: const Icon(Icons.phone),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onChanged: (value) {
              ref.read(registrationStateProvider.notifier).setPhone(value);
            },
          ),
          if (state.error != null && _currentStep == 0)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                state.error!,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.danger,
                ),
              ),
            ),
          const SizedBox(height: 40),
          Text(
            'We\'ll send a verification code to your phone.',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleStep(
    BuildContext context,
    RegistrationState state,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 40),
          Text(
            'What describes you?',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: 32),
          _buildRoleCard(
            context,
            role: UserRole.fleetOwner,
            isSelected: true,
            onTap: () {
              ref.read(registrationStateProvider.notifier)
                  .setRole(UserRole.fleetOwner);
            },
          ),
          const SizedBox(height: 16),
          Text(
            'Cargo-owner tools are not part of this fleet-management launch.',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleCard(
    BuildContext context, {
    required UserRole role,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected
                ? AppColors.brandTeal
                : AppColors.borderDefault,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isSelected
              ? AppColors.brandTeal.withAlpha((0.1 * 255).toInt())
              : AppColors.bgCard,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Role Icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.brandTeal,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Icon(
                      role == UserRole.fleetOwner
                          ? Icons.directions_bus
                          : Icons.local_shipping,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        role.label,
                        style: AppTextStyles.h4.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        role.amharic,
                        style: AppTextStyles.body2.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Icon(
                    Icons.check_circle,
                    color: AppColors.brandTeal,
                    size: 24,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              role.subtitle,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              role.amharicSubtitle,
              style: AppTextStyles.subtitle2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNameStep(
    BuildContext context,
    RegistrationState state,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 40),
          Text(
            'Your Full Name',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: 8),
          Text(
            'This will appear on your profile',
            style: AppTextStyles.subtitle1,
          ),
          const SizedBox(height: 40),
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              hintText: 'Full Name',
              prefixIcon: const Icon(Icons.person),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onChanged: (value) {
              ref.read(registrationStateProvider.notifier).setFullName(value);
            },
          ),
          if (state.error != null && _currentStep == 2)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                state.error!,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.danger,
                ),
              ),
            ),
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderDefault),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Summary',
                  style: AppTextStyles.h4,
                ),
                const SizedBox(height: 12),
                _summaryRow('Phone', state.phone),
                const SizedBox(height: 8),
                _summaryRow('Role',
                    state.selectedRole?.label ?? 'Not selected'),
                const SizedBox(height: 8),
                _summaryRow('Name', state.fullName),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.body2),
        Text(
          value,
          style: AppTextStyles.body2.copyWith(
            color: AppColors.brandTeal,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  bool _validateStep() {
    switch (_currentStep) {
      case 0:
        return _phoneController.text.isNotEmpty;
      case 1:
        return ref.read(registrationStateProvider).selectedRole != null;
      case 2:
        return _nameController.text.isNotEmpty;
      default:
        return false;
    }
  }

  Future<void> _completeRegistration(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final success = await ref
        .read(registrationStateProvider.notifier)
        .completeRegistration();

    if (!context.mounted) return;

    if (success) {
      // OTP was sent by the backend — go verify it
      context.go('/auth/otp');
    } else {
      // Error is already set in state
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ref.read(registrationStateProvider).error ?? 'Registration failed',
          ),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }
}
