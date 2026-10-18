import '../core/api_client.dart';
import 'token_store.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
  });
  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: json['id'] as String,
    email: json['email'] as String,
    role: json['role'] as String,
    fullName: json['fullName'] as String?,
  );
  final String id;
  final String email;
  final String role;
  final String? fullName;
  bool get isAdmin => role == 'admin';
  String get displayName =>
      fullName?.trim().isNotEmpty == true ? fullName! : email;
}

class AuthRepository {
  AuthRepository({required this.api, required this.store, required this.isWeb});
  final ApiClient api;
  final TokenStore store;
  final bool isWeb;
  String? _accessToken;
  Future<void>? _refreshing;
  String get _sessionPath => isWeb ? '/auth' : '/auth/mobile';

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    if (!isWeb) await store.write(data['refreshToken'] as String);
    _accessToken = data['accessToken'] as String;
  }

  Future<AppUser?> restore() async {
    if (!isWeb && await store.read() == null) return null;
    try {
      await refresh();
      return await currentUser();
    } on ApiException catch (error) {
      if (!error.isUnauthorized) rethrow;
      await clearSession();
      return null;
    }
  }

  Future<AppUser> login(String email, String password) async {
    final data = await api.send(
      'POST',
      '$_sessionPath/login',
      body: {'email': email.trim(), 'password': password},
    );
    await _saveTokens(data);
    return currentUser();
  }

  Future<void> refresh() {
    if (_refreshing != null) return _refreshing!;
    final future = _refresh();
    _refreshing = future;
    return future.whenComplete(() => _refreshing = null);
  }

  Future<void> _refresh() async {
    final token = await store.read();
    if (!isWeb && token == null) {
      throw const ApiException('Please sign in again.', status: 401);
    }
    final data = await api.send(
      'POST',
      '$_sessionPath/refresh',
      body: isWeb ? null : {'refreshToken': token},
    );
    await _saveTokens(data);
  }

  // Retry once after expiry; concurrent requests share the same rotation.
  Future<Map<String, dynamic>> authorized(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final sentToken = _accessToken;
    try {
      return await api.send(method, path, body: body, accessToken: sentToken);
    } on ApiException catch (error) {
      if (error.status != 401) rethrow;
      if (_accessToken == sentToken) await refresh();
      return api.send(method, path, body: body, accessToken: _accessToken);
    }
  }

  Future<AppUser> currentUser() async {
    final data = await authorized('GET', '/auth/me');
    final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    if (user.role != 'user' && user.role != 'admin') {
      await logout();
      throw const ApiException(
        'This app supports User and Admin accounts. Please use the existing website for a Trainer account.',
        status: 403,
      );
    }
    return user;
  }

  Future<void> logout() async {
    final token = await store.read();
    if (isWeb || token != null) {
      await api.send(
        'POST',
        '$_sessionPath/logout',
        body: isWeb ? null : {'refreshToken': token},
      );
    }
    await clearSession();
  }

  Future<void> clearSession() async {
    _accessToken = null;
    await store.clear();
  }

  Future<void> register(
    String name,
    String email,
    String phone,
    String password,
  ) async {
    await api.send(
      'POST',
      '/auth/register',
      body: {
        'fullName': name.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'password': password,
        'role': 'user',
      },
    );
  }

  Future<void> verify(String email, String otp) async {
    await api.send(
      'POST',
      '/auth/verify-email',
      body: {'email': email.trim(), 'otp': otp.trim()},
    );
  }

  Future<void> requestReset(String email) async {
    await api.send(
      'POST',
      '/auth/request-password-reset',
      body: {'email': email.trim()},
    );
  }

  Future<void> resetPassword(String token, String password) async {
    await api.send(
      'POST',
      '/auth/reset-password',
      body: {'token': token, 'newPassword': password},
    );
  }
}
