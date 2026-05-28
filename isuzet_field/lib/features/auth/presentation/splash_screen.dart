import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/constants/amharic_strings.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateAfterDelay();
  }

  Future<void> _navigateAfterDelay() async {
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    // Check if user has tokens
    final accessToken = await SecureStorage.getAccessToken();

    if (accessToken != null) {
      // User is logged in
      context.go('/home');
    } else {
      // User is not logged in
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              Am.appName,
              style: AppTextStyles.headingLarge.copyWith(
                color: AppColors.brandTeal,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'የጭነት አቀናባሪ',
              style: AppTextStyles.bodyLarge.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Freight Organizer',
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
