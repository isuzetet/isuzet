import 'package:intl/intl.dart';

class EthiopianDate {
  // Convert Gregorian ISO date string to Ethiopian calendar display
  static String toEthiopianDisplay(String gregorianIso) {
    try {
      final gregorian = DateTime.parse(gregorianIso);
      final ethiopian = _toEthiopian(gregorian);
      
      final formattedGregorian = DateFormat('MMM d, yyyy').format(gregorian);
      final day = ethiopian['day'] ?? 0;
      final month = ethiopian['month'] ?? 1;
      final year = ethiopian['year'] ?? gregorian.year;
      
      return '$day ${_ethiopianMonthName(month)} '
             '$year · $formattedGregorian';
    } catch (e) {
      return '';
    }
  }

  static Map<String, int> _toEthiopian(DateTime gregorian) {
    // Simplified Ethiopian calendar conversion
    // Ethiopian calendar is ~8 years behind Gregorian
    int year = gregorian.year - 8;
    int month = gregorian.month;
    int day = gregorian.day;

    // Adjust for days before Ethiopian new year (Sept 11)
    if (gregorian.month < 9) {
      year--;
    } else if (gregorian.month == 9 && gregorian.day < 11) {
      year--;
    }

    return {'year': year, 'month': month, 'day': day};
  }

  static String _ethiopianMonthName(int month) {
    const monthNames = [
      'ጃንዋሪ',    // January
      'ፌብርዋሪ',  // February
      'ማርች',     // March
      'ኤፕሪል',    // April
      'ሜይ',      // May
      'ጁን',      // June
      'ጁላይ',     // July
      'ኦገስት',    // August
      'ሴፕቴምበር', // September
      'ኦክቶበር',  // October
      'ኖቬምበር',  // November
      'ዲሴምበር',  // December
    ];
    // Clamp month to 1-12 range, then access list with 0-11 index
    final clampedMonth = month.clamp(1, 12);
    return monthNames[clampedMonth - 1];
  }
}
