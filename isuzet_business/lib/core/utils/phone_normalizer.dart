class PhoneNormalizer {
  /// Normalizes Ethiopian phone numbers to E.164 format (+251XXXXXXXXX)
  static String normalize(String phone) {
    // Remove all non-digit characters
    var cleaned = phone.replaceAll(RegExp(r'\D'), '');

    // Handle leading 0 (domestic format: 0911234567)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Handle leading 251 (international without +)
    if (cleaned.startsWith('251')) {
      return '+$cleaned';
    }

    // If it's 9 digits (without country code), add +251
    if (cleaned.length == 9) {
      return '+251$cleaned';
    }

    // Already in correct format or already has country code
    if (cleaned.length == 12) {
      return '+$cleaned';
    }

    // Return as-is for invalid lengths (error handling in UI)
    return phone;
  }

  /// Converts E.164 to domestic format (0XXXXXXXXX)
  static String toDomestic(String phone) {
    var cleaned = phone.replaceAll(RegExp(r'\D'), '');

    if (cleaned.startsWith('251')) {
      cleaned = cleaned.substring(3);
    }

    if (!cleaned.startsWith('0')) {
      cleaned = '0$cleaned';
    }

    return cleaned;
  }

  /// Validates if a phone number looks valid (after normalization)
  static bool isValid(String phone) {
    var normalized = normalize(phone);
    return RegExp(r'^\+251\d{9}$').hasMatch(normalized);
  }

  /// Format for display (with country code visible)
  static String formatForDisplay(String phone) {
    var normalized = normalize(phone);
    if (RegExp(r'^\+251\d{9}$').hasMatch(normalized)) {
      // +251 911 234 567 format
      var digits = normalized.substring(4); // Remove +251
      return '+251 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}';
    }
    return phone;
  }
}
