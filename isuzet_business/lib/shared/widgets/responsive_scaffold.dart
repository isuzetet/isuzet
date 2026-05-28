import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:isuzet_business/core/constants/app_colors.dart';
import 'package:isuzet_business/core/responsive/layout_builder.dart';

class ResponsiveScaffold extends StatefulWidget {
  final Widget body;
  final String? title;
  final int? currentIndex;
  final List<ResponsiveNavItem> navItems;
  final FloatingActionButton? fab;
  final PreferredSizeWidget? appBar;

  const ResponsiveScaffold({
    Key? key,
    required this.body,
    required this.navItems,
    this.title,
    this.currentIndex,
    this.fab,
    this.appBar,
  }) : super(key: key);

  @override
  State<ResponsiveScaffold> createState() => _ResponsiveScaffoldState();
}

class _ResponsiveScaffoldState extends State<ResponsiveScaffold> {
  @override
  Widget build(BuildContext context) {
    if (AppLayout.isDesktop(context)) {
      return _buildDesktopLayout(context);
    } else {
      return _buildMobileLayout(context);
    }
  }

  Widget _buildDesktopLayout(BuildContext context) {
    return Scaffold(
      appBar: widget.appBar,
      body: Row(
        children: [
          // Left sidebar
          SizedBox(
            width: 220,
            child: Container(
              color: AppColors.bgSurface,
              child: Column(
                children: [
                  // Logo area
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'ISUZET',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppColors.brandTeal,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Divider(color: AppColors.borderDefault),
                  // Navigation items
                  Expanded(
                    child: ListView.builder(
                      itemCount: widget.navItems.length,
                      itemBuilder: (context, index) {
                        final item = widget.navItems[index];
                        final isSelected = widget.currentIndex == index;
                        return _buildSidebarItem(context, item, isSelected, index);
                      },
                    ),
                  ),
                  const Divider(color: AppColors.borderDefault),
                  // Profile section could go here
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.borderDefault),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppColors.brandTeal,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: Text(
                                'P',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Profile',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                GestureDetector(
                                  onTap: () => context.go('/profile'),
                                  child: Text(
                                    'View',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(color: AppColors.brandTeal),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Main content
          Expanded(
            child: widget.body,
          ),
        ],
      ),
    );
  }

  Widget _buildMobileLayout(BuildContext context) {
    return Scaffold(
      appBar: widget.appBar,
      body: widget.body,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: widget.currentIndex ?? 0,
        onTap: (index) {
          if (index < widget.navItems.length) {
            context.go(widget.navItems[index].route);
          }
        },
        items: widget.navItems.map((item) {
          return BottomNavigationBarItem(
            icon: Icon(item.icon),
            label: item.label,
          );
        }).toList(),
      ),
      floatingActionButton: widget.fab,
    );
  }

  Widget _buildSidebarItem(
    BuildContext context,
    ResponsiveNavItem item,
    bool isSelected,
    int index,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Container(
        decoration: BoxDecoration(
          color: isSelected ? AppColors.statusInTransit.withOpacity(0.2) : null,
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListTile(
          leading: Icon(
            item.icon,
            color: isSelected ? AppColors.brandTeal : AppColors.textSecondary,
          ),
          title: Text(
            item.label,
            style: TextStyle(
              color: isSelected ? AppColors.brandTeal : AppColors.textPrimary,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          onTap: () {
            context.go(item.route);
          },
        ),
      ),
    );
  }
}

class ResponsiveNavItem {
  final String label;
  final IconData icon;
  final String route;

  const ResponsiveNavItem({
    required this.label,
    required this.icon,
    required this.route,
  });
}
