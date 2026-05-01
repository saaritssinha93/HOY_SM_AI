# packages/

Shared TypeScript packages used by both the worker (agents) and the dashboard.

| Package | Layer | Purpose |
|---|---|---|
| `shared/` | — | Types, Supabase client, brand memory loader |
| `agents/` | 2 | Agent runtime, model router, the 9 employees |
| `control/` | 3 | Approval state machine, autonomy levels, kill switch, rate limits |
| `integrations/` | 4 | Shopify, IG Graph, Gmail clients (each with retry + audit) |
| `safety/` | 7 | Content moderation, PII handling, escalation triggers |
| `observability/` | 6 | Structured logging, metrics, alerts |

See [README §2](../README.md#2-the-8-layer-architecture) for the full layer breakdown.
