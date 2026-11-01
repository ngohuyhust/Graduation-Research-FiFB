import 'package:flutter/material.dart';
import '../auth/auth_controller.dart';
import 'live_workout_page.dart';
import 'session_repository.dart';

class SessionHistory extends StatefulWidget {
  const SessionHistory({super.key, required this.repository});
  final SessionRepository repository;
  @override
  State<SessionHistory> createState() => _SessionHistoryState();
}

class _SessionHistoryState extends State<SessionHistory> {
  List<Map<String, dynamic>> sessions = [];
  int page = 1, pages = 0;
  bool busy = true, pendingStart = false;
  String? error, lastId;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      pendingStart = await widget.repository.local('start') != null;
      lastId = (await widget.repository.local('last'))?['id'] as String?;
      final data = await widget.repository.list(page);
      if (!mounted) return;
      sessions = (data['items'] as List).cast<Map<String, dynamic>>();
      pages = data['totalPages'] as int;
    } catch (e) {
      if (mounted) error = AuthController.messageFor(e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> open(String id) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LiveWorkoutPage(repository: widget.repository, id: id),
      ),
    );
    if (mounted) load();
  }

  Future<void> retryStart() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final session = await widget.repository.start();
      if (mounted) await open(session['id']);
    } catch (e) {
      if (mounted) setState(() => error = AuthController.messageFor(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text('Workout sessions', style: Theme.of(context).textTheme.titleLarge),
      if (busy) const LinearProgressIndicator(),
      if (error != null) Text(error!),
      if (pendingStart)
        FilledButton(
          onPressed: busy ? null : retryStart,
          child: const Text('Retry pending workout start'),
        ),
      if (lastId != null)
        OutlinedButton(
          onPressed: busy ? null : () => open(lastId!),
          child: const Text('Reopen last workout'),
        ),
      if (!busy && sessions.isEmpty && error == null)
        const Text(
          'Start a scheduled workout from Home. Your sessions will appear here.',
        ),
      for (final session in sessions)
        Card(
          child: ListTile(
            title: Text(session['title']),
            subtitle: Text(
              '${session['completed_at'] != null
                  ? 'Completed'
                  : session['paused'] == true
                  ? 'Paused'
                  : 'In progress'} · ${session['logged_sets']} sets',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: busy ? null : () => open(session['id']),
          ),
        ),
      if (pages > 1)
        Wrap(
          children: [
            TextButton(
              onPressed: busy || page <= 1
                  ? null
                  : () {
                      page--;
                      load();
                    },
              child: const Text('Previous sessions'),
            ),
            Text('Page $page of $pages'),
            TextButton(
              onPressed: busy || page >= pages
                  ? null
                  : () {
                      page++;
                      load();
                    },
              child: const Text('Next sessions'),
            ),
          ],
        ),
      TextButton(
        onPressed: busy ? null : load,
        child: const Text('Refresh sessions'),
      ),
    ],
  );
}
