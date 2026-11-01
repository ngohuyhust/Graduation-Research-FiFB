import '../auth/auth_repository.dart';

const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

class PlanItem {
  PlanItem({
    required this.exerciseId,
    required this.name,
    this.day = 1,
    this.sets,
    this.reps,
    this.duration,
    this.rest,
    this.note = '',
    this.active = true,
  });
  factory PlanItem.fromJson(Map<String, dynamic> json) => PlanItem(
    exerciseId: json['exercise_id'] as String,
    name: json['exercise_name'] as String? ?? 'Unavailable exercise',
    active: json['exercise_status'] == 'active',
    day: json['day_number'] as int,
    sets: json['sets'] as int?,
    reps: json['reps'] as int?,
    duration: json['duration_seconds'] as int?,
    rest: json['rest_seconds'] as int?,
    note: json['note'] as String? ?? '',
  );
  final String exerciseId, name;
  final bool active;
  int day;
  int? sets, reps, duration, rest;
  String note;
  Map<String, dynamic> payload(int order) => {
    'exerciseId': exerciseId,
    'dayNumber': day,
    'sortOrder': order,
    if (sets != null) 'sets': sets,
    if (reps != null) 'reps': reps,
    if (duration != null) 'durationSeconds': duration,
    if (rest != null) 'restSeconds': rest,
    if (note.trim().isNotEmpty) 'note': note.trim(),
  };
  String get summary => [
    if (sets != null) '$sets sets',
    if (reps != null) '$reps reps',
    if (duration != null) '${duration}s work',
    if (rest != null) '${rest}s rest',
  ].join(' · ');
}

class WorkoutRepository {
  WorkoutRepository(this.auth);
  final AuthRepository auth;
  Future<Map<String, dynamic>> list(int page) =>
      auth.authorized('GET', '/workout-plans?page=$page&limit=20');
  Future<Map<String, dynamic>> detail(String id) async =>
      (await auth.authorized('GET', '/workout-plans/$id'))['plan']
          as Map<String, dynamic>;
  Future<void> save({
    String? id,
    required String title,
    required String description,
    required List<PlanItem> items,
    required Map<int, int> schedule,
  }) async {
    final counts = <int, int>{};
    await auth.authorized(
      id == null ? 'POST' : 'PATCH',
      id == null ? '/workout-plans' : '/workout-plans/$id',
      body: {
        'title': title.trim(),
        'description': description.trim(),
        if (id == null) 'visibility': 'private',
        'items': [
          for (final item in items)
            item.payload(
              counts.update(item.day, (n) => n + 1, ifAbsent: () => 1),
            ),
        ],
        'schedule': [
          for (final entry in schedule.entries)
            {'weekday': entry.key, 'dayNumber': entry.value},
        ],
      },
    );
  }

  Future<void> archive(String id) async {
    await auth.authorized('DELETE', '/workout-plans/$id');
  }

  Future<void> restore(String id) async {
    await auth.authorized(
      'PATCH',
      '/workout-plans/$id',
      body: {'status': 'active'},
    );
  }

  Future<List<Map<String, dynamic>>> today(DateTime localDate) async =>
      ((await auth.authorized(
                'GET',
                '/workout-plans/today?weekday=${localDate.weekday}',
              ))['items']
              as List)
          .cast<Map<String, dynamic>>();
}
