import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.status = 0});
  final String message;
  final int status;
  bool get isUnauthorized => status == 401 || status == 403;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.baseUrl, required this.client});
  final String baseUrl;
  final http.Client client;

  Future<Map<String, dynamic>> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    try {
      final request = http.Request(method, Uri.parse('$baseUrl$path'));
      request.headers['Accept'] = 'application/json';
      if (accessToken != null) {
        request.headers['Authorization'] = 'Bearer $accessToken';
      }
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      final response = await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 20)),
      ).timeout(const Duration(seconds: 20));
      if (response.statusCode == 204) return {};
      final dynamic decoded;
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        throw ApiException(
          'The server returned an unexpected response.',
          status: response.statusCode,
        );
      }
      if (decoded is! Map<String, dynamic>) {
        throw const ApiException('The server returned an unexpected response.');
      }
      if (response.statusCode >= 400 || decoded['success'] != true) {
        final error = decoded['error'];
        throw ApiException(
          error is Map && error['message'] is String
              ? error['message'] as String
              : 'Something went wrong. Please try again.',
          status: response.statusCode,
        );
      }
      return decoded['data'] is Map<String, dynamic>
          ? decoded['data'] as Map<String, dynamic>
          : {};
    } on TimeoutException {
      throw const ApiException('Connection timed out. Please try again.');
    } on http.ClientException {
      throw const ApiException(
        'Cannot reach FiFB. Check your connection and try again.',
      );
    }
  }

  void close() => client.close();
}
