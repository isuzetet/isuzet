import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/core/utils/etb_formatter.dart';
import 'package:isuzet_business/shared/providers/fleet_provider.dart';

class FinanceScreen extends ConsumerWidget {
  const FinanceScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metricsAsync = ref.watch(fleetMetricsProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(AppLayout.paddingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Finance',
                style: AppTextStyles.h1,
              ),
              SizedBox(height: AppLayout.spacingMedium),
              metricsAsync.when(
                data: (metrics) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _FinanceCard(
                        title: 'This Month\'s Revenue',
                        amount: metrics.monthlyRevenueEtb.toInt(),
                        icon: Icons.trending_up,
                        color: Colors.green,
                      ),
                      SizedBox(height: AppLayout.spacingMedium),
                      _FinanceDetailsCard(
                        metrics: metrics,
                      ),
                    ],
                  );
                },
                loading: () {
                  return Center(
                    child: CircularProgressIndicator(
                      color: AppColors.brandTeal,
                    ),
                  );
                },
                error: (error, stack) {
                  return Center(
                    child: Text(
                      'Failed to load finance data: $error',
                      style: AppTextStyles.body1.copyWith(
                        color: AppColors.danger,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FinanceCard extends StatelessWidget {
  final String title;
  final int amount; // in ETB
  final IconData icon;
  final Color color;

  const _FinanceCard({
    required this.title,
    required this.amount,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1.5,
        ),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: EdgeInsets.all(AppLayout.paddingMedium),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 28,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    EtbFormatter.format(amount.toDouble()),
                    style: AppTextStyles.h2.copyWith(
                      color: color,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'ETB',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: AppLayout.spacingMedium),
          Text(
            title,
            style: AppTextStyles.body1,
          ),
        ],
      ),
    );
  }
}

class _FinanceDetailsCard extends StatelessWidget {
  final dynamic metrics;

  const _FinanceDetailsCard({
    required this.metrics,
  });

  @override
  Widget build(BuildContext context) {
    final breakdownItems = [
      _BreakdownItem(
        label: 'Active Trucks',
        value: metrics.activeTrucks.toString(),
        color: Colors.blue,
      ),
      _BreakdownItem(
        label: 'Available Drivers',
        value: metrics.availableDrivers.toString(),
        color: Colors.orange,
      ),
      _BreakdownItem(
        label: 'Fleet Size',
        value: metrics.totalTrucks.toString(),
        color: Colors.teal,
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.borderColor,
          width: 1,
        ),
      ),
      padding: EdgeInsets.all(AppLayout.paddingLarge),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Fleet Overview',
            style: AppTextStyles.h3,
          ),
          SizedBox(height: AppLayout.spacingMedium),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppLayout.spacingMedium,
            crossAxisSpacing: AppLayout.spacingMedium,
            children: breakdownItems
                .map((item) => _BreakdownCard(item))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _BreakdownItem {
  final String label;
  final String value;
  final Color color;

  _BreakdownItem({
    required this.label,
    required this.value,
    required this.color,
  });
}

class _BreakdownCard extends StatelessWidget {
  final _BreakdownItem item;

  const _BreakdownCard(this.item);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgPrimary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: item.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      padding: EdgeInsets.all(AppLayout.paddingSmall),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            item.value,
            style: AppTextStyles.h3.copyWith(
              color: item.color,
            ),
          ),
          SizedBox(height: 4),
          Text(
            item.label,
            style: AppTextStyles.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
