// Executor — picks up actions in `approved` state and "executes" them.
//
// Phase 1 reality check: HOY doesn't have IG Graph API access yet (Meta App Review pending),
// so `send_dm` "execution" just transitions to succeeded and updates the lead status to
// `contacted`. Vanshika manually copies the DM and sends on Instagram.
//
// `propose_content` execution: same idea — transitions to succeeded; Saarit shoots the Reel
// from the script offline.
//
// When IG Graph API is wired in Phase 3, this is where the actual send call goes.

import {
  assertNotPaused,
  IllegalStateTransition,
  markExecuting,
  markFailed,
  markSucceeded,
} from "@hoy/control";
import { db, type Action } from "@hoy/shared";

export interface ExecutorResult {
  picked_up: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{ action_id: string; status: string; note?: string }>;
}

export async function executePending(): Promise<ExecutorResult> {
  await assertNotPaused();

  const { data, error } = await db()
    .from("actions")
    .select("*")
    .eq("state", "approved")
    .order("proposed_at", { ascending: true })
    .limit(20);

  if (error) throw error;
  const approved = (data ?? []) as Action[];

  const result: ExecutorResult = {
    picked_up: approved.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const action of approved) {
    try {
      await markExecuting(action.id);
    } catch (err) {
      // Race condition — another worker grabbed it. Skip.
      if (err instanceof IllegalStateTransition) {
        result.skipped++;
        result.details.push({ action_id: action.id, status: "skipped", note: "race" });
        continue;
      }
      throw err;
    }

    try {
      const note = await execute(action);
      await markSucceeded(action.id, { executed_at: new Date().toISOString(), note });
      result.succeeded++;
      result.details.push({ action_id: action.id, status: "succeeded", note });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markFailed(action.id, message);
      result.failed++;
      result.details.push({ action_id: action.id, status: "failed", note: message });
    }
  }

  return result;
}

// ============================================================================
// Per-type execution
// ============================================================================

async function execute(action: Action): Promise<string> {
  switch (action.type) {
    case "send_dm":
      return executeSendDm(action);
    case "propose_content":
      return executeProposeContent(action);
    default:
      throw new Error(`No executor registered for action type "${action.type}"`);
  }
}

async function executeSendDm(action: Action): Promise<string> {
  // Phase 1: no IG Graph API yet. Mark the lead as contacted and rely on
  // Vanshika to copy the message into Instagram manually.
  const payload = action.payload as { to_handle: string; lead_id: string; message: string };

  const { error } = await db()
    .from("leads")
    .update({
      status: "contacted",
      contact_attempt_at: new Date().toISOString(),
      contact_message: payload.message,
    })
    .eq("id", payload.lead_id);

  if (error) throw new Error(`Lead update failed: ${error.message}`);

  return `Marked lead @${payload.to_handle} as contacted. Vanshika sends the DM manually until IG Graph is wired.`;
}

async function executeProposeContent(_action: Action): Promise<string> {
  // Phase 1: content creation lives offline. Saarit shoots from the script;
  // we just record that the script was approved.
  return "Reel script approved — Saarit shoots from the script offline.";
}
