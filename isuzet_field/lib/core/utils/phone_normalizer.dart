class PhoneNormalizer {
  // Normalizes Ethiopian phone numbers to +251XXXXXXXXX format
  static String normalize(String input) {
    String cleaned = input.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    if (cleaned.startsWith('09') && cleaned.length == 10) {
      return '+251${cleaned.substring(1)}';
    }
    if (cleaned.startsWith('251') && cleaned.length == 12) {
      return '+$cleaned';
    }
    if (cleaned.startsWith('+251') && cleaned.length == 13) {
      return cleaned;
    }
    return cleaned;
  }

  static bool isValid(String normalized) {
    return RegExp(r'^\+2519\d{8}$').hasMatch(normalized) ||
           RegExp(r'^\+2517\d{8}$').hasMatch(normalized);
  }
}
