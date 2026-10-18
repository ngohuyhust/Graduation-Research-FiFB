import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth_controller.dart';

enum AuthMode {
  login('/login', 'Welcome back', 'Sign in to your training space.', 'Sign in'),
  register(
    '/register',
    'Start your journey',
    'Create an account. Build a habit that lasts.',
    'Create account',
  ),
  verify(
    '/verify-email',
    'Check your email',
    'Enter the six-digit code sent to your email.',
    'Verify email',
  ),
  forgot(
    '/forgot-password',
    'Reset your password',
    'We will email you a link to reset your password.',
    'Send reset link',
  ),
  reset(
    '/reset-password',
    'Choose a new password',
    'Use at least eight characters.',
    'Save password',
  );

  const AuthMode(this.path, this.title, this.subtitle, this.action);
  final String path, title, subtitle, action;
}

class AuthPage extends StatefulWidget {
  const AuthPage({
    super.key,
    required this.auth,
    required this.mode,
    this.initialEmail = '',
    this.resetToken = '',
  });
  final AuthController auth;
  final AuthMode mode;
  final String initialEmail, resetToken;
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final form = GlobalKey<FormState>();
  late final email = TextEditingController(text: widget.initialEmail);
  late final token = TextEditingController(text: widget.resetToken);
  final password = TextEditingController();
  final name = TextEditingController();
  final phone = TextEditingController();
  final otp = TextEditingController();
  bool hidePassword = true;
  String? notice;
  AuthMode get mode => widget.mode;
  bool get hasPassword =>
      [AuthMode.login, AuthMode.register, AuthMode.reset].contains(mode);

  @override
  void initState() {
    super.initState();
    widget.auth.clearError();
  }

  @override
  void dispose() {
    for (final controller in [email, token, password, name, phone, otp]) {
      controller.dispose();
    }
    super.dispose();
  }

