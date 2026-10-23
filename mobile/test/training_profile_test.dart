import 'dart:convert';
import 'package:fifb/training/training_profile_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'helpers.dart';

const savedProfile = {
  'goal': 'strength',
  'experienceLevel': 'beginner',
  'daysPerWeek': 3,
  'sessionMinutes': 45,
  'location': 'home',
  'equipmentIds': ['equipment-1'],
  'priorityMuscleIds': <String>[],
  'dislikedExerciseIds': <String>[],
  'limitations': 'No jumping',
};

Future<void> press(WidgetTester tester, String label) async {
  await tester.ensureVisible(find.text(label).last);
  await tester.tap(find.text(label).last);
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, String label, String value) async {
  await tester.ensureVisible(find.byKey(ValueKey(label)));
  await tester.tap(find.byKey(ValueKey(label)));
  await tester.pumpAndSettle();
  await tester.tap(find.text(value).last);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('onboarding validates each step and persists real selections', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    Map<String, dynamic>? payload;
    final auth = createAuth((request) async {
      if (request.method == 'PUT') {
        payload = jsonDecode(request.body);
        return ok({'profile': payload});
      }
      if (request.url.path.endsWith('training-profile')) {
        return ok({'profile': null});
      }
      if (request.url.path.endsWith('equipments')) {
        return ok({
          'items': [
            {'id': 'equipment-1', 'name': 'Dumbbell'},
          ],
        });
      }
      if (request.url.path.endsWith('muscles')) {
        return ok({
          'items': [
            {'id': 'muscle-1', 'name': 'Chest'},
          ],
        });
      }
      return ok({
        'items': [
          {'id': 'exercise-1', 'name': 'Push up'},
        ],
      });
    });
    await tester.pumpWidget(
      MaterialApp(home: TrainingProfilePage(repository: auth.repository)),
    );
    await tester.pumpAndSettle();
    await press(tester, 'Continue');
    expect(find.text('Choose Goal'), findsOneWidget);
    expect(payload, isNull);
    await choose(tester, 'Goal', 'Get stronger');
    await choose(tester, 'Experience', 'Beginner');
    await choose(tester, 'Days per week', '3');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Minutes per session (15–180)'),
      '45',
    );
    await press(tester, 'Continue');
    await choose(tester, 'Training location', 'Home');
    await press(tester, 'Dumbbell');
    await press(tester, 'Chest');
    await press(tester, 'Continue');
    await tester.enterText(
      find.widgetWithText(
        TextFormField,
        'Limitations to keep in mind (optional)',
      ),
      'No jumping',
    );
    await press(tester, 'Search');
    await press(tester, 'Push up');
    await press(tester, 'Save profile');
    expect(payload, {
      ...savedProfile,
      'priorityMuscleIds': ['muscle-1'],
      'dislikedExerciseIds': ['exercise-1'],
    });
  });

  testWidgets('load failure retries and failed saves preserve edits', (
    tester,
  ) async {
    var failLoad = true, failSave = true;
    Map<String, dynamic>? payload;
    final auth = createAuth((request) async {
      if (request.method == 'PUT') {
        payload = jsonDecode(request.body);
        return failSave
            ? failure(503, 'Offline; retry saving')
            : ok({'profile': payload});
      }
      if (request.url.path.endsWith('training-profile')) {
        return failLoad
            ? failure(503, 'Offline')
            : ok({'profile': savedProfile});
      }
      if (request.url.path.endsWith('muscles')) return ok({'items': []});
      return ok({
        'items': [
          {'id': 'equipment-1', 'name': 'Dumbbell'},
        ],
      });
    });
    await tester.pumpWidget(
      MaterialApp(home: TrainingProfilePage(repository: auth.repository)),
    );
    await tester.pumpAndSettle();
    expect(find.text('Offline'), findsOneWidget);
    failLoad = false;
    await press(tester, 'Retry');
    expect(find.text('Get stronger'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Minutes per session (15–180)'),
      '60',
    );
    await press(tester, 'Continue');
    await press(tester, 'Dumbbell');
    await press(tester, 'Continue');
    await press(tester, 'Save profile');
    expect(find.text('Offline; retry saving'), findsOneWidget);
    expect(payload!['sessionMinutes'], 60);
    expect(payload!['equipmentIds'], isEmpty);
    failSave = false;
    await press(tester, 'Save profile');
    expect(payload!['limitations'], 'No jumping');
    expect(tester.takeException(), isNull);
  });
}
