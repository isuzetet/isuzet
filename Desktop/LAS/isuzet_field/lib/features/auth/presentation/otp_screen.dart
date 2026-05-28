import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/errors/app_exceptions.dart';
import 'package:isuzet_field/features/auth/data/models/auth_models.dart';
import 'package:isuzet_field/shared/providers/auth_provider.dart';
import 'package:isuzet_field/shared/widgets/buttons.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;

  const OtpScreen({Key? key, required this.phone}) : super(key: key);

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final List<TextEditingController> _otpControllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  late Timer _countdownTimer;
  int _secondsRemaining = 300; // 5 minutes
  bool _isLocked = false;
  String? _errorMessage;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _countdownTimer.cancel();
    for (final controller in _otpControllers) {
      controller.dispose();
    }
    for (final node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
        if (_secondsRemaining <= 0) {
          _secondsRemaining = 0;
          _countdownTimer.cancel();
          _isLocked = true;
        }
      });
    });
  }

  void _resendOtp() {
    setState(() {
      _secondsRemaining = 300;
      _isLocked = false;
      _errorMessage = null;
      for (final controller in _otpControllers) {
        controller.clear();
      }
    });
    _startCountdown();
    _focusNodes[0].requestFocus();
  }

  void _onOtpDigitChanged(String value, int index) {
    if (value.isEmpty) return;

    _otpControllers[index].text = value[0];

    if (index < 5) {
      _focusNodes[index + 1].requestFocus();
    } else {
      // All filled - auto-submit
      _submitOtp();
    }
  }

  void _submitOtp() async {
    final otp = _otpControllers.map((c) => c.text).join();
    if (otp.length != 6) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final response = await ref.read(
        verifyOtpProvider(
          VerifyOtpRequest(phone: widget.phone, otp: otp),
        ).future,
      );

      if (!mounted) return;

      if (response.user != null) {
        if (response.user!.kycTier < 1) {
          context.go('/auth/kyc');
        } else {
          context.go('/home');
        }
      }
    } on ValidationException catch (e) {
      setState(() {
        _isSubmitting = false;
        if (e.code == 'OTP_EXPIRED') {
          _errorMessage = 'OTP ጊዜው አልፏል - እንደገና ሞክር';
          _isLocked = true;
        } else if (e.code == 'OTP_LOCKOUT') {
          _errorMessage = 'ብዙ ሙከራ። 30 ደቂቃ ውስጥ እንደገና ሞክር።';
          _isLocked = true;
        } else {
          _errorMessage = 'ስህተት ኮድ';
          // Shake animation
          for (int i = 0; i < 3; i++) {
            Future.delayed(Duration(milliseconds: i * 100), () {
              setState(() {});
            });
          }
        }
      });
      _showErrorSnackbar(_errorMessage!);
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = e.toString();
      });
      _showErrorSnackbar(_errorMessage!);
    }
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.danger,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(1, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  Color _getTimerColor() {
    if (_secondsRemaining > 300) return AppColors.success;
    if (_secondsRemaining > 60) return AppColors.success;
    if (_secondsRemaining > 30) return AppColors.warning;
    return AppColors.danger;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),
            Text(
              'OTP አረጋግጥ',
              style: AppTextStyles.headingMedium,
            ),
            const SizedBox(height: 12),
            Text(
              '${widget.phone} ወደ ተላከ ኮድ ያስገቡ',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // OTP Input boxes
            row(
              children: List.generate(
                6,
                (i) => Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    child: TextField(
                      controller: _otpControllers[i],
                      focusNode: _focusNodes[i],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      maxLength: 1,
                      enabled: !_isSubmitting,
                      decoration: InputDecoration(
                        counterText: '',
                        filled: true,
                        fillColor: AppColors.bgInput,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(
                            color: AppColors.borderDefault,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(
                            color: AppColors.brandTeal,
                            width: 2,
                          ),
                        ),
                        contentPadding: EdgeInsets.zero,
                      ),
                      style: AppTextStyles.headingSmall,
                      onChanged: (v) => _onOtpDigitChanged(v, i),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Countdown timer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Column(
                children: [
                  Text(
                    'ቅናሽ ሸጋ ሊጠናቅቅ በ',
                    style: AppTextStyles.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatTime(_secondsRemaining),
                    style: AppTextStyles.headingMedium
                        .copyWith(color: _getTimerColor()),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Resend button
            SecondaryButton(
              label: 'እንደገና ላክ',
              onPressed: _resendOtp,
              isDisabled: !_isLocked && _secondsRemaining > 0,
            ),
          ],
        ),
      ),
    );
  }
}

// Fix the Row widget call
Widget row({required List<Widget> children}) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: children,
  );
}
