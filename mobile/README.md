# FiFB Flutter

Weeks 3–4 foundation: one app for Android, iOS and Web, with registration, email OTP,
login, password reset, session restoration, User/Admin route guards, responsive
navigation and an account screen. Weeks 5–6 now include a three-step onboarding
and editable training profile, accessible from User Home and Profile. Goals,
schedule, taxonomy equipment/muscles, disliked exercises and limitations persist
through the authenticated API. Loading and save failures can be retried without
discarding edits. Explore now provides paginated exercise search, body-part,
equipment and target-muscle filters, exercise details with GIF/instructions,
and a paginated favorites view. Detail pages support adding/removing favorites
with retryable errors and a fallback for missing media. Weeks 7–8 add a paginated
plan list, create/edit/archive/restore, exercise selection, targets, ordering and
optional weekly schedules. Home previews Today Workout from active scheduled plans.
The first weeks 9–10 slice starts a selected day from Home and provides a live
logger, one-tap set copy, edit/delete, previous completed results, instructions,
rest countdown, pause/resume, completion, and session history/reopen in Workout.
Submitted changes are persisted before sending and retried with stable keys.
Only one pending change is supported; full offline workout recording remains pending.

Use Flutter **3.47.7** (Dart 3.13.5), matching CI. Commit `pubspec.lock` for reproducible installs.
The workspace SDK used during development is at `../tmp/sdk/flutter`; it is ignored by Git.

## Run

Start the Nest backend and apply pending Flyway migrations, including V5. Add
`http://localhost:5174` to `CORS_ORIGIN` in `server/.env`. To send verification/reset
links to Flutter Web, set `FRONTEND_URL=http://localhost:5174` and restart the server.
Email delivery requires the existing SendGrid settings.

```powershell
flutter pub get
flutter run -d chrome --web-port 5174 --dart-define=API_BASE_URL=http://localhost:4000/api/v1
```

For this workspace without Flutter on PATH, replace `flutter` with
`..\tmp\sdk\flutter\bin\flutter.bat` while inside `mobile/`.

```powershell
# Android emulator: 10.0.2.2 reaches the host machine
flutter run -d <device-id> --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

On a physical device, use a reachable API URL. Debug Android builds permit HTTP
for local development; release builds must use HTTPS. Android Internet permission
is included and backup is disabled for secure token storage. Android SDK/JDK must
be installed to build/run Android. iOS requires macOS/Xcode, signing configuration
and a reachable HTTPS backend. Keychain entitlements are included.

## Authentication

- Native: `/api/v1/auth/mobile/login`, `/refresh` and `/logout`. Refresh tokens are
  stored using OS secure storage; access tokens stay in memory. Refresh sends
  `{ "refreshToken": "..." }` and replaces the stored token after rotation.
- Web: existing `/api/v1/auth` endpoints with credentialed requests and HTTP-only
  refresh cookies. No tokens are persisted in browser local/session storage.
- A 401 triggers one shared refresh and one retry. Startup keeps saved credentials
  on network errors and offers retry; invalid sessions return to sign-in.
- Logout requires server revocation to succeed; on a network error the screen
  keeps the session and offers retry rather than claiming a successful logout.
- Role comes from `/auth/me`. Only User/Admin enter this app; Trainer sessions
  are revoked and directed to the existing website. Registration creates a User.
- Device-session management, per-device revocation UI and biometric Admin actions
  from section 9.1 remain separate follow-up work.

Web uses path URLs. Hosting must serve `index.html` for app paths such as
`/verify-email` and `/reset-password`. Keep Web and API on the same site for the
existing SameSite cookie policy (different localhost ports work). Native app links
are a later phase; a password reset token can also be entered in the reset form.

## Checks

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web --dart-define=API_BASE_URL=https://your-api.example/api/v1
flutter build apk --debug --dart-define=API_BASE_URL=https://your-api.example/api/v1
```

Tests use an injected HTTP client and token store, covering auth contracts, token
rotation, network failure, role redirects, forms and responsive layouts. Native
secure storage still needs a device smoke test; widget tests do not verify OS storage.
CI runs analysis, tests, Web and debug APK builds. Release signing and deployment
are not configured by this foundation.

## Live workout recovery

Expand a scheduled day on Home and choose Start workout. Workout lists sessions
and offers Reopen last workout and Retry pending workout start when applicable.
Returning to a session fetches server logs and the plan snapshot. A rest deadline
uses wall-clock time so closing/reopening does not restart the countdown; pause
clears it. No background sound/notification is implemented.

Session caches and pending requests are scoped by account and survive sign-out
for later recovery by the same account. No refresh/access tokens are stored with
workout data. Secure storage must work before a new write is sent. When the server
response is uncertain, Retry sync replays the saved request. Server state is
refreshed when the logger returns to the foreground while idle.
Opening the logger or returning to it also retries an uncertain saved request
after fetching the owned session, then refreshes the confirmed logs. Rejected
requests remain available for explicit review/discard and are not automatically
retried. Authorization failures hide both cached logs and pending-set details.
Editing on several devices concurrently is not conflict-resolved. Storage-plugin persistence and
browser/device lifecycle behavior need a real-device smoke test in addition to
the injected-store tests. Unsubmitted form text is not persisted.
