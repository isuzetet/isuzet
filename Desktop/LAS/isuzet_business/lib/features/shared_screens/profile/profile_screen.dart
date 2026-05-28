import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/config/app_config.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/network/api_client.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/shared/providers/auth_provider.dart';

// Provider that fetches /identity/me
final _meProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.dio.get('${AppConfig.identityBase}/identity/me');
  final data = res.data['data'] ?? res.data;
  return Map<String, dynamic>.from(data as Map);
});

// Provider that fetches trust breakdown
final _trustProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.dio.get('${AppConfig.identityBase}/identity/trust-breakdown');
  final data = res.data['data'] ?? res.data;
  return Map<String, dynamic>.from(data as Map);
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isMobile = AppLayout.isMobile(context);
    final meAsync = ref.watch(_meProvider);
    final trustAsync = ref.watch(_trustProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgSecondary,
        title: Text('Profile', style: AppTextStyles.h3),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_meProvider);
          ref.invalidate(_trustProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: EdgeInsets.all(
              isMobile ? AppLayout.paddingMedium : AppLayout.paddingLarge,
            ),
            child: meAsync.when(
              data: (profile) {
                final role = profile['role'] as String? ?? '';
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Account Information', style: AppTextStyles.h2),
                    SizedBox(height: AppLayout.spacingMedium),
                    _CommonFields(profile: profile),
                    SizedBox(height: AppLayout.spacingLarge),
                    if (role == 'FLEET_OWNER') ...[
                      Text('Fleet Owner Details', style: AppTextStyles.h3),
                      SizedBox(height: AppLayout.spacingMedium),
                      _FleetOwnerFields(profile: profile),
                    ] else if (role == 'ORDERER') ...[
                      Text('Orderer Details', style: AppTextStyles.h3),
                      SizedBox(height: AppLayout.spacingMedium),
                      _OrdererFields(profile: profile, ref: ref),
                    ],
                    SizedBox(height: AppLayout.spacingLarge),
                    // Trust score
                    trustAsync.when(
                      data: (trust) => _TrustScoreCard(trust: trust),
                      loading: () => const _SkeletonCard(height: 80),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                    SizedBox(height: AppLayout.spacingLarge),
                    _buildActionButtons(context, ref),
                  ],
                );
              },
              loading: () => Column(
                children: [
                  const _SkeletonCard(height: 120),
                  SizedBox(height: AppLayout.spacingMedium),
                  const _SkeletonCard(height: 160),
                ],
              ),
              error: (err, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                    SizedBox(height: AppLayout.spacingMedium),
                    Text('Could not load profile', style: AppTextStyles.body1),
                    Text(err.toString(),
                      style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center),
                    SizedBox(height: AppLayout.spacingMedium),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(_meProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed: () async {
            await ref.read(authServiceProvider).logout();
            if (context.mounted) context.go('/splash');
          },
          icon: const Icon(Icons.logout, color: AppColors.danger),
          label: const Text('Logout', style: TextStyle(color: AppColors.danger)),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger,
            side: const BorderSide(color: AppColors.danger),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ],
    );
  }
}

class _CommonFields extends StatelessWidget {
  final Map<String, dynamic> profile;
  const _CommonFields({required this.profile});

  @override
  Widget build(BuildContext context) {
    final name = profile['fullName'] as String? ?? profile['full_name'] as String? ?? '--';
    final phone = _decryptedPhone(profile);
    final fleetOwner = profile['fleetOwner'] as Map? ?? profile['fleet_owner'] as Map?;
    final companyName = fleetOwner?['companyName'] as String?
        ?? fleetOwner?['company_name'] as String?
        ?? '--';
    final tinNumber = fleetOwner?['tinNumber'] as String?
        ?? fleetOwner?['tin_number'] as String?
        ?? '--';

    return _InfoCard(fields: [
      _Field('Full Name', name),
      _Field('Company Name', companyName),
      _Field('TIN', tinNumber),
      _Field('Phone', phone),
      _Field('Country', 'Ethiopia'),
    ]);
  }

