import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/features/orderer/presentation/providers/post_load_wizard_provider.dart';
import 'package:isuzet_business/features/orderer/presentation/providers/orderer_providers.dart';

class PostLoadScreen extends ConsumerWidget {
  const PostLoadScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wizardState = ref.watch(postLoadWizardProvider);
    final isMobile = AppLayout.isMobile(context);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgSecondary,
        title: Text('Post Load', style: AppTextStyles.h3),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(isMobile ? AppLayout.paddingMedium : AppLayout.paddingLarge),
          child: isMobile
              ? _buildMobileWizard(context, ref, wizardState)
              : _buildDesktopForm(context, ref, wizardState),
        ),
      ),
    );
  }

  Widget _buildMobileWizard(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Column(
      children: [
        _StepIndicator(currentStep: wizardState.currentStep),
        SizedBox(height: AppLayout.spacingLarge),
        _buildStepContent(context, ref, wizardState),
        SizedBox(height: AppLayout.spacingLarge),
        _buildStepButtons(context, ref, wizardState),
      ],
    );
  }

  Widget _buildDesktopForm(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 200,
          child: _buildStepsList(context, ref, wizardState),
        ),
        SizedBox(width: AppLayout.spacingLarge),
        Expanded(
          child: _buildStepContent(context, ref, wizardState),
        ),
      ],
    );
  }

  Widget _buildStepsList(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Column(
      children: [
        for (int i = 0; i < 4; i++)
          _StepListItem(
            stepNumber: i + 1,
            title: _getStepTitle(i),
            isActive: i == wizardState.currentStep,
            isCompleted: i < wizardState.currentStep,
            onTap: () {
              // Allow jumping to previous steps, auto-advance to next
              if (i <= wizardState.currentStep) {
                for (int j = 0; j < i; j++) {
                  ref.read(postLoadWizardProvider.notifier).nextStep();
                }
              }
            },
          ),
      ],
    );
  }

  Widget _buildStepContent(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    switch (wizardState.currentStep) {
      case 0:
        return _buildCorridorStep(context, ref, wizardState);
      case 1:
        return _buildCargoStep(context, ref, wizardState);
      case 2:
        return _buildPickupStep(context, ref, wizardState);
      case 3:
        return _buildEstimateStep(context, ref, wizardState);
      default:
        return SizedBox.shrink();
    }
  }

  Widget _buildCorridorStep(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    final corridorsAsync = ref.watch(corridorsProvider);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderColor),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Step 1: Select Route',
            style: AppTextStyles.h3,
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Choose departure and arrival cities',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          SizedBox(height: AppLayout.spacingLarge),
          corridorsAsync.when(
            data: (corridors) {
              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: corridors.length,
                separatorBuilder: (_, __) =>
                    SizedBox(height: AppLayout.spacingSmall),
                itemBuilder: (context, index) {
                  final corridor = corridors[index];
                  final isSelected = wizardState.corridorId == corridor.id;

                  return GestureDetector(
                    onTap: () {
                      ref
                          .read(postLoadWizardProvider.notifier)
                          .setCorridorId(
                            corridor.id,
                            originCity: corridor.fromCity,
                            destinationCity: corridor.toCity,
                          );
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.brandTeal.withValues(alpha: 0.1)
                            : AppColors.bgPrimary,
                        border: Border.all(
                          color: isSelected
                              ? AppColors.brandTeal
                              : AppColors.borderColor,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: EdgeInsets.all(AppLayout.paddingMedium),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${corridor.fromCity} → ${corridor.toCity}',
                                style: AppTextStyles.body1.copyWith(
                                  color: isSelected
                                      ? AppColors.brandTeal
                                      : AppColors.textPrimary,
                                ),
                              ),
                              if (isSelected)
                                Icon(Icons.check_circle,
                                    color: AppColors.brandTeal),
                            ],
                          ),
                          SizedBox(height: 4),
                          Text(
                            '${corridor.distanceKm} km',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => Center(
              child: CircularProgressIndicator(
                color: AppColors.brandTeal,
              ),
            ),
            error: (error, _) => Text(
              'Error loading corridors: $error',
              style: AppTextStyles.body1.copyWith(
                color: AppColors.danger,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCargoStep(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    final cargoTypes = [
      'Grain',
      'Coffee',
      'Livestock',
      'Produce',
      'Beverages',
      'Cement',
      'Khat',
      'Fish',
      'Honey',
      'Cotton'
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderColor),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Step 2: Cargo Details',
            style: AppTextStyles.h3,
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Cargo Type *',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: wizardState.cargoType,
            items: cargoTypes
                .map((type) => DropdownMenuItem(
                      value: type,
                      child: Text(type),
                    ))
                .toList(),
            onChanged: (value) {
              if (value != null) {
                ref
                    .read(postLoadWizardProvider.notifier)
                    .setCargoType(value);
              }
            },
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Weight (kg) *',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          TextField(
            onChanged: (value) {
              final weight = int.tryParse(value) ?? 0;
              ref.read(postLoadWizardProvider.notifier).setWeightKg(weight);
            },
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: 'e.g., 1000',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            style: AppTextStyles.body2,
          ),
        ],
      ),
    );
  }

  Widget _buildPickupStep(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderColor),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Step 3: Pickup & Delivery Schedule',
            style: AppTextStyles.h3,
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Pickup Date *',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: wizardState.pickupDate ?? DateTime.now(),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 90)),
              );
              if (picked != null) {
                ref
                    .read(postLoadWizardProvider.notifier)
                    .setPickupDate(picked);
              }
            },
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.borderColor),
                borderRadius: BorderRadius.circular(8),
              ),
              padding: EdgeInsets.all(AppLayout.paddingMedium),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    wizardState.pickupDate?.toString().split(' ')[0] ??
                        'Select date',
                    style: AppTextStyles.body2,
                  ),
                  Icon(Icons.calendar_today,
                      color: AppColors.brandTeal),
                ],
              ),
            ),
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Delivery Deadline *',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: wizardState.deliveryDeadline ?? 
                    (wizardState.pickupDate?.add(const Duration(days: 1)) ?? DateTime.now()),
                firstDate: wizardState.pickupDate ?? DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 180)),
              );
              if (picked != null) {
                ref
                    .read(postLoadWizardProvider.notifier)
                    .setDeliveryDeadline(picked);
              }
            },
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                  color: wizardState.deliveryDeadline != null && 
                          wizardState.pickupDate != null &&
                          !wizardState.deliveryDeadline!.isAfter(wizardState.pickupDate!)
                      ? AppColors.danger
                      : AppColors.borderColor,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              padding: EdgeInsets.all(AppLayout.paddingMedium),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    wizardState.deliveryDeadline?.toString().split(' ')[0] ??
                        'Select date',
                    style: AppTextStyles.body2.copyWith(
                      color: wizardState.deliveryDeadline != null && 
                              wizardState.pickupDate != null &&
                              !wizardState.deliveryDeadline!.isAfter(wizardState.pickupDate!)
                          ? AppColors.danger
                          : AppColors.textPrimary,
                    ),
                  ),
                  Icon(Icons.calendar_today,
                      color: AppColors.brandTeal),
                ],
              ),
            ),
          ),
          if (wizardState.deliveryDeadline != null && 
              wizardState.pickupDate != null &&
              !wizardState.deliveryDeadline!.isAfter(wizardState.pickupDate!))
            Padding(
              padding: EdgeInsets.only(top: AppLayout.spacingSmall),
              child: Text(
                'Delivery deadline must be after pickup date',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.danger,
                ),
              ),
            ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            'Special Instructions (optional)',
            style: AppTextStyles.body2,
          ),
          SizedBox(height: 8),
          TextField(
            onChanged: (value) {
              ref
                  .read(postLoadWizardProvider.notifier)
                  .setSpecialInstructions(value);
            },
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'e.g., Handle with care, fragile items',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            style: AppTextStyles.body2,
          ),
        ],
      ),
    );
  }

  Widget _buildEstimateStep(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderColor),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Step 4: Review & Submit',
            style: AppTextStyles.h3,
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Container(
            decoration: BoxDecoration(
              color: AppColors.bgPrimary,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderColor),
            ),
            padding: EdgeInsets.all(AppLayout.paddingMedium),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildReviewField('Corridor', wizardState.corridorId ?? '—'),
                _buildReviewField('Cargo Type', wizardState.cargoType ?? '—'),
                _buildReviewField('Weight (kg)', wizardState.weightKg?.toString() ?? '—'),
                _buildReviewField('Pickup Date', wizardState.pickupDate?.toString().split(' ')[0] ?? '—'),
                _buildReviewField('Delivery Deadline', wizardState.deliveryDeadline?.toString().split(' ')[0] ?? '—'),
                if (wizardState.specialInstructions?.isNotEmpty ?? false)
                  _buildReviewField('Special Instructions', wizardState.specialInstructions!),
              ],
            ),
          ),
          if (wizardState.error != null)
            Padding(
              padding: EdgeInsets.only(top: AppLayout.spacingSmall),
              child: Text(
                wizardState.error!,
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.danger,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReviewField(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: AppLayout.spacingSmall),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: AppTextStyles.body2,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepButtons(
    BuildContext context,
    WidgetRef ref,
    PostLoadWizardState wizardState,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        if (wizardState.currentStep > 0)
          ElevatedButton(
            onPressed: () {
              ref.read(postLoadWizardProvider.notifier).previousStep();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.bgSecondary,
              foregroundColor: AppColors.textPrimary,
              padding: EdgeInsets.symmetric(
                horizontal: AppLayout.paddingLarge,
                vertical: AppLayout.paddingMedium,
              ),
            ),
            child: const Text('Back'),
          ),
        if (wizardState.currentStep < 3)
          ElevatedButton(
            onPressed: wizardState.currentStep == 0 && wizardState.corridorId != null
                ? () {
                    ref
                        .read(postLoadWizardProvider.notifier)
                        .nextStep();
                  }
                : wizardState.currentStep == 1 &&
                        wizardState.canProceedToStep3
                    ? () {
                        ref
                            .read(postLoadWizardProvider.notifier)
                            .nextStep();
                      }
                    : wizardState.currentStep == 2 &&
                            wizardState.canProceedToStep4
                        ? () {
                            ref
                                .read(postLoadWizardProvider.notifier)
                                .nextStep();
                          }
                        : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandTeal,
              padding: EdgeInsets.symmetric(
                horizontal: AppLayout.paddingLarge,
                vertical: AppLayout.paddingMedium,
              ),
            ),
            child: Text(
              'Next',
              style: TextStyle(color: Colors.white),
            ),
          )
        else
          ElevatedButton(
            onPressed: wizardState.canSubmit && !wizardState.isSubmitting
                ? () async {
                    final success = await ref
                        .read(postLoadWizardProvider.notifier)
                        .submitLoad();
                    if (success && context.mounted) {
                      ref.read(postLoadWizardProvider.notifier).reset();
                      context.go('/orderer');
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Load posted successfully!'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  }
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandTeal,
              padding: EdgeInsets.symmetric(
                horizontal: AppLayout.paddingLarge,
                vertical: AppLayout.paddingMedium,
              ),
            ),
            child: wizardState.isSubmitting
                ? SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(Colors.white),
                    ),
                  )
                : const Text('Post Load', style: TextStyle(color: Colors.white)),
          ),
      ],
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0:
        return 'Route';
      case 1:
        return 'Cargo';
      case 2:
        return 'Schedule';
      case 3:
        return 'Review';
      default:
        return '';
    }
  }
}

