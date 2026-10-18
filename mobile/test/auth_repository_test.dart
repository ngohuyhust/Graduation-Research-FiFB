import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:fifb/auth/auth_controller.dart';
import 'package:fifb/core/api_client.dart';
import 'package:http/http.dart' as http;
import 'helpers.dart';

void main() {
  test(
    'native login stores refresh token and sends bearer token to me',
    () async {
      final store = MemoryTokenStore();
      final auth = createAuth((request) async {
        if (request.url.path.endsWith('/mobile/login')) {
          expect(jsonDecode(request.body), {
            'email': 'member@example.com',
            'password': 'password123',
          });
          return ok(tokenData());
        }
        expect(request.headers['authorization'], 'Bearer access-1');
        return ok(userData());
      }, store: store);
      expect(await auth.login('member@example.com', 'password123'), true);
      expect(store.token, 'refresh-1');
      expect(auth.user!.role, 'user');
    },
  );

  test(
    'web refresh uses cookie endpoint with no refresh token in request/storage',
    () async {
      final store = MemoryTokenStore();
      final auth = createAuth(
        (request) async {
          if (request.url.path.endsWith('/auth/refresh')) {
            expect(request.body, isEmpty);
            return ok({'accessToken': 'access-web'});
          }
          return ok(userData('admin'));
        },
        store: store,
        isWeb: true,
      );
      await auth.restore();
      expect(auth.user!.isAdmin, true);
      expect(store.token, isNull);
    },
  );

  test(
    'expired refresh signs out; network failure preserves secure token for retry',
    () async {
      final store = MemoryTokenStore()..token = 'stored';
      var offline = true;
      final auth = createAuth((_) async {
        if (offline) throw http.ClientException('offline');
        return failure(401, 'Invalid refresh token');
      }, store: store);
      await auth.restore();
      expect(auth.status, AuthStatus.unavailable);
      expect(store.token, 'stored');
      offline = false;
      await auth.restore();
      expect(auth.status, AuthStatus.signedOut);
      expect(store.token, isNull);
    },
  );

  test(
    'concurrent expired requests rotate once and retry with the new token',
    () async {
      final gate = Completer<void>();
      var refreshes = 0;
      final store = MemoryTokenStore()..token = 'stored';
      final auth = createAuth((request) async {
        if (request.url.path.endsWith('/mobile/refresh')) {
          refreshes++;
          await gate.future;
          return ok(tokenData('rotated'));
        }
        return request.headers['authorization'] == 'Bearer access-rotated'
            ? ok(userData())
            : failure(401, 'Expired');
      }, store: store);
      final first = auth.repository.currentUser();
      final second = auth.repository.currentUser();
      await Future<void>.delayed(Duration.zero);
      gate.complete();
      final users = await Future.wait([first, second]);
      expect(users.length, 2);
      expect(refreshes, 1);
      expect(store.token, 'refresh-rotated');
    },
  );

  test(
    'failed logout preserves session so the user can retry revocation',
    () async {
      final store = MemoryTokenStore();
      var failLogout = true;
      final auth = createAuth((request) async {
        if (request.url.path.endsWith('/login')) return ok(tokenData());
        if (request.url.path.endsWith('/logout')) {
          if (failLogout) throw http.ClientException('offline');
          return http.Response('', 204);
        }
        return ok(userData());
      }, store: store);
      await auth.login('member@example.com', 'password123');
      expect(await auth.logout(), false);
      expect(auth.status, AuthStatus.signedIn);
      expect(store.token, 'refresh-1');
      failLogout = false;
      expect(await auth.logout(), true);
      expect(auth.user, isNull);
      expect(store.token, isNull);
    },
  );

  test(
    'a Trainer account is rejected and its native session is revoked',
    () async {
      var revoked = false;
      final store = MemoryTokenStore();
      final auth = createAuth((request) async {
        if (request.url.path.endsWith('/login')) return ok(tokenData());
        if (request.url.path.endsWith('/logout')) {
          revoked = true;
          return http.Response('', 204);
        }
        return ok(userData('trainer'));
      }, store: store);
      expect(await auth.login('member@example.com', 'password123'), false);
      expect(auth.error, contains('User and Admin'));
      expect(revoked, true);
      expect(store.token, isNull);
    },
  );

  test(
    'second unauthorized response is surfaced without an infinite refresh loop',
    () async {
      var refreshes = 0;
      final auth = createAuth((request) async {
        if (request.url.path.endsWith('/refresh')) {
          refreshes++;
          return ok(tokenData());
        }
        return failure(401, 'Invalid');
      }, store: MemoryTokenStore()..token = 'stored');
      await expectLater(
        auth.repository.currentUser(),
        throwsA(isA<ApiException>()),
      );
      expect(refreshes, 1);
    },
  );
}
