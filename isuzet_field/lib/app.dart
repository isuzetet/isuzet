import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/features/auth/presentation/splash_screen.dart';
import 'package:isuzet_field/features/auth/presentation/onboarding_screen.dart';
import 'package:isuzet_field/features/auth/presentation/register_screen.dart';
import 'package:isuzet_field/features/auth/presentation/otp_screen.dart';
import 'package:isuzet_field/features/auth/presentation/kyc_upload_screen.dart';
import 'package:isuzet_field/features/home/presentation/home_screen.dart';
import 'package:isuzet_field/features/loads/presentation/load_detail_screen.dart';
import 'package:isuzet_field/features/trips/presentation/trip_dashboard_screen.dart';
import 'package:isuzet_field/features/trips/presentation/delivery_confirm_screen.dart';
import 'package:isuzet_field/features/dashboard/presentation/earnings_screen.dart';
import 'package:isuzet_field/features/dashboard/presentation/incident_report_screen.dart';
import 'package:isuzet_field/features/profile/presentation/profile_screen.dart';
import 'package:isuzet_field/shared/providers/offline_sync_provider.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: '/auth/kyc',
        builder: (context, state) => const KycUploadScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const DriverProfileScreen(),
      ),
      GoRoute(
        path: '/load/:id',
        builder: (context, state) {
          final loadId = state.pathParameters['id'] ?? '';
          return LoadDetailScreen(loadId: loadId);
        },
      ),
      GoRoute(
        path: '/trip/:id',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          return TripDashboardScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/trip/:id/deliver',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          final extra = state.extra as Map<String, dynamic>? ?? {};
          final stopId = extra['stopId'] as String? ?? '';
          final address = extra['address'] as String? ?? 'Delivery Location';
          
          return DeliveryConfirmScreen(
            tripId: tripId,
            stopId: stopId,
            address: address,
          );
        },
      ),
      GoRoute(
        path: '/incident/report',
        builder: (context, state) {
          final tripId = state.uri.queryParameters['tripId'] ?? '';
          return IncidentReportScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/earnings',
        builder: (context, state) => const EarningsScreen(),
      ),
    ],
    redirect: (context, state) {
      // If already on auth pages, let them through
      if (state.uri.path.startsWith('/auth') || state.uri.path.startsWith('/splash') || state.uri.path.startsWith('/onboarding')) {
        return null;
      }

      return null;
    },
  );
});

class IsuzApplication extends ConsumerWidget {
  const IsuzApplication({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Wire offline sync watcher — triggers flush when connectivity is restored
    ref.watch(offlineSyncWatcherProvider);

    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'ISUZET',
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bgPrimary,
        cardColor: AppColors.bgCard,
        primaryColor: AppColors.brandTeal,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.brandTeal,
          secondary: AppColors.brandAmber,
          surface: AppColors.bgSurface,
          error: AppColors.danger,
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.bgInput,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderDefault),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderFocus, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
      ),
    );
  }
}