  String _decryptedPhone(Map<String, dynamic> profile) {
    // Phone may be PII-encrypted in the response; backend decrypts it for /me
    return profile['phone'] as String? ?? '--';
  }
}

class _FleetOwnerFields extends StatelessWidget {
  final Map<String, dynamic> profile;
  const _FleetOwnerFields({required this.profile});

  @override
  Widget build(BuildContext context) {
    final fo = profile['fleetOwner'] as Map? ?? profile['fleet_owner'] as Map? ?? {};
    final regNum = fo['businessRegistrationNumber'] as String?
        ?? fo['business_registration_number'] as String?
        ?? '--';
    final reliabilityScore = fo['paymentReliabilityScore'] as num?
        ?? fo['payment_reliability_score'] as num?;
    final reliabilityStr = reliabilityScore != null
        ? '${reliabilityScore.toStringAsFixed(1)}/100'
        : '--';
    final trucks = (fo['trucks'] as List?)?.length ?? fo['fleetSize'] as int? ?? 0;
    final tripsCompleted = fo['totalTripsCompleted'] as int? ?? fo['total_trips_completed'] as int? ?? 0;

    return _InfoCard(fields: [
      _Field('Business Registration', regNum),
      _Field('Payment Reliability', reliabilityStr, isBadge: true),
      _Field('Registered Trucks', '$trucks'),
      _Field('Total Deliveries', '$tripsCompleted'),
    ]);
  }
}

class _OrdererFields extends ConsumerWidget {
  final Map<String, dynamic> profile;
  final WidgetRef ref;
  const _OrdererFields({required this.profile, required this.ref});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderer = profile['orderer'] as Map? ?? {};
    final reliabilityScore = orderer['paymentReliabilityScore'] as num?
        ?? orderer['payment_reliability_score'] as num?;
    final reliabilityStr = reliabilityScore != null
        ? '${reliabilityScore.toStringAsFixed(1)}/100'
        : '--';
    final totalOrders = orderer['totalLoadsPosted'] as int?
        ?? orderer['total_loads_posted'] as int?
        ?? 0;

    return _InfoCard(fields: [
      _Field('Payment Reliability', reliabilityStr, isBadge: true),
      _Field('Total Orders Posted', '$totalOrders'),
    ]);
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
      padding: EdgeInsets.all(AppLayout.paddingMedium),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trust Score', style: AppTextStyles.subtitle1.copyWith(color: AppColors.textSecondary)),
          SizedBox(height: AppLayout.spacingSmall),
          Row(
            children: [
              Text(score.toStringAsFixed(1),
                style: AppTextStyles.h2.copyWith(color: AppColors.brandTeal)),
              const SizedBox(width: 6),
              Text('/100', style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.brandAmber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Tier $tier',
                  style: AppTextStyles.subtitle2.copyWith(
                    color: AppColors.brandAmber, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          SizedBox(height: AppLayout.spacingSmall),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: score / 100,
              backgroundColor: AppColors.bgPrimary,
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

// ── Shared reusable widgets ──────────────────────────────────

class _InfoCard extends StatelessWidget {
  final List<_Field> fields;
  const _InfoCard({required this.fields});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(AppLayout.paddingMedium),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: fields.map((f) => _FieldRow(field: f)).toList(),
      ),
    );
  }
}

class _Field {
  final String label;
  final String value;
  final bool isBadge;
  const _Field(this.label, this.value, {this.isBadge = false});
}

class _FieldRow extends StatelessWidget {
  final _Field field;
  const _FieldRow({required this.field});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: AppLayout.spacingSmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(field.label, style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          if (field.isBadge)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.brandTeal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(field.value,
                style: AppTextStyles.body1.copyWith(
                  color: AppColors.brandTeal, fontWeight: FontWeight.w600)),
            )
          else
            Text(field.value, style: AppTextStyles.body1),
        ],
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  final double height;
  const _SkeletonCard({required this.height});

  @override
  Widget build(BuildContext context) => Container(
    height: height,
    decoration: BoxDecoration(
      color: AppColors.bgSecondary,
      borderRadius: BorderRadius.circular(12),
    ),
  );
}
