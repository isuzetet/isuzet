import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:isuzet_field/core/config/app_config.dart';
import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/core/storage/secure_storage.dart';

// Must be top-level for FCM background message handling
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Background messages are handled by the OS notification tray.
  // No local notification display needed here — system shows it automatically.
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _loadsChannel =
      AndroidNotificationChannel(
    'isuzet_loads',
    'ISUZET Load Offers',
    description: 'Notifications for new load offers and trip updates',
    importance: Importance.high,
  );

  static Future<void> initialize() async {
    // Register the background handler before any other setup
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Request permission (iOS; Android 13+ also requires this)
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Create the Android notification channel
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_loadsChannel);

    // Initialize flutter_local_notifications
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false, // already requested above
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Handle foreground messages — show as local notification
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was launched from a notification
    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Call this immediately after a successful login to register the FCM token.
  static Future<void> registerTokenAfterLogin() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await ApiClient.dio.post(
        '${AppConfig.identityBase}/identity/fcm-token',
        data: {'fcmToken': token},
      );
    } catch (_) {
      // Non-critical — token can be registered on next login
    }

    // Refresh token listener
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
      try {
        await ApiClient.dio.post(
          '${AppConfig.identityBase}/identity/fcm-token',
          data: {'fcmToken': newToken},
        );
      } catch (_) {}
    });
  }

  /// Call on logout to unregister the FCM token.
  static Future<void> unregisterToken() async {
    try {
      await ApiClient.dio.delete(
          '${AppConfig.identityBase}/identity/fcm-token');
    } catch (_) {}
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _loadsChannel.id,
          _loadsChannel.name,
          channelDescription: _loadsChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: message.data['type'],
    );
  }

  static void _handleNotificationTap(RemoteMessage message) {
    // Navigation is handled by the app router once it's available.
    // Store the intent for the router to pick up on next build.
    final type = message.data['type'] ?? '';
    SecureStorage.savePendingNotificationRoute(_buildRoute(type, message.data));
  }

  static void _onNotificationTap(NotificationResponse response) {
    // Local notification tapped — payload is the notification type
  }

  static String _buildRoute(String type, Map<String, dynamic> data) {
    switch (type) {
      case 'LOAD_OFFER':
        final loadId = data['loadId'] ?? '';
        return loadId.isNotEmpty ? '/loads/$loadId' : '/home';
      case 'PAYMENT_RELEASED':
        return '/earnings';
      case 'TRIP_UPDATE':
        return '/home';
      default:
        return '/home';
    }
  }
}
