import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'app.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_repository.dart';
import 'auth/token_store.dart';
import 'core/api_client.dart';
import 'core/http_client.dart';
import 'core/url_strategy.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  configureUrls();
  final defaultUrl = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
      ? 'http://10.0.2.2:4000/api/v1'
      : 'http://localhost:4000/api/v1';
  const configuredUrl = String.fromEnvironment('API_BASE_URL');
  final api = ApiClient(
    baseUrl: (configuredUrl.isEmpty ? defaultUrl : configuredUrl).replaceFirst(
      RegExp(r'/$'),
      '',
    ),
    client: createHttpClient(),
  );
  final auth = AuthController(
    AuthRepository(
      api: api,
      store: kIsWeb ? CookieTokenStore() : SecureTokenStore(),
      isWeb: kIsWeb,
    ),
  );
  runApp(FiFBApp(auth: auth));
  auth.restore();
}
