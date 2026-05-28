import 'package:intl/intl.dart';

class EtbFormatter {
  static final _formatter = NumberFormat('#,##0.00', 'en_US');

  // Input: integer cents from API (e.g. 1245000 = ETB 12,450.00)
  static String format(int cents) {
    final etb = cents / 100;
    return 'ETB ${_formatter.format(etb)}';
  }

  // Short format for cards (e.g. ETB 12.4K)
  static String formatShort(int cents) {
    final etb = cents / 100;
    if (etb >= 1000000) return 'ETB ${(etb / 1000000).toStringAsFixed(1)}M';
    if (etb >= 1000) return 'ETB ${(etb / 1000).toStringAsFixed(1)}K';
    return 'ETB ${_formatter.format(etb)}';
  }
}
