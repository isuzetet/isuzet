import 'package:intl/intl.dart';

class EtbFormatter {
  static final NumberFormat _formatter = NumberFormat.simpleCurrency(
    name: 'ETB',
    decimalDigits: 0,
  );

  static String format(double amount) {
    return _formatter.format(amount);
  }

  static String formatShort(double amount) {
    if (amount < 1000) {
      return 'ETB ${amount.toStringAsFixed(0)}';
    } else if (amount < 1000000) {
      return 'ETB ${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return 'ETB ${(amount / 1000000).toStringAsFixed(1)}M';
    }
  }

  static double parseEtb(String value) {
    try {
      return double.parse(value.replaceAll(RegExp(r'[^0-9.]'), ''));
    } catch (e) {
      return 0.0;
    }
  }
}
