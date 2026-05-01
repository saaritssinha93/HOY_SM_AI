// Centralized DB queries used by multiple pages.
// All run server-side via supabaseServer() (RLS-respecting) or supabaseAdmin().

import { supabaseAdmin, supabaseServer } from "./supabase/server";
import type { Action, CostEntry, Employee, Lead, Order, Setting } from "@hoy/shared";

// ============================================================================
// Today snapshot — homepage data
// ============================================================================

export async function getTodaySnapshot() {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);

  const [pendingRes, todaysCostsRes, todaysOrdersRes, employeesRes, settingsRes] = await Promise.all([
    sb.from("actions").select("id", { count: "exact", head: true }).eq("state", "proposed"),
    sb.from("costs").select("cost_inr").eq("date", today),
    sb.from("orders").select("total_inr, is_stranger").gte("placed_at", `${today}T00:00:00Z`),
    sb.from("employees").select("*").eq("active", true),
    sb.from("settings").select("*"),
  ]);

  const todays_spend_inr = (todaysCostsRes.data ?? []).reduce(
    (sum: number, row: { cost_inr: number }) => sum + row.cost_inr,
    0,
  );

  const orders = (todaysOrdersRes.data ?? []) as Pick<Order, "total_inr" | "is_stranger">[];
  const todays_revenue_inr = orders.reduce((sum, o) => sum + Number(o.total_inr), 0);
  const todays_orders = orders.length;
  const todays_stranger_orders = orders.filter((o) => o.is_stranger).length;

  const settings = Object.fromEntries(
    ((settingsRes.data ?? []) as Setting[]).map((s) => [s.key, s.value]),
  );

  return {
    pending_approvals: pendingRes.count ?? 0,
    todays_spend_inr,
    todays_revenue_inr,
    todays_orders,
    todays_stranger_orders,
    employees: (employeesRes.data ?? []) as Employee[],
    is_paused: settings.pause_all === true,
  };
}

// ============================================================================
// Approval queue
// ============================================================================

export async function getPendingActions(limit = 50): Promise<Action[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("actions")
    .select("*")
    .eq("state", "proposed")
    .order("proposed_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Action[];
}

// ============================================================================
// Employees
// ============================================================================

export async function getEmployeesWithTodayUsage() {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);

  const [employeesRes, costsRes] = await Promise.all([
    sb.from("employees").select("*").order("role"),
    sb.from("costs").select("*").eq("date", today),
  ]);

  const employees = (employeesRes.data ?? []) as Employee[];
  const costsByEmployee = new Map<string, CostEntry>();
  for (const c of (costsRes.data ?? []) as CostEntry[]) {
    costsByEmployee.set(c.employee_id, c);
  }

  return employees.map((e) => ({
    employee: e,
    today: costsByEmployee.get(e.id) ?? null,
  }));
}

// ============================================================================
// Leads — the 20-strangers funnel
// ============================================================================

export async function getLeadsFunnel(): Promise<{ status: Lead["status"]; count: number }[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("leads").select("status");
  if (error) throw error;

  const counts = new Map<Lead["status"], number>();
  for (const row of (data ?? []) as { status: Lead["status"] }[]) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const order: Lead["status"][] = ["new", "contacted", "replied", "visited_site", "converted", "dead"];
  return order.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

// ============================================================================
// Settings
// ============================================================================

export async function getSettings(): Promise<Record<string, unknown>> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("settings").select("*");
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as Setting[]).map((s) => [s.key, s.value]));
}

// ============================================================================
// Audit log
// ============================================================================

export async function getRecentAuditEntries(limit = 100) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("audit_log")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Tag the unused import so eslint doesn't trip.
export const _adminAvailable = supabaseAdmin;