class _StepIndicator extends StatelessWidget {
  final int currentStep;

  const _StepIndicator({required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (int i = 0; i < 4; i++)
          Expanded(
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: i <= currentStep
                        ? AppColors.brandTeal
                        : AppColors.bgSecondary,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.borderColor,
                      width: 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '${i + 1}',
                      style: TextStyle(
                        color: i <= currentStep
                            ? Colors.white
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                if (i < 3)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: i < currentStep
                          ? AppColors.brandTeal
                          : AppColors.borderColor,
                      margin: EdgeInsets.symmetric(
                        horizontal: AppLayout.paddingSmall,
                        vertical: AppLayout.paddingSmall,
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StepListItem extends StatelessWidget {
  final int stepNumber;
  final String title;
  final bool isActive;
  final bool isCompleted;
  final VoidCallback onTap;

  const _StepListItem({
    required this.stepNumber,
    required this.title,
    required this.isActive,
    required this.isCompleted,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: AppLayout.spacingSmall),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: isActive ? AppColors.brandTeal.withValues(alpha: 0.1) : Colors.transparent,
            border: Border.all(
              color: isActive ? AppColors.brandTeal : Colors.transparent,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(6),
          ),
          padding: EdgeInsets.all(AppLayout.paddingSmall),
          child: Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? Colors.green
                      : isActive
                          ? AppColors.brandTeal
                          : AppColors.bgSecondary,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.white, size: 16)
                      : Text(
                          stepNumber.toString(),
                          style: TextStyle(
                            color: isActive ? Colors.white : AppColors.textSecondary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              SizedBox(width: AppLayout.spacingSmall),
              Expanded(
                child: Text(
                  title,
                  style: AppTextStyles.body2.copyWith(
                    color: isActive
                        ? AppColors.brandTeal
                        : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
