import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/shared/providers/fleet_provider.dart';

class DriversScreen extends ConsumerWidget {
  const DriversScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driversAsync = ref.watch(driversProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(AppLayout.paddingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Drivers',
                    style: AppTextStyles.h1,
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      _showAddDriverDialog(context, ref);
                    },
                    icon: Icon(Icons.add),
                    label: Text('Add Driver'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandTeal,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingMedium),
              driversAsync.when(
                data: (drivers) {
                  if (drivers.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppLayout.paddingMedium),
                        child: Text(
                          'No drivers yet. Add your first driver!',
                          style: AppTextStyles.body1.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    itemCount: drivers.length,
                    separatorBuilder: (_, __) =>
                        SizedBox(height: AppLayout.spacingMedium),
                    itemBuilder: (context, index) {
                      final driver = drivers[index];
                      return _DriverCard(
                        driver,
                        onEdit: () => _showEditDriverDialog(context, ref, driver),
                        onDeactivate: () =>
                            _confirmDeactivateDriver(context, ref, driver),
                      );
                    },
                  );
                },
                loading: () {
                  return Center(
                    child: CircularProgressIndicator(
                      color: AppColors.brandTeal,
                    ),
                  );
                },
                error: (error, stack) {
                  return Center(
                    child: Text(
                      'Failed to load drivers: $error',
                      style: AppTextStyles.body1.copyWith(
                        color: AppColors.danger,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddDriverDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _AddDriverDialog(ref),
    );
  }

  void _showEditDriverDialog(BuildContext context, WidgetRef ref, dynamic driver) {
    showDialog(
      context: context,
      builder: (_) => _EditDriverDialog(ref: ref, driver: driver),
    );
  }

  Future<void> _confirmDeactivateDriver(
    BuildContext context,
    WidgetRef ref,
    dynamic driver,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        title: Text('Deactivate driver?', style: AppTextStyles.h3),
        content: Text(
          'This unlinks ${driver.fullName} from active fleet operations.',
          style: AppTextStyles.body2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: Text('Deactivate'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(fleetServiceProvider).deleteDriver(driver.id);
      ref.invalidate(driversProvider);
      ref.invalidate(trucksProvider);
      ref.invalidate(fleetMetricsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Driver deactivated')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to deactivate driver: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }
}

class _DriverCard extends StatelessWidget {
  final dynamic driver;
  final VoidCallback onEdit;
  final VoidCallback onDeactivate;

  const _DriverCard(
    this.driver, {
    required this.onEdit,
    required this.onDeactivate,
  });

  @override
  Widget build(BuildContext context) {
    final trustTierColor = _getTrustTierColor(driver.trustTier);
    final trustTierLabel = _getTrustTierLabel(driver.trustTier);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.borderColor,
          width: 1,
        ),
      ),
      padding: EdgeInsets.all(AppLayout.paddingMedium),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      driver.fullName,
                      style: AppTextStyles.h4,
                    ),
                    SizedBox(height: 4),
                    Text(
                      driver.phone,
                      style: AppTextStyles.body2.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              // CRITICAL: Trust Tier Badge
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: trustTierColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: trustTierColor,
                    width: 1.5,
                  ),
                ),
                child: Text(
                  trustTierLabel,
                  style: AppTextStyles.caption.copyWith(
                    color: trustTierColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: AppLayout.spacingSmall),
          if (driver.licenseNumber != null)
            Text(
              'License: ${driver.licenseNumber}',
              style: AppTextStyles.body2,
            ),
          SizedBox(height: AppLayout.spacingSmall),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: driver.active
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.red.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  driver.active ? 'ACTIVE' : 'INACTIVE',
                  style: AppTextStyles.caption.copyWith(
                    color: driver.active ? Colors.green : Colors.red,
                  ),
                ),
              ),
              Wrap(
                spacing: 8,
                children: [
                  IconButton(
                    onPressed: onEdit,
                    icon: Icon(Icons.edit, size: 18),
                    tooltip: 'Edit',
                  ),
                  IconButton(
                    onPressed: onDeactivate,
                    icon: Icon(Icons.delete, size: 18, color: Colors.red),
                    tooltip: 'Deactivate',
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getTrustTierColor(int tier) {
    switch (tier) {
      case 0:
        return AppColors.tierT0; // grey
      case 1:
        return AppColors.tierT1; // blue
      case 2:
        return AppColors.tierT2; // teal
      case 3:
        return AppColors.tierT3; // green
      case 4:
        return AppColors.tierT4; // yellow
      case 5:
        return AppColors.tierT5; // gold
      default:
        return Colors.grey;
    }
  }

  String _getTrustTierLabel(int tier) {
    return 'T$tier';
  }
}

class _AddDriverDialog extends ConsumerWidget {
  final WidgetRef ref;

  _AddDriverDialog(this.ref);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(addDriverFormProvider);

    return Dialog(
      backgroundColor: AppColors.bgSecondary,
      child: SizedBox(
        width: 500,
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.all(AppLayout.paddingMedium),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add New Driver',
                      style: AppTextStyles.h3,
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(Icons.close),
                    ),
                  ],
                ),
                SizedBox(height: AppLayout.spacingMedium),
                TextField(
                  onChanged:
                      ref.read(addDriverFormProvider.notifier).setFullName,
                  style: AppTextStyles.body2,
                  decoration: InputDecoration(
                    labelText: 'Full Name *',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),
                TextField(
                  onChanged: ref.read(addDriverFormProvider.notifier).setPhone,
                  keyboardType: TextInputType.phone,
                  style: AppTextStyles.body2,
                  decoration: InputDecoration(
                    labelText: 'Phone Number *',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),
                TextField(
                  onChanged:
                      ref.read(addDriverFormProvider.notifier).setLicenseNumber,
                  style: AppTextStyles.body2,
                  decoration: InputDecoration(
                    labelText: 'License Number (optional)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),
                if (formState.error != null)
                  Padding(
                    padding: EdgeInsets.only(bottom: AppLayout.spacingSmall),
                    child: Text(
                      formState.error!,
                      style: AppTextStyles.body2.copyWith(
                        color: AppColors.danger,
                      ),
                    ),
                  ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: formState.isLoading
                        ? null
                        : () async {
                            final success = await ref
                                .read(addDriverFormProvider.notifier)
                                .submitForm();
                            if (success && context.mounted) {
                              ref.invalidate(driversProvider);
                              ref.invalidate(fleetMetricsProvider);
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Driver invited successfully'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandTeal,
                      padding: EdgeInsets.symmetric(
                        vertical: AppLayout.paddingMedium,
                      ),
                    ),
                    child: formState.isLoading
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            'Invite Driver',
                            style: TextStyle(color: Colors.white),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EditDriverDialog extends StatefulWidget {
  final WidgetRef ref;
  final dynamic driver;

  const _EditDriverDialog({
    required this.ref,
    required this.driver,
  });

  @override
  State<_EditDriverDialog> createState() => _EditDriverDialogState();
}

class _EditDriverDialogState extends State<_EditDriverDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _licenseController;
  bool _active = true;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.driver.fullName);
    _phoneController = TextEditingController(text: widget.driver.phone);
    _licenseController =
        TextEditingController(text: widget.driver.licenseNumber ?? '');
    _active = widget.driver.active;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _licenseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.bgSecondary,
      child: SizedBox(
        width: 500,
        child: SingleChildScrollView(
          padding: EdgeInsets.all(AppLayout.paddingMedium),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Edit Driver', style: AppTextStyles.h3),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _nameController,
                decoration: InputDecoration(labelText: 'Full Name *'),
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: 'Phone Number *'),
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _licenseController,
                decoration: InputDecoration(labelText: 'License Number'),
              ),
              SizedBox(height: AppLayout.spacingSmall),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Active', style: AppTextStyles.body2),
                value: _active,
                onChanged: (value) => setState(() => _active = value),
              ),
              if (_error != null)
                Text(
                  _error!,
                  style: AppTextStyles.body2.copyWith(color: AppColors.danger),
                ),
              SizedBox(height: AppLayout.spacingMedium),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  child: _isLoading
                      ? SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text('Save Changes'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_nameController.text.trim().length < 2 ||
        _phoneController.text.trim().length < 9) {
      setState(() => _error = 'Name and valid phone are required');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.ref.read(fleetServiceProvider).updateDriver(
            widget.driver.id,
            fullName: _nameController.text.trim(),
            phone: _phoneController.text.trim(),
            licenseNumber: _licenseController.text.trim().isEmpty
                ? null
                : _licenseController.text.trim(),
            active: _active,
          );
      widget.ref.invalidate(driversProvider);
      widget.ref.invalidate(fleetMetricsProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }
}
