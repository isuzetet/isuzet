import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:isuzet_business/app.dart';
import 'package:isuzet_business/core/services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Initialize push notifications (FCM handlers, local notification channel)
  await NotificationService.initialize();

  runApp(const IsuzetBusinessApp());
}
