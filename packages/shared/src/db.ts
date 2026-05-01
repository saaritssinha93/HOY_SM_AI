// Supabase client singleton — used by the worker, CLI, and dashboard server-side code.
// The dashboard's client-side code uses its own anon-key client; this one uses the service role.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client using the service role key.
 * For server-side use only — never ship this client to the browser.
 *
 * Required env vars:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Copy .env.example to .env and follow db/SETUP.md.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "hoy-sm-ai/worker" } },
  });

  return client;
}

/**
 * Reset the singleton — only useful for tests.
 */
export function _resetDbClient(): void {
  client = null;
}
