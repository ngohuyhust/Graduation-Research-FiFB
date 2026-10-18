import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import 'auth_repository.dart';

enum AuthStatus { loading, signedOut, signedIn, unavailable }

class AuthController extends ChangeNotifier {
  AuthController(this.repository);
  final AuthRepository repository;
  AuthStatus status = AuthStatus.loading;
  AppUser? user;
  String? error;
  bool busy = false;

  Future<void> restore() async {
    status = AuthStatus.loading;
    error = null;
    notifyListeners();
    try {
      user = await repository.restore();
      status = user == null ? AuthStatus.signedOut : AuthStatus.signedIn;
    } catch (e) {
      error = messageFor(e);
      status = AuthStatus.unavailable;
    }
    notifyListeners();
  }

  Future<bool> run(Future<void> Function() action) async {
    if (busy) return false;
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
      return true;
    } catch (e) {
      error = messageFor(e);
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) => run(() async {
    user = await repository.login(email, password);
    status = AuthStatus.signedIn;
  });
  Future<bool> logout() => run(() async {
    await repository.logout();
    user = null;
    status = AuthStatus.signedOut;
  });
  void clearError() {
    error = null;
  }

  static String messageFor(Object error) => error is ApiException
      ? error.message
      : 'Unable to complete this action. Please try again.';
}
