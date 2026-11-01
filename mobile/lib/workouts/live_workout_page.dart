import 'dart:async';
import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import '../core/api_client.dart';
import '../exercises/exercise_detail_page.dart';
import '../exercises/exercise_repository.dart';
import 'session_repository.dart';

class LiveWorkoutPage extends StatefulWidget {
  const LiveWorkoutPage({
    super.key,
    required this.repository,
    required this.id,
  });
  final SessionRepository repository;
  final String id;
  @override
  State<LiveWorkoutPage> createState() => _LiveWorkoutPageState();
}

class _LiveWorkoutPageState extends State<LiveWorkoutPage> {
  Map<String, dynamic>? session, pending;
  bool busy = true, offline = false;
  String? error;
  Timer? clock;
  @override
  void initState() {
    super.initState();
    load();
    clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    clock?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      pending = await widget.repository.local('pending.${widget.id}');
      final data = await widget.repository.detail(widget.id);
      if (mounted) {
        session = data;
        offline = false;
      }
    } catch (e) {
      if (mounted) {
        error = AuthController.messageFor(e);
        offline = true;
        // Never show cached content after an authorization or ownership failure.
        if (e is ApiException && [401, 403, 404].contains(e.status)) {
          session = null;
        } else {
          try {
            session ??= await widget.repository.local('session.${widget.id}');
          } catch (_) {
            /* Report original failure. */
          }
        }
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> mutate(
    String method,
    String suffix,
    Map<String, dynamic>? body,
  ) async {
    if (busy || pending != null) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.queue(widget.id, method, suffix, body);
      await load();
    } catch (e) {
      try {
        pending = await widget.repository.local('pending.${widget.id}');
      } catch (_) {
        /* Keep error visible. */
      }
      if (mounted) {
        setState(() {
          error = AuthController.messageFor(e);
          busy = false;
        });
      }
    }
  }

  Future<void> sync() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.flush(widget.id);
      await load();
    } catch (e) {
      try {
        pending = await widget.repository.local('pending.${widget.id}');
      } catch (_) {
        /* Keep original failure. */
      }
      if (mounted) {
        setState(() {
          error = AuthController.messageFor(e);
          busy = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get logs =>
      (session?['logs'] as List? ?? []).cast<Map<String, dynamic>>();

  Future<void> record(
    Map<String, dynamic> exercise, {
    Map<String, dynamic>? log,
    bool copy = false,
  }) async {
    final form = GlobalKey<FormState>();
    final values = <String, String>{
      'Reps': '${log?['actual_reps'] ?? exercise['reps'] ?? ''}',
      'Weight (kg)': '${log?['actual_weight_kg'] ?? ''}',
      'Duration (seconds)':
          '${log?['duration_seconds'] ?? exercise['duration_seconds'] ?? ''}',
      'Note': log?['note'] as String? ?? '',
    };
    String? formError;
    final accepted = copy
        ? true
        : await showDialog<bool>(
            context: context,
            builder: (context) => StatefulBuilder(
              builder: (context, update) => AlertDialog(
                title: Text(
                  copy
                      ? 'Copy previous set'
                      : log == null
                      ? 'Log set'
                      : 'Edit set',
                ),
                content: SizedBox(
                  width: 420,
                  child: SingleChildScrollView(
                    child: Form(
                      key: form,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            exercise['exercise_name'] as String? ?? 'Exercise',
                          ),
                          for (final label in values.keys)
                            Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: TextFormField(
                                initialValue: values[label],
                                decoration: InputDecoration(labelText: label),
                                keyboardType: label == 'Note'
                                    ? TextInputType.text
                                    : const TextInputType.numberWithOptions(
                                        decimal: true,
                                      ),
                                maxLength: label == 'Note' ? 1000 : 10,
                                onChanged: (v) => values[label] = v,
                                validator: (v) {
                                  if (label == 'Note' ||
                                      (v ?? '').trim().isEmpty) {
                                    return null;
                                  }
                                  if (label == 'Weight (kg)') {
                                    final n = double.tryParse(v!);
                                    return n == null ||
                                            !n.isFinite ||
                                            n < 0 ||
                                            n > 100000
                                        ? 'Enter 0–100000 kg'
                                        : null;
                                  }
                                  final n = int.tryParse(v!);
                                  return n == null || n < 1 || n > 2147483647
                                      ? 'Enter a positive whole number'
                                      : null;
                                },
                              ),
                            ),
                          if (formError != null) Text(formError!),
                        ],
                      ),
                    ),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: () {
                      if (!form.currentState!.validate()) return;
                      if (values.entries
                          .where((e) => e.key != 'Note')
                          .every((e) => e.value.trim().isEmpty)) {
                        update(
                          () => formError = 'Enter reps, weight, or duration.',
                        );
                        return;
                      }
                      Navigator.pop(context, true);
                    },
                    child: const Text('Save set'),
                  ),
                ],
              ),
            ),
          );
    if (accepted != true || !mounted) return;
    final editing = log != null && !copy;
    final exerciseId = exercise['exercise_id'];
    final numbers = logs
        .where((l) => l['exercise_id'] == exerciseId)
        .map((l) => l['set_number'] as int);
    final next = numbers.fold<int>(0, (a, b) => a > b ? a : b) + 1;
    final rest = exercise['rest_seconds'] as int? ?? 60;
    await mutate(
      editing ? 'PUT' : 'POST',
      editing ? '/logs/${log['id']}' : '/logs',
      {
        'exerciseId': exerciseId,
        'setNumber': editing ? log['set_number'] : next,
        if (values['Reps']!.trim().isNotEmpty)
          'actualReps': int.parse(values['Reps']!),
        if (values['Weight (kg)']!.trim().isNotEmpty)
          'actualWeightKg': double.parse(values['Weight (kg)']!),
        if (values['Duration (seconds)']!.trim().isNotEmpty)
          'durationSeconds': int.parse(values['Duration (seconds)']!),
        'note': values['Note']!.trim(),
        if (!editing) ...{
          'clientOperationId': operationId(),
          'restEndsAt': rest > 0
              ? DateTime.now()
                    .toUtc()
                    .add(Duration(seconds: rest))
                    .toIso8601String()
              : null,
        },
      },
    );
  }

