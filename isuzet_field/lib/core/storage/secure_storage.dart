import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();

  static Future<void> saveTokens(String access, String refresh) async {
    await Future.wait([
      _storage.write(key: 'access_token', value: access),
      _storage.write(key: 'refresh_token', value: refresh),
    ]);
  }

  static Future<String?> getAccessToken() =>
      _storage.read(key: 'access_token');

  static Future<String?> getRefreshToken() =>
      _storage.read(key: 'refresh_token');

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  static Future<void> saveUserId(String id) =>
      _storage.write(key: 'user_id', value: id);

  static Future<String?> getUserId() =>
      _storage.read(key: 'user_id');

  static Future<void> saveUserRole(String role) =>
      _storage.write(key: 'user_role', value: role);

  static Future<String?> getUserRole() =>
      _storage.read(key: 'user_role');

  static Future<void> saveActiveTripId(String tripId) =>
      _storage.write(key: 'active_trip_id', value: tripId);

  static Future<String?> getActiveTripId() =>
      _storage.read(key: 'active_trip_id');

  static Future<void> clearActiveTripId() =>
      _storage.delete(key: 'active_trip_id');

  static Future<void> savePendingNotificationRoute(String route) =>
      _storage.write(key: 'pending_notification_route', value: route);

  static Future<String?> getPendingNotificationRoute() =>
      _storage.read(key: 'pending_notification_route');

  static Future<void> clearPendingNotificationRoute() =>
      _storage.delete(key: 'pending_notification_route');
}
