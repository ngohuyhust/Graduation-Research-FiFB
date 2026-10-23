import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

class TrainingProfilePage extends StatefulWidget {
  const TrainingProfilePage({super.key, required this.repository});
  final AuthRepository repository;
  @override
  State<TrainingProfilePage> createState() => _TrainingProfilePageState();
}

class _TrainingProfilePageState extends State<TrainingProfilePage> {
  final form = GlobalKey<FormState>();
  final limitations = TextEditingController();
  final minutes = TextEditingController();
  final search = TextEditingController();
  String? goal, level, location;
  int? days;
  int step = 0;
  bool loading = true, saving = false, searching = false, completed = false;
  bool loadFailed = false;
  String? error, searchError;
  List<Map<String, dynamic>> equipment = [], muscles = [], results = [];
  final equipmentIds = <String>{}, muscleIds = <String>{};
  final dislikes = <String, String>{};
  static const path = '/users/me/training-profile';

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    limitations.dispose();
    minutes.dispose();
    search.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> items(Map<String, dynamic> data) =>
      (data['items'] as List).cast<Map<String, dynamic>>();

  Future<void> load() async {
    setState(() {
      loading = true;
      loadFailed = false;
      error = null;
    });
    try {
      final values = await Future.wait([
        widget.repository.authorized('GET', path),
        widget.repository.api.send('GET', '/exercise-taxonomy/equipments'),
        widget.repository.api.send('GET', '/exercise-taxonomy/muscles'),
      ]);
      if (!mounted) return;
      equipment = items(values[1]);
      muscles = items(values[2]);
      final p = values[0]['profile'] as Map<String, dynamic>?;
      if (p != null) {
        goal = p['goal'];
        level = p['experienceLevel'];
        location = p['location'];
        days = p['daysPerWeek'];
        minutes.text = '${p['sessionMinutes']}';
        limitations.text = p['limitations'];
        equipmentIds.addAll((p['equipmentIds'] as List).cast<String>());
        muscleIds.addAll((p['priorityMuscleIds'] as List).cast<String>());
        for (final id in (p['dislikedExerciseIds'] as List).cast<String>()) {
          dislikes[id] = 'Previously excluded exercise';
        }
        completed = true;
        // Missing or retired exercises remain removable without blocking the form.
        await Future.wait(
          dislikes.keys.toList().map((id) async {
            try {
              final data = await widget.repository.api.send(
                'GET',
                '/exercises/$id',
              );
              if (!mounted) return;
              dislikes[id] = data['exercise']['name'] as String;
            } catch (_) {
              /* Keep the exclusion when its public detail is unavailable. */
            }
          }),
        );
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

  Future<void> findExercises() async {
    setState(() {
      searching = true;
      searchError = null;
    });
    try {
      final data = await widget.repository.api.send(
        'GET',
        '/exercises?limit=20&keyword=${Uri.encodeQueryComponent(search.text.trim())}',
      );
      if (mounted) setState(() => results = items(data));
    } catch (e) {
      if (mounted) setState(() => searchError = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => searching = false);
    }
  }

  Future<void> save() async {
    if (saving || !form.currentState!.validate()) return;
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await widget.repository.authorized(
        'PUT',
        path,
        body: {
          'goal': goal,
          'experienceLevel': level,
          'daysPerWeek': days,
          'sessionMinutes': int.parse(minutes.text),
          'location': location,
          'equipmentIds': equipmentIds.toList(),
          'priorityMuscleIds': muscleIds.toList(),
          'dislikedExerciseIds': dislikes.keys.toList(),
          'limitations': limitations.text.trim(),
        },
      );
      if (!mounted) return;
      setState(() {
        completed = true;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Training profile saved')));
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Widget choice(
    String label,
    String? value,
    Map<String, String> options,
    ValueChanged<String?> change,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: DropdownButtonFormField<String>(
      key: ValueKey(label),
      initialValue: value,
      decoration: InputDecoration(labelText: label),
      isExpanded: true,
      items: options.entries
          .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
          .toList(),
      onChanged: change,
      validator: (v) => v == null ? 'Choose $label' : null,
    ),
  );
  Widget selections(
    String title,
    List<Map<String, dynamic>> options,
    Set<String> selected,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      if (options.isEmpty)
        const Text('No options available yet. You can update this later.'),
      Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          for (final item in options)
            FilterChip(
              label: Text(item['name'] as String),
              selected: selected.contains(item['id']),
              onSelected: (yes) => setState(() {
                if (yes && selected.length < 100) {
                  selected.add(item['id'] as String);
                } else {
                  selected.remove(item['id']);
                }
              }),
            ),
        ],
      ),
      const SizedBox(height: 24),
    ],
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !saving,
    child: Scaffold(
      appBar: AppBar(
        title: Text(completed ? 'Training profile' : 'Set up your training'),
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
                  constraints: const BoxConstraints(maxWidth: 680),
                  child: AbsorbPointer(
                    absorbing: saving,
                    child: Form(
                      key: form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Step ${step + 1} of 3',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(value: (step + 1) / 3),
                          const SizedBox(height: 24),
                          if (step == 0) ...[
                            Text(
                              'Your goals and routine',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 24),
                            choice('Goal', goal, const {
                              'general_fitness': 'General fitness',
                              'build_muscle': 'Build muscle',
                              'lose_fat': 'Lose fat',
                              'strength': 'Get stronger',
                            }, (v) => setState(() => goal = v)),
                            choice('Experience', level, const {
                              'beginner': 'Beginner',
                              'intermediate': 'Intermediate',
                              'advanced': 'Advanced',
                            }, (v) => setState(() => level = v)),
                            choice('Days per week', days?.toString(), {
                              for (var i = 1; i <= 7; i++) '$i': '$i',
                            }, (v) => setState(() => days = int.parse(v!))),
                            TextFormField(
                              controller: minutes,
                              decoration: const InputDecoration(
                                labelText: 'Minutes per session (15–180)',
                              ),
                              keyboardType: TextInputType.number,
                              validator: (v) {
                                final n = int.tryParse(v ?? '');
                                return n == null || n < 15 || n > 180
                                    ? 'Enter 15–180 minutes'
                                    : null;
                              },
                            ),
                          ],
                          if (step == 1) ...[
                            choice('Training location', location, const {
                              'home': 'Home',
                              'gym': 'Gym',
                              'both': 'Home and gym',
                            }, (v) => setState(() => location = v)),
                            const Text(
                              'Choose equipment you can actually use. Leave empty if you have none.',
                            ),
                            const SizedBox(height: 16),
                            selections(
                              'Available equipment',
                              equipment,
                              equipmentIds,
                            ),
                            selections(
                              'Priority muscles (optional)',
                              muscles,
                              muscleIds,
                            ),
                          ],
                          if (step == 2) ...[
                            Text(
                              'Your preferences',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: limitations,
                              maxLength: 1000,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText:
                                    'Limitations to keep in mind (optional)',
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text('Exercises you dislike (optional)'),
                            Wrap(
                              spacing: 8,
                              children: [
                                for (final entry in dislikes.entries)
                                  InputChip(
                                    label: Text(entry.value),
                                    onDeleted: () => setState(
                                      () => dislikes.remove(entry.key),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: search,
                              maxLength: 120,
                              decoration: const InputDecoration(
                                labelText: 'Search exercises',
                              ),
                            ),
                            TextButton.icon(
                              onPressed: searching ? null : findExercises,
                              icon: const Icon(Icons.search),
                              label: Text(searching ? 'Searching…' : 'Search'),
                            ),
                            if (searchError != null) Text(searchError!),
                            for (final item in results)
                              CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(item['name'] as String),
                                value: dislikes.containsKey(item['id']),
                                onChanged: (yes) => setState(() {
                                  if (yes == true && dislikes.length < 100) {
                                    dislikes[item['id'] as String] =
                                        item['name'] as String;
                                  } else {
                                    dislikes.remove(item['id']);
                                  }
                                }),
                              ),
                            const Text(
                              'Search shows up to 20 matches. Refine the name to find a specific exercise.',
                            ),
                          ],
                          if (error != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: Text(
                                error!,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              ),
                            ),
                          const SizedBox(height: 24),
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              if (step > 0)
                                TextButton(
                                  onPressed: () => setState(() {
                                    step--;
                                    error = null;
                                  }),
                                  child: const Text('Back'),
                                ),
                              FilledButton(
                                onPressed: saving
                                    ? null
                                    : () {
                                        if (!form.currentState!.validate()) {
                                          return;
                                        }
                                        if (step < 2) {
                                          setState(() {
                                            step++;
                                            error = null;
                                          });
                                        } else {
                                          save();
                                        }
                                      },
                                child: Text(
                                  saving
                                      ? 'Saving…'
                                      : step == 2
                                      ? 'Save profile'
                                      : 'Continue',
                                ),
                              ),
                            ],
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
