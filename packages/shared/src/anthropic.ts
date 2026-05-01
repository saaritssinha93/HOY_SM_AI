// Anthropic SDK client singleton.
// Lives here (in @hoy/shared) so both @hoy/agents and @hoy/safety can use it
// without depending on each other.

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to .env (the only paid service in this project).",
    );
  }

  client = new Anthropic({ apiKey });
  return client;
}

export function _resetAnthropicClient(): void {
  client = null;
}
