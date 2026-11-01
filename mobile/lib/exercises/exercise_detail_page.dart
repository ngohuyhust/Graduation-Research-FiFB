import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import 'exercise_repository.dart';

class ExerciseDetailPage extends StatefulWidget {
  const ExerciseDetailPage({
    super.key,
    required this.repository,
    required this.id,
  });
  final ExerciseRepository repository;
  final String id;
  @override
  State<ExerciseDetailPage> createState() => _ExerciseDetailPageState();
}

class _ExerciseDetailPageState extends State<ExerciseDetailPage> {
  Exercise? exercise;
  bool loading = true, saving = false;
  bool? favorite;
  String? error, favoriteError;

  @override
  void initState() {
    super.initState();
    load();
    loadFavorite();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await widget.repository.detail(widget.id);
      if (mounted) setState(() => exercise = result);
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadFavorite() async {
    setState(() {
      saving = true;
      favoriteError = null;
    });
    try {
      final result = await widget.repository.isFavorite(widget.id);
      if (mounted) setState(() => favorite = result);
    } catch (e) {
      if (mounted) setState(() => favoriteError = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> toggleFavorite() async {
    if (saving || favorite == null) return;
    final next = !favorite!;
    setState(() {
      saving = true;
      favoriteError = null;
    });
    try {
      await widget.repository.favorite(widget.id, next);
      if (mounted) setState(() => favorite = next);
    } catch (e) {
      if (mounted) setState(() => favoriteError = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Widget taxonomy(String label, List<String> values) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      '$label: ${values.isEmpty ? 'Not specified' : values.join(', ')}',
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Exercise detail')),
    body: loading
        ? const Center(child: CircularProgressIndicator())
        : error != null
        ? Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(error!, textAlign: TextAlign.center),
                TextButton(onPressed: load, child: const Text('Retry')),
              ],
            ),
          )
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      exercise!.name,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 16),
                    ExerciseMedia(url: exercise!.gifUrl),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: saving || favorite == null
                          ? null
                          : toggleFavorite,
                      icon: Icon(
                        favorite == true
                            ? Icons.favorite
                            : Icons.favorite_border,
                      ),
                      label: Text(
                        saving
                            ? 'Updating favorite…'
                            : favorite == true
                            ? 'Remove from favorites'
                            : 'Add to favorites',
                      ),
                    ),
                    if (favoriteError != null) ...[
                      Text(favoriteError!),
                      TextButton(
                        onPressed: saving ? null : loadFavorite,
                        child: const Text('Retry favorite status'),
                      ),
                    ],
                    const SizedBox(height: 20),
                    taxonomy('Body parts', exercise!.bodyParts),
                    taxonomy('Equipment', exercise!.equipments),
                    taxonomy('Target muscles', exercise!.targetMuscles),
                    taxonomy('Secondary muscles', exercise!.secondaryMuscles),
                    const SizedBox(height: 12),
                    Text(
                      'How to perform',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    if (exercise!.instructions.isEmpty)
                      const Text('Instructions are not available yet.'),
                    for (var i = 0; i < exercise!.instructions.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Text('${i + 1}. ${exercise!.instructions[i]}'),
                      ),
                  ],
                ),
              ),
            ),
          ),
  );
}

class ExerciseMedia extends StatelessWidget {
  const ExerciseMedia({super.key, this.url});
  final String? url;
  @override
  Widget build(BuildContext context) {
    final uri = Uri.tryParse(url ?? '');
    const fallback = Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.fitness_center, size: 48),
          SizedBox(height: 8),
          Text('Exercise preview unavailable'),
        ],
      ),
    );
    return SizedBox(
      height: 240,
      child:
          uri == null ||
              !uri.hasAuthority ||
              !['http', 'https'].contains(uri.scheme)
          ? fallback
          : Image.network(
              url!,
              fit: BoxFit.contain,
              semanticLabel: 'Exercise demonstration',
              errorBuilder: (_, error, stack) => fallback,
            ),
    );
  }
}
