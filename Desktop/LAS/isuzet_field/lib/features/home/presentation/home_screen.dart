import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_field/core/constants/app_colors.dart';
import 'package:isuzet_field/core/constants/app_text_styles.dart';
import 'package:isuzet_field/shared/providers/auth_provider.dart';
import 'package:isuzet_field/shared/providers/load_provider.dart';
import 'package:isuzet_field/shared/widgets/load_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentPage = 1;
  bool _isLoadingMore = false;

  @override
  Widget build(BuildContext context) {
    final loadsList = ref.watch(loadsListProvider(_currentPage));
    final authUser = ref.watch(authUserProvider);

    return Scaffold(
      backgroundColor: AppColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.bgPrimary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ዋቅ ሁኔታ',
              style: AppTextStyles.headingSmall,
            ),
            if (authUser != null)
              Text(
                authUser.fullName,
                style: AppTextStyles.bodySmall
                    .copyWith(color: AppColors.textSecondary),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(loadsListProvider(_currentPage));
            },
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: loadsList.when(
        data: (loadsResponse) {
          if (loadsResponse.loads.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.inbox_outlined,
                    size: 64,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'ዋቅ የለም',
                    style: AppTextStyles.headingSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'ለጊዜው ምንም ዋቅ የላቸውም။',
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      ref.invalidate(loadsListProvider(_currentPage));
                    },
                    child: const Text('አዳግማ፡'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: loadsResponse.loads.length + 1, // +1 for load more button
            itemBuilder: (context, index) {
              if (index == loadsResponse.loads.length) {
                // Load more button
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoadingMore
                          ? null
                          : () {
                              setState(() {
                                _isLoadingMore = true;
                                _currentPage++;
                              });
                              // ignore: unused_result
                              ref.refresh(loadsListProvider(_currentPage));
                              WidgetsBinding.instance.addPostFrameCallback((_) {
                                setState(() => _isLoadingMore = false);
                              });
                            },
                      child: _isLoadingMore
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('ተጨማሪ ዋቅ'),
                    ),
                  ),
                );
              }

              final load = loadsResponse.loads[index];
              return LoadCard(
                load: load,
                onTap: () {
                  ref.read(selectedLoadProvider.notifier).state = load;
                  context.go('/load/${load.id}');
                },
              );
            },
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: AppColors.danger,
              ),
              const SizedBox(height: 16),
              Text(
                'ስህተት ተሆነ',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodySmall
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(loadsListProvider(_currentPage));
                },
                child: const Text('ዳግም ሞክር'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
