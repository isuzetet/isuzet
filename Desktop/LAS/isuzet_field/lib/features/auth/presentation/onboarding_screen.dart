import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/shared/widgets/buttons.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _currentPage = 0;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () => context.go('/auth/register'),
            child: const Text('Skip'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (page) {
                setState(() {
                  _currentPage = page;
                });
              },
              children: [
                _buildCard(
                  icon: Icons.local_shipping,
                  titleAm: 'ጭነት ፈልግ',
                  titleEn: 'Find loads without brokers',
                  description:
                      'ጭነት ቅድመ-ዝርዝር ፍለጋ እና ኦファር ሪህስ ብዮ ተቀበል።',
                ),
                _buildCard(
                  icon: Icons.lock,
                  titleAm: 'ክፍያ ዋስትና',
                  titleEn: 'Payments secured in escrow',
                  description:
                      'ሁሉም ክፍያ በ escrow ተከላከል። ምንም ሪስክ የለም።',
                ),
                _buildCard(
                  icon: Icons.star,
                  titleAm: 'ደረጃ ገንቢ',
                  titleEn: 'Build your trust rating',
                  description:
                      'በእያንዳንዱ ግዞ ደረጃ አድስ። ተወዳጅ ሹፌር ሁን።',
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Dots
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    3,
                    (index) => Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: index == _currentPage
                            ? AppColors.brandTeal
                            : AppColors.borderDefault,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Button
                if (_currentPage == 2)
                  PrimaryButton(
                    label: 'ጀምር · Get Started',
                    onPressed: () => context.go('/auth/register'),
                  )
                else
                  PrimaryButton(
                    label: 'Next',
                    onPressed: () {
                      _pageController.nextPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required IconData icon,
    required String titleAm,
    required String titleEn,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: AppColors.brandTeal),
          const SizedBox(height: 24),
          Text(
            titleAm,
            style: AppTextStyles.headingMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            titleEn,
            style: AppTextStyles.bodyLarge.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            description,
            style: AppTextStyles.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
