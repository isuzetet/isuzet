import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  // Override with --dart-define=API_BASE_URL=https://api.example.com
  // Android emulator: 10.0.2.2 reaches host localhost
  // Web / physical device: override via --dart-define
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get effectiveBaseUrl {
    if (_configuredBaseUrl.isNotEmpty) return _configuredBaseUrl;
    if (kIsWeb) return 'http://localhost';
    return 'http://10.0.2.2'; // Android emulator → host localhost
  }

  static String get baseUrl => effectiveBaseUrl;

  // Engine bases — use effectiveBaseUrl so Android emulator works correctly
  static String get identityBase   => '$effectiveBaseUrl:3001/api/v1';
  static String get optimizerBase  => '$effectiveBaseUrl:3002/api/v1';
  static String get corridorBase   => '$effectiveBaseUrl:3003/api/v1';
  static String get liquidityBase  => '$effectiveBaseUrl:3004/api/v1';
  static String get incidentBase   => '$effectiveBaseUrl:3006/api/v1';
  static String get locationBase   => '$effectiveBaseUrl:3014/api/v1';
  static String get dispatchBase   => '$effectiveBaseUrl:3015/api/v1/dispatch';
  static String get tripsBase      => '$effectiveBaseUrl:3015/api/v1';
  static String get notifyBase     => '$effectiveBaseUrl:3013/api/v1';

  // Timeouts
  static const int connectTimeoutMs  = 10000;
  static const int receiveTimeoutMs  = 30000;

  // Business rules
  static const int offerWindowMinutes         = 20;
  static const int timeCriticalWindowMinutes  = 5;
  static const int gpsIntervalMinutes         = 10;
  static const int gpsBatchMaxPoints          = 500;
}
