import 'dart:convert';
import 'package:fifb/auth/auth_controller.dart';
import 'package:fifb/auth/auth_repository.dart';
import 'package:fifb/auth/token_store.dart';
import 'package:fifb/core/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class MemoryTokenStore implements TokenStore {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String token) async {
    this.token = token;
  }

  @override
  Future<void> clear() async {
    token = null;
  }
}

http.Response ok(Map<String, dynamic> data) =>
    http.Response(jsonEncode({'success': true, 'data': data}), 200);
http.Response failure(int status, String message) => http.Response(
  jsonEncode({
    'success': false,
    'error': {'message': message},
  }),
  status,
);
Map<String, dynamic> userData([String role = 'user']) => {
  'user': {
    'id': 'user-1',
    'email': 'member@example.com',
    'role': role,
    'fullName': 'Test Member',
  },
};
Map<String, dynamic> tokenData([String suffix = '1']) => {
  'accessToken': 'access-$suffix',
  'refreshToken': 'refresh-$suffix',
};

AuthController createAuth(
  Future<http.Response> Function(http.Request) handler, {
  MemoryTokenStore? store,
  bool isWeb = false,
}) => AuthController(
  AuthRepository(
    api: ApiClient(
      baseUrl: 'https://example.com/api/v1',
      client: MockClient(handler),
    ),
    store: store ?? MemoryTokenStore(),
    isWeb: isWeb,
  ),
);
