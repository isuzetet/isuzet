import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/features/agent/data/agent_provider.dart';

class AgentClientsScreen extends ConsumerWidget {
  const AgentClientsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientsAsync = ref.watch(managedClientsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Clients'),
        backgroundColor: AppColors.bgCard,
        elevation: 0,
      ),
      body: clientsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.brandTeal),
        ),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error, color: AppColors.danger, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Failed to load clients',
                  style: AppTextStyles.headingMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Error: $err',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
        data: (clients) => clients.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, color: AppColors.textSecondary, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        'No clients yet',
                        style: AppTextStyles.headingMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'When you add clients, they will appear here',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: clients.length,
                itemBuilder: (context, index) {
                  final client = clients[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.bgCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderDefault),
                    ),
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
                                    client.clientName,
                                    style: AppTextStyles.headingMedium,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    client.clientPhone,
                                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.brandTeal),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: client.isActive ? AppColors.success.withOpacity(0.1) : AppColors.warning.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                client.isActive ? 'Active' : 'Inactive',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: client.isActive ? AppColors.success : AppColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (client.clientCompany != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Company: ${client.clientCompany}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text(
                          'Added: ${client.addedAt.toString().split(' ')[0]}',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}
