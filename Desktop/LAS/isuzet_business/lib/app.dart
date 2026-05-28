import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/router.dart';

class IsuzetBusinessApp extends StatelessWidget {
  const IsuzetBusinessApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: MaterialApp.router(
        title: 'ISUZET Business',
        theme: ThemeData(
          useMaterial3: true,
          // Color scheme
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.brandTeal,
            brightness: Brightness.dark,
          ),
          // Dark background
          scaffoldBackgroundColor: AppColors.bgPrimary,
          appBarTheme: AppBarTheme(
            backgroundColor: AppColors.bgSurface,
            elevation: 0,
            centerTitle: false,
            iconTheme: const IconThemeData(color: AppColors.textPrimary),
            titleTextStyle: AppTextStyles.h3,
          ),
          // Cards
          cardColor: AppColors.bgCard,
          // Input
          inputDecorationTheme: InputDecorationTheme(
            fillColor: AppColors.bgInput,
            filled: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.borderFocus, width: 2),
            ),
            hintStyle: AppTextStyles.subtitle2,
          ),
          // Buttons
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandTeal,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              textStyle: AppTextStyles.button,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(
              foregroundColor: AppColors.brandTeal,
              textStyle: AppTextStyles.button,
            ),
          ),
          // Bottom nav
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: AppColors.bgSurface,
            selectedItemColor: AppColors.brandTeal,
            unselectedItemColor: AppColors.textSecondary,
            type: BottomNavigationBarType.fixed,
          ),
          // Text themes
          textTheme: const TextTheme(
            displayLarge: AppTextStyles.h1,
            displayMedium: AppTextStyles.h2,
            displaySmall: AppTextStyles.h3,
            headlineSmall: AppTextStyles.h4,
            titleLarge: AppTextStyles.h4,
            titleMedium: AppTextStyles.subtitle1,
            bodyLarge: AppTextStyles.body1,
            bodyMedium: AppTextStyles.body2,
            bodySmall: AppTextStyles.caption,
            labelSmall: AppTextStyles.overline,
          ),
        ),
        routerConfig: appRouter,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
