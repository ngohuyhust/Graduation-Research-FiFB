import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import '../exercises/exercise_detail_page.dart';
import '../exercises/exercise_repository.dart';
import 'plan_editor.dart';
import 'workout_repository.dart';
import 'session_repository.dart';
import 'live_workout_page.dart';

class WorkoutPlans extends StatefulWidget {
  const WorkoutPlans({super.key, required this.repository});
  final WorkoutRepository repository;
  @override
  State<WorkoutPlans> createState() => _WorkoutPlansState();
}

class _WorkoutPlansState extends State<WorkoutPlans> {
  List<Map<String, dynamic>> plans = [];
  int page = 1, pages = 0;
  bool loading = true, mutating = false;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.repository.list(page);
      if (!mounted) return;
      plans = (data['items'] as List).cast<Map<String, dynamic>>();
      pages = data['totalPages'] as int;
    } catch (e) {
      if (mounted) error = AuthController.messageFor(e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> edit([String? id]) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => PlanEditor(repository: widget.repository, id: id),
      ),
    );
    if (saved == true && mounted) {
      page = 1;
      load();
    }
  }

  Future<void> changeStatus(Map<String, dynamic> plan) async {
    final archived = plan['status'] == 'archived';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${archived ? 'Restore' : 'Archive'} this plan?'),
        content: Text(
          archived
              ? 'Its weekly schedule will become active again.'
              : 'It will stop appearing in Today Workout. You can restore it later.',
        ),
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
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      mutating = true;
      error = null;
    });
    try {
      if (archived) {
        await widget.repository.restore(plan['id']);
      } else {
        await widget.repository.archive(plan['id']);
      }
      if (mounted) await load();
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => mutating = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      FilledButton.icon(
        onPressed: loading || mutating ? null : () => edit(),
        icon: const Icon(Icons.add),
        label: const Text('Create plan'),
      ),
      const SizedBox(height: 16),
      if (loading)
        const Center(child: CircularProgressIndicator())
      else ...[
        if (error != null) ...[
          Text(error!),
          TextButton(
            onPressed: mutating ? null : load,
            child: const Text('Retry plans'),
          ),
        ],
        if (plans.isEmpty && error == null)
          const Text('No plans yet. Create your first workout plan.'),
        for (final plan in plans)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    plan['title'],
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(plan['status'] == 'archived' ? 'Archived' : 'Active'),
                  if (plan['description'] != null) Text(plan['description']),
                  Wrap(
                    spacing: 12,
                    children: [
                      TextButton(
                        onPressed: mutating ? null : () => edit(plan['id']),
                        child: const Text('Edit plan'),
                      ),
                      TextButton(
                        onPressed: mutating ? null : () => changeStatus(plan),
                        child: Text(
                          plan['status'] == 'archived' ? 'Restore' : 'Archive',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        if (pages > 1)
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton(
                onPressed: page > 1 && !mutating
                    ? () {
                        page--;
                        load();
                      }
                    : null,
                child: const Text('Previous'),
              ),
              Text('Page $page of $pages'),
              TextButton(
                onPressed: page < pages && !mutating
                    ? () {
                        page++;
                        load();
                      }
                    : null,
                child: const Text('Next'),
              ),
            ],
          ),
      ],
    ],
  );
}

class TodayWorkout extends StatefulWidget {
  const TodayWorkout({
    super.key,
    required this.repository,
    this.now,
    this.sessions,
  });
  final WorkoutRepository repository;
  final DateTime Function()? now;
  final SessionRepository? sessions;
  @override
  State<TodayWorkout> createState() => _TodayWorkoutState();
}

class _TodayWorkoutState extends State<TodayWorkout>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> workouts = [];
  bool loading = true;
  String? error;
  late DateTime date;
  bool starting = false;
  Future<void> start(Map<String, dynamic> workout) async {
    if (starting) return;
    setState(() {
      starting = true;
      error = null;
    });
    try {
      final session = await widget.sessions!.start(workout: workout);
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              LiveWorkoutPage(repository: widget.sessions!, id: session['id']),
        ),
      );
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => starting = false);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !loading) load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
      date = (widget.now ?? DateTime.now)();
    });
    try {
      final data = await widget.repository.today(date);
      if (mounted) workouts = data;
    } catch (e) {
      if (mounted) error = AuthController.messageFor(e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Today Workout', style: Theme.of(context).textTheme.titleLarge),
          Text(
            '${weekdays[date.weekday - 1]} · ${date.day}/${date.month}/${date.year} · Device local date',
          ),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else if (error != null)
            Text(error!)
          else if (workouts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'No workout scheduled today. Set a weekly schedule in your workout plan.',
              ),
            )
          else
            for (final workout in workouts)
              ExpansionTile(
                title: Text(
                  '${workout['title']} · Day ${workout['dayNumber']}',
                ),
                children: [
                  if (widget.sessions != null)
                    FilledButton(
                      onPressed: starting ? null : () => start(workout),
                      child: Text(starting ? 'Starting…' : 'Start workout'),
                    ),
                  for (final json in workout['items'] as List)
                    Builder(
                      builder: (context) {
                        final item = PlanItem.fromJson(json);
                        return ListTile(
                          title: Text(item.name),
                          subtitle: Text(
                            '${item.summary}${item.active ? '' : ' · Unavailable exercise'}',
                          ),
                          onTap: !item.active
                              ? null
                              : () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ExerciseDetailPage(
                                      repository: ExerciseRepository(
                                        widget.repository.auth,
                                      ),
                                      id: item.exerciseId,
                                    ),
                                  ),
                                ),
                        );
                      },
                    ),
                ],
              ),
          TextButton(
            onPressed: loading ? null : load,
            child: const Text('Refresh today'),
          ),
        ],
      ),
    ),
  );
}
