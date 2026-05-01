// Sales Head — drafts cold DMs for the 20-strangers experiment.
//
// Caller flow:
//   const result = await salesHeadDraftDm({ leadId });
//   // result.action_id is now in `proposed` state, waiting for Vanshika
//
// Errors thrown:
//   - LeadNotFound — invalid leadId
//   - LeadNotEligible — already converted, dead, or contacted in last 14 days
//   - ModerationFailed — draft tripped the safety gate
//   - SystemPaused / RateLimitExceeded — pre-flight gates from @hoy/control
//   - AgentParseError — model output didn't match schema (rare)

import { z } from "zod";
import { db, type Lead } from "@hoy/shared";
import { proposeAction } from "@hoy/control";
import { assertAllowed, moderate } from "@hoy/safety";
import { loadEmployee } from "../loader";
import { runAgent } from "../runner";

// ============================================================================
// Schema for what Sales Head returns
// ============================================================================

const SalesHeadDmDraft = z.object({
  message: z.string().min(20).max(500),
  reasoning: z.string().min(10),
  predicted_reply_rate: z.number().min(0).max(1),
});

type SalesHeadDmDraft = z.infer<typeof SalesHeadDmDraft>;

// ============================================================================
// Public API
// ============================================================================

export interface DraftDmInput {
  leadId: string;
}

export interface DraftDmResult {
  action_id: string;
  run_id: string;
  message: string;
  reasoning: string;
  predicted_reply_rate: number;
  cost_inr: number;
}

export async function salesHeadDraftDm(input: DraftDmInput): Promise<DraftDmResult> {
  const employee = await loadEmployee("sales_head");
  const lead = await loadLead(input.leadId);
  assertEligibleForContact(lead);

  const context = formatLeadContext(lead);

  const result = await runAgent({
    employee,
    task:
      "Draft a personalized cold DM to this lead, following the rules in your job description. " +
      "The DM goes into the approval queue for Vanshika to review. After approval, " +
      "she will manually send it on Instagram (IG Graph API not yet wired in Phase 1).",
    context,
    outputSchema: SalesHeadDmDraft,
    outputName: "SalesHeadDmDraft",
  });

  const moderation = await moderate({
    text: result.proposed.message,
    channel: "ig_dm",
    role: "sales_head",
  });
  assertAllowed(moderation);

  // Idempotency: one DM per (lead, day). Re-running today returns the same action.
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `sales_head:send_dm:${lead.ig_handle}:${today}`;

  const action = await proposeAction({
    employee_id: employee.id,
    run_id: result.run_id,
    type: "send_dm",
    payload: {
      to_handle: lead.ig_handle,
      lead_id: lead.id,
      message: result.proposed.message,
      reasoning: result.proposed.reasoning,
      predicted_reply_rate: result.proposed.predicted_reply_rate,
      moderation: { passed: true, warnings: moderation.concerns.filter((c) => c.severity === "warn") },
    },
    idempotency_key: idempotencyKey,
  });

  return {
    action_id: action.id,
    run_id: result.run_id,
    message: result.proposed.message,
    reasoning: result.proposed.reasoning,
    predicted_reply_rate: result.proposed.predicted_reply_rate,
    cost_inr: result.usage.cost_inr,
  };
}

// ============================================================================
// Errors
// ============================================================================

export class LeadNotFound extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "LeadNotFound";
  }
}

export class LeadNotEligible extends Error {
  constructor(public readonly lead: Lead, public readonly reason: string) {
    super(`Lead @${lead.ig_handle} not eligible for contact: ${reason}`);
    this.name = "LeadNotEligible";
  }
}

// ============================================================================
// Internals
// ============================================================================

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function loadLead(leadId: string): Promise<Lead> {
  const { data, error } = await db().from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error) throw error;
  if (!data) throw new LeadNotFound(leadId);
  return data as Lead;
}

function assertEligibleForContact(lead: Lead): void {
  if (lead.status === "converted") {
    throw new LeadNotEligible(lead, "already converted");
  }
  if (lead.status === "dead") {
    throw new LeadNotEligible(lead, "marked dead");
  }
  if (lead.contact_attempt_at) {
    const lastContact = new Date(lead.contact_attempt_at).getTime();
    if (Date.now() - lastContact < FOURTEEN_DAYS_MS) {
      const days = Math.ceil((Date.now() - lastContact) / (24 * 60 * 60 * 1000));
      throw new LeadNotEligible(lead, `contacted ${days} days ago — wait for 14-day cooldown`);
    }
  }
}

interface ProfileSnapshot {
  bio?: string;
  follower_count?: number;
  post_count?: number;
  location?: string;
  vibes?: string;
  recent_posts?: Array<{ caption?: string; engagement?: number }>;
}

function formatLeadContext(lead: Lead): string {
  const profile = (lead.profile_snapshot ?? {}) as ProfileSnapshot;

  const parts: string[] = [
    `IG handle: @${lead.ig_handle}`,
    `Source: ${lead.source ?? "unknown"}`,
    `Bio: ${profile.bio ? `"${profile.bio}"` : "(empty)"}`,
  ];

  if (profile.follower_count !== undefined) {
    parts.push(`Followers: ${profile.follower_count}`);
  }
  if (profile.location) {
    parts.push(`Location: ${profile.location}`);
  }
  if (profile.vibes) {
    parts.push(`Your read on their vibe: ${profile.vibes}`);
  }
  if (profile.recent_posts && profile.recent_posts.length > 0) {
    parts.push("Recent posts:");
    for (const post of profile.recent_posts.slice(0, 3)) {
      if (post.caption) parts.push(`  - "${post.caption.slice(0, 200)}"`);
    }
  }
  if (lead.notes) {
    parts.push(`Notes: ${lead.notes}`);
  }

  return parts.join("\n");
}
