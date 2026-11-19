import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';
import '../training/training_profile_page.dart';
import 'workout_repository.dart';

enum WorkoutAdvice { plan, replacement, progression, feedback }

class RecommendationPage extends StatefulWidget {
  const RecommendationPage({
    super.key,
    required this.auth,
    required this.mode,
    this.sessionId,
    this.exercise,
  });
  final AuthRepository auth;
  final WorkoutAdvice mode;
  final String? sessionId;
  final Map<String, dynamic>? exercise;
  @override
  State<RecommendationPage> createState() => _RecommendationPageState();
}

class _RecommendationPageState extends State<RecommendationPage> {
  Map<String, dynamic>? preview;
  List<Map<String, dynamic>> equipment = [];
  final selected = <String>{};
  final minutes = TextEditingController();
  String changeReason = 'equipment_busy', difficulty = 'right', preference = '';
  bool busy = false, ready = false;
  String? error;
  String get session => '/workout-sessions/${widget.sessionId}';
  String get exercise =>
      '$session/exercises/${widget.exercise?['exercise_id']}';
  String get path => switch (widget.mode) {
    WorkoutAdvice.plan => '/recommendations',
    WorkoutAdvice.replacement => '$session/substitutions',
    WorkoutAdvice.progression => '$exercise/suggestion',
    WorkoutAdvice.feedback => '$exercise/feedback',
  };
  @override
  void initState() {
    super.initState();
    initialize();
  }

  @override
  void dispose() {
    minutes.dispose();
    super.dispose();
  }

