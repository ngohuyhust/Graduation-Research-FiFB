import 'dart:convert';
import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../auth/auth_repository.dart';
import '../core/api_client.dart';

String operationId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

abstract interface class WorkoutStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class SecureWorkoutStore implements WorkoutStore {
  const SecureWorkoutStore();
  static const storage = FlutterSecureStorage();
  @override
  Future<String?> read(String key) => storage.read(key: key);
  @override
  Future<void> write(String key, String value) =>
      storage.write(key: key, value: value);
  @override
  Future<void> delete(String key) => storage.delete(key: key);
}

class SessionRepository {
  SessionRepository(
    this.auth,
    this.userId, {
    this.store = const SecureWorkoutStore(),
  });
  final AuthRepository auth;
  final String userId;
  final WorkoutStore store;
  String key(String name) => 'fifb.workout.$userId.$name';
  Future<Map<String, dynamic>?> local(String name) async {
    final data = await store.read(key(name));
    return data == null ? null : jsonDecode(data) as Map<String, dynamic>;
  }

  Future<void> saveLocal(String name, Map<String, dynamic> value) =>
      store.write(key(name), jsonEncode(value));

  Future<Map<String, dynamic>> start({Map<String, dynamic>? workout}) async {
    var pending = await local('start');
    if (pending != null &&
        workout != null &&
        (pending['workoutPlanId'] != workout['planId'] ||
            pending['dayNumber'] != workout['dayNumber'])) {
      throw const ApiException(
        'Retry the pending workout start in Workout sessions before starting a different day.',
      );
    }
    if (pending == null) {
      if (workout == null) {
        throw const ApiException('There is no pending start to retry.');
      }
      final planTitle = '${workout['title']}';
      final shortTitle = planTitle.substring(0, min(planTitle.length, 170));
      pending = {
        'workoutPlanId': workout['planId'],
        'dayNumber': workout['dayNumber'],
        'title': '$shortTitle · Day ${workout['dayNumber']}',
        'clientOperationId': operationId(),
      };
      // Persist the exact request before any network call, including uncertain outcomes.
      await saveLocal('start', pending);
    }
    final Map<String, dynamic> data;
    try {
      data = await auth.authorized('POST', '/workout-sessions', body: pending);
    } on ApiException catch (e) {
      if ([400, 404].contains(e.status)) await store.delete(key('start'));
      rethrow;
    }
    final session = data['session'] as Map<String, dynamic>;
    await saveLocal('last', {'id': session['id']});
    await store.delete(key('start'));
    return session;
  }

  Future<Map<String, dynamic>> detail(String id) async {
    final data = await auth.authorized('GET', '/workout-sessions/$id');
    final session = data['session'] as Map<String, dynamic>;
    await saveLocal('session.$id', session);
    await saveLocal('last', {'id': id});
    return session;
  }

  Future<Map<String, dynamic>> list(int page) =>
      auth.authorized('GET', '/workout-sessions?page=$page&limit=20');
  Future<List<Map<String, dynamic>>> previous(
    String id,
    String exerciseId,
  ) async =>
      ((await auth.authorized(
                'GET',
                '/workout-sessions/$id/previous?exerciseId=$exerciseId',
              ))['items']
              as List)
          .cast<Map<String, dynamic>>();

  Future<void> queue(
    String id,
    String method,
    String suffix,
    Map<String, dynamic>? body,
  ) async {
    if (await local('pending.$id') != null) {
      throw const ApiException('Sync the pending change first.');
    }
    await saveLocal('pending.$id', {
      'method': method,
      'suffix': suffix,
      'body': body,
    });
    await flush(id);
  }

  Future<void> flush(String id) async {
    final pending = await local('pending.$id');
    if (pending == null) return;
    try {
      await auth.authorized(
        pending['method'] as String,
        '/workout-sessions/$id${pending['suffix']}',
        body: pending['body'] as Map<String, dynamic>?,
      );
    } on ApiException catch (e) {
      if ([400, 404, 409].contains(e.status)) {
        await saveLocal('pending.$id', {...pending, 'rejected': true});
      }
      rethrow;
    }
    await store.delete(key('pending.$id'));
  }

  Future<void> dismissRejected(String id) async {
    if ((await local('pending.$id'))?['rejected'] != true) {
      throw const ApiException('Retry sync to confirm the outcome first.');
    }
    await store.delete(key('pending.$id'));
  }
}
