import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:isuzet_business/features/auth/presentation/splash_screen.dart';
import 'package:isuzet_business/features/auth/presentation/register_screen.dart';
import 'package:isuzet_business/features/auth/presentation/otp_screen.dart';
import 'package:isuzet_business/features/auth/presentation/kyc_upload_screen.dart';
import 'package:isuzet_business/features/fleet/presentation/fleet_home_screen.dart';
import 'package:isuzet_business/features/fleet/presentation/trucks_screen.dart';
import 'package:isuzet_business/features/fleet/presentation/drivers_screen.dart';
import 'package:isuzet_business/features/fleet/presentation/finance_screen.dart';
import 'package:isuzet_business/features/fleet/presentation/fleet_map_screen.dart';
import 'package:isuzet_business/features/tracking/presentation/tracking_screen.dart';
import 'package:isuzet_business/features/shared_screens/profile/profile_screen.dart';

// Remaining placeholders (to be replaced in Phase 3)
class FleetLoadsScreen extends StatelessWidget {
  const FleetLoadsScreen({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fleet Loads')),
      body: const Center(child: Text('Fleet Loads - Phase 2')),
    );
  }
}

// App Router
final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/auth/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/auth/otp',
      builder: (context, state) => const OtpScreen(),
    ),
    GoRoute(
      path: '/auth/kyc',
      builder: (context, state) => const KycUploadScreen(),
    ),
    GoRoute(
      path: '/fleet',
      builder: (context, state) => const FleetHomeScreen(),
      routes: [
        GoRoute(
          path: 'trucks',
          builder: (context, state) => const TrucksScreen(),
        ),
        GoRoute(
          path: 'drivers',
          builder: (context, state) => const DriversScreen(),
        ),
        GoRoute(
          path: 'finance',
          builder: (context, state) => const FinanceScreen(),
        ),
        GoRoute(
          path: 'map',
          builder: (context, state) => const FleetMapScreen(),
        ),
        GoRoute(
          path: 'loads',
          builder: (context, state) => const FleetLoadsScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/track/:tripId',
      builder: (context, state) {
        final tripId = state.pathParameters['tripId'] ?? '';
        return TrackShipmentScreen(tripId: tripId);
      },
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
  ],
);
