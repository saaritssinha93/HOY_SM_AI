# apps/

Runnable applications.

| App | What it is | Where it runs |
|---|---|---|
| `dashboard/` | Next.js 15 web dashboard for Vanshika | Cloudflare Pages (free) |
| `worker/` | Long-running agent loop — polls inbox, runs standups, dispatches work | Local Mac via `launchd` cron (free) |
| `cli/` | Local commands: `hoy approve`, `hoy pause-all`, `hoy autonomy <agent> <level>` | Local terminal |
