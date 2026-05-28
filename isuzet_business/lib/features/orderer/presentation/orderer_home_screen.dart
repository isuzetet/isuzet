import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/core/utils/etb_formatter.dart';
import 'package:isuzet_business/shared/providers/orderer_provider.dart';

class OrdererHomeScreen extends ConsumerWidget {
  const OrdererHomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metricsAsync = ref.watch(ordererMetricsProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(AppLayout.paddingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'My Loads',
                    style: AppTextStyles.h1,
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      context.go('/orderer/post');
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Post Load'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandTeal,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingMedium),
              metricsAsync.when(
                data: (metrics) {
                  return _buildMetrics(context, metrics);
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

  Widget _buildMetrics(BuildContext context, dynamic metrics) {
    final isMobile = AppLayout.isMobile(context);
    final isTablet = AppLayout.isTablet(context);

    int crossAxisCount = 1;
    if (isTablet) crossAxisCount = 2;
    if (AppLayout.isDesktop(context)) crossAxisCount = 3;

    double childAspectRatio = isMobile ? 1.0 : 1.2;

    return GridView.count(
      crossAxisCount: crossAxisCount,
      childAspectRatio: childAspectRatio,
      crossAxisSpacing: AppLayout.spacingMedium,
      mainAxisSpacing: AppLayout.spacingMedium,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _MetricCard(
          icon: Icons.local_shipping,
          title: 'Total Loads Posted',
          value: metrics.totalLoads.toString(),
          color: Colors.blue,
        ),
        _MetricCard(
          icon: Icons.pending_actions,
          title: 'Active Loads',
          value: metrics.activeLoads.toString(),
          color: Colors.orange,
        ),
        _MetricCard(
          icon: Icons.attach_money,
          title: 'Total Value',
          value: EtbFormatter.format(metrics.totalValueEtb),
          color: Colors.green,
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;

  const _MetricCard({
    required this.icon,
    required this.title,
    required this.value,
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
            ],
          ),
        ],
      ),
    );
  }
}
