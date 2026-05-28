import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/features/auth/data/auth_service.dart';

final _profileProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.dio.get('${AppConfig.identityBase}/identity/me');
  final data = res.data['data'] ?? res.data;
  return Map<String, dynamic>.from(data as Map);
});

final _trustBreakdownProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.dio.get('${AppConfig.identityBase}/identity/trust-breakdown');
  final data = res.data['data'] ?? res.data;
  return Map<String, dynamic>.from(data as Map);
});

class DriverProfileScreen extends ConsumerWidget {
  const DriverProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(_profileProvider);
    final trustAsync = ref.watch(_trustBreakdownProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        title: Text('Profile', style: AppTextStyles.headingSmall),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_profileProvider);
          ref.invalidate(_trustBreakdownProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile header
              profileAsync.when(
                data: (profile) => _ProfileHeader(profile: profile),
                loading: () => const _ProfileHeaderSkeleton(),
                error: (_, __) => const _ProfileHeaderError(),
              ),
              const SizedBox(height: 20),

              // Trust score card
              trustAsync.when(
                data: (trust) => _TrustScoreCard(trust: trust),
                loading: () => const _TrustScoreSkeleton(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 20),

              // KYC status
              profileAsync.when(
                data: (profile) => _KycStatusCard(profile: profile),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 32),

              // Logout
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await AuthService.logout();
                    if (context.mounted) context.go('/splash');
                  },
                  icon: const Icon(Icons.logout, color: AppColors.danger),
                  label: const Text('Logout', style: TextStyle(color: AppColors.danger)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.danger),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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

class _ProfileHeader extends StatelessWidget {
  final Map<String, dynamic> profile;
  const _ProfileHeader({required this.profile});

  @override
  Widget build(BuildContext context) {
    final name = profile['fullName'] as String? ?? profile['full_name'] as String? ?? '--';
    final phone = profile['phone'] as String? ?? '--';
    final role = profile['role'] as String? ?? '--';
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: AppColors.brandTeal.withOpacity(0.2),
            child: Text(
              initials,
              style: AppTextStyles.headingMedium.copyWith(color: AppColors.brandTeal),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.headingSmall),
                const SizedBox(height: 4),
                Text(phone, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.brandTeal.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    role,
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.brandTeal, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TrustScoreCard extends StatelessWidget {
  final Map<String, dynamic> trust;
  const _TrustScoreCard({required this.trust});

  @override
  Widget build(BuildContext context) {
    final score = (trust['overallScore'] as num? ?? trust['score'] as num? ?? 0).toDouble();
    final tier = trust['trustTier'] as int? ?? trust['tier'] as int? ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trust Score', style: AppTextStyles.labelLarge.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                score.toStringAsFixed(1),
                style: AppTextStyles.headingLarge.copyWith(color: AppColors.brandTeal),
              ),
              const SizedBox(width: 8),
              Text('/100', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.brandAmber.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Tier $tier',
                  style: AppTextStyles.labelLarge.copyWith(color: AppColors.brandAmber, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: score / 100,
              backgroundColor: AppColors.borderDefault,
              valueColor: AlwaysStoppedAnimation<Color>(
                score >= 70 ? AppColors.success : score >= 40 ? AppColors.brandAmber : AppColors.danger,
              ),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _KycStatusCard extends StatelessWidget {
  final Map<String, dynamic> profile;
  const _KycStatusCard({required this.profile});

  @override
  Widget build(BuildContext context) {
    final kycTier = profile['kycTier'] as int? ?? profile['kyc_tier'] as int? ?? 0;
    final status = profile['status'] as String? ?? 'PENDING_KYC';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          Icon(
            kycTier >= 1 ? Icons.verified_user : Icons.pending,
            color: kycTier >= 1 ? AppColors.success : AppColors.brandAmber,
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('KYC Status', style: AppTextStyles.bodyMedium),
              Text(
                kycTier >= 1 ? 'Verified (Tier $kycTier)' : status,
                style: AppTextStyles.bodySmall.copyWith(
                  color: kycTier >= 1 ? AppColors.success : AppColors.brandAmber,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileHeaderSkeleton extends StatelessWidget {
  const _ProfileHeaderSkeleton();
  @override
  Widget build(BuildContext context) => Container(
    height: 100,
    decoration: BoxDecoration(
      color: AppColors.bgCard,
      borderRadius: BorderRadius.circular(16),
    ),
  );
}

class _ProfileHeaderError extends StatelessWidget {
  const _ProfileHeaderError();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.bgCard,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Text('Could not load profile. Pull to refresh.',
      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
  );
}

class _TrustScoreSkeleton extends StatelessWidget {
  const _TrustScoreSkeleton();
  @override
  Widget build(BuildContext context) => Container(
    height: 80,
    decoration: BoxDecoration(
      color: AppColors.bgCard,
      borderRadius: BorderRadius.circular(16),
    ),
  );
}
