import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/features/agent/data/agent_provider.dart';

class AgentDashboardScreen extends ConsumerWidget {
  const AgentDashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(agentProfileProvider);
    final summaryAsync = ref.watch(agentLoadSummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Agent Dashboard'),
        backgroundColor: AppColors.bgCard,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile section
            profileAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.brandTeal),
            ),
            error: (err, stack) => Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                border: Border.all(color: AppColors.warning),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Failed to load profile: $err',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.warning),
              ),
            ),
            data: (profile) => _buildProfileCard(context, profile),
          ),
            const SizedBox(height: 16),
            // Summary section
            summaryAsync.when(
              loading: () => const CircularProgressIndicator(color: AppColors.brandTeal),
              error: (err, stack) => Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.1),
                  border: Border.all(color: AppColors.warning),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Failed to load summary: $err',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.warning),
                ),
              ),
              data: (summary) => _buildLoadSummary(context, summary),
            ),
            const SizedBox(height: 24),
            // Action buttons
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard(BuildContext context, dynamic profile) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Agent Profile',
            style: AppTextStyles.headingMedium,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Name', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text(profile.name, style: AppTextStyles.bodyMedium),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Region', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text(profile.region, style: AppTextStyles.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Clients', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('${profile.clientsManaged}', style: AppTextStyles.bodyMedium),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Commission', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('${profile.commissionRate}%', style: AppTextStyles.headingMedium.copyWith(color: AppColors.success)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLoadSummary(BuildContext context, dynamic summary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'This Month',
            style: AppTextStyles.headingMedium,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Total Loads', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('${summary.totalLoadsThisMonth}', style: AppTextStyles.headingMedium),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Successful', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('${summary.successfulLoads}', style: AppTextStyles.headingMedium.copyWith(color: AppColors.success)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pending', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                    Text('${summary.pendingLoads}', style: AppTextStyles.headingMedium.copyWith(color: AppColors.warning)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.brandTeal.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Commission Earned', style: AppTextStyles.bodyMedium),
                Text(
                  '${summary.currencyCode} ${summary.totalCommissionThisMonth.toStringAsFixed(2)}',
                  style: AppTextStyles.headingMedium.copyWith(color: AppColors.brandTeal),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandTeal,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              context.push('/agent/post-load');
            },
            child: const Text(
              'Post Load for Client',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.brandTeal),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              context.push('/agent/clients');
            },
            child: const Text(
              'Manage Clients',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.brandTeal),
            ),
          ),
        ),
      ],
    );
  }
}