  Future<void> perform(Future<void> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await action();
    } catch (e) {
      if (mounted) error = AuthController.messageFor(e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> initialize() => perform(() async {
    if (widget.mode == WorkoutAdvice.replacement) {
      final data = await widget.auth.api.send(
        'GET',
        '/exercise-taxonomy/equipments',
      );
      final profile = (await widget.auth.authorized(
        'GET',
        '/users/me/training-profile',
      ))['profile'];
      equipment = (data['items'] as List).cast<Map<String, dynamic>>();
      selected.addAll((profile?['equipmentIds'] as List? ?? []).cast<String>());
    } else if (widget.mode != WorkoutAdvice.feedback) {
      preview = await widget.auth.authorized(
        widget.mode == WorkoutAdvice.plan ? 'POST' : 'GET',
        path,
      );
    }
    ready = true;
  });
  Future<void> propose() => perform(() async {
    final time = int.tryParse(minutes.text.trim());
    if (minutes.text.trim().isNotEmpty &&
        (time == null || time <= 0 || time > 180)) {
      error = 'Enter between 1 and 180 minutes.';
      return;
    }
    preview = await widget.auth.authorized(
      'POST',
      path,
      body: {
        'slotId': widget.exercise!['id'],
        'expectedExerciseId': widget.exercise!['exercise_id'],
        'reason': changeReason,
        'equipmentIds': selected.toList(),
        'remainingMinutes': ?time,
      },
    );
  });
  Future<void> decide(bool accept) => perform(() async {
    final id = preview!['runId'];
    if (accept && widget.mode != WorkoutAdvice.plan) {
      await widget.auth.authorized('POST', '$path/accept', body: {'runId': id});
    } else {
      await widget.auth.authorized(
        'POST',
        '/recommendations/$id/${accept ? 'accept' : 'dismiss'}',
      );
    }
    if (mounted) Navigator.pop(context, accept);
  });
  Future<void> editProfile() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TrainingProfilePage(repository: widget.auth),
      ),
    );
    if (mounted) await initialize();
  }

  Future<void> saveFeedback() => perform(() async {
    await widget.auth.authorized(
      'PUT',
      path,
      body: {
        'difficulty': difficulty,
        if (preference.isNotEmpty) 'preference': preference,
      },
    );
    if (mounted) Navigator.pop(context, true);
  });
  @override
  Widget build(BuildContext context) {
    final result = preview;
    final title = switch (widget.mode) {
      WorkoutAdvice.plan => 'Suggested plan',
      WorkoutAdvice.replacement => 'Replace exercise',
      WorkoutAdvice.progression => 'Next target',
      WorkoutAdvice.feedback => 'Exercise feedback',
    };
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.exercise != null)
              Text(
                widget.exercise!['exercise_name'] ?? 'Exercise',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            if (busy) const LinearProgressIndicator(),
            if (error != null) ...[
              Text(error!),
              if (!ready)
                TextButton(
                  onPressed: busy ? null : initialize,
                  child: const Text('Retry'),
                ),
            ],
            if (result != null) ...[
              if (result['problem'] != null) Text(result['problem']),
              if (result['plan'] case final Map plan) ...[
                Text(
                  plan['title'],
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                for (final day in plan['schedule']) ...[
                  Builder(
                    builder: (_) {
                      final selections = (result['selections'] as List).where(
                        (s) => s['dayNumber'] == day['dayNumber'],
                      );
                      final total = selections.fold<int>(
                        0,
                        (n, s) => n + (s['minutes'] as int),
                      );
                      return Text(
                        '${weekdays[day['weekday'] - 1]} · $total min',
                        style: Theme.of(context).textTheme.titleMedium,
                      );
                    },
                  ),
                  for (final s in result['selections'])
                    if (s['dayNumber'] == day['dayNumber'])
                      ListTile(
                        title: Text(s['name']),
                        subtitle: Text('${s['minutes']} min · ${s['reason']}'),
                      ),
                ],
              ],
              if (result['replacement'] case final Map replacement)
                Text(
                  '${replacement['exercise_name']} · ${result['minutes']} min',
                ),
              if (result['target'] case final Map target)
                Text(
                  '${target['reps']} reps${target['target_weight_kg'] == null ? '' : ' · ${target['target_weight_kg']} kg'}',
                ),
              if (result['reason'] != null) Text(result['reason']),
              if (result['problem'] == null)
                FilledButton(
                  onPressed: busy ? null : () => decide(true),
                  child: Text(
                    widget.mode == WorkoutAdvice.plan
                        ? 'Save plan'
                        : 'Apply change',
                  ),
                ),
              TextButton(
                onPressed: busy ? null : () => decide(false),
                child: const Text('Dismiss'),
              ),
              if (widget.mode == WorkoutAdvice.plan)
                TextButton(
                  onPressed: busy ? null : editProfile,
                  child: const Text('Edit training profile'),
                ),
              if (error != null)
                TextButton(
                  onPressed: busy
                      ? null
                      : widget.mode == WorkoutAdvice.replacement
                      ? propose
                      : initialize,
                  child: const Text('Refresh preview'),
                ),
            ] else if (ready && widget.mode == WorkoutAdvice.replacement) ...[
              DropdownButtonFormField<String>(
                initialValue: changeReason,
                decoration: const InputDecoration(labelText: 'Reason'),
                items: [
                  for (final entry in {
                    'equipment_busy': 'Equipment busy',
                    'at_home': 'Training at home',
                    'short_on_time': 'Short on time',
                    'disliked': 'Dislike exercise',
                    'too_hard': 'Too difficult',
                  }.entries)
                    DropdownMenuItem(
                      value: entry.key,
                      child: Text(entry.value),
                    ),
                ],
                onChanged: busy
                    ? null
                    : (v) => setState(() => changeReason = v!),
              ),
              const Text('Equipment available for this exercise'),
              Wrap(
                spacing: 8,
                children: [
                  for (final e in equipment)
                    FilterChip(
                      label: Text(e['name']),
                      selected: selected.contains(e['id']),
                      onSelected: busy
                          ? null
                          : (v) => setState(() {
                              if (v) {
                                selected.add(e['id']);
                              } else {
                                selected.remove(e['id']);
                              }
                            }),
                    ),
                ],
              ),
              TextField(
                controller: minutes,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Minutes left in this workout',
                ),
              ),
              FilledButton(
                onPressed: busy ? null : propose,
                child: const Text('Find replacement'),
              ),
            ] else if (ready && widget.mode == WorkoutAdvice.feedback) ...[
              DropdownButtonFormField<String>(
                initialValue: difficulty,
                decoration: const InputDecoration(labelText: 'Difficulty'),
                items: [
                  for (final d in ['easy', 'right', 'hard'])
                    DropdownMenuItem(value: d, child: Text(d)),
                ],
                onChanged: busy ? null : (v) => setState(() => difficulty = v!),
              ),
              DropdownButtonFormField<String>(
                initialValue: preference,
                decoration: const InputDecoration(labelText: 'Preference'),
                items: [
                  for (final p in ['', 'liked', 'disliked'])
                    DropdownMenuItem(
                      value: p,
                      child: Text(p.isEmpty ? 'Keep current preference' : p),
                    ),
                ],
                onChanged: busy ? null : (v) => setState(() => preference = v!),
              ),
              FilledButton(
                onPressed: busy ? null : saveFeedback,
                child: const Text('Save feedback'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
