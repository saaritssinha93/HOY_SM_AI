# Supabase setup — one-time, ~10 minutes

This guide walks Vanshika through creating the Supabase project HOY_SM_AI uses for its database and auth.

**Cost:** ₹0 — Supabase free tier covers HOY's scale (500 MB Postgres, 50k MAU, commercial use OK).

---

## Step 1 — Create the Supabase account & project

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up with GitHub (easiest) or email.
3. Once logged in, click **New project**.
4. Fill in:
    - **Organization**: your default (or create one called "HOY")
    - **Name**: `hoy-sm-ai`
    - **Database password**: generate a strong one and save it in a password manager (you won't need it often, but you can't recover it)
    - **Region**: **South Asia (Mumbai)** — closest to you and your customers
    - **Pricing plan**: **Free**
5. Click **Create new project**. Wait ~2 minutes for it to provision.

---

## Step 2 — Apply the schema

1. In the Supabase dashboard, open your project.
2. Left sidebar → **SQL Editor**.
3. Click **New query**.
4. Open `db/migrations/0001_initial_schema.sql` from this repo.
5. Copy the entire file contents and paste into the Supabase SQL editor.
6. Click **Run** (or press Cmd+Enter).
7. You should see "Success. No rows returned." at the bottom.
8. Verify: left sidebar → **Table Editor** — you should see all 12 tables (employees, runs, actions, approvals, audit_log, leads, customers, orders, products, knowledge, costs, settings).
9. Verify the seed: open the `employees` table — you should see all 9 roles registered (only `ceo` has `active = true`).

---

## Step 3 — Get your API keys

1. Left sidebar → **Project Settings** (gear icon) → **API**.
2. Copy these three values into your `.env` file (in the repo root, not committed):

    | Supabase field | `.env` variable |
    |---|---|
    | Project URL | `SUPABASE_URL` |
    | `anon` `public` key | `SUPABASE_ANON_KEY` |
    | `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

3. **`service_role` key warning:** this bypasses Row Level Security. Use it ONLY in the worker (never in the dashboard frontend code). The dashboard uses the `anon` key + your authenticated session.

---

## Step 4 — Set up auth (Vanshika-only access to the dashboard)

1. Left sidebar → **Authentication** → **Providers**.
2. **Disable** every provider except **Email**.
3. In **Email** settings: enable **Magic Link**. Disable **Confirm email** if you want the smoothest first-login (you'll get the link directly).
4. Left sidebar → **Authentication** → **Users** → **Add user** → add your email (the one you want to log in with).
5. Save your email to `.env` as `OPERATOR_EMAIL`.

The dashboard will allow login *only* for users in the Auth users list — so Vanshika is the only person who can sign in.

---

## Step 5 — (Optional but recommended) Lock down audit_log

The `audit_log` table is supposed to be append-only. Add an RLS policy to enforce this:

1. SQL Editor → New query.
2. Paste and run:

    ```sql
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

    -- Allow inserts from anyone authenticated or service role
    CREATE POLICY audit_log_insert ON audit_log
      FOR INSERT
      TO authenticated, service_role
      WITH CHECK (true);

    -- Allow reads for authenticated users
    CREATE POLICY audit_log_select ON audit_log
      FOR SELECT
      TO authenticated, service_role
      USING (true);

    -- No UPDATE policy and no DELETE policy → forbidden by default
    ```

---

## Step 6 — Verify

In `.env`, you should now have:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPERATOR_EMAIL=...
```

Plus the Shopify / Gmail / IG / Razorpay placeholders — those come later, in Phase 1 / 2 / 3.

You're done. Future migrations go in `db/migrations/000N_*.sql` — apply them the same way (paste into SQL Editor, run).

---

## Troubleshooting

**"relation already exists" on re-run** — the migration uses `IF NOT EXISTS`, so this shouldn't happen. If it does, the table was created differently. Drop and re-run, or contact me.

**Can't see tables in Table Editor** — refresh the page; Supabase caches the schema briefly.

**Magic link email doesn't arrive** — check spam. Supabase free tier uses a shared sender that sometimes gets flagged. For a custom sender, configure SMTP later (free with Resend or Gmail).
