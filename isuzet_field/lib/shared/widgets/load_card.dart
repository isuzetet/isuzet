import 'dart:async';
import 'package:flutter/material.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/core/utils/etb_formatter.dart';
import 'package:isuzet_field/features/loads/data/models/load_models.dart';

class LoadCard extends StatefulWidget {
  final LoadItem load;
  final VoidCallback? onTap;

  const LoadCard({
    Key? key,
    required this.load,
    this.onTap,
  }) : super(key: key);

  @override
  State<LoadCard> createState() => _LoadCardState();
}

class _LoadCardState extends State<LoadCard> {
  late Timer _timer;
  late int _secondsRemaining;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.load.secondsRemaining;
    _startCountdown();
  }

  void _startCountdown() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
        if (_secondsRemaining < 0) {
          _secondsRemaining = 0;
          _timer.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatTimeRemaining(int seconds) {
    if (seconds <= 0) return '0 ደቂቃ';
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    if (mins > 0) {
      return '$mins ደቂቃ ${secs.toString().padLeft(2, '0')}ሰ';
    }
    return '${secs}ሰ';
  }

  Color _getTimerColor() {
    if (_secondsRemaining <= 0) return AppColors.danger;
    if (_secondsRemaining <= 300) return AppColors.danger; // red if < 5 min
    if (_secondsRemaining <= 900) return AppColors.warning; // amber if < 15 min
    return AppColors.success; // green otherwise
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _secondsRemaining > 0 ? widget.onTap : null,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _secondsRemaining > 0 ? AppColors.borderDefault : AppColors.danger,
            width: 1.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Origin → Destination + Timer
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.load.origin,
                        style: AppTextStyles.bodySmall
                            .copyWith(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '→ ${widget.load.destination}',
                        style: AppTextStyles.bodySemibold,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                // REAL COUNTDOWN TIMER (updates every second)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getTimerColor().withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: _getTimerColor()),
                  ),
                  child: Text(
                    _formatTimeRemaining(_secondsRemaining),
                    style: AppTextStyles.bodySmall.copyWith(
                      color: _getTimerColor(),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Distance + Weight + Vehicle
            Row(
              children: [
                Expanded(
                  child: _DetailChip(
                    icon: Icons.straighten,
                    label: '${widget.load.distance} km',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _DetailChip(
                    icon: Icons.scale,
                    label: '${widget.load.weight.toStringAsFixed(0)} kg',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _DetailChip(
                    icon: Icons.local_shipping,
                    label: widget.load.vehicleType,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Tags (if any)
            if (widget.load.tags != null && widget.load.tags!.isNotEmpty)
              Column(
                children: [
                  Wrap(
                    spacing: 6,
                    children: widget.load.tags!
                        .map((tag) => Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.info.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            tag,
                            style: AppTextStyles.bodyXSmall
                                .copyWith(color: AppColors.info),
                          ),
                        ))
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                ],
              ),

            // Price + Agent
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ዋጋ',
                      style: AppTextStyles.bodyXSmall
                          .copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      EtbFormatter.format(
                        widget.load.offeredPrice.toInt(),
                      ),
                      style: AppTextStyles.bodySemibold
                          .copyWith(color: AppColors.brandTeal),
                    ),
                  ],
                ),
                if (widget.load.agentName != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'አጋሥ',
                        style: AppTextStyles.bodyXSmall
                            .copyWith(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (widget.load.agentRating != null)
                            Row(
                              children: [
                                Icon(
                                  Icons.star,
                                  size: 12,
                                  color: AppColors.warning,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  widget.load.agentRating!.toStringAsFixed(1),
                                  style: AppTextStyles.bodyXSmall,
                                ),
                              ],
                            ),
                          const SizedBox(width: 4),
                          Text(
                            widget.load.agentName!,
                            style: AppTextStyles.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ],
                  ),
              ],
            ),

            // Expired state
            if (_secondsRemaining <= 0)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      'ዋጋ ጊዜውሰሰ',
                      style: AppTextStyles.bodySmall
                          .copyWith(color: AppColors.danger),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            label,
            style: AppTextStyles.bodyXSmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
