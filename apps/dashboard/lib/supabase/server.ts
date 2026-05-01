// Supabase client for server components and server actions.
// Uses the user's session cookie via @supabase/ssr.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components can't set cookies — ignore. Middleware handles refresh.
          }
        },
      },
    },
  );
}

/**
 * Service-role Supabase client — bypasses RLS. Use for admin operations
 * (settings, audit log writes). Never use this in code that processes
 * untrusted input.
 */
export function supabaseAdmin() {
  // Lazy import to avoid bundling for client components
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
