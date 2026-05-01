// Approval flow — propose, approve, reject, edit, execute.
// Every transition writes to audit_log.

import { db, type Action, type ActionState, type ApprovalDecision } from "@hoy/shared";
import { canTransition, IllegalStateTransition } from "./state-machine";

// ============================================================================
// Propose
// ============================================================================

export interface ProposeActionInput {
  employee_id: string;
  run_id: string | null;
  type: string;
  payload: unknown;
  /**
   * Idempotency key — if a row with this key already exists, returns it
   * instead of creating a duplicate. Use a deterministic hash of the action
   * intent so retries don't double-send.
   */
  idempotency_key: string;
}

export async function proposeAction(input: ProposeActionInput): Promise<Action> {
  const supabase = db();

  // Idempotency check
  const { data: existing } = await supabase
    .from("actions")
    .select("*")
    .eq("idempotency_key", input.idempotency_key)
    .maybeSingle();

  if (existing) {
    return existing as Action;
  }

  const { data, error } = await supabase
    .from("actions")
    .insert({
      employee_id: input.employee_id,
      run_id: input.run_id,
      type: input.type,
      payload: input.payload,
      state: "proposed",
      idempotency_key: input.idempotency_key,
    })
    .select()
    .single();

  if (error) throw error;

  await audit({
    employee_id: input.employee_id,
    action_id: data.id,
    event: "action_proposed",
    payload: { type: input.type },
  });

  return data as Action;
}

// ============================================================================
// Approve / reject / edit (Vanshika's decisions)
// ============================================================================

export interface ApproveOptions {
  decided_by?: string;
  reason?: string;
}

export async function approveAction(
  actionId: string,
  options: ApproveOptions = {},
): Promise<void> {
  await transitionState(actionId, "approved", { reviewed_at: new Date().toISOString() });
  await recordApproval(actionId, "approved", null, options);
}

export async function rejectAction(
  actionId: string,
  reason: string,
  options: Omit<ApproveOptions, "reason"> = {},
): Promise<void> {
  await transitionState(actionId, "rejected", { reviewed_at: new Date().toISOString() });
  await recordApproval(actionId, "rejected", null, { ...options, reason });
}

export async function editAction(
  actionId: string,
  edits: unknown,
  options: ApproveOptions = {},
): Promise<void> {
  // Apply the edits to the payload, then transition through `edited` → `approved`.
  await applyEditsToPayload(actionId, edits);
  await transitionState(actionId, "edited", { reviewed_at: new Date().toISOString() });
  await transitionState(actionId, "approved");
  await recordApproval(actionId, "edited", edits, options);
}

// ============================================================================
// Execution lifecycle (called by the worker, not by Vanshika)
// ============================================================================

export async function markExecuting(actionId: string): Promise<void> {
  await transitionState(actionId, "executing", {
    executed_at: new Date().toISOString(),
  });
}

export async function markSucceeded(actionId: string, result: unknown): Promise<void> {
  await transitionState(actionId, "succeeded", {
    completed_at: new Date().toISOString(),
    result,
  });
}

export async function markFailed(actionId: string, error: string): Promise<void> {
  await transitionState(actionId, "failed", {
    completed_at: new Date().toISOString(),
    error,
  });
}

// ============================================================================
// Internal helpers
// ============================================================================

async function transitionState(
  actionId: string,
  to: ActionState,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const supabase = db();

  const { data: current, error: fetchErr } = await supabase
    .from("actions")
    .select("id, state, employee_id")
    .eq("id", actionId)
    .single();

  if (fetchErr) throw fetchErr;

  const from = current.state as ActionState;
  if (!canTransition(from, to)) {
    throw new IllegalStateTransition(from, to);
  }

  const { error: updateErr } = await supabase
    .from("actions")
    .update({ state: to, ...extra })
    .eq("id", actionId)
    .eq("state", from); // optimistic concurrency: only update if state hasn't changed

  if (updateErr) throw updateErr;

  await audit({
    employee_id: current.employee_id,
    action_id: actionId,
    event: "state_change",
    payload: { from, to },
  });
}

async function recordApproval(
  actionId: string,
  decision: ApprovalDecision,
  edits: unknown | null,
  options: ApproveOptions,
): Promise<void> {
  const supabase = db();

  // Compute latency from proposed_at → now
  const { data: action } = await supabase
    .from("actions")
    .select("proposed_at")
    .eq("id", actionId)
    .single();

  const latency_ms = action?.proposed_at
    ? Date.now() - new Date(action.proposed_at).getTime()
    : null;

  const { error } = await supabase.from("approvals").insert({
    action_id: actionId,
    decided_by: options.decided_by ?? "vanshika",
    decision,
    edits,
    reason: options.reason ?? null,
    latency_ms,
  });

  if (error) throw error;
}

async function applyEditsToPayload(actionId: string, edits: unknown): Promise<void> {
  const supabase = db();
  const { data: action, error: fetchErr } = await supabase
    .from("actions")
    .select("payload")
    .eq("id", actionId)
    .single();
  if (fetchErr) throw fetchErr;

  // Merge edits into payload (shallow). For deep edits, callers should send a full new payload.
  const currentPayload = (action.payload ?? {}) as Record<string, unknown>;
  const editsObj = (edits ?? {}) as Record<string, unknown>;
  const newPayload = { ...currentPayload, ...editsObj };

  const { error: updateErr } = await supabase
    .from("actions")
    .update({ payload: newPayload })
    .eq("id", actionId);
  if (updateErr) throw updateErr;
}

interface AuditInput {
  employee_id: string | null;
  action_id: string | null;
  event: string;
  payload: unknown;
  request_id?: string;
}

async function audit(input: AuditInput): Promise<void> {
  const { error } = await db()
    .from("audit_log")
    .insert({
      employee_id: input.employee_id,
      action_id: input.action_id,
      event: input.event,
      payload: input.payload,
      request_id: input.request_id ?? null,
    });
  // Audit failures are logged but don't crash the caller — better to lose an audit
  // entry than to fail an approval. The worker's own observability layer should
  // surface persistent audit failures.
  if (error) {
    console.error("[audit] failed to write audit_log entry:", error.message);
  }
}

// ============================================================================
// Queries
// ============================================================================

export async function getPendingActions(): Promise<Action[]> {
  const { data, error } = await db()
    .from("actions")
    .select("*")
    .eq("state", "proposed")
    .order("proposed_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Action[];
}

export async function getActionsByState(state: ActionState): Promise<Action[]> {
  const { data, error } = await db()
    .from("actions")
    .select("*")
    .eq("state", state)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Action[];
}
