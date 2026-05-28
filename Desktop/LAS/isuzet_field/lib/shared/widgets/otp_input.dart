import 'package:flutter/material.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';

class OtpInput extends StatefulWidget {
  final void Function(String) onComplete;
  final int length;

  const OtpInput({
    Key? key,
    required this.onComplete,
    this.length = 6,
  }) : super(key: key);

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  late List<TextEditingController> _controllers;
  late List<FocusNode> _focusNodes;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(widget.length, (_) => TextEditingController());
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    for (final node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _onChanged(String value, int index) {
    if (value.isEmpty) return;

    _controllers[index].text = value[0];

    if (index < widget.length - 1) {
      _focusNodes[index + 1].requestFocus();
    } else {
      // All filled - auto-submit
      final otp = _controllers.map((c) => c.text).join();
      widget.onComplete(otp);
      _focusNodes[index].unfocus();
    }
  }

  void shake() {
    // Simple shake animation
    for (int i = 0; i < 5; i++) {
      Future.delayed(Duration(milliseconds: i * 50), () {
        setState(() {});
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(
        widget.length,
        (index) => SizedBox(
          width: 48,
          height: 60,
          child: TextFormField(
            controller: _controllers[index],
            focusNode: _focusNodes[index],
            textAlign: TextAlign.center,
            keyboardType: TextInputType.number,
            maxLength: 1,
            inputFormatters: [],
            decoration: InputDecoration(
              counterText: '',
              filled: true,
              fillColor: AppColors.bgInput,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.borderDefault),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.brandTeal, width: 2),
              ),
              contentPadding: EdgeInsets.zero,
            ),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            onChanged: (value) => _onChanged(value, index),
          ),
        ),
      ),
    );
  }
}

extension on TextField {
  // Extension for future backspace handling if needs
}
