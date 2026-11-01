import 'dart:async';
import 'package:fifb/app.dart';
import 'package:fifb/exercises/exercise_detail_page.dart';
import 'package:fifb/exercises/exercise_library.dart';
import 'package:fifb/exercises/exercise_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'helpers.dart';

Map<String, dynamic> exercise(String id, String name) => {
  'id': id,
  'name': name,
  'instructions': ['Keep your back straight.'],
  'equipments': [
    {'name': 'Dumbbell'},
  ],
  'targetMuscles': [
    {'name': 'Quads'},
  ],
};
Map<String, dynamic> page(
  List<Map<String, dynamic>> items, {
  int number = 1,
  int pages = 1,
}) => {
  'items': items,
  'page': number,
  'totalPages': pages,
  'total': pages == 1 ? items.length : 21,
};

void main() {
  testWidgets(
    'taxonomy uses API route names and selected filters reach the list',
    (tester) async {
      final calls = <http.Request>[];
      final auth = createAuth((req) async {
        calls.add(req);
        switch (req.url.path) {
          case '/api/v1/exercise-taxonomy/bodyParts':
            return ok({
              'items': [
                {'name': 'Legs'},
              ],
            });
          case '/api/v1/exercise-taxonomy/equipments':
            return ok({
              'items': [
                {'name': 'Dumbbell'},
              ],
            });
          case '/api/v1/exercise-taxonomy/muscles':
            return ok({
              'items': [
                {'name': 'Quads'},
              ],
            });
          case '/api/v1/exercises':
            return ok(page([]));
          default:
            return failure(404, 'Unexpected route');
        }
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: ExerciseLibrary(
                repository: ExerciseRepository(auth.repository),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Filters unavailable'), findsNothing);
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Legs').last);
      await tester.pumpAndSettle();
      expect(calls.last.url.queryParameters['bodyPart'], 'Legs');
      await tester.tap(find.text('Clear filters'));
      await tester.pumpAndSettle();
      expect(calls.last.url.queryParameters.containsKey('bodyPart'), isFalse);
    },
  );

  test(
    'repository encodes filters and favorites use authenticated endpoints',
    () async {
      final calls = <http.Request>[];
      final auth = createAuth((req) async {
        calls.add(req);
        if (req.url.path.endsWith('/login')) return ok(tokenData());
        if (req.url.path.endsWith('/me')) return ok(userData());
        return ok(page([]));
      });
      await auth.login('member@example.com', 'password123');
      final repo = ExerciseRepository(auth.repository);
      await repo.list(
        keyword: 'press & row',
        equipment: 'body weight',
        targetMuscle: 'lats',
        page: 2,
      );
      expect(calls.last.url.queryParameters, {
        'page': '2',
        'limit': '20',
        'keyword': 'press & row',
        'equipment': 'body weight',
        'targetMuscle': 'lats',
      });
      await repo.list(favorites: true, keyword: 'ignored');
      expect(calls.last.url.path, '/api/v1/favorites');
      expect(calls.last.url.queryParameters.containsKey('keyword'), isFalse);
      expect(calls.last.headers['Authorization'], 'Bearer access-1');
    },
  );

  testWidgets('search ignores older results and retries failed requests', (
    tester,
  ) async {
    final delayed = Completer<http.Response>();
    var fail = true;
    final auth = createAuth((req) async {
      if (req.url.path.contains('exercise-taxonomy')) return ok({'items': []});
      final keyword = req.url.queryParameters['keyword'];
      if (keyword == 'old') return delayed.future;
      if (keyword == 'new' && fail) return failure(503, 'Try later');
      return ok(
        page([
          exercise('1', keyword == 'new' ? 'New result' : 'Initial exercise'),
        ]),
      );
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: ExerciseLibrary(
              repository: ExerciseRepository(auth.repository),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'old');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'new');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(find.text('Try later'), findsOneWidget);
    fail = false;
    await tester.ensureVisible(find.text('Retry exercises'));
    await tester.tap(find.text('Retry exercises'));
    await tester.pumpAndSettle();
    delayed.complete(ok(page([exercise('2', 'Stale result')])));
    await tester.pumpAndSettle();
    expect(find.text('New result'), findsOneWidget);
    expect(find.text('Stale result'), findsNothing);
  });

  testWidgets(
    'detail keeps content on favorite failure and supports add/remove',
    (tester) async {
      var saved = false, fail = true;
      final auth = createAuth((req) async {
        if (req.url.path.contains('/exercises/')) {
          return ok({'exercise': exercise('1', 'Squat')});
        }
        if (req.method == 'GET') return ok({'isFavorite': saved});
        if (fail) return failure(503, 'Save unavailable');
        saved = req.method == 'POST';
        return saved ? ok({}) : http.Response('', 204);
      });
      await tester.pumpWidget(
        MaterialApp(
          home: ExerciseDetailPage(
            repository: ExerciseRepository(auth.repository),
            id: '1',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Exercise preview unavailable'), findsOneWidget);
      await tester.tap(find.text('Add to favorites'));
      await tester.pumpAndSettle();
      expect(find.text('Save unavailable'), findsOneWidget);
      expect(find.text('Add to favorites'), findsOneWidget);
      fail = false;
      await tester.tap(find.text('Add to favorites'));
      await tester.pumpAndSettle();
      expect(find.text('Remove from favorites'), findsOneWidget);
      await tester.tap(find.text('Remove from favorites'));
      await tester.pumpAndSettle();
      expect(saved, isFalse);
      expect(find.text('1. Keep your back straight.'), findsOneWidget);
    },
  );

  for (final width in [320.0, 1280.0]) {
    testWidgets('Explore navigation and pagination fit width $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final auth = createAuth((req) async {
        if (req.url.path.endsWith('/login')) return ok(tokenData());
        if (req.url.path.endsWith('/me')) return ok(userData());
        if (req.url.path.contains('exercise-taxonomy')) {
          return ok({'items': []});
        }
        if (req.url.path.endsWith('/favorites')) return ok(page([]));
        final n = int.parse(req.url.queryParameters['page'] ?? '1');
        return ok(page([exercise('$n', 'Exercise $n')], number: n, pages: 2));
      });
      await auth.login('member@example.com', 'password123');
      await tester.pumpWidget(
        FiFBApp(auth: auth, initialLocation: '/user/explore'),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Next'));
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Exercise 2'), findsOneWidget);
      await tester.ensureVisible(find.text('Favorites'));
      await tester.tap(find.text('Favorites'));
      await tester.pumpAndSettle();
      expect(
        find.text('No favorites yet. Open an exercise to save it here.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }
}
