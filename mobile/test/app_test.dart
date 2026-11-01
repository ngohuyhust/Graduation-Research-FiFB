import 'dart:convert';
import 'package:fifb/app.dart';
import 'package:fifb/auth/auth_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'helpers.dart';

void main() {
  testWidgets('login validates input, signs in, opens profile and signs out', (
    tester,
  ) async {
    var logins = 0;
    final auth = createAuth((request) async {
      if (request.url.path.endsWith('/login')) {
        logins++;
        return ok(tokenData());
      }
      if (request.url.path.endsWith('/logout')) return http.Response('', 204);
      if (request.url.path.endsWith('/workout-plans/today')) {
        return ok({'items': []});
      }
      return ok(userData());
    });
    await auth.restore();
    await tester.pumpWidget(FiFBApp(auth: auth));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(logins, 0);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'member@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'password123',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome, Test Member'), findsOneWidget);
    await tester.ensureVisible(find.text('View your profile'));
    await tester.tap(find.text('View your profile'));
    await tester.pumpAndSettle();
    expect(find.text('member@example.com'), findsOneWidget);
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome back'), findsOneWidget);
  });

  for (final role in ['user', 'admin']) {
    testWidgets('$role cannot enter the other role shell through a deep link', (
      tester,
    ) async {
      final auth = createAuth(
        (request) async => request.url.path.endsWith('/login')
            ? ok(tokenData())
            : ok(userData(role)),
      );
      await auth.login('member@example.com', 'password123');
      await tester.pumpWidget(
        FiFBApp(
          auth: auth,
          initialLocation: role == 'user' ? '/admin/users' : '/user/workout',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Welcome, Test Member'), findsOneWidget);
      expect(
        find.text(role == 'user' ? 'FiFB · Admin' : 'Workout'),
        findsNothing,
      );
    });
  }

  testWidgets('registration proceeds to OTP verification with the same email', (
    tester,
  ) async {
    final calls = <http.Request>[];
    final auth = createAuth((request) async {
      calls.add(request);
      return ok({});
    });
    await auth.restore();
    await tester.pumpWidget(FiFBApp(auth: auth, initialLocation: '/register'));
    await tester.pumpAndSettle();
    for (final entry in {
      'Full name': 'Member',
      'Email': 'member@example.com',
      'Phone': '0900000000',
      'Password': 'password123',
    }.entries) {
      await tester.enterText(
        find.widgetWithText(TextFormField, entry.key),
        entry.value,
      );
    }
    await tester.ensureVisible(find.text('Create account'));
    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();
    expect(find.text('Check your email'), findsOneWidget);
    expect(jsonDecode(calls.first.body)['role'], 'user');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Verification code'),
      '123456',
    );
    await tester.tap(find.text('Verify email'));
    await tester.pumpAndSettle();
    expect(jsonDecode(calls.last.body), {
      'email': 'member@example.com',
      'otp': '123456',
    });
    expect(find.text('Email verified. You can now sign in.'), findsOneWidget);
  });

  testWidgets('password-reset deep link survives initial session restoration', (
    tester,
  ) async {
    final auth = createAuth((_) async => ok({}));
    await tester.pumpWidget(
      FiFBApp(
        auth: auth,
        initialLocation: '/reset-password?token=example-reset-token',
      ),
    );
    await tester.pump();
    await auth.restore();
    await tester.pumpAndSettle();
    expect(find.text('Choose a new password'), findsOneWidget);
  });

  for (final size in [
    const Size(320, 640),
    const Size(800, 600),
    const Size(1280, 800),
  ]) {
    testWidgets('responsive shell at $size has no overflow', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final auth = createAuth(
        (request) async => request.url.path.endsWith('/login')
            ? ok(tokenData())
            : ok(userData('admin')),
      );
      await auth.login('member@example.com', 'password123');
      await tester.pumpWidget(FiFBApp(auth: auth));
      await tester.pumpAndSettle();
      expect(
        find.byType(size.width >= 760 ? NavigationRail : NavigationBar),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'offline startup shows retry without discarding saved credentials',
    (tester) async {
      final store = MemoryTokenStore()..token = 'saved';
      final auth = createAuth(
        (_) async => throw http.ClientException('offline'),
        store: store,
      );
      await auth.restore();
      await tester.pumpWidget(FiFBApp(auth: auth));
      await tester.pumpAndSettle();
      expect(auth.status, AuthStatus.unavailable);
      expect(find.text('Try again'), findsOneWidget);
      expect(store.token, 'saved');
    },
  );
}
