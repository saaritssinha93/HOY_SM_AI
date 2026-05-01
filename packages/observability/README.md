# observability (Layer 6)

Structured logs, metrics, and alerts.

- **Structured logs** (JSONL) — every agent run emits one line to `/logs/`
- **Metrics** — counters in Supabase: `actions_per_agent`, `approvals_pending`, `cost_today`
- **Alerts** — push to Vanshika's phone when error rate >5%, daily cost > budget, approvals pending >24h

See [README §7](../../README.md#7-observability--governance).
