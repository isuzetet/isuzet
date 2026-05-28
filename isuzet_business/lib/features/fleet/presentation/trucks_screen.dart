import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/constants/app_text_styles.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';
import 'package:isuzet_business/shared/providers/fleet_provider.dart';

class TrucksScreen extends ConsumerWidget {
  const TrucksScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trucksAsync = ref.watch(trucksProvider);
    final isDesktop = AppLayout.isDesktop(context);

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
                    'Trucks',
                    style: AppTextStyles.h1,
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      _showAddTruckDialog(context, ref);
                    },
                    icon: Icon(Icons.add),
                    label: Text('Add Truck'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandTeal,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingMedium),
              trucksAsync.when(
                data: (trucks) {
                  if (trucks.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppLayout.paddingMedium),
                        child: Text(
                          'No trucks yet. Add your first truck!',
                          style: AppTextStyles.body1.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    );
                  }

                  // Desktop: DataTable2 with sortable columns
                  if (isDesktop) {
                    return _buildDesktopTable(context, ref, trucks);
                  }

                  // Mobile/Tablet: Card list
                  return _buildCardList(context, ref, trucks);
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
                      'Failed to load trucks: $error',
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

  Widget _buildDesktopTable(BuildContext context, WidgetRef ref, List<dynamic> trucks) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.borderColor,
          width: 1,
        ),
      ),
      child: DataTable2(
        columns: const [
          DataColumn2(
            label: Text('License Plate'),
            size: ColumnSize.M,
          ),
          DataColumn2(
            label: Text('Registration'),
            size: ColumnSize.M,
          ),
          DataColumn2(
            label: Text('Capacity'),
            size: ColumnSize.S,
          ),
          DataColumn2(
            label: Text('Status'),
            size: ColumnSize.S,
          ),
          DataColumn2(
            label: Text('Actions'),
            size: ColumnSize.S,
          ),
        ],
        rows: trucks
            .map(
              (truck) => DataRow2(
                cells: [
                  DataCell(
                    Text(
                      truck.licensePlate,
                      style: AppTextStyles.body2,
                    ),
                  ),
                  DataCell(
                    Text(
                      truck.registrationNumber ?? '—',
                      style: AppTextStyles.body2,
                    ),
                  ),
                  DataCell(
                    Text(
                      '${truck.capacityKg} kg',
                      style: AppTextStyles.body2,
                    ),
                  ),
                  DataCell(
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: truck.status == 'active'
                            ? Colors.green.withValues(alpha: 0.2)
                            : Colors.orange.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        truck.status.toUpperCase(),
                        style: AppTextStyles.caption.copyWith(
                          color: truck.status == 'active'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                    ),
                  ),
                  DataCell(
                    Wrap(
                      spacing: 8,
                      children: [
                        IconButton(
                          onPressed: () => _showEditTruckDialog(context, ref, truck),
                          icon: Icon(Icons.edit, size: 18),
                          tooltip: 'Edit',
                        ),
                        IconButton(
                          onPressed: () => _confirmDeleteTruck(context, ref, truck),
                          icon: Icon(Icons.delete, size: 18, color: Colors.red),
                          tooltip: 'Delete',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildCardList(BuildContext context, WidgetRef ref, List<dynamic> trucks) {
    return ListView.separated(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      itemCount: trucks.length,
      separatorBuilder: (_, __) => SizedBox(height: AppLayout.spacingMedium),
      itemBuilder: (context, index) {
        final truck = trucks[index];
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
                  Text(
                    truck.licensePlate,
                    style: AppTextStyles.h4,
                  ),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: truck.status == 'active'
                          ? Colors.green.withValues(alpha: 0.2)
                          : Colors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      truck.status.toUpperCase(),
                      style: AppTextStyles.caption.copyWith(
                        color: truck.status == 'active'
                            ? Colors.green
                            : Colors.orange,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingSmall),
              if (truck.registrationNumber != null)
                Text(
                  'Registration: ${truck.registrationNumber}',
                  style: AppTextStyles.body2,
                ),
              SizedBox(height: AppLayout.spacingSmall),
              Text(
                'Capacity: ${truck.capacityKg} kg',
                style: AppTextStyles.body2,
              ),
              SizedBox(height: AppLayout.spacingSmall),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _showEditTruckDialog(context, ref, truck),
                    icon: Icon(Icons.edit, size: 18),
                    label: Text('Edit'),
                  ),
                  SizedBox(width: 8),
                  TextButton.icon(
                    onPressed: () => _confirmDeleteTruck(context, ref, truck),
                    icon: Icon(Icons.delete, size: 18, color: Colors.red),
                    label: Text('Deactivate'),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAddTruckDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _AddTruckDialog(ref),
    );
  }

  void _showEditTruckDialog(BuildContext context, WidgetRef ref, dynamic truck) {
    showDialog(
      context: context,
      builder: (_) => _EditTruckDialog(ref: ref, truck: truck),
    );
  }

  Future<void> _confirmDeleteTruck(
    BuildContext context,
    WidgetRef ref,
    dynamic truck,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        title: Text('Deactivate truck?', style: AppTextStyles.h3),
        content: Text(
          'This removes ${truck.licensePlate} from active fleet operations.',
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
      await ref.read(fleetServiceProvider).deleteTruck(truck.id);
      ref.invalidate(trucksProvider);
      ref.invalidate(fleetMetricsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Truck deactivated')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to deactivate truck: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }
}

class _EditTruckDialog extends StatefulWidget {
  final WidgetRef ref;
  final dynamic truck;

  const _EditTruckDialog({
    required this.ref,
    required this.truck,
  });

  @override
  State<_EditTruckDialog> createState() => _EditTruckDialogState();
}

class _EditTruckDialogState extends State<_EditTruckDialog> {
  late final TextEditingController _plateController;
  late final TextEditingController _registrationController;
  late final TextEditingController _capacityController;
  String _status = 'active';
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _plateController = TextEditingController(text: widget.truck.licensePlate);
    _registrationController =
        TextEditingController(text: widget.truck.registrationNumber ?? '');
    _capacityController =
        TextEditingController(text: widget.truck.capacityKg.toString());
    _status = widget.truck.status;
  }

  @override
  void dispose() {
    _plateController.dispose();
    _registrationController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.bgSecondary,
      child: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          padding: EdgeInsets.all(AppLayout.paddingMedium),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Edit Truck', style: AppTextStyles.h3),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close),
                  ),
                ],
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _plateController,
                decoration: InputDecoration(labelText: 'License Plate *'),
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _registrationController,
                decoration: InputDecoration(labelText: 'Registration Number'),
              ),
              SizedBox(height: AppLayout.spacingMedium),
              TextField(
                controller: _capacityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: 'Capacity (kg) *'),
              ),
              SizedBox(height: AppLayout.spacingMedium),
              DropdownButtonFormField<String>(
                value: _status,
                decoration: InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: 'active', child: Text('Active')),
                  DropdownMenuItem(value: 'maintenance', child: Text('Maintenance')),
                  DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                ],
                onChanged: (value) => setState(() => _status = value ?? 'active'),
              ),
              if (_error != null) ...[
                SizedBox(height: AppLayout.spacingSmall),
                Text(
                  _error!,
                  style: AppTextStyles.body2.copyWith(color: AppColors.danger),
                ),
              ],
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
    final capacity = int.tryParse(_capacityController.text.trim());
    if (_plateController.text.trim().isEmpty || capacity == null || capacity <= 0) {
      setState(() => _error = 'Plate and positive capacity are required');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.ref.read(fleetServiceProvider).updateTruck(
            widget.truck.id,
            licensePlate: _plateController.text.trim(),
            registrationNumber: _registrationController.text.trim().isEmpty
                ? null
                : _registrationController.text.trim(),
            capacityKg: capacity,
            status: _status,
          );
      widget.ref.invalidate(trucksProvider);
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

class _AddTruckDialog extends ConsumerWidget {
  final WidgetRef ref;

  const _AddTruckDialog(this.ref);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(addTruckFormProvider);

    return Dialog(
      backgroundColor: AppColors.bgSecondary,
      child: SizedBox(
        width: 600,
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
                      'Add New Truck',
                      style: AppTextStyles.h3,
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(Icons.close),
                    ),
                  ],
                ),
                SizedBox(height: AppLayout.spacingMedium),

                // License Plate
                TextField(
                  onChanged: (val) {
                    ref
                        .read(addTruckFormProvider.notifier)
                        .setLicensePlate(val);
                  },
                  style: AppTextStyles.body2,
                  decoration: InputDecoration(
                    labelText: 'License Plate *',
                    hintText: 'e.g., AA-123-AAA',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),

                // Registration Number
                TextField(
                  onChanged: (val) {
                    ref
                        .read(addTruckFormProvider.notifier)
                        .setRegistrationNumber(val);
                  },
                  style: AppTextStyles.body2,
                  decoration: InputDecoration(
                    labelText: 'Registration Number (optional)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),

                // CRITICAL: Capacity with toggle (kg/tonnes)
                Text(
                  'Truck Capacity *',
                  style: AppTextStyles.body2,
                ),
                SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        onChanged: (val) {
                          final capacity = double.tryParse(val) ?? 0;
                          ref
                              .read(addTruckFormProvider.notifier)
                              .setCapacity(capacity);
                        },
                        keyboardType:
                            TextInputType.numberWithOptions(decimal: true),
                        style: AppTextStyles.body2,
                        decoration: InputDecoration(
                          labelText: formState.capacityInTonnes
                              ? 'Capacity (Tonnes)'
                              : 'Capacity (kg)',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: AppLayout.spacingSmall),
                    ElevatedButton(
                      onPressed: () {
                        ref
                            .read(addTruckFormProvider.notifier)
                            .toggleCapacityUnit();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            formState.capacityInTonnes ? Colors.blue : Colors.grey,
                      ),
                      child: Text(
                        formState.capacityInTonnes ? 'Tonnes' : 'Kg',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Text(
                  formState.capacityInTonnes
                      ? 'Will send ${(formState.capacity * 1000).toInt()} kg to server'
                      : 'Will send ${formState.capacity.toInt()} kg to server',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                SizedBox(height: AppLayout.spacingMedium),

                // Submit & Error
                if (formState.error != null)
                  Padding(
                    padding: EdgeInsets.only(
                      bottom: AppLayout.spacingSmall,
                    ),
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
                                .read(addTruckFormProvider.notifier)
                                .submitForm();
                            if (success && context.mounted) {
                              ref.invalidate(trucksProvider);
                              ref.invalidate(fleetMetricsProvider);
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Truck added successfully!'),
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
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Text(
                            'Add Truck',
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
