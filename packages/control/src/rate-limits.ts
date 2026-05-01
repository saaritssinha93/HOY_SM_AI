// Per-employee daily caps: tokens, actions, INR spend.
//
// Each agent calls `assertWithinLimits(employee_id)` before starting a run.
// If any cap is exceeded, the agent pauses for the day.

import { db } from "@hoy/shared";

export type LimitKind = "tokens" | "actions" | "inr";

export interface RateLimitStatus {
  withinTokenBudget: boolean;
  withinActionLimit: boolean;
  withinInrBudget: boolean;

  tokens_used_today: number;
  actions_today: number;
  inr_spent_today: number;

  daily_token_budget: number;
  daily_action_limit: number;
  daily_inr_budget: number;
}

export async function checkRateLimits(employeeId: string): Promise<RateLimitStatus> {
  const today = todayUtcDate();
  const supabase = db();

  const [employeeRes, costsRes] = await Promise.all([
    supabase
      .from("employees")
      .select("daily_token_budget, daily_action_limit, daily_inr_budget")
      .eq("id", employeeId)
      .single(),
    supabase
      .from("costs")
      .select("tokens_in, tokens_out, action_count, cost_inr")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle(),
  ]);

  if (employeeRes.error) throw employeeRes.error;
  if (costsRes.error) throw costsRes.error;

  const employee = employeeRes.data;
  const costs = costsRes.data ?? {
    tokens_in: 0,
    tokens_out: 0,
    action_count: 0,
    cost_inr: 0,
  };

  const tokens_used = costs.tokens_in + costs.tokens_out;

  return {
    withinTokenBudget: tokens_used < employee.daily_token_budget,
    withinActionLimit: costs.action_count < employee.daily_action_limit,
    withinInrBudget: costs.cost_inr < employee.daily_inr_budget,

    tokens_used_today: tokens_used,
    actions_today: costs.action_count,
    inr_spent_today: costs.cost_inr,

    daily_token_budget: employee.daily_token_budget,
    daily_action_limit: employee.daily_action_limit,
    daily_inr_budget: employee.daily_inr_budget,
  };
}

export class RateLimitExceeded extends Error {
  constructor(
    public readonly employee_id: string,
    public readonly kind: LimitKind,
    public readonly status: RateLimitStatus,
  ) {
    super(
      `Rate limit exceeded for employee ${employee_id}: ${kind} ` +
        `(used: ${kindUsage(kind, status)} / cap: ${kindCap(kind, status)})`,
    );
    this.name = "RateLimitExceeded";
  }
}

export async function assertWithinLimits(employeeId: string): Promise<RateLimitStatus> {
  const status = await checkRateLimits(employeeId);
  if (!status.withinTokenBudget) throw new RateLimitExceeded(employeeId, "tokens", status);
  if (!status.withinActionLimit) throw new RateLimitExceeded(employeeId, "actions", status);
  if (!status.withinInrBudget) throw new RateLimitExceeded(employeeId, "inr", status);
  return status;
}

/**
 * Increment today's cost row for an employee — called after every model run.
 * Uses upsert to handle the first call of the day.
 */
export async function recordUsage(
  employeeId: string,
  delta: {
    tokens_in: number;
    tokens_out: number;
    cache_tokens?: number;
    cost_inr: number;
    action_count?: number;
  },
): Promise<void> {
  const today = todayUtcDate();
  const supabase = db();

  // Upsert via fetch + update/insert. For atomic increment we'd ideally use a
  // Postgres function — for Phase 1 the read-modify-write race is acceptable.
  const { data: existing } = await supabase
    .from("costs")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("costs")
      .update({
        tokens_in: existing.tokens_in + delta.tokens_in,
        tokens_out: existing.tokens_out + delta.tokens_out,
        cache_tokens: existing.cache_tokens + (delta.cache_tokens ?? 0),
        cost_inr: existing.cost_inr + delta.cost_inr,
        action_count: existing.action_count + (delta.action_count ?? 0),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("costs").insert({
      date: today,
      employee_id: employeeId,
      tokens_in: delta.tokens_in,
      tokens_out: delta.tokens_out,
      cache_tokens: delta.cache_tokens ?? 0,
      cost_inr: delta.cost_inr,
      action_count: delta.action_count ?? 0,
    });
    if (error) throw error;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function todayUtcDate(): string {
  // YYYY-MM-DD in UTC. Aligns with the `date` column type in `costs`.
  return new Date().toISOString().slice(0, 10);
}

function kindUsage(kind: LimitKind, s: RateLimitStatus): string {
  switch (kind) {
    case "tokens":
      return `${s.tokens_used_today} tokens`;
    case "actions":
      return `${s.actions_today} actions`;
    case "inr":
      return `₹${s.inr_spent_today.toFixed(2)}`;
  }
}

function kindCap(kind: LimitKind, s: RateLimitStatus): string {
  switch (kind) {
    case "tokens":
      return `${s.daily_token_budget} tokens`;
    case "actions":
      return `${s.daily_action_limit} actions`;
    case "inr":
      return `₹${s.daily_inr_budget.toFixed(2)}`;
  }
}