  void navigate(String path) {
    widget.auth.clearError();
    context.go(path);
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() || widget.auth.busy) return;
    setState(() => notice = null);
    if (mode == AuthMode.login) {
      await widget.auth.login(email.text, password.text);
      return;
    }
    final repo = widget.auth.repository;
    final success = await widget.auth.run(() async {
      switch (mode) {
        case AuthMode.register:
          await repo.register(name.text, email.text, phone.text, password.text);
        case AuthMode.verify:
          await repo.verify(email.text, otp.text);
        case AuthMode.forgot:
          await repo.requestReset(email.text);
        case AuthMode.reset:
          await repo.resetPassword(token.text.trim(), password.text);
        case AuthMode.login:
          break;
      }
    });
    if (!mounted || !success) return;
    if (mode == AuthMode.register) {
      navigate('/verify-email?email=${Uri.encodeComponent(email.text.trim())}');
    } else {
      setState(
        () => notice = switch (mode) {
          AuthMode.verify => 'Email verified. You can now sign in.',
          AuthMode.forgot =>
            'If an account exists for this email, a reset link has been sent.',
          _ => 'Password updated. You can now sign in.',
        },
      );
    }
  }

  Widget field(
    String label,
    TextEditingController controller, {
    TextInputType? keyboard,
    String? Function(String?)? validator,
    Iterable<String>? autofillHints,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: TextFormField(
      controller: controller,
      keyboardType: keyboard,
      autofillHints: autofillHints,
      enabled: !widget.auth.busy,
      decoration: InputDecoration(labelText: label),
      validator:
          validator ??
          (value) => value == null || value.trim().isEmpty
              ? '$label is required.'
              : null,
      textInputAction: TextInputAction.next,
    ),
  );

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.auth,
    builder: (context, _) => Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide =
                constraints.maxWidth >= 900 && constraints.maxHeight >= 640;
            final content = Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: AutofillGroup(
                    child: Form(
                      key: form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(
                                Icons.fitness_center,
                                color: Color(0xff16745b),
                              ),
                              SizedBox(width: 10),
                              Text(
                                'FiFB',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 24,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 36),
                          Text(
                            mode.title,
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            mode.subtitle,
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          const SizedBox(height: 28),
                          if (mode == AuthMode.register)
                            field(
                              'Full name',
                              name,
                              autofillHints: const [AutofillHints.name],
                            ),
                          if (mode != AuthMode.reset)
                            field(
                              'Email',
                              email,
                              keyboard: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              validator: (value) =>
                                  RegExp(
                                    r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                                  ).hasMatch(value?.trim() ?? '')
                                  ? null
                                  : 'Enter a valid email address.',
                            ),
                          if (mode == AuthMode.register)
                            field(
                              'Phone',
                              phone,
                              keyboard: TextInputType.phone,
                              autofillHints: const [
                                AutofillHints.telephoneNumber,
                              ],
                            ),
                          if (mode == AuthMode.verify)
                            field(
                              'Verification code',
                              otp,
                              keyboard: TextInputType.number,
                              autofillHints: const [AutofillHints.oneTimeCode],
                              validator: (value) =>
                                  RegExp(
                                    r'^\d{6}$',
                                  ).hasMatch(value?.trim() ?? '')
                                  ? null
                                  : 'Enter the six-digit code.',
                            ),
                          if (mode == AuthMode.reset &&
                              widget.resetToken.isEmpty)
                            field('Reset token from your email link', token),
                          if (hasPassword)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: TextFormField(
                                controller: password,
                                obscureText: hidePassword,
                                enabled: !widget.auth.busy,
                                autofillHints: [
                                  mode == AuthMode.login
                                      ? AutofillHints.password
                                      : AutofillHints.newPassword,
                                ],
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  suffixIcon: IconButton(
                                    tooltip: hidePassword
                                        ? 'Show password'
                                        : 'Hide password',
                                    onPressed: () => setState(
                                      () => hidePassword = !hidePassword,
                                    ),
                                    icon: Icon(
                                      hidePassword
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                    ),
                                  ),
                                ),
                                validator: (value) =>
                                    (value?.length ?? 0) <
                                        (mode == AuthMode.login ? 1 : 8)
                                    ? (mode == AuthMode.login
                                          ? 'Enter your password.'
                                          : 'Use at least eight characters.')
                                    : (value!.length > 128
                                          ? 'Use no more than 128 characters.'
                                          : null),
                                onFieldSubmitted: (_) => submit(),
                              ),
                            ),
                          if (widget.auth.error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Semantics(
                                liveRegion: true,
                                child: Text(
                                  widget.auth.error!,
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.error,
                                  ),
                                ),
                              ),
                            ),
                          if (notice != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Semantics(
                                liveRegion: true,
                                child: Text(notice!),
                              ),
                            ),
                          FilledButton(
                            onPressed: widget.auth.busy ? null : submit,
                            child: widget.auth.busy
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(mode.action),
                          ),
                          const SizedBox(height: 12),
                          if (mode == AuthMode.login) ...[
                            TextButton(
                              onPressed: widget.auth.busy
                                  ? null
                                  : () => navigate('/forgot-password'),
                              child: const Text('Forgot password?'),
                            ),
                            OutlinedButton(
                              onPressed: widget.auth.busy
                                  ? null
                                  : () => navigate('/register'),
                              child: const Text('Create an account'),
                            ),
                            TextButton(
                              onPressed: widget.auth.busy
                                  ? null
                                  : () => navigate(
                                      '/verify-email?email=${Uri.encodeComponent(email.text.trim())}',
                                    ),
                              child: const Text('Verify your email'),
                            ),
                          ] else
                            TextButton(
                              onPressed: widget.auth.busy
                                  ? null
                                  : () => navigate(
                                      '/login?email=${Uri.encodeComponent(email.text.trim())}',
                                    ),
                              child: const Text('Back to sign in'),
                            ),
                          if (mode == AuthMode.forgot)
                            TextButton(
                              onPressed: widget.auth.busy
                                  ? null
                                  : () => navigate('/reset-password'),
                              child: const Text('I have a reset token'),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
            return Row(
              children: [
                if (wide)
                  Expanded(
                    child: Container(
                      color: const Color(0xff123b31),
                      padding: const EdgeInsets.all(56),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.fitness_center,
                            color: Color(0xffb9efb9),
                            size: 56,
                          ),
                          SizedBox(height: 32),
                          Text(
                            'A stronger you.\nOne day at a time.',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 42,
                              height: 1.15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 24),
                          Text(
                            'Your space to build confidence, find your rhythm, and keep moving.',
                            style: TextStyle(
                              color: Color(0xffd2e5dc),
                              fontSize: 18,
                              height: 1.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(child: content),
              ],
            );
          },
        ),
      ),
    ),
  );
}
