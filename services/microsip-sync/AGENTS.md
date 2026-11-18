# services/microsip-sync

Local persistent synchronization service using the existing API client. Never write back to VegyFresh or import backend internals. Keep customer mappings, tokens and operational SQLite files local. A simulator receipt is never proof of a real Microsip order. Preserve durable intent before any external write and reconcile ambiguous outcomes before retrying. Use `make check` for lint, types, tests and build; dependency installation runs through pnpm in Docker.
