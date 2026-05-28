import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/core/utils/etb_formatter.dart';
import 'package:isuzet_field/shared/providers/load_provider.dart';
import 'package:isuzet_field/shared/widgets/buttons.dart';

class LoadDetailScreen extends ConsumerStatefulWidget {
  final String loadId;

  const LoadDetailScreen({Key? key, required this.loadId}) : super(key: key);

  @override
  ConsumerState<LoadDetailScreen> createState() => _LoadDetailScreenState();
}

class _LoadDetailScreenState extends ConsumerState<LoadDetailScreen> {
  bool _isAccepting = false;

  void _acceptLoad() async {
    setState(() {
      _isAccepting = true;
    });

    try {
      final response = await ref.read(
        acceptLoadProvider(widget.loadId).future,
      );

      if (!mounted) return;

      // Show success snackbar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('ዋቅ ተቀበል'),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );

      // Navigate to trip dashboard
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        context.go('/trip/${response.tripId}');
      }
    } on ValidationException catch (e) {
      setState(() {
        _isAccepting = false;
      });
      _showErrorSnackbar(e.message);
    } catch (e) {
      setState(() {
        _isAccepting = false;
      });
      _showErrorSnackbar('Unknown error occurred');
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
    final loadDetail = ref.watch(loadDetailProvider(widget.loadId));

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('ዋቅ ዝርዝር'),
      ),
      body: loadDetail.when(
        data: (load) => SingleChildScrollView(
          child: Column(
            children: [
              // Header card
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderDefault),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ከ',
                                style: AppTextStyles.bodySmall
                                    .copyWith(color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                load.origin,
                                style: AppTextStyles.headingSmall,
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward,
                          color: AppColors.textSecondary,
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'ወደ',
                                style: AppTextStyles.bodySmall
                                    .copyWith(color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                load.destination,
                                style: AppTextStyles.headingSmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Details grid
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    _DetailRow(
                      label: 'ርቀት',
                      value: '${load.distance} km',
                      icon: Icons.straighten,
                    ),
                    const SizedBox(height: 12),
                    _DetailRow(
                      label: 'ክብደት',
                      value: '${load.weight.toStringAsFixed(0)} kg',
                      icon: Icons.scale,
                    ),
                    const SizedBox(height: 12),
                    _DetailRow(
                      label: 'ተሽከርካሪ',
                      value: load.vehicleType,
                      icon: Icons.local_shipping,
                    ),
                    const SizedBox(height: 12),
                    _DetailRow(
                      label: 'መሆጃ ጊዜ',
                      value: '${load.pickupTime.hour}:${load.pickupTime.minute.toString().padLeft(2, '0')}',
                      icon: Icons.access_time,
                    ),
                    if (load.tags != null && load.tags!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _DetailRow(
                        label: 'መለያ',
                        value: load.tags!.join(', '),
                        icon: Icons.label,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Price section
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.brandTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.brandTeal),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ዋጋ ቅሪት',
                          style: AppTextStyles.bodySmall
                              .copyWith(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          EtbFormatter.format(
                            load.offeredPrice.toInt(),
                          ),
                          style: AppTextStyles.headingMedium
                              .copyWith(color: AppColors.brandTeal),
                        ),
                      ],
                    ),
                    if (load.agentName != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'የተሞግተዋት ከ',
                            style: AppTextStyles.bodySmall
                                .copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (load.agentRating != null) ...[
                                Icon(
                                  Icons.star,
                                  size: 16,
                                  color: AppColors.warning,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  load.agentRating!.toStringAsFixed(1),
                                  style: AppTextStyles.bodySemibold,
                                ),
                                const SizedBox(width: 8),
                              ],
                              Text(
                                load.agentName!,
                                style: AppTextStyles.bodySemibold,
                              ),
                            ],
                          ),
                        ],
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Accept button (or expired message)
              if (load.hasExpired)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.danger),
                  ),
                  child: Center(
                    child: Text(
                      'ዋጋ ጊዜውሰሰ',
                      style: AppTextStyles.bodySemibold
                          .copyWith(color: AppColors.danger),
                    ),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: PrimaryButton(
                    label: 'ዋቅ ተቀበል',
                    onPressed: _acceptLoad,
                    isLoading: _isAccepting,
                  ),
                ),

              const SizedBox(height: 24),
            ],
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: AppColors.danger,
              ),
              const SizedBox(height: 16),
              Text(
                'ስህተት ተሆነ',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodySmall
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(loadDetailProvider(widget.loadId));
                },
                child: const Text('ዳግም ሞክር'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _DetailRow({
    Key? key,
    required this.label,
    required this.value,
    required this.icon,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.brandTeal, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTextStyles.bodyXSmall
                    .copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: AppTextStyles.bodySemibold,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
