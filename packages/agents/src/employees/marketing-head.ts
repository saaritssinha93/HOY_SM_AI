// Marketing Head — drafts Reel scripts in Saarit's voice.
//
// Caller flow:
//   const result = await marketingHeadDraftReel({ format: "pasandida_mard" });
//   // result.action_id is now in `proposed` state, waiting for Vanshika

import { z } from "zod";
import { proposeAction } from "@hoy/control";
import { assertAllowed, moderate } from "@hoy/safety";
import { loadEmployee } from "../loader";
import { runAgent } from "../runner";

// ============================================================================
// Schema — must match ProposeContentPayload in @hoy/shared
// ============================================================================

const ReelFormat = z.enum([
  "pasandida_mard",
  "founder_face",
  "stress_test",
  "comparison",
  "what_500_buys",
]);

const MarketingHeadReelDraft = z.object({
  format: ReelFormat,
  title: z.string().min(2).max(80),
  hook_line: z.string().min(5).max(200),
  script: z.string().min(50),
  duration_estimate_sec: z.number().int().min(5).max(90),
  shot_list: z.array(z.string()).min(1).max(20),
  caption: z.string().min(10).max(500),
  cta: z.enum(["link_in_bio", "dm_name", "comment_for_link"]),
  why_now: z.string().min(10),
});

type MarketingHeadReelDraft = z.infer<typeof MarketingHeadReelDraft>;

// ============================================================================
// Public API
// ============================================================================

export interface DraftReelInput {
  format: z.infer<typeof ReelFormat>;
  /** Optional steering — e.g. "feature Dilruba", "target Gen Z college students". */
  brief?: string;
}

export interface DraftReelResult {
  action_id: string;
  run_id: string;
  draft: MarketingHeadReelDraft;
  cost_inr: number;
}

export async function marketingHeadDraftReel(input: DraftReelInput): Promise<DraftReelResult> {
  const employee = await loadEmployee("marketing_head");

  const context = input.brief ? `Founder brief for this Reel: "${input.brief}"` : "No specific brief — pick what would land best this week.";

  const result = await runAgent({
    employee,
    task:
      `Draft a Reel script in the **${input.format}** format. ` +
      `Saarit will shoot from your script — write it so it sounds like her, not like you. ` +
      `Submit hook, full script (beat by beat), shot list, caption, and CTA. ` +
      `The draft goes into the approval queue for Vanshika.`,
    context,
    outputSchema: MarketingHeadReelDraft,
    outputName: "MarketingHeadReelDraft",
  });

  // Moderate the caption AND the script — both go to viewers eventually.
  // We treat the script as ig_caption-ish since it dictates what Saarit will say on camera.
  const [captionMod, scriptMod] = await Promise.all([
    moderate({ text: result.proposed.caption, channel: "ig_caption", role: "marketing_head" }),
    moderate({ text: result.proposed.script, channel: "ig_caption", role: "marketing_head" }),
  ]);
  assertAllowed(captionMod);
  assertAllowed(scriptMod);

  // Idempotency: same format + same brief on the same day → same action.
  const today = new Date().toISOString().slice(0, 10);
  const briefSlug = input.brief ? hash(input.brief) : "no-brief";
  const idempotencyKey = `marketing_head:propose_content:${input.format}:${briefSlug}:${today}`;

  const action = await proposeAction({
    employee_id: employee.id,
    run_id: result.run_id,
    type: "propose_content",
    payload: {
      ...result.proposed,
      moderation: {
        caption_warnings: captionMod.concerns.filter((c) => c.severity === "warn"),
        script_warnings: scriptMod.concerns.filter((c) => c.severity === "warn"),
      },
    },
    idempotency_key: idempotencyKey,
  });

  return {
    action_id: action.id,
    run_id: result.run_id,
    draft: result.proposed,
    cost_inr: result.usage.cost_inr,
  };
}

// ============================================================================
// Internals
// ============================================================================

/** Stable, short hash of a string (for idempotency keys). Not cryptographic. */
function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}
