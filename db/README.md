# db/

Schema and migrations for the Supabase Postgres.

| File / dir | Purpose |
|---|---|
| `schema.sql` | Canonical table definitions (~10 tables — see [README §5](../README.md#5-data-model)) |
| `migrations/` | Versioned migrations applied via `supabase migration` or `drizzle-kit` |

Local SQLite files (if any during dev) are gitignored.
