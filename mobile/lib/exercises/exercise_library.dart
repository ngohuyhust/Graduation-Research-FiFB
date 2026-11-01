import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import 'exercise_detail_page.dart';
import 'exercise_repository.dart';

class ExerciseLibrary extends StatefulWidget {
  const ExerciseLibrary({super.key, required this.repository, this.onSelected});
  final ExerciseRepository repository;
  final ValueChanged<Exercise>? onSelected;
  @override
  State<ExerciseLibrary> createState() => _ExerciseLibraryState();
}

class _ExerciseLibraryState extends State<ExerciseLibrary> {
  final search = TextEditingController();
  List<String> bodyParts = [], equipments = [], muscles = [];
  String? bodyPart, equipment, muscle, error, taxonomyError;
  String keyword = '';
  bool favorites = false, loading = true;
  ExercisePage? result;
  int generation = 0, requestedPage = 1;

  @override
  void initState() {
    super.initState();
    load();
    loadTaxonomy();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> loadTaxonomy() async {
    setState(() => taxonomyError = null);
    try {
      final data = await Future.wait([
        widget.repository.taxonomy('bodyParts'),
        widget.repository.taxonomy('equipments'),
        widget.repository.taxonomy('muscles'),
      ]);
      if (mounted) {
        setState(() {
          bodyParts = data[0];
          equipments = data[1];
          muscles = data[2];
        });
      }
    } catch (e) {
      if (mounted) setState(() => taxonomyError = AuthController.messageFor(e));
    }
  }

  Future<void> load({int page = 1}) async {
    final request = ++generation;
    requestedPage = page;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.repository.list(
        page: page,
        keyword: keyword,
        bodyPart: bodyPart,
        equipment: equipment,
        targetMuscle: muscle,
        favorites: favorites,
      );
      if (!mounted || request != generation) return;
      // Removing the final favorite on a page may reduce the page count.
      if (page > 1 && data.items.isEmpty) {
        await load(page: page - 1);
        return;
      }
      setState(() => result = data);
    } catch (e) {
      if (mounted && request == generation) {
        setState(() => error = AuthController.messageFor(e));
      }
    } finally {
      if (mounted && request == generation) setState(() => loading = false);
    }
  }

  Widget filter(
    String label,
    String? value,
    List<String> options,
    ValueChanged<String?> change,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: DropdownButtonFormField<String>(
      key: ValueKey('$label:$value'),
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      items: [
        DropdownMenuItem<String>(
          value: null,
          child: Text('All ${label.toLowerCase()}'),
        ),
        for (final option in options.toSet())
          DropdownMenuItem(value: option, child: Text(option)),
      ],
      onChanged: (v) {
        setState(() => change(v));
        load();
      },
    ),
  );

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Wrap(
        spacing: 8,
        children: [
          ChoiceChip(
            label: const Text('All exercises'),
            selected: !favorites,
            onSelected: (_) {
              setState(() => favorites = false);
              load();
            },
          ),
          ChoiceChip(
            label: const Text('Favorites'),
            selected: favorites,
            onSelected: (_) {
              setState(() => favorites = true);
              load();
            },
          ),
        ],
      ),
      const SizedBox(height: 16),
      if (!favorites) ...[
        TextField(
          controller: search,
          maxLength: 120,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            labelText: 'Search exercises',
            suffixIcon: IconButton(
              tooltip: 'Search',
              icon: const Icon(Icons.search),
              onPressed: () {
                keyword = search.text;
                load();
              },
            ),
          ),
          onSubmitted: (_) {
            keyword = search.text;
            load();
          },
        ),
        filter('Body parts', bodyPart, bodyParts, (v) => bodyPart = v),
        filter('Equipment', equipment, equipments, (v) => equipment = v),
        filter('Target muscles', muscle, muscles, (v) => muscle = v),
        if (taxonomyError != null) ...[
          Text('Filters unavailable: $taxonomyError'),
          TextButton(
            onPressed: loadTaxonomy,
            child: const Text('Retry filters'),
          ),
        ],
        TextButton(
          onPressed: () {
            search.clear();
            keyword = '';
            setState(() {
              bodyPart = null;
              equipment = null;
              muscle = null;
            });
            load();
          },
          child: const Text('Clear filters'),
        ),
      ],
      if (loading)
        const Center(child: CircularProgressIndicator())
      else if (error != null) ...[
        Text(error!),
        TextButton(
          onPressed: () => load(page: requestedPage),
          child: const Text('Retry exercises'),
        ),
      ] else if (result != null) ...[
        Text('${result!.total} ${favorites ? 'favorites' : 'exercises'}'),
        if (result!.items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              favorites
                  ? 'No favorites yet. Open an exercise to save it here.'
                  : 'No exercises match. Try another name or clear the filters.',
            ),
          ),
        for (final exercise in result!.items)
          Card(
            child: ListTile(
              title: Text(exercise.name),
              subtitle: Text(
                [...exercise.equipments, ...exercise.targetMuscles].join(' · '),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                if (widget.onSelected != null) {
                  widget.onSelected!(exercise);
                  return;
                }
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ExerciseDetailPage(
                      repository: widget.repository,
                      id: exercise.id,
                    ),
                  ),
                );
                if (mounted && favorites) load(page: result!.page);
              },
            ),
          ),
        if (result!.totalPages > 1)
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              TextButton(
                onPressed: result!.page > 1
                    ? () => load(page: result!.page - 1)
                    : null,
                child: const Text('Previous'),
              ),
              Text('Page ${result!.page} of ${result!.totalPages}'),
              TextButton(
                onPressed: result!.page < result!.totalPages
                    ? () => load(page: result!.page + 1)
                    : null,
                child: const Text('Next'),
              ),
            ],
          ),
      ],
    ],
  );
}
