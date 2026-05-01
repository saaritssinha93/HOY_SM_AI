// Main moderation entry point.
//
// Pipeline:
//   1. Regex blocklist (free, fast, runs first) — fail closed on any fail-severity match
//   2. LLM judge (Haiku, ~₹0.05/call) — if blocklist passes
//
// Skip the judge with `blocklist_only: true` for low-risk internal text.

import { runBlocklist } from "./blocklist";
import { runLlmJudge } from "./judge";
import type { ModerateInput, ModerationConcern, ModerationResult } from "./types";

export async function moderate(input: ModerateInput): Promise<ModerationResult> {
  const blocklistConcerns = runBlocklist(input.text, input.channel);

  // If blocklist already failed, don't bother the LLM judge.
  if (hasFail(blocklistConcerns)) {
    return result(input, blocklistConcerns);
  }

  // Optional: skip LLM judge for low-risk internal text.
  if (input.blocklist_only) {
    return result(input, blocklistConcerns);
  }

  const judgeConcerns = await runLlmJudge({
    text: input.text,
    channel: input.channel,
    role: input.role,
  });

  return result(input, [...blocklistConcerns, ...judgeConcerns]);
}

/** Throws ModerationFailed if `result.allow` is false. */
export function assertAllowed(result: ModerationResult): void {
  if (!result.allow) throw new ModerationFailed(result);
}

export class ModerationFailed extends Error {
  constructor(public readonly result: ModerationResult) {
    const failures = result.concerns.filter((c) => c.severity === "fail");
    super(
      `Moderation rejected text on channel "${result.channel}": ` +
        failures.map((f) => `[${f.rule}] ${f.message}`).join("; "),
    );
    this.name = "ModerationFailed";
  }
}

// ============================================================================
// Internals
// ============================================================================

function result(input: ModerateInput, concerns: ModerationConcern[]): ModerationResult {
  return {
    allow: !hasFail(concerns),
    concerns,
    source_text: input.text,
    channel: input.channel,
  };
}

function hasFail(concerns: ModerationConcern[]): boolean {
  return concerns.some((c) => c.severity === "fail");
}
