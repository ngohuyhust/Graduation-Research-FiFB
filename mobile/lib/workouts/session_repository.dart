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
  Future<void> _operations = Future.value();
  Future<void> _serial(Future<void> Function() action) {
    final next = _operations.then((_) => action());
    _operations = next.catchError((Object _) {});
    return next;
  }

  static List<Map<String, dynamic>> operations(Map<String, dynamic>? pending) =>
      pending == null
      ? []
      : [
          Map<String, dynamic>.from(pending)..remove('remaining'),
          ...(pending['remaining'] as List? ?? []).cast<Map<String, dynamic>>(),
        ];

  static bool isQueuedSet(Map<String, dynamic> item) =>
      item['method'] == 'POST' &&
      item['suffix'] == '/logs' &&
      item['body']?['clientOperationId'] is String;

  Future<void> _saveQueue(String id, List<Map<String, dynamic>> items) async {
    if (items.isEmpty) {
      await store.delete(key('pending.$id'));
    } else {
      await saveLocal('pending.$id', {
        ...items.first,
        'remaining': items.skip(1).toList(),
      });
    }
  }

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
    Map<String, dynamic>? body, {
    String? draftName,
  }) => _serial(() async {
    final items = operations(await local('pending.$id'));
    final request = <String, dynamic>{
      'method': method,
      'suffix': suffix,
      'body': body,
      'draftName': ?draftName,
    };
    if (items.isNotEmpty &&
        (!isQueuedSet(request) ||
            items.any(
              (item) =>
                  !isQueuedSet(item) ||
                  item['rejected'] == true ||
                  item.containsKey('draftName'),
            ))) {
      throw const ApiException('Resolve the pending changes first.');
    }
    items.add(request);
    await _saveQueue(id, items);
    // Clear the submitted form even when an earlier offline request blocks sync.
    if (draftName != null) {
      await store.delete(key(draftName));
      request.remove('draftName');
      await _saveQueue(id, items);
    }
    await _flush(id);
  });

  Future<void> flush(String id) => _serial(() => _flush(id));

  Future<void> _flush(String id) async {
    final items = operations(await local('pending.$id'));
    while (items.isNotEmpty) {
      final pending = items.first;
      if (pending['rejected'] == true) {
        throw ApiException(
          pending['error'] as String? ??
              'Review the rejected change before syncing.',
          status: 409,
        );
      }
      // The durable request owns the submitted values before the form is removed.
      // Repeat cleanup on recovery if the app stopped between these two writes.
      if (pending['draftName'] is String) {
        await store.delete(key(pending['draftName'] as String));
        pending.remove('draftName');
        await _saveQueue(id, items);
      }
      try {
        final result = await auth.authorized(
          pending['method'] as String,
          '/workout-sessions/$id${pending['suffix']}',
          body: pending['body'] as Map<String, dynamic>?,
        );
        // Persist acknowledged sets before advancing, including partial sync.
        final log = result['log'];
        final cached = await local('session.$id');
        if (isQueuedSet(pending) &&
            log is Map<String, dynamic> &&
            cached != null) {
          final logs = (cached['logs'] as List? ?? [])
              .cast<Map<String, dynamic>>();
          await saveLocal('session.$id', {
            ...cached,
            'logs': [
              ...logs.where(
                (row) =>
                    row['id'] != log['id'] &&
                    row['client_operation_id'] !=
                        pending['body']['clientOperationId'],
              ),
              if (log['deleted_at'] == null) log,
            ],
          });
        }
      } on ApiException catch (e) {
        if ([400, 404, 409].contains(e.status)) {
          items[0] = {...pending, 'rejected': true, 'error': e.message};
          await _saveQueue(id, items);
        }
        rethrow;
      }
      items.removeAt(0);
      await _saveQueue(id, items);
    }
  }

  Future<void> dismissRejected(String id) => _serial(() async {
    final items = operations(await local('pending.$id'));
    if (items.isEmpty || items.first['rejected'] != true) {
      throw const ApiException('Retry sync to confirm the outcome first.');
    }
    items.removeAt(0);
    await _saveQueue(id, items);
  });
}
