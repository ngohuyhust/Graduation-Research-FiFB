import 'dart:convert';
import 'package:fifb/workouts/session_repository.dart';
import 'package:fifb/workouts/live_workout_page.dart';
import 'package:fifb/core/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'helpers.dart';

class MemoryWorkoutStore implements WorkoutStore {
  final values = <String, String>{};
  bool failWrite = false;
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async {
    if (failWrite) throw Exception('Storage unavailable');
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

Map<String, dynamic> sessionData({
  List<Map<String, dynamic>> logs = const [],
  bool paused = false,
}) => {
  'id': 'session',
  'title': 'Full body',
  'paused': paused,
  'completed_at': null,
  'rest_ends_at': null,
  'logs': logs,
  'planned_exercises': [
    {
      'exercise_id': 'exercise',
      'exercise_name': 'Squat',
      'sets': 3,
      'reps': 8,
      'rest_seconds': 60,
    },
  ],
};

Future<void> tapVisible(WidgetTester tester, String label) async {
  await tester.ensureVisible(find.text(label).last);
  await tester.tap(find.text(label).last);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 350));
}

void main() {
  for (final width in [320.0, 1280.0]) {
    testWidgets('editing and deleting sets works at width $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final store = MemoryWorkoutStore();
      var logs = <Map<String, dynamic>>[
        {
          'id': 'set',
          'exercise_id': 'exercise',
          'exercise_name': 'Squat',
          'set_number': 1,
          'actual_reps': 8,
          'actual_weight_kg': '20.00',
        },
      ];
      final auth = createAuth((req) async {
        if (req.method == 'PUT') {
          final body = jsonDecode(req.body);
          logs[0] = {...logs[0], 'actual_reps': body['actualReps']};
          return ok({});
        }
        if (req.method == 'DELETE') {
          logs = [];
          return ok({});
        }
        return ok({'session': sessionData(logs: logs)});
      });
      await tester.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(
            repository: SessionRepository(
              auth.repository,
              'owner',
              store: store,
            ),
            id: 'session',
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, 'Edit set');
      await tester.enterText(find.widgetWithText(TextFormField, 'Reps'), '12');
      await tapVisible(tester, 'Save set');
      expect(logs[0]['actual_reps'], 12);
      await tapVisible(tester, 'Delete set');
      await tapVisible(tester, 'Confirm');
      expect(logs, isEmpty);
      expect(find.text('Edit set'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }

  test(
    'uncertain start survives repository recreation and uses identical request',
    () async {
      final store = MemoryWorkoutStore();
      final calls = <String>[];
      final auth = createAuth((req) async {
        calls.add(req.body);
        if (calls.length == 1) throw http.ClientException('response lost');
        return ok({
          'session': {'id': 'session'},
        });
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      await expectLater(
        repo.start(
          workout: {'planId': 'plan', 'dayNumber': 2, 'title': 'Full body'},
        ),
        throwsA(isA<ApiException>()),
      );
      final recreated = SessionRepository(
        auth.repository,
        'owner',
        store: store,
      );
      await recreated.start();
      expect(calls[1], calls[0]);
      expect(await recreated.local('start'), isNull);
      expect(await recreated.local('last'), {'id': 'session'});
    },
  );

  test(
    'pending set is durable, account scoped and replays unchanged after restart',
    () async {
      final store = MemoryWorkoutStore();
      final calls = <String>[];
      final auth = createAuth((req) async {
        calls.add(req.body);
        if (calls.length == 1) return failure(503, 'Offline');
        return ok({
          'log': {'id': 'set'},
        });
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      final body = {
        'exerciseId': 'exercise',
        'actualReps': 8,
        'actualWeightKg': 0,
        'clientOperationId': operationId(),
      };
      await expectLater(
        repo.queue('session', 'POST', '/logs', body),
        throwsA(isA<ApiException>()),
      );
      expect(
        await SessionRepository(
          auth.repository,
          'another',
          store: store,
        ).local('pending.session'),
        isNull,
      );
      await expectLater(
        repo.dismissRejected('session'),
        throwsA(isA<ApiException>()),
      );
      await SessionRepository(
        auth.repository,
        'owner',
        store: store,
      ).flush('session');
      expect(calls[1], calls[0]);
      expect(await repo.local('pending.session'), isNull);
    },
  );

  test(
    'storage failure stops network writes and rejected changes can be discarded',
    () async {
      final store = MemoryWorkoutStore()..failWrite = true;
      var calls = 0;
      final auth = createAuth((_) async {
        calls++;
        return failure(400, 'Exercise retired');
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      await expectLater(
        repo.queue('session', 'POST', '/logs', {'actualReps': 8}),
        throwsException,
      );
      expect(calls, 0);
      store.failWrite = false;
      await expectLater(
        repo.queue('session', 'POST', '/logs', {'actualReps': 8}),
        throwsA(isA<ApiException>()),
      );
      expect((await repo.local('pending.session'))!['rejected'], isTrue);
      await repo.dismissRejected('session');
      expect(await repo.local('pending.session'), isNull);
    },
  );

  testWidgets(
    'set logging and one-tap copy preserve zero weight and start rest',
    (tester) async {
      final store = MemoryWorkoutStore();
      final logs = <Map<String, dynamic>>[];
      final bodies = <Map<String, dynamic>>[];
      String? rest;
      final auth = createAuth((req) async {
        if (req.method == 'GET') {
          return ok({
            'session': {...sessionData(logs: logs), 'rest_ends_at': rest},
          });
        }
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        bodies.add(body);
        rest = body['restEndsAt'];
        logs.add({
          'id': 'set-${logs.length}',
          'exercise_id': body['exerciseId'],
          'exercise_name': 'Squat',
          'set_number': body['setNumber'],
          'actual_reps': body['actualReps'],
          'actual_weight_kg': body['actualWeightKg'],
        });
        return ok({'log': logs.last});
      });
      await tester.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(
            repository: SessionRepository(
              auth.repository,
              'owner',
              store: store,
            ),
            id: 'session',
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, 'Log set');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Weight (kg)'),
        '0',
      );
      await tapVisible(tester, 'Save set');
      expect(bodies.single['actualWeightKg'], 0);
      expect(find.textContaining('Rest:'), findsOneWidget);
      await tapVisible(tester, 'Copy previous set');
      expect(bodies.length, 2);
      expect(bodies[1]['actualReps'], 8);
      expect(bodies[1]['setNumber'], 2);
      expect(
        bodies[1]['clientOperationId'],
        isNot(bodies[0]['clientOperationId']),
      );
      expect(find.byType(AlertDialog), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'offline reopening shows cached workout and a recoverable pending set',
    (tester) async {
      final store = MemoryWorkoutStore();
      final auth = createAuth(
        (_) async => throw http.ClientException('offline'),
      );
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      await repo.saveLocal('session.session', sessionData());
      await repo.saveLocal('pending.session', {
        'method': 'POST',
        'suffix': '/logs',
        'body': {'setNumber': 1, 'actualReps': 8},
      });
      await tester.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(repository: repo, id: 'session'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Full body'), findsOneWidget);
      expect(find.text('Retry sync'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Log set'))
            .onPressed,
        isNull,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('authorization failure never displays a cached session', (
    tester,
  ) async {
    final store = MemoryWorkoutStore();
    final auth = createAuth((_) async => failure(403, 'Forbidden'));
    final repo = SessionRepository(auth.repository, 'owner', store: store);
    await repo.saveLocal('session.session', sessionData());
    await tester.pumpWidget(
      MaterialApp(
        home: LiveWorkoutPage(repository: repo, id: 'session'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Full body'), findsNothing);
    expect(find.text('Forbidden'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('pause persists and completed session is read only', (
    tester,
  ) async {
    final store = MemoryWorkoutStore();
    var paused = false, completed = false;
    final auth = createAuth((req) async {
      if (req.method == 'PATCH') {
        final body = jsonDecode(req.body);
        paused = body['paused'] ?? paused;
        completed = body['completed'] ?? completed;
        return ok({});
      }
      return ok({
        'session': {
          ...sessionData(paused: paused),
          'completed_at': completed ? '2026-11-01T00:00:00Z' : null,
        },
      });
    });
    await tester.pumpWidget(
      MaterialApp(
        home: LiveWorkoutPage(
          repository: SessionRepository(auth.repository, 'owner', store: store),
          id: 'session',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tapVisible(tester, 'Pause workout');
    expect(paused, isTrue);
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Log set'))
          .onPressed,
      isNull,
    );
    await tapVisible(tester, 'Resume workout');
    expect(paused, isFalse);
    await tapVisible(tester, 'Finish workout');
    await tapVisible(tester, 'Confirm');
    expect(find.text('Workout complete'), findsOneWidget);
    expect(find.text('Log set'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
}
