import 'dart:convert';
import 'package:fifb/workouts/plan_editor.dart';
import 'package:fifb/workouts/workout_pages.dart';
import 'package:fifb/workouts/workout_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'helpers.dart';

Map<String, dynamic> item(String id, String name, int day) => {
  'exercise_id': id,
  'exercise_name': name,
  'exercise_status': 'active',
  'day_number': day,
  'sets': 3,
  'reps': 10,
  'rest_seconds': 0,
};
Map<String, dynamic> plan() => {
  'id': 'plan-1',
  'title': 'My plan',
  'description': 'Original',
  'status': 'active',
  'schedule': [
    {'weekday': 1, 'dayNumber': 1},
  ],
  'items': [item('a', 'Squat', 1), item('b', 'Row', 1)],
};

Future<void> tapText(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).last);
  await tester.tap(find.text(text).last);
  await tester.pumpAndSettle();
}

void main() {
  test(
    'save normalizes order per day, clears description and preserves visibility on edit',
    () async {
      final calls = <http.Request>[];
      final auth = createAuth((req) async {
        calls.add(req);
        return ok({});
      });
      final repo = WorkoutRepository(auth.repository);
      await repo.save(
        id: 'plan-1',
        title: '  Test  ',
        description: '',
        items: [
          PlanItem(exerciseId: 'a', name: 'Squat', day: 2, rest: 0),
          PlanItem(exerciseId: 'b', name: 'Row', day: 1),
          PlanItem(exerciseId: 'c', name: 'Press', day: 2),
        ],
        schedule: {7: 2},
      );
      final body = jsonDecode(calls.single.body);
      expect(calls.single.method, 'PATCH');
      expect(body['title'], 'Test');
      expect(body['description'], '');
      expect(body.containsKey('visibility'), isFalse);
      expect((body['items'] as List).map((item) => item['sortOrder']), [
        1,
        1,
        2,
      ]);
      expect(body['items'][0]['restSeconds'], 0);
      expect(body['schedule'], [
        {'weekday': 7, 'dayNumber': 2},
      ]);
    },
  );

  testWidgets(
    'editor preserves changes after failure and asks before discarding',
    (tester) async {
      final auth = createAuth(
        (req) async => req.method == 'GET'
            ? ok({'plan': plan()})
            : failure(503, 'Save failed'),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PlanEditor(
                      repository: WorkoutRepository(auth.repository),
                      id: 'plan-1',
                    ),
                  ),
                ),
                child: const Text('Open editor'),
              ),
            ),
          ),
        ),
      );
      await tapText(tester, 'Open editor');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Plan title'),
        'Changed title',
      );
      await tapText(tester, 'Save plan');
      expect(find.text('Save failed'), findsOneWidget);
      expect(find.text('Changed title'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard unsaved changes?'), findsOneWidget);
      await tapText(tester, 'Keep editing');
      expect(find.text('Changed title'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tapText(tester, 'Discard');
      expect(find.text('Open editor'), findsOneWidget);
    },
  );

  testWidgets('removing a scheduled day clears schedule and saves empty plan', (
    tester,
  ) async {
    Map<String, dynamic>? saved;
    final auth = createAuth((req) async {
      if (req.method == 'GET') {
        return ok({
          'plan': {
            ...plan(),
            'items': [item('a', 'Squat', 1)],
          },
        });
      }
      saved = jsonDecode(req.body);
      return failure(503, 'Stay here');
    });
    await tester.pumpWidget(
      MaterialApp(
        home: PlanEditor(
          repository: WorkoutRepository(auth.repository),
          id: 'plan-1',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byTooltip('Remove exercise'));
    await tester.tap(find.byTooltip('Remove exercise'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Save plan');
    expect(saved!['items'], isEmpty);
    expect(saved!['schedule'], isEmpty);
  });

  testWidgets(
    'create validates title, picks exercise, configures targets and weekly schedule',
    (tester) async {
      Map<String, dynamic>? saved;
      final auth = createAuth((req) async {
        if (req.url.path.contains('exercise-taxonomy')) {
          return ok({'items': []});
        }
        if (req.url.path.endsWith('/exercises')) {
          return ok({
            'items': [
              {'id': 'a', 'name': 'Squat'},
            ],
            'page': 1,
            'totalPages': 1,
            'total': 1,
          });
        }
        saved = jsonDecode(req.body);
        return ok({});
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PlanEditor(
                      repository: WorkoutRepository(auth.repository),
                    ),
                  ),
                ),
                child: const Text('New plan'),
              ),
            ),
          ),
        ),
      );
      await tapText(tester, 'New plan');
      await tapText(tester, 'Save plan');
      expect(find.text('Enter a title'), findsOneWidget);
      await tester.ensureVisible(
        find.widgetWithText(TextFormField, 'Plan title'),
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Plan title'),
        'Beginner',
      );
      await tapText(tester, 'Add exercise');
      await tapText(tester, 'Squat');
      await tester.enterText(find.widgetWithText(TextFormField, 'Sets'), '3');
      await tester.enterText(find.widgetWithText(TextFormField, 'Reps'), '10');
      await tapText(tester, 'Apply');
      final monday = find.byType(DropdownButtonFormField<int>).first;
      await tester.ensureVisible(monday);
      await tester.tap(monday);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Day 1').last);
      await tester.pumpAndSettle();
      await tapText(tester, 'Save plan');
      expect(saved!['visibility'], 'private');
      expect(saved!['items'][0], containsPair('sets', 3));
      expect(saved!['schedule'], [
        {'weekday': 1, 'dayNumber': 1},
      ]);
      expect(find.text('New plan'), findsOneWidget);
    },
  );

  for (final width in [320.0, 1280.0]) {
    testWidgets('today uses local weekday and renders targets at $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final calls = <http.Request>[];
      final auth = createAuth((req) async {
        calls.add(req);
        return ok({
          'items': [
            {
              'planId': 'plan-1',
              'title': 'My plan',
              'dayNumber': 1,
              'items': [item('a', 'Squat', 1)],
            },
          ],
        });
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: TodayWorkout(
                repository: WorkoutRepository(auth.repository),
                now: () => DateTime(2026, 11, 1, 0, 5),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(calls.single.url.queryParameters['weekday'], '7');
      await tapText(tester, 'My plan · Day 1');
      expect(find.text('Squat'), findsOneWidget);
      expect(find.text('3 sets · 10 reps · 0s rest'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('plan list archive is confirmed and refreshes server state', (
    tester,
  ) async {
    var archived = false;
    final auth = createAuth((req) async {
      if (req.method == 'DELETE') {
        archived = true;
        return ok({});
      }
      return ok({
        'items': [
          {...plan(), 'status': archived ? 'archived' : 'active'},
        ],
        'totalPages': 1,
      });
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: WorkoutPlans(repository: WorkoutRepository(auth.repository)),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tapText(tester, 'Archive');
    expect(archived, isFalse);
    await tapText(tester, 'Confirm');
    expect(archived, isTrue);
    expect(find.text('Restore'), findsOneWidget);
  });
}
