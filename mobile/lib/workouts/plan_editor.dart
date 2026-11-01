import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import '../exercises/exercise_library.dart';
import '../exercises/exercise_repository.dart';
import 'workout_repository.dart';

class PlanEditor extends StatefulWidget {
  const PlanEditor({super.key, required this.repository, this.id});
  final WorkoutRepository repository;
  final String? id;
  @override
  State<PlanEditor> createState() => _PlanEditorState();
}

class _PlanEditorState extends State<PlanEditor> {
  final form = GlobalKey<FormState>();
  final title = TextEditingController(), description = TextEditingController();
  List<PlanItem> items = [];
  final schedule = <int, int>{};
  bool loading = false, saving = false, dirty = false, loadFailed = false;
  String? error;
  @override
  void initState() {
    super.initState();
    if (widget.id != null) load();
  }

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
      loadFailed = false;
    });
    try {
      final data = await widget.repository.detail(widget.id!);
      if (!mounted) return;
      title.text = data['title'] as String;
      description.text = data['description'] as String? ?? '';
      items = [
        for (final item in data['items'] as List) PlanItem.fromJson(item),
      ];
      schedule.clear();
      for (final entry in data['schedule'] as List? ?? []) {
        schedule[entry['weekday'] as int] = entry['dayNumber'] as int;
      }
    } catch (e) {
      if (mounted) {
        error = AuthController.messageFor(e);
        loadFailed = true;
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> leave() async {
    if (saving) return;
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard unsaved changes?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep editing'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard'),
          ),
        ],
      ),
    );
    if (discard != true || !mounted) return;
    setState(() => dirty = false);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.pop(context);
    });
  }

  Future<void> save() async {
    if (saving || !form.currentState!.validate()) return;
    if (items.any((item) => !item.active)) {
      setState(
        () => error = 'Remove or replace unavailable exercises before saving.',
      );
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await widget.repository.save(
        id: widget.id,
        title: title.text,
        description: description.text,
        items: items,
        schedule: schedule,
      );
      if (!mounted) return;
      setState(() {
        dirty = false;
        saving = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.pop(context, true);
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          error = AuthController.messageFor(e);
          saving = false;
        });
      }
    }
  }

  void cleanSchedule() =>
      schedule.removeWhere((_, day) => !items.any((item) => item.day == day));

  Future<void> add() async {
    final exercise = await Navigator.push<Exercise>(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Choose an exercise')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ExerciseLibrary(
              repository: ExerciseRepository(widget.repository.auth),
              onSelected: (exercise) => Navigator.pop(context, exercise),
            ),
          ),
        ),
      ),
    );
    if (exercise == null || !mounted) return;
    final item = PlanItem(exerciseId: exercise.id, name: exercise.name);
    if (await editItem(item) && mounted) {
      setState(() {
        items.add(item);
        dirty = true;
      });
    }
  }

  Future<bool> editItem(PlanItem item) async {
    final itemForm = GlobalKey<FormState>();
    final values = <String, String>{
      'Day': '${item.day}',
      'Sets': '${item.sets ?? ''}',
      'Reps': '${item.reps ?? ''}',
      'Work seconds': '${item.duration ?? ''}',
      'Rest seconds': '${item.rest ?? ''}',
      'Note': item.note,
    };
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item.name),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Form(
              key: itemForm,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Day is a numbered workout, not a weekday. Leave optional targets blank if unspecified.',
                  ),
                  for (final label in values.keys)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: TextFormField(
                        initialValue: values[label],
                        decoration: InputDecoration(labelText: label),
                        keyboardType: label == 'Note'
                            ? TextInputType.text
                            : TextInputType.number,
                        maxLength: label == 'Note' ? 1000 : 9,
                        onChanged: (v) => values[label] = v,
                        validator: (v) {
                          if (label == 'Note' ||
                              (label != 'Day' && (v ?? '').trim().isEmpty)) {
                            return null;
                          }
                          final n = int.tryParse(v ?? '');
                          return n == null ||
                                  n < (label == 'Rest seconds' ? 0 : 1) ||
                                  n > 2147483647
                              ? 'Enter a valid whole number'
                              : null;
                        },
                      ),
                    ),
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
              if (itemForm.currentState!.validate()) {
                Navigator.pop(context, true);
              }
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
    if (accepted != true) return false;
    item.day = int.parse(values['Day']!);
    item.sets = int.tryParse(values['Sets']!);
    item.reps = int.tryParse(values['Reps']!);
    item.duration = int.tryParse(values['Work seconds']!);
    item.rest = int.tryParse(values['Rest seconds']!);
    item.note = values['Note']!;
    return true;
  }

  void move(PlanItem item, int offset) {
    final dayItems = items.where((entry) => entry.day == item.day).toList();
    final target = dayItems.indexOf(item) + offset;
    if (target < 0 || target >= dayItems.length) return;
    final a = items.indexOf(item), b = items.indexOf(dayItems[target]);
    setState(() {
      items[a] = items[b];
      items[b] = item;
      dirty = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final days = items.map((item) => item.day).toSet().toList()..sort();
    return PopScope(
      canPop: !dirty && !saving,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.id == null ? 'Create plan' : 'Edit plan'),
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : loadFailed
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(error!),
                    TextButton(onPressed: load, child: const Text('Retry')),
                  ],
                ),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 800),
                    child: AbsorbPointer(
                      absorbing: saving,
                      child: Form(
                        key: form,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: title,
                              maxLength: 200,
                              decoration: const InputDecoration(
                                labelText: 'Plan title',
                              ),
                              onChanged: (_) => setState(() => dirty = true),
                              validator: (v) => (v ?? '').trim().isEmpty
                                  ? 'Enter a title'
                                  : null,
                            ),
                            TextFormField(
                              controller: description,
                              maxLength: 2000,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Description (optional)',
                              ),
                              onChanged: (_) => setState(() => dirty = true),
                            ),
                            for (final day in days) ...[
                              Text(
                                'Day $day',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              for (final item in items.where(
                                (item) => item.day == day,
                              ))
                                Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.stretch,
                                      children: [
                                        Text(
                                          item.name,
                                          style: Theme.of(
                                            context,
                                          ).textTheme.titleMedium,
                                        ),
                                        Text(item.summary),
                                        if (!item.active)
                                          const Text(
                                            'Unavailable — remove or replace this exercise',
                                          ),
                                        if (item.note.isNotEmpty)
                                          Text(item.note),
                                        Wrap(
                                          spacing: 4,
                                          children: [
                                            TextButton(
                                              onPressed: () async {
                                                if (await editItem(item) &&
                                                    mounted) {
                                                  setState(() {
                                                    dirty = true;
                                                    cleanSchedule();
                                                  });
                                                }
                                              },
                                              child: const Text('Edit targets'),
                                            ),
                                            IconButton(
                                              tooltip: 'Move up',
                                              onPressed: () => move(item, -1),
                                              icon: const Icon(
                                                Icons.arrow_upward,
                                              ),
                                            ),
                                            IconButton(
                                              tooltip: 'Move down',
                                              onPressed: () => move(item, 1),
                                              icon: const Icon(
                                                Icons.arrow_downward,
                                              ),
                                            ),
                                            IconButton(
                                              tooltip: 'Remove exercise',
                                              onPressed: () => setState(() {
                                                items.remove(item);
                                                dirty = true;
                                                cleanSchedule();
                                              }),
                                              icon: const Icon(
                                                Icons.delete_outline,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                            if (items.isEmpty)
                              const Text(
                                'No exercises yet. You can save an empty plan and add exercises later.',
                              ),
                            OutlinedButton.icon(
                              onPressed: add,
                              icon: const Icon(Icons.add),
                              label: const Text('Add exercise'),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'Weekly schedule',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Text(
                              'Choose which workout day to repeat each weekday. Unscheduled days have no planned workout. Removing the last exercise in a day clears its schedule.',
                            ),
                            for (var weekday = 1; weekday <= 7; weekday++)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: DropdownButtonFormField<int>(
                                  key: ValueKey(
                                    'schedule-$weekday-${schedule[weekday]}',
                                  ),
                                  initialValue: schedule[weekday] ?? 0,
                                  isExpanded: true,
                                  decoration: InputDecoration(
                                    labelText: weekdays[weekday - 1],
                                  ),
                                  items: [
                                    const DropdownMenuItem(
                                      value: 0,
                                      child: Text('Unscheduled'),
                                    ),
                                    for (final day in {
                                      ...days,
                                      if (schedule[weekday] != null)
                                        schedule[weekday]!,
                                    })
                                      DropdownMenuItem(
                                        value: day,
                                        child: Text('Day $day'),
                                      ),
                                  ],
                                  onChanged: (v) => setState(() {
                                    dirty = true;
                                    if (v == 0) {
                                      schedule.remove(weekday);
                                    } else {
                                      schedule[weekday] = v!;
                                    }
                                  }),
                                ),
                              ),
                            if (error != null)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                child: Text(error!),
                              ),
                            const SizedBox(height: 20),
                            FilledButton(
                              onPressed: saving ? null : save,
                              child: Text(saving ? 'Saving…' : 'Save plan'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
