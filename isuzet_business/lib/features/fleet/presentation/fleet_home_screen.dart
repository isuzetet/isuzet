import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/constants/amharic_strings.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/core/utils/etb_formatter.dart';
import 'package:isuzet_business/shared/providers/fleet_provider.dart';

class FleetHomeScreen extends ConsumerWidget {
  const FleetHomeScreen({Key? key}) : super(key: key);

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
                AmharicStrings.fleetHome,
                style: AppTextStyles.h1,
              ),
              SizedBox(height: AppLayout.spacingMedium),
              metricsAsync.when(
                data: (metrics) {
                  return _buildKpiCards(context, metrics);
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
                      'Failed to load metrics: $error',
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

  Widget _buildKpiCards(BuildContext context, dynamic metrics) {
    final isMobile = AppLayout.isMobile(context);
    final isTablet = AppLayout.isTablet(context);

    // Responsive grid: mobile=1 col, tablet=2 cols, desktop=4 cols
    int crossAxisCount = 1;
    if (isTablet) crossAxisCount = 2;
    if (AppLayout.isDesktop(context)) crossAxisCount = 4;

    final childAspectRatio = isMobile ? 1.0 : 1.2;

    return GridView.count(
      crossAxisCount: crossAxisCount,
      childAspectRatio: childAspectRatio,
      crossAxisSpacing: AppLayout.spacingMedium,
      mainAxisSpacing: AppLayout.spacingMedium,
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      children: [
        _KpiCard(
          icon: Icons.directions_car,
          title: 'Total Trucks',
          value: metrics.totalTrucks.toString(),
          subtitle: 'In fleet',
          color: AppColors.brandTeal,
        ),
        _KpiCard(
          icon: Icons.location_on,
          title: 'Active Trucks',
          value: metrics.activeTrucks.toString(),
          subtitle: 'On road',
          color: Colors.green,
        ),
        _KpiCard(
          icon: Icons.show_chart,
          title: 'Monthly Revenue',
          value: EtbFormatter.format(metrics.monthlyRevenueEtb),
          subtitle: 'This month',
          color: Colors.blue,
        ),
        _KpiCard(
          icon: Icons.person,
          title: 'Available Drivers',
          value: metrics.availableDrivers.toString(),
          subtitle: 'Ready',
          color: Colors.orange,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String subtitle;
  final Color color;

  const _KpiCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1.5,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: EdgeInsets.all(AppLayout.paddingMedium),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(AppLayout.paddingSmall),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: AppTextStyles.h3.copyWith(
                  color: color,
                ),
              ),
              SizedBox(height: 4),
              Text(
                title,
                style: AppTextStyles.body2,
              ),
              Text(
                subtitle,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
