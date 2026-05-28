import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/utils/etb_formatter.dart';
import 'package:isuzet_field/features/dashboard/data/dashboard_provider.dart';

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earningsAsync = ref.watch(earningsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings'),
        elevation: 0,
        backgroundColor: AppColors.bgPrimary,
      ),
      backgroundColor: AppColors.bgPrimary,
      body: earningsAsync.when(
        data: (earnings) => _buildEarningsContent(context, earnings),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.brandTeal),
        ),
        error: (error, st) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: AppColors.danger,
              ),
              const SizedBox(height: 16),
              Text(
                'Failed to load earnings',
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEarningsContent(BuildContext context, earnings) {
    final totalFormatted = EtbFormatter.format(earnings.totalEarnings.toInt());
    final weeklyFormatted = EtbFormatter.format(earnings.weeklyEarnings.toInt());
    final monthlyFormatted = EtbFormatter.format(earnings.monthlyEarnings.toInt());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Total earnings card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.brandTeal.withOpacity(0.1),
              border: Border.all(color: AppColors.brandTeal),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Earnings',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  totalFormatted,
                  style: AppTextStyles.headingLarge.copyWith(
                    color: AppColors.brandTeal,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${earnings.totalTrips} trips completed',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Weekly and monthly breakdown
          Row(
            children: [
              Expanded(
                child: _buildEarningsCard(
                  label: 'This Week',
                  amount: weeklyFormatted,
                  trips: earnings.thisWeekTrips,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildEarningsCard(
                  label: 'This Month',
                  amount: monthlyFormatted,
                  trips: earnings.thisMonthTrips,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Last updated
          Center(
            child: Text(
              'Last updated: ${earnings.lastEarningsUpdate.toString().split('.')[0]}',
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEarningsCard({
    required String label,
    required String amount,
    required int trips,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.borderDefault),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            amount,
            style: AppTextStyles.headingSmall.copyWith(
              color: AppColors.statusDelivered,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$trips trips',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
