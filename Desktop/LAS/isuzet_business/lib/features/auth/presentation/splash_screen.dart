import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/shared/providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..forward();

    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    // Give splash time to display (minimum 2 seconds)
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    final authService = ref.read(authServiceProvider);
    final isAuthenticated = await authService.isAuthenticated();

    if (!mounted) return;

    if (!isAuthenticated) {
      // No auth → register
      context.go('/auth/register');
    } else {
      // Has auth → check role and redirect
      final role = await authService.getCachedUserRole();

      if (!mounted) return;

      if (role == 'FLEET_OWNER' || role == 'FLEET_MANAGER') {
        context.go('/fleet');
      } else {
        // Unknown role → register
        context.go('/auth/register');
      }
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ScaleTransition(
              scale: Tween<double>(begin: 0.5, end: 1.0).animate(
                CurvedAnimation(parent: _animationController, curve: Curves.elasticOut),
              ),
              child: Text(
                'ISUZET',
                style: AppTextStyles.h1.copyWith(
                  color: AppColors.brandTeal,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Business',
              style: AppTextStyles.body1.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.brandTeal,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
