import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityMonitor {
  static final _connectivity = Connectivity();
  static bool _isOnline = true;

  static Stream<bool> get isOnline => _connectivity.onConnectivityChanged
      .map((result) => !result.contains(ConnectivityResult.none));

  static bool get currentlyOnline => _isOnline;

  static Future<void> initialize() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = !result.contains(ConnectivityResult.none);
  }
}
