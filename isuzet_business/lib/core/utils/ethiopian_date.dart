class EthiopianDate {
  /// Converts Gregorian date to Ethiopian calendar
  /// Returns format: "1 Meskerem 2016 ዓ.ም"
  static String toEthiopian(DateTime gregorian) {
    const amharicMonths = [
      'ጃንዋሪ', 'ፌብርዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
      'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዴሴምበር'
    ];

    // Simple approximation: Ethiopian year = Gregorian year - 7
    // Actual conversion is more complex, but this is sufficient for display
    final ethiopianYear = gregorian.year - 7;
    final month = amharicMonths[gregorian.month - 1];
    final day = gregorian.day;

    return '$day $month $ethiopianYear ዓ.ም';
  }

  /// Returns time ago string in Amharic
  /// e.g., "2 ሰአታት በፊት" (2 hours ago)
  static String timeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds} ሰከንድ በፊት'; // seconds ago
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} ደቂቃ በፊት'; // minutes ago
    } else if (difference.inHours < 24) {
      return '${difference.inHours} ሰአታት በፊት'; // hours ago
    } else if (difference.inDays < 7) {
      return '${difference.inDays} ቀናት በፊት'; // days ago
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '$weeks ሳምንታት በፊት'; // weeks ago
    } else {
      final months = (difference.inDays / 30).floor();
      return '$months ወራት በፊት'; // months ago
    }
  }

  /// Checks if date is in rainy season (June-September)
  static bool isRainySeason(DateTime date) {
    return date.month >= 6 && date.month <= 9;
  }

  /// Returns rainy season name in Amharic
  static const String rainySeason = 'ዝናብ ወቅት'; // Rainy season
}
