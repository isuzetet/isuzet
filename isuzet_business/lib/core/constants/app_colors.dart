import 'package:flutter/material.dart';

class AppColors {
  // Brand
  static const Color brandTeal       = Color(0xFF0F6E56);
  static const Color brandTealLight  = Color(0xFF1D9E75);
  static const Color brandAmber      = Color(0xFFBA7517);
  static const Color brandAmberLight = Color(0xFFFAC775);

  // Status colors — consistent across all screens
  static const Color statusOpen       = Color(0xFFBA7517);
  static const Color statusMatching   = Color(0xFF185FA5);
  static const Color statusOffered    = Color(0xFF534AB7);
  static const Color statusInTransit  = Color(0xFF0F6E56);
  static const Color statusDelivered  = Color(0xFF3B6D11);
  static const Color statusDisputed   = Color(0xFFA32D2D);
  static const Color statusCancelled  = Color(0xFF5F5E5A);
  static const Color statusUnmatched  = Color(0xFF854F0B);

  // Trust tier colors
  static const Color tierT0 = Color(0xFF5F5E5A);
  static const Color tierT1 = Color(0xFF185FA5);
  static const Color tierT2 = Color(0xFF0F6E56);
  static const Color tierT3 = Color(0xFF3B6D11);
  static const Color tierT4 = Color(0xFFBA7517);
  static const Color tierT5 = Color(0xFFEF9F27); // Gold

  // Backgrounds (dark-first — field app is used outdoors in bright sun,
  // high contrast is essential for readability)
  static const Color bgPrimary   = Color(0xFF0D1117);
  static const Color bgSurface   = Color(0xFF161B22);
  static const Color bgCard      = Color(0xFF21262D);
  static const Color bgSecondary = Color(0xFF161B22);
  static const Color bgInput     = Color(0xFF1C2128);

  // Text
  static const Color textPrimary   = Color(0xFFE6EDF3);
  static const Color textSecondary = Color(0xFF7D8590);
  static const Color textHint      = Color(0xFF484F58);

  // Borders
  static const Color borderColor   = Color(0xFF30363D);
  static const Color borderDefault = Color(0xFF30363D);
  static const Color borderFocus   = Color(0xFF0F6E56);

  // Semantic
  static const Color success = Color(0xFF1D9E75);
  static const Color warning = Color(0xFFBA7517);
  static const Color danger  = Color(0xFFA32D2D);
  static const Color info    = Color(0xFF185FA5);
}
