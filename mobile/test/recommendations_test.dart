import 'dart:convert';
import 'package:fifb/workouts/live_workout_page.dart';
import 'package:fifb/workouts/recommendation_page.dart';
import 'package:fifb/workouts/session_repository.dart';
import 'package:fifb/workouts/workout_pages.dart';
import 'package:fifb/workouts/workout_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'helpers.dart';
import 'live_workout_test.dart' show MemoryWorkoutStore, sessionData;

Future<void> tap(WidgetTester t, String text) async {
  final target = find.text(text).last;
  await t.ensureVisible(target);
  await t.tap(target);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'preview displays schedule and reasons, saves once and refreshes Workout',
    (t) async {
      var saved = false;
      final auth = createAuth((r) async {
        if (r.url.path.endsWith('/workout-plans')) {
          return ok({
            'items': [
              if (saved)
                {'id': 'plan', 'title': 'Full Body', 'status': 'active'},
            ],
            'totalPages': 1,
          });
        }
        if (r.url.path.endsWith('/recommendations')) {
          return ok({
            'runId': 'run',
            'plan': {
              'title': 'Full Body',
              'schedule': [
                {'weekday': 1, 'dayNumber': 1},
              ],
            },
            'selections': [
              {
                'dayNumber': 1,
                'name': 'Squat',
                'minutes': 4,
                'reason': 'Matches equipment',
              },
            ],
          });
        }
        expect(r.url.path, '/api/v1/recommendations/run/accept');
        expect(saved, isFalse);
        saved = true;
        return ok({'planId': 'plan'});
      });
      await t.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListView(
              children: [
                WorkoutPlans(repository: WorkoutRepository(auth.repository)),
              ],
            ),
          ),
        ),
      );
      await t.pumpAndSettle();
      await tap(t, 'Suggest a plan');
      expect(find.text('Monday · 4 min'), findsOneWidget);
      expect(find.textContaining('Matches equipment'), findsOneWidget);
      await tap(t, 'Save plan');
      expect(saved, isTrue);
      expect(find.text('Full Body'), findsOneWidget);
    },
  );

  testWidgets(
    'replacement keeps the preview after conflict and sends the selected equipment and budget',
    (t) async {
      var requests = 0;
      final auth = createAuth((r) async {
        if (r.url.path.endsWith('/equipments')) {
          return ok({
            'items': [
              {'id': 'gear', 'name': 'Dumbbell'},
            ],
          });
        }
        if (r.url.path.endsWith('/training-profile')) {
          return ok({
            'profile': {
              'equipmentIds': ['gear'],
            },
          });
        }
        if (r.url.path.endsWith('/accept')) {
          expect(jsonDecode(r.body), {'runId': 'r1'});
          return failure(409, 'This slot changed');
        }
        expect(jsonDecode(r.body), {
          'reason': 'equipment_busy',
          'slotId': 'slot',
          'expectedExerciseId': 'old',
          'equipmentIds': [],
          'remainingMinutes': 5,
        });
        requests++;
        return ok({
          'runId': 'r$requests',
          'replacement': {'exercise_name': 'Bodyweight squat'},
          'minutes': 4,
          'reason': 'Fits your equipment',
        });
      });
      await t.pumpWidget(
        MaterialApp(
          home: RecommendationPage(
            auth: auth.repository,
            mode: WorkoutAdvice.replacement,
            sessionId: 'session',
            exercise: const {'id': 'slot', 'exercise_id': 'old'},
          ),
        ),
      );
      await t.pumpAndSettle();
      await tap(t, 'Dumbbell');
      await t.enterText(find.byType(TextField), '5');
      await tap(t, 'Find replacement');
      await tap(t, 'Apply change');
      expect(find.text('This slot changed'), findsOneWidget);
      await tap(t, 'Refresh preview');
      expect(requests, 2);
    },
  );
  testWidgets(
    'queued set blocks replacement of a different slot until synced',
    (t) async {
      final data = sessionData();
      (data['planned_exercises'] as List).first['id'] = 'slot';
      final auth = createAuth((r) async => ok({'session': data}));
      final repo = SessionRepository(
        auth.repository,
        'owner',
        store: MemoryWorkoutStore(),
      );
      await repo.saveLocal('pending.session', {
        'method': 'POST',
        'suffix': '/logs',
        'body': {'exerciseId': 'other', 'setNumber': 1},
        'rejected': true,
      });
      await t.pumpWidget(
        MaterialApp(
          home: LiveWorkoutPage(repository: repo, id: 'session'),
        ),
      );
      await t.pumpAndSettle();
      expect(
        t
            .widget<TextButton>(
              find.widgetWithText(TextButton, 'Replace exercise'),
            )
            .onPressed,
        isNull,
      );
      await t.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'rating can be saved and the next suggestion explicitly dismissed',
    (t) async {
      final paths = <String>[];
      final auth = createAuth((r) async {
        paths.add(r.url.path);
        if (r.method == 'PUT') {
          expect(jsonDecode(r.body), {
            'difficulty': 'easy',
            'preference': 'disliked',
          });
          return ok({'saved': true});
        }
        if (r.method == 'GET') {
          return ok({
            'runId': 'r',
            'target': {'reps': 8, 'target_weight_kg': 20.5},
            'reason': 'Two completed workouts at 12 reps.',
          });
        }
        return ok({'decision': 'dismissed'});
      });
      Future<void> open(WorkoutAdvice mode) async {
        await t.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RecommendationPage(
                        auth: auth.repository,
                        mode: mode,
                        sessionId: 's',
                        exercise: const {'exercise_id': 'e'},
                      ),
                    ),
                  ),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );
        await tap(t, 'Open');
      }

      await open(WorkoutAdvice.feedback);
      await tap(t, 'right');
      await tap(t, 'easy');
      await tap(t, 'Keep current preference');
      await tap(t, 'disliked');
      await tap(t, 'Save feedback');
      await open(WorkoutAdvice.progression);
      expect(find.text('8 reps · 20.5 kg'), findsOneWidget);
      await tap(t, 'Dismiss');
      expect(paths, [
        '/api/v1/workout-sessions/s/exercises/e/feedback',
        '/api/v1/workout-sessions/s/exercises/e/suggestion',
        '/api/v1/recommendations/r/dismiss',
      ]);
    },
  );
}
