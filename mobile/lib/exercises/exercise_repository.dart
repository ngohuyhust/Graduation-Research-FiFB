import '../auth/auth_repository.dart';

class Exercise {
  Exercise.fromJson(Map<String, dynamic> data)
    : id = data['id'] as String,
      name = data['name'] as String,
      gifUrl = data['gifUrl'] as String?,
      instructions = List<String>.from(data['instructions'] ?? []),
      bodyParts = names(data['bodyParts']),
      equipments = names(data['equipments']),
      targetMuscles = names(data['targetMuscles']),
      secondaryMuscles = names(data['secondaryMuscles']);

  final String id, name;
  final String? gifUrl;
  final List<String> instructions,
      bodyParts,
      equipments,
      targetMuscles,
      secondaryMuscles;
  static List<String> names(dynamic values) => [
    for (final item in values as List? ?? []) item['name'] as String,
  ];
}

class ExercisePage {
  ExercisePage.fromJson(Map<String, dynamic> data)
    : items = [
        for (final item in data['items'] as List)
          Exercise.fromJson(item as Map<String, dynamic>),
      ],
      page = data['page'] as int,
      totalPages = data['totalPages'] as int,
      total = data['total'] as int;
  final List<Exercise> items;
  final int page, totalPages, total;
}

class ExerciseRepository {
  ExerciseRepository(this.auth);
  final AuthRepository auth;

  Future<ExercisePage> list({
    int page = 1,
    String keyword = '',
    String? bodyPart,
    String? equipment,
    String? targetMuscle,
    bool favorites = false,
  }) async {
    final query = Uri(
      queryParameters: {
        'page': '$page',
        'limit': '20',
        if (!favorites) ...{
          if (keyword.trim().isNotEmpty) 'keyword': keyword.trim(),
          'bodyPart': ?bodyPart,
          'equipment': ?equipment,
          'targetMuscle': ?targetMuscle,
        },
      },
    ).query;
    final data = favorites
        ? await auth.authorized('GET', '/favorites?$query')
        : await auth.api.send('GET', '/exercises?$query');
    return ExercisePage.fromJson(data);
  }

  Future<Exercise> detail(String id) async {
    final data = await auth.api.send('GET', '/exercises/$id');
    return Exercise.fromJson(data['exercise'] as Map<String, dynamic>);
  }

  Future<bool> isFavorite(String id) async =>
      (await auth.authorized('GET', '/favorites/$id'))['isFavorite'] as bool;

  Future<void> favorite(String id, bool value) async {
    await auth.authorized(
      value ? 'POST' : 'DELETE',
      value ? '/favorites' : '/favorites/$id',
      body: value ? {'exerciseId': id} : null,
    );
  }

  Future<List<String>> taxonomy(String kind) async => Exercise.names(
    (await auth.api.send('GET', '/exercise-taxonomy/$kind'))['items'],
  );
}
