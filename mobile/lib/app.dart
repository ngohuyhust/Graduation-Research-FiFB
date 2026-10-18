import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_page.dart';
import 'shell/app_shell.dart';

const userTabs = ['home', 'explore', 'workout', 'progress', 'profile'];
const adminTabs = ['dashboard', 'review', 'users', 'audit', 'profile'];

GoRouter createRouter(AuthController auth, {String? initialLocation}) {
  String? pendingLocation;
  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: auth,
    redirect: (context, state) {
      final path = state.uri.path;
      if (auth.status == AuthStatus.loading ||
          auth.status == AuthStatus.unavailable) {
        if (path != '/startup') pendingLocation = state.uri.toString();
        return path == '/startup' ? null : '/startup';
      }
      if (auth.status == AuthStatus.signedOut) {
        if (path == '/startup' && pendingLocation != null) {
          final target = pendingLocation!;
          pendingLocation = null;
          if (AuthMode.values.any(
            (mode) => mode.path == Uri.parse(target).path,
          )) {
            return target;
          }
        }
        return path.startsWith('/user') ||
                path.startsWith('/admin') ||
                path == '/startup' ||
                path == '/'
            ? '/login'
            : null;
      }
      final root = auth.user!.isAdmin ? '/admin' : '/user';
      final tabs = auth.user!.isAdmin ? adminTabs : userTabs;
      return tabs.any((tab) => path == '$root/$tab')
          ? null
          : '$root/${tabs.first}';
    },
    routes: [
      GoRoute(path: '/', builder: (_, state) => const SizedBox.shrink()),
      GoRoute(
        path: '/startup',
        builder: (_, state) => StartupPage(auth: auth),
      ),
      for (final mode in AuthMode.values)
        GoRoute(
          path: mode.path,
          builder: (_, state) => AuthPage(
            key: ValueKey('${mode.name}:${state.uri}'),
            auth: auth,
            mode: mode,
            initialEmail: state.uri.queryParameters['email'] ?? '',
            resetToken: state.uri.queryParameters['token'] ?? '',
          ),
        ),
      for (final tab in userTabs)
        GoRoute(
          path: '/user/$tab',
          builder: (_, state) => AppShell(auth: auth, tab: tab),
        ),
      for (final tab in adminTabs)
        GoRoute(
          path: '/admin/$tab',
          builder: (_, state) => AppShell(auth: auth, tab: tab),
        ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: FilledButton(
          onPressed: () => context.go('/'),
          child: const Text('Back to FiFB'),
        ),
      ),
    ),
  );
}

class FiFBApp extends StatefulWidget {
  const FiFBApp({super.key, required this.auth, this.initialLocation});
  final AuthController auth;
  final String? initialLocation;
  @override
  State<FiFBApp> createState() => _FiFBAppState();
}

class _FiFBAppState extends State<FiFBApp> {
  late final GoRouter router = createRouter(
    widget.auth,
    initialLocation: widget.initialLocation,
  );
  @override
  void dispose() {
    router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
    title: 'FiFB',
    debugShowCheckedModeBanner: false,
    routerConfig: router,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xff16745b),
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: const Color(0xfff5f7f5),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 50),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    ),
  );
}

class StartupPage extends StatelessWidget {
  const StartupPage({super.key, required this.auth});
  final AuthController auth;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: auth,
    builder: (context, _) => Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: auth.status == AuthStatus.loading
              ? const CircularProgressIndicator(
                  semanticsLabel: 'Restoring your session',
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_outlined, size: 48),
                    const SizedBox(height: 16),
                    Text(
                      auth.error ?? 'Cannot restore your session.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: auth.restore,
                      child: const Text('Try again'),
                    ),
                  ],
                ),
        ),
      ),
    ),
  );
}
