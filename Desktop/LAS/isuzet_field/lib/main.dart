import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/app.dart';
import 'package:isuzet_field/core/services/notification_service.dart';
import 'package:isuzet_field/core/storage/local_cache.dart';
import 'package:isuzet_field/core/utils/connectivity_monitor.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive local cache
  await LocalCache.initialize();

  // Initialize connectivity monitor
  await ConnectivityMonitor.initialize();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Initialize push notifications (FCM handlers, local notification channel)
  await NotificationService.initialize();

  runApp(
    const ProviderScope(
      child: IsuzApplication(),
    ),
  );
}
