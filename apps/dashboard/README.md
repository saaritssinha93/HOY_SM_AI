# dashboard

The Next.js 15 web dashboard at `hoy-ops` (Cloudflare Pages, free tier).

**Stack:**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth (magic-link, Vanshika-only)
- Reads/writes the same Supabase Postgres the worker uses
- Mobile-friendly

**Pages:**
- `/` — today snapshot (approvals, sales, DMs, spend)
- `/approvals` — full approval queue (one-click)
- `/employees` — per-agent status, errors, ₹ spent today
- `/employees/[role]` — drill into one agent (standups, runs, prompt history)
- `/leads` — the 20-strangers funnel
- `/orders` — Shopify orders w/ enrichment
- `/settings` — autonomy levels, daily budgets, kill switch
- `/audit` — append-only log of every outbound action

See [README §7 → Dashboard](../../README.md#dashboard) for the full spec.