  Future<void> remove(Map<String, dynamic> log) async {
    final confirmed = await confirm(
      'Delete this set?',
      'This removes the set from your workout totals.',
    );
    if (confirmed && mounted) {
      await mutate('DELETE', '/logs/${log['id']}', null);
    }
  }

  Future<bool> confirm(String title, String text) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(text),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirm'),
            ),
          ],
        ),
      ) ??
      false;
  Future<void> previous(String exerciseId) async {
    setState(() => busy = true);
    try {
      final rows = await widget.repository.previous(widget.id, exerciseId);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Previous completed workout'),
          content: SizedBox(
            width: 420,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (rows.isEmpty) const Text('No previous completed sets.'),
                  if (rows.isNotEmpty) Text('${rows.first['completed_at']}'),
                  for (final row in rows) Text(setText(row)),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  static String setText(Map<String, dynamic> row) => [
    'Set ${row['set_number']}',
    if (row['actual_reps'] != null) '${row['actual_reps']} reps',
    if (row['actual_weight_kg'] != null) '${row['actual_weight_kg']} kg',
    if (row['duration_seconds'] != null) '${row['duration_seconds']}s',
    if ((row['note'] as String? ?? '').isNotEmpty) row['note'] as String,
  ].join(' · ');

  @override
  Widget build(BuildContext context) {
    final completed = session?['completed_at'] != null,
        paused = session?['paused'] == true;
    final disabled = busy || pending != null || completed || paused;
    final deadline = DateTime.tryParse(
      session?['rest_ends_at'] as String? ?? '',
    );
    final remaining = deadline == null
        ? 0
        : deadline.difference(DateTime.now()).inSeconds;
    final exercises = (session?['planned_exercises'] as List? ?? [])
        .cast<Map<String, dynamic>>();
    // Legacy/free sessions still show their existing logged exercises.
    final known = exercises.map((e) => e['exercise_id']).toSet();
    final all = [
      ...exercises,
      for (final log in logs)
        if (known.add(log['exercise_id']))
          {
            'exercise_id': log['exercise_id'],
            'exercise_name': log['exercise_name'],
          },
    ];
    return Scaffold(
      appBar: AppBar(title: Text(session?['title'] as String? ?? 'Workout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (busy) const LinearProgressIndicator(),
                if (error != null) Text(error!),
                if (offline && session != null)
                  const Text(
                    'Showing saved data. New changes need sync before you can continue.',
                  ),
                if (pending != null) ...[
                  const Text(
                    'A change is saved on this device and awaiting confirmation. Retry sync before continuing.',
                  ),
                  if (pending!['body']?['setNumber'] != null)
                    Text(
                      'Pending set ${pending!['body']['setNumber']}: ${pending!['body']['actualReps'] ?? '—'} reps · ${pending!['body']['actualWeightKg'] ?? '—'} kg',
                    ),
                  FilledButton(
                    onPressed: busy ? null : sync,
                    child: const Text('Retry sync'),
                  ),
                  if (pending!['rejected'] == true)
                    TextButton(
                      onPressed: busy
                          ? null
                          : () async {
                              if (await confirm(
                                    'Discard rejected change?',
                                    'The server rejected this change. Discard it to continue with the saved workout.',
                                  ) &&
                                  mounted) {
                                try {
                                  await widget.repository.dismissRejected(
                                    widget.id,
                                  );
                                  await load();
                                } catch (e) {
                                  if (mounted) {
                                    setState(
                                      () =>
                                          error = AuthController.messageFor(e),
                                    );
                                  }
                                }
                              }
                            },
                      child: const Text('Discard rejected change'),
                    ),
                ],
                TextButton(
                  onPressed: busy ? null : load,
                  child: const Text('Refresh session'),
                ),
                if (session != null) ...[
                  Text(
                    completed
                        ? 'Workout complete'
                        : paused
                        ? 'Workout paused'
                        : 'Workout in progress',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (!completed)
                    Text(
                      remaining > 0
                          ? 'Rest: ${remaining ~/ 60}:${(remaining % 60).toString().padLeft(2, '0')}'
                          : 'Ready for your next set',
                    ),
                  if (!completed)
                    Wrap(
                      spacing: 8,
                      children: [
                        OutlinedButton(
                          onPressed: busy || pending != null
                              ? null
                              : () => mutate('PATCH', '', {
                                  'paused': !paused,
                                  'restEndsAt': null,
                                }),
                          child: Text(
                            paused ? 'Resume workout' : 'Pause workout',
                          ),
                        ),
                        TextButton(
                          onPressed: busy || pending != null || remaining <= 0
                              ? null
                              : () => mutate('PATCH', '', {'restEndsAt': null}),
                          child: const Text('Skip rest'),
                        ),
                        FilledButton(
                          onPressed: busy || pending != null
                              ? null
                              : () async {
                                  if (await confirm(
                                        'Finish workout?',
                                        'Confirm all sets are recorded. Completed workouts cannot be edited.',
                                      ) &&
                                      mounted) {
                                    await mutate('PATCH', '', {
                                      'completed': true,
                                    });
                                  }
                                },
                          child: const Text('Finish workout'),
                        ),
                      ],
                    ),
                  if (all.isEmpty)
                    const Text(
                      'No exercises in this session. Start a scheduled plan day from Home to log a planned workout.',
                    ),
                  for (final exercise in all)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              exercise['exercise_name'] as String? ??
                                  'Exercise',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            if (exercise['sets'] != null)
                              Text(
                                'Target: ${exercise['sets']} sets · ${exercise['reps'] ?? '—'} reps',
                              ),
                            if ((exercise['note'] as String? ?? '').isNotEmpty)
                              Text(exercise['note']),
                            Wrap(
                              spacing: 8,
                              children: [
                                TextButton(
                                  onPressed: busy
                                      ? null
                                      : () => Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => ExerciseDetailPage(
                                              repository: ExerciseRepository(
                                                widget.repository.auth,
                                              ),
                                              id: exercise['exercise_id'],
                                            ),
                                          ),
                                        ),
                                  child: const Text('Instructions'),
                                ),
                                TextButton(
                                  onPressed: busy
                                      ? null
                                      : () => previous(exercise['exercise_id']),
                                  child: const Text('Previous workout'),
                                ),
                              ],
                            ),
                            for (final log in logs.where(
                              (l) =>
                                  l['exercise_id'] == exercise['exercise_id'],
                            ))
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(setText(log)),
                                subtitle: completed
                                    ? null
                                    : Wrap(
                                        children: [
                                          TextButton(
                                            onPressed: disabled
                                                ? null
                                                : () => record(
                                                    exercise,
                                                    log: log,
                                                  ),
                                            child: const Text('Edit set'),
                                          ),
                                          TextButton(
                                            onPressed: disabled
                                                ? null
                                                : () => remove(log),
                                            child: const Text('Delete set'),
                                          ),
                                        ],
                                      ),
                              ),
                            if (!completed)
                              Wrap(
                                spacing: 8,
                                children: [
                                  FilledButton(
                                    onPressed: disabled
                                        ? null
                                        : () => record(exercise),
                                    child: const Text('Log set'),
                                  ),
                                  if (logs.any(
                                    (l) =>
                                        l['exercise_id'] ==
                                        exercise['exercise_id'],
                                  ))
                                    OutlinedButton(
                                      onPressed: disabled
                                          ? null
                                          : () => record(
                                              exercise,
                                              log: logs.lastWhere(
                                                (l) =>
                                                    l['exercise_id'] ==
                                                    exercise['exercise_id'],
                                              ),
                                              copy: true,
                                            ),
                                      child: const Text('Copy previous set'),
                                    ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
