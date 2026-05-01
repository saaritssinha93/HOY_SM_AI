"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const params = useSearchParams();
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your email for a magic link.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-ink mb-1">HOY Ops</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in with your magic link.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-ink/20 rounded-md bg-white focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full px-3 py-2 bg-ink text-cream rounded-md hover:bg-ink/90 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : status === "sent" ? "Sent!" : "Send magic link"}
          </button>
        </form>

        {(message || error) && (
          <p
            className={`mt-4 text-sm ${
              status === "sent" ? "text-green-700" : "text-red-700"
            }`}
          >
            {message ||
              (error === "unauthorized"
                ? "That email is not authorized for this dashboard."
                : error === "missing_code"
                  ? "Login link was incomplete. Try again."
                  : error)}
          </p>
        )}
      </div>
    </main>
  );
}
