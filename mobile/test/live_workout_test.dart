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
  bool failDelete = false;
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async {
    if (failWrite) throw Exception('Storage unavailable');
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    if (failDelete) throw Exception('Storage unavailable');
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
  test(
    'failed append preserves queue and retry does not remove a newer draft',
    () async {
      final store = MemoryWorkoutStore();
      var online = false;
      var requests = 0;
      final auth = createAuth((req) async {
        requests++;
        if (!online) throw http.ClientException('offline');
        return ok({});
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      const draftName = 'draft.session.exercise.new';
      await repo.saveLocal(draftName, {'Reps': '8'});
      final body = {
        'exerciseId': 'exercise',
        'setNumber': 1,
        'actualReps': 8,
        'clientOperationId': operationId(),
      };
      await expectLater(
        repo.queue('session', 'POST', '/logs', body, draftName: draftName),
        throwsA(isA<ApiException>()),
      );
      final original = await repo.local('pending.session');
      store.failWrite = true;
      await expectLater(
        repo.queue('session', 'POST', '/logs', {
          ...body,
          'setNumber': 2,
          'clientOperationId': operationId(),
        }),
        throwsException,
      );
      expect(await repo.local('pending.session'), original);
      expect(requests, 1);
      store.failWrite = false;
      await repo.saveLocal(draftName, {'Reps': '15'});
      online = true;
      await repo.flush('session');
      expect((await repo.local(draftName))!['Reps'], '15');
    },
  );

  test(
    'offline queue serializes appends and resumes after partial sync',
    () async {
      final store = MemoryWorkoutStore();
      var online = false;
      var failSecond = true;
      final accepted = <int>[];
      final auth = createAuth((req) async {
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        final number = body['setNumber'] as int;
        if (!online || (number == 2 && failSecond)) {
          throw http.ClientException('offline');
        }
        accepted.add(number);
        return ok({
          'log': {
            'id': 'set$number',
            'exercise_id': 'exercise',
            'set_number': number,
            'client_operation_id': body['clientOperationId'],
          },
        });
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      await repo.saveLocal('session.session', sessionData());
      Future<void> add(int n) async {
        await expectLater(
          repo.queue('session', 'POST', '/logs', {
            'exerciseId': 'exercise',
            'setNumber': n,
            'actualReps': 8,
            'clientOperationId': operationId(),
          }),
          throwsA(isA<ApiException>()),
        );
      }

      await Future.wait([add(1), add(2), add(3)]);
      expect(
        SessionRepository.operations(
          await repo.local('pending.session'),
        ).length,
        3,
      );
      online = true;
      await expectLater(repo.flush('session'), throwsA(isA<ApiException>()));
      expect(accepted, [1]);
      expect((await repo.local('session.session'))!['logs'], hasLength(1));
      expect(
        SessionRepository.operations(
          await repo.local('pending.session'),
        ).map((e) => e['body']['setNumber']),
        [2, 3],
      );
      failSecond = false;
      await SessionRepository(
        auth.repository,
        'owner',
        store: store,
      ).flush('session');
      expect(accepted, [1, 2, 3]);
      expect(await repo.local('pending.session'), isNull);
      expect((await repo.local('session.session'))!['logs'], hasLength(3));
    },
  );

  test('rejection blocks queue and discard preserves later sets', () async {
    final store = MemoryWorkoutStore();
    final calls = <int>[];
    final auth = createAuth((req) async {
      final number = jsonDecode(req.body)['setNumber'] as int;
      calls.add(number);
      return number == 1 ? failure(409, 'Session completed elsewhere') : ok({});
    });
    final repo = SessionRepository(auth.repository, 'owner', store: store);
    Map<String, dynamic> item(int n) => {
      'method': 'POST',
      'suffix': '/logs',
      'body': {'setNumber': n, 'clientOperationId': operationId()},
    };
    await repo.saveLocal('pending.session', {
      ...item(1),
      'remaining': [item(2)],
    });
    await expectLater(repo.flush('session'), throwsA(isA<ApiException>()));
    await expectLater(repo.flush('session'), throwsA(isA<ApiException>()));
    expect(calls, [1]);
    await expectLater(
      repo.queue('session', 'POST', '/logs', item(3)['body']),
      throwsA(isA<ApiException>()),
    );
    await repo.dismissRejected('session');
    expect(
      SessionRepository.operations(await repo.local('pending.session')).length,
      1,
    );
    await repo.flush('session');
    expect(calls, [1, 2]);
  });

  testWidgets(
    'offline sets remain visible, number consecutively and sync after reopening',
    (tester) async {
      final store = MemoryWorkoutStore();
      var online = false;
      final serverLogs = <Map<String, dynamic>>[];
      final auth = createAuth((req) async {
        if (!online) throw http.ClientException('offline');
        if (req.method == 'POST') {
          final body = jsonDecode(req.body);
          final log = {
            'id': 'set${body['setNumber']}',
            'exercise_id': 'exercise',
            'set_number': body['setNumber'],
            'actual_reps': body['actualReps'],
            'client_operation_id': body['clientOperationId'],
          };
          serverLogs.add(log);
          return ok({'log': log});
        }
        return ok({'session': sessionData(logs: serverLogs)});
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      await repo.saveLocal('session.session', sessionData());
      await tester.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(repository: repo, id: 'session'),
        ),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, 'Log set');
      await tapVisible(tester, 'Save set');
      await tapVisible(tester, 'Copy previous set');
      expect(find.textContaining('Pending sync'), findsNWidgets(2));
      final queued = SessionRepository.operations(
        await repo.local('pending.session'),
      );
      expect(queued.map((e) => e['body']['setNumber']), [1, 2]);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Finish workout'),
            )
            .onPressed,
        isNull,
      );
      await tester.pumpWidget(const SizedBox());
      online = true;
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
      expect(serverLogs.length, 2);
      expect(find.textContaining('Pending sync'), findsNothing);
      expect(await repo.local('pending.session'), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  for (final width in [320.0, 1280.0]) {
    testWidgets(
      'draft survives reopening and is consumed on submit at $width',
      (tester) async {
        tester.view.physicalSize = Size(width, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final store = MemoryWorkoutStore();
        final requests = <Map<String, dynamic>>[];
        final auth = createAuth((req) async {
          if (req.method == 'POST') {
            requests.add(jsonDecode(req.body) as Map<String, dynamic>);
            return ok({});
          }
          return ok({'session': sessionData()});
        });
        SessionRepository repo() =>
            SessionRepository(auth.repository, 'owner', store: store);
        await tester.pumpWidget(
          MaterialApp(
            home: LiveWorkoutPage(repository: repo(), id: 'session'),
          ),
        );
        await tester.pumpAndSettle();
        await tapVisible(tester, 'Log set');
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Reps'),
          '13',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Weight (kg)'),
          '0',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Note'),
          'slow tempo',
        );
        await tester.pumpAndSettle();
        // Simulate closing the app without pressing Keep draft.
        await tester.pumpWidget(const SizedBox());
        await tester.pumpWidget(
          MaterialApp(
            home: LiveWorkoutPage(repository: repo(), id: 'session'),
          ),
        );
        await tester.pumpAndSettle();
        await tapVisible(tester, 'Log set');
        expect(find.text('13'), findsOneWidget);
        expect(find.text('slow tempo'), findsOneWidget);
        expect(
          await SessionRepository(
            auth.repository,
            'other',
            store: store,
          ).local('draft.session.exercise.new'),
          isNull,
        );
        await tapVisible(tester, 'Save set');
        expect(requests.single['actualReps'], 13);
        expect(requests.single['actualWeightKg'], 0);
        expect(requests.single['note'], 'slow tempo');
        expect(await repo().local('draft.session.exercise.new'), isNull);
        await tapVisible(tester, 'Log set');
        expect(find.text('13'), findsNothing);
        await tapVisible(tester, 'Discard draft');
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets('draft storage failure keeps form open and prevents submission', (
    tester,
  ) async {
    final store = MemoryWorkoutStore();
    var posts = 0;
    final auth = createAuth((req) async {
      if (req.method == 'POST') posts++;
      return ok({'session': sessionData()});
    });
    final repo = SessionRepository(auth.repository, 'owner', store: store);
    await tester.pumpWidget(
      MaterialApp(
        home: LiveWorkoutPage(repository: repo, id: 'session'),
      ),
    );
    await tester.pumpAndSettle();
    await tapVisible(tester, 'Log set');
    store.failWrite = true;
    await tester.enterText(find.widgetWithText(TextFormField, 'Reps'), '11');
    await tester.pumpAndSettle();
    await tapVisible(tester, 'Save set');
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(posts, 0);
    store.failWrite = false;
    await tapVisible(tester, 'Keep draft');
    expect((await repo.local('draft.session.exercise.new'))!['Reps'], '11');
    await tapVisible(tester, 'Log set');
    await tapVisible(tester, 'Discard draft');
    expect(await repo.local('draft.session.exercise.new'), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  test(
    'interrupted draft handoff recovers exact request before clearing journal',
    () async {
      final store = MemoryWorkoutStore();
      final requests = <String>[];
      final auth = createAuth((req) async {
        requests.add(req.body);
        if (requests.length == 1) throw http.ClientException('response lost');
        return ok({});
      });
      final repo = SessionRepository(auth.repository, 'owner', store: store);
      const name = 'draft.session.exercise.new';
      await repo.saveLocal(name, {'Reps': '12'});
      final body = {'actualReps': 12, 'clientOperationId': operationId()};
      store.failDelete = true;
      await expectLater(
        repo.queue('session', 'POST', '/logs', body, draftName: name),
        throwsException,
      );
      expect(requests, isEmpty);
      expect(await repo.local(name), isNotNull);
      expect((await repo.local('pending.session'))!['body'], body);
      store.failDelete = false;
      final recreated = SessionRepository(
        auth.repository,
        'owner',
        store: store,
      );
      await expectLater(
        recreated.flush('session'),
        throwsA(isA<ApiException>()),
      );
      expect(await repo.local(name), isNull);
      expect(await repo.local('pending.session'), isNotNull);
      await recreated.flush('session');
      expect(requests[0], requests[1]);
      expect(await repo.local('pending.session'), isNull);
    },
  );

  testWidgets('reopening confirms a pending set and refreshes server data', (
    tester,
  ) async {
    final store = MemoryWorkoutStore();
    final methods = <String>[];
    final body = {
      'setNumber': 1,
      'actualReps': 8,
      'clientOperationId': operationId(),
    };
    final auth = createAuth((req) async {
      methods.add(req.method);
      if (req.method == 'POST') {
        expect(jsonDecode(req.body), body);
        return ok({});
      }
      return ok({'session': sessionData()});
    });
    final repo = SessionRepository(auth.repository, 'owner', store: store);
    await repo.saveLocal('pending.session', {
      'method': 'POST',
      'suffix': '/logs',
      'body': body,
    });
    await tester.pumpWidget(
      MaterialApp(
        home: LiveWorkoutPage(repository: repo, id: 'session'),
      ),
    );
    await tester.pumpAndSettle();
    expect(methods, ['GET', 'POST', 'GET']);
    expect(await repo.local('pending.session'), isNull);
    expect(find.text('Retry sync'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'app resume refreshes completed state and removes observer on close',
    (tester) async {
      var completed = false;
      var reads = 0;
      final auth = createAuth((req) async {
        reads++;
        return ok({
          'session': {
            ...sessionData(),
            'completed_at': completed ? '2026-11-06T00:00:00Z' : null,
          },
        });
      });
      final repo = SessionRepository(
        auth.repository,
        'owner',
        store: MemoryWorkoutStore(),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(repository: repo, id: 'session'),
        ),
      );
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      completed = true;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(reads, 2);
      expect(find.text('Workout complete'), findsOneWidget);
      expect(find.text('Log set'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      expect(reads, 2);
    },
  );

  testWidgets('rejected recovery stays visible and is not retried on resume', (
    tester,
  ) async {
    var writes = 0;
    final auth = createAuth((req) async {
      if (req.method == 'POST') {
        writes++;
        return failure(409, 'Workout already completed');
      }
      return ok({'session': sessionData()});
    });
    final repo = SessionRepository(
      auth.repository,
      'owner',
      store: MemoryWorkoutStore(),
    );
    await repo.saveLocal('pending.session', {
      'method': 'POST',
      'suffix': '/logs',
      'body': {'setNumber': 1},
    });
    await tester.pumpWidget(
      MaterialApp(
        home: LiveWorkoutPage(repository: repo, id: 'session'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Discard rejected change'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(writes, 1);
    expect(find.text('Discard rejected change'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

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
      await tapVisible(tester, 'Keep draft');
      await tapVisible(tester, 'Log set');
      expect(find.text('12'), findsNothing);
      await tapVisible(tester, 'Discard draft');
      await tapVisible(tester, 'Edit set');
      expect(find.text('12'), findsOneWidget);
      await tapVisible(tester, 'Save set');
      expect(logs[0]['actual_reps'], 12);
      expect(
        await SessionRepository(
          auth.repository,
          'owner',
          store: store,
        ).local('draft.session.exercise.set'),
        isNull,
      );
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
    expect(find.text('Full body'), findsNothing);
    expect(find.text('Forbidden'), findsOneWidget);
    expect(find.text('Retry sync'), findsNothing);
    expect(find.textContaining('Pending set'), findsNothing);
    expect(await repo.local('pending.session'), isNotNull);
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
