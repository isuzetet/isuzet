import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';

class AgentPostLoadScreen extends ConsumerStatefulWidget {
  const AgentPostLoadScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _AgentPostLoadScreenState();
}

class _AgentPostLoadScreenState extends ConsumerState<AgentPostLoadScreen> {
  // Form currently disabled pending backend integration
  // All fields and submission logic preserved in git history
  // See KNOWN_DEBT.md for backend requirements

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post Load for Client'),
        backgroundColor: AppColors.bgCard,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderDefault),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.schedule,
                      color: AppColors.brandTeal,
                      size: 48,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Agent Load Posting',
                      style: AppTextStyles.headingMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Coming Soon',
                      style: AppTextStyles.bodyLarge.copyWith(
                        color: AppColors.brandTeal,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'This feature is being built and will be available shortly. Backend integration is in progress.',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'ለወኪሎች ጭነት መለጠፍ',
                      style: AppTextStyles.headingMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'በቅርቡ ይገኛል',
                      style: AppTextStyles.bodyLarge.copyWith(
                        color: AppColors.brandTeal,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'ይህ ባህርይ ተገንቢተ ይገኛል እና በቅርቡ ይገኛል። ጀርባዊ ውህደት በዚህ ጊዜ ውስጥ ነው።',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandTeal,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () {
                          context.go('/agent');
                        },
                        child: const Text(
                          'Back to Dashboard',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
