import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/features/dashboard/data/dashboard_provider.dart';

class TrustScoreWidget extends ConsumerWidget {
  /// Component names for the 6-part trust breakdown (null-safe)
  static const List<String> componentNames = [
    'Safety',
    'Reliability',
    'Communication',
    'Integrity',
    'Professionalism',
    'Vehicle',
  ];

  const TrustScoreWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trustAsync = ref.watch(trustBreakdownProvider);

    return trustAsync.when(
      data: (trustBreakdown) {
        // CRITICAL: Get component scores with null safety (defaults to 0.0)
        final scores = trustBreakdown.getComponentScores();
        final overallScore = trustBreakdown.overallTrustScore ?? 0.0;

        return _buildTrustIndicator(scores, overallScore);
      },
      loading: () => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderDefault),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 60,
              height: 60,
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.brandTeal),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Loading trust score...',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
      error: (error, st) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.danger),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.warning_amber,
              color: AppColors.danger,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              'Could not load trust score',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.danger,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrustIndicator(List<double> scores, double overallScore) {
    // Clamp all scores to 0-100 range for display
    final clampedScores =
        scores.map((s) => s.clamp(0.0, 100.0)).toList();
    final clampedOverall = overallScore.clamp(0.0, 100.0);

    // Determine color based on overall score
    Color scoreColor;
    if (clampedOverall >= 75) {
      scoreColor = AppColors.statusDelivered; // Green
    } else if (clampedOverall >= 50) {
      scoreColor = AppColors.statusOpen; // Amber
    } else {
      scoreColor = AppColors.danger; // Red
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border.all(color: scoreColor.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overall score circle
          Center(
            child: SizedBox(
              width: 120,
              height: 120,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Background circle
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: scoreColor.withOpacity(0.2),
                        width: 2,
                      ),
                    ),
                  ),
                  // Progress arc (simplified as circular progress)
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: CircularProgressIndicator(
                      value: clampedOverall / 100.0,
                      valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                      backgroundColor: scoreColor.withOpacity(0.1),
                      strokeWidth: 6,
                    ),
                  ),
                  // Score text in center
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        clampedOverall.toStringAsFixed(0),
                        style: AppTextStyles.headingLarge.copyWith(
                          color: scoreColor,
                        ),
                      ),
                      Text(
                        'Trust Score',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Component breakdown - 6 scores (all null-safe)
          Text(
            'Breakdown',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          ...List.generate(componentNames.length, (index) {
            final score = clampedScores[index];
            final name = componentNames[index];

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        name,
                        style: AppTextStyles.bodySmall,
                      ),
                      Text(
                        '${score.toStringAsFixed(0)}%',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: score / 100.0,
                      minHeight: 6,
                      backgroundColor: AppColors.borderDefault,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _getScoreColor(score),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  /// Get color based on individual component score
  Color _getScoreColor(double score) {
    if (score >= 75) {
      return AppColors.statusDelivered;
    } else if (score >= 50) {
      return AppColors.statusOpen;
    } else {
      return AppColors.danger;
    }
  }
}
