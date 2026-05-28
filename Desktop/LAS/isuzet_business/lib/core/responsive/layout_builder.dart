import 'package:flutter/material.dart';

enum DeviceType { mobile, tablet, desktop }

class AppLayout {
  // Spacing constants
  static const double spacingSmall = 8.0;
  static const double spacingMedium = 16.0;
  static const double spacingLarge = 24.0;
  static const double spacingXL = 32.0;

  // Padding constants
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double paddingXL = 32.0;

  static DeviceType of(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width < 600) return DeviceType.mobile;
    if (width < 1024) return DeviceType.tablet;
    return DeviceType.desktop;
  }

  static bool isMobile(BuildContext context) =>
      of(context) == DeviceType.mobile;

  static bool isTablet(BuildContext context) =>
      of(context) == DeviceType.tablet;

  static bool isDesktop(BuildContext context) =>
      of(context) == DeviceType.desktop;

  /// Returns main content width (accounting for sidebar on desktop)
  static double getMainWidth(BuildContext context) {
    final totalWidth = MediaQuery.of(context).size.width;
    if (isDesktop(context)) {
      return totalWidth - 220; // 220px sidebar
    }
    return totalWidth;
  }

  /// Standard padding for screens (responsive)
  static double getHorizontalPadding(BuildContext context) {
    if (isMobile(context)) return 16;
    if (isTablet(context)) return 24;
    return 32;
  }

  static double getVerticalPadding(BuildContext context) {
    if (isMobile(context)) return 12;
    if (isTablet(context)) return 16;
    return 20;
  }
}
