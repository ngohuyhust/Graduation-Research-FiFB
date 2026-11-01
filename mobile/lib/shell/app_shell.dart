import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_controller.dart';
import '../training/training_profile_page.dart';
import '../exercises/exercise_library.dart';
import '../exercises/exercise_repository.dart';
import '../workouts/workout_repository.dart';
import '../workouts/workout_pages.dart';
import '../workouts/session_repository.dart';
import '../workouts/session_history.dart';

class AppDestination {
  const AppDestination(this.path, this.label, this.icon, this.description);
  final String path, label, description;
  final IconData icon;
}

const userDestinations = [
  AppDestination('home', 'Home', Icons.home_outlined, 'Your training space'),
  AppDestination(
    'explore',
    'Explore',
    Icons.search,
    'Discover exercises and learn the movements.',
  ),
  AppDestination(
    'workout',
    'Workout',
    Icons.fitness_center,
    'Build your plans and set your weekly schedule.',
  ),
  AppDestination(
    'progress',
    'Progress',
    Icons.insights_outlined,
    'Follow your progress, one session at a time.',
  ),
  AppDestination('profile', 'Profile', Icons.person_outline, 'Your account'),
];
const adminDestinations = [
  AppDestination(
    'dashboard',
    'Dashboard',
    Icons.dashboard_outlined,
    'Your administration workspace',
  ),
  AppDestination(
    'review',
    'Review',
    Icons.fact_check_outlined,
    'Review exercises and program templates.',
  ),
  AppDestination(
    'users',
    'Users',
    Icons.people_outline,
    'Manage accounts and access.',
  ),
  AppDestination(
    'audit',
    'Audit',
    Icons.history,
    'Review administrative activity.',
  ),
  AppDestination('profile', 'Profile', Icons.person_outline, 'Your account'),
];

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.auth, required this.tab});
  final AuthController auth;
  final String tab;
  @override
  Widget build(BuildContext context) {
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();
    final destinations = user.isAdmin ? adminDestinations : userDestinations;
    final selected = destinations.indexWhere((item) => item.path == tab);
    final index = selected < 0 ? 0 : selected;
    final current = destinations[index];
    void select(int value) => context.go(
      '/${user.isAdmin ? 'admin' : 'user'}/${destinations[value].path}',
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;
        return Scaffold(
          appBar: AppBar(
            title: Text(user.isAdmin ? 'FiFB · Admin' : 'FiFB'),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Chip(label: Text(user.isAdmin ? 'Admin' : 'User')),
              ),
            ],
          ),
          bottomNavigationBar: wide
              ? null
              : NavigationBar(
                  selectedIndex: index,
                  onDestinationSelected: select,
                  destinations: [
                    for (final item in destinations)
                      NavigationDestination(
                        icon: Icon(item.icon),
                        label: item.label,
                      ),
                  ],
                ),
          body: SafeArea(
            child: Row(
              children: [
                if (wide)
                  NavigationRail(
                    extended: constraints.maxWidth >= 1100,
                    selectedIndex: index,
                    onDestinationSelected: select,
                    labelType: constraints.maxWidth >= 1100
                        ? null
                        : NavigationRailLabelType.all,
                    destinations: [
                      for (final item in destinations)
                        NavigationRailDestination(
                          icon: Icon(item.icon),
                          label: Text(item.label),
                        ),
                    ],
                  ),
                if (wide) const VerticalDivider(width: 1),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.all(wide ? 40 : 20),
                    child: Align(
                      alignment: Alignment.topCenter,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1000),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              current.label,
                              style: Theme.of(context).textTheme.headlineLarge
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              current.description,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                            const SizedBox(height: 28),
                            if (!user.isAdmin &&
                                (tab == 'home' || tab == 'profile'))
                              Card(
                                child: ListTile(
                                  leading: const Icon(Icons.tune),
                                  title: const Text('Your training profile'),
                                  subtitle: const Text(
                                    'Set up or edit your goals, schedule and equipment.',
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => TrainingProfilePage(
                                        repository: auth.repository,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            if (!user.isAdmin && tab == 'home')
                              TodayWorkout(
                                repository: WorkoutRepository(auth.repository),
                                sessions: SessionRepository(
                                  auth.repository,
                                  user.id,
                                ),
                              ),
                            if (!user.isAdmin && tab == 'workout')
                              SessionHistory(
                                repository: SessionRepository(
                                  auth.repository,
                                  user.id,
                                ),
                              ),
                            if (!user.isAdmin && tab == 'workout')
                              WorkoutPlans(
                                repository: WorkoutRepository(auth.repository),
                              )
                            else if (!user.isAdmin && tab == 'explore')
                              ExerciseLibrary(
                                repository: ExerciseRepository(auth.repository),
                              )
                            else if (tab == 'profile')
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const CircleAvatar(
                                        radius: 28,
                                        child: Icon(
                                          Icons.person_outline,
                                          size: 30,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        user.displayName,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleLarge,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(user.email),
                                      const SizedBox(height: 12),
                                      const Row(
                                        children: [
                                          Icon(
                                            Icons.verified_outlined,
                                            size: 18,
                                          ),
                                          SizedBox(width: 8),
                                          Text('Email verified'),
                                        ],
                                      ),
                                      const SizedBox(height: 24),
                                      AnimatedBuilder(
                                        animation: auth,
                                        builder: (context, _) => Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            if (auth.error != null)
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  bottom: 12,
                                                ),
                                                child: Text(
                                                  auth.error!,
                                                  style: TextStyle(
                                                    color: Theme.of(
                                                      context,
                                                    ).colorScheme.error,
                                                  ),
                                                ),
                                              ),
                                            OutlinedButton.icon(
                                              onPressed: auth.busy
                                                  ? null
                                                  : auth.logout,
                                              icon: const Icon(Icons.logout),
                                              label: const Text('Sign out'),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            else if (index == 0) ...[
                              Container(
                                padding: const EdgeInsets.all(28),
                                decoration: BoxDecoration(
                                  color: const Color(0xff123b31),
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Welcome, ${user.displayName}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 26,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      user.isAdmin
                                          ? 'Your account is ready. Manage your profile while your administration tools are being prepared.'
                                          : 'Your account is ready. Your training journey starts here.',
                                      style: const TextStyle(
                                        color: Color(0xffd2e5dc),
                                        fontSize: 16,
                                        height: 1.5,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    FilledButton.tonal(
                                      onPressed: () => select(4),
                                      child: const Text('View your profile'),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              const Card(
                                child: Padding(
                                  padding: EdgeInsets.all(24),
                                  child: Text(
                                    'More features are on the way. This preview includes account access and navigation.',
                                  ),
                                ),
                              ),
                            ] else
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(36),
                                  child: Column(
                                    children: [
                                      Icon(
                                        current.icon,
                                        size: 48,
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.primary,
                                      ),
                                      const SizedBox(height: 20),
                                      Text(
                                        'Coming soon',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleLarge,
                                      ),
                                      const SizedBox(height: 12),
                                      const Text(
                                        'This feature is being prepared. Your account is ready to use.',
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
