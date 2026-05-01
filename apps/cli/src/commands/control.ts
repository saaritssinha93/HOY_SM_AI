// Approval, kill switch, autonomy, status — the operator control commands.

import { approveAction, getPendingActions, isPaused, pauseAll, rejectAction, resumeAll } from "@hoy/control";
import { db, type Action, type CostEntry, type Employee } from "@hoy/shared";

export async function handleControl(command: string, args: string[]): Promise<void> {
  switch (command) {
    case "approve":
      return cmdApprove(args);
    case "reject":
      return cmdReject(args);
    case "pending":
      return cmdPending();
    case "pause-all":
      return cmdPauseAll();
    case "resume-all":
      return cmdResumeAll();
    case "autonomy":
      return cmdAutonomy(args);
    case "status":
      return cmdStatus();
    case "employees":
      return cmdEmployees();
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// ============================================================================
// Approvals
// ============================================================================

async function cmdApprove(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: hoy approve <action_id>");
    process.exit(1);
  }
  await approveAction(id, { decided_by: "vanshika (cli)" });
  console.log(`✓ Approved ${id}`);
}

async function cmdReject(args: string[]): Promise<void> {
  const id = args[0];
  const reason = args.slice(1).join(" ") || "no reason given";
  if (!id) {
    console.error("Usage: hoy reject <action_id> [reason]");
    process.exit(1);
  }
  await rejectAction(id, reason, { decided_by: "vanshika (cli)" });
  console.log(`✓ Rejected ${id}`);
}

async function cmdPending(): Promise<void> {
  const pending = await getPendingActions(50);
  if (pending.length === 0) {
    console.log("No pending approvals. Inbox zero.");
    return;
  }
  for (const a of pending) {
    const ageMin = Math.floor((Date.now() - new Date(a.proposed_at).getTime()) / 60000);
    console.log(`${a.id}  [${a.type.padEnd(18)}]  ${ageMin}m ago`);
    console.log(`  ${summarize(a)}`);
  }
  console.log(`\n${pending.length} pending`);
}

function summarize(action: Action): string {
  const p = action.payload as Record<string, unknown>;
  switch (action.type) {
    case "send_dm":
      return `to @${String(p.to_handle ?? "")}: "${String(p.message ?? "").slice(0, 80)}…"`;
    case "propose_content":
      return `${String(p.format ?? "")}: "${String(p.title ?? "")}"`;
    default:
      return JSON.stringify(p).slice(0, 80);
  }
}

// ============================================================================
// Kill switch
// ============================================================================

async function cmdPauseAll(): Promise<void> {
  await pauseAll();
  console.log("✓ All agents paused. Resume with: hoy resume-all");
}

async function cmdResumeAll(): Promise<void> {
  await resumeAll();
  console.log("✓ All agents resumed.");
}

// ============================================================================
// Autonomy
// ============================================================================

async function cmdAutonomy(args: string[]): Promise<void> {
  const role = args[0];
  const levelStr = args[1];
  if (!role || !levelStr) {
    console.error("Usage: hoy autonomy <role> <0|1|2>");
    process.exit(1);
  }
  const level = Number(levelStr);
  if (![0, 1, 2].includes(level)) {
    console.error("Level must be 0, 1, or 2.");
    process.exit(1);
  }

  const { error } = await db()
    .from("employees")
    .update({ autonomy_level: level })
    .eq("role", role);
  if (error) throw error;

  await db().from("audit_log").insert({
    event: "autonomy_changed",
    payload: { role, level, decided_by: "vanshika (cli)" },
  });

  console.log(`✓ Set ${role} autonomy to L${level}`);
}

// ============================================================================
// Status
// ============================================================================

async function cmdStatus(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const [pendingRes, costsRes, employeesRes, paused] = await Promise.all([
    db().from("actions").select("id", { count: "exact", head: true }).eq("state", "proposed"),
    db().from("costs").select("cost_inr").eq("date", today),
    db().from("employees").select("*").eq("active", true),
    isPaused(),
  ]);

  const totalSpend = ((costsRes.data ?? []) as Pick<CostEntry, "cost_inr">[]).reduce(
    (s, c) => s + c.cost_inr,
    0,
  );

  console.log(`HOY · ${today}`);
  console.log("─".repeat(40));
  console.log(`Pending approvals: ${pendingRes.count ?? 0}`);
  console.log(`Today's spend:     ₹${totalSpend.toFixed(2)}`);
  console.log(`Active employees:  ${employeesRes.data?.length ?? 0}`);
  console.log(`System status:     ${paused ? "🛑 PAUSED" : "✓ running"}`);
}

async function cmdEmployees(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const [employeesRes, costsRes] = await Promise.all([
    db().from("employees").select("*").order("role"),
    db().from("costs").select("*").eq("date", today),
  ]);

  const costsBy = new Map<string, CostEntry>();
  for (const c of (costsRes.data ?? []) as CostEntry[]) {
    costsBy.set(c.employee_id, c);
  }

  for (const e of (employeesRes.data ?? []) as Employee[]) {
    const today = costsBy.get(e.id);
    const status = e.active ? "active" : "dormant";
    const spend = today ? `₹${today.cost_inr.toFixed(2)}` : "—";
    const actions = today ? `${today.action_count}/${e.daily_action_limit}` : "0";
    console.log(
      `${e.role.padEnd(20)} ${status.padEnd(10)} L${e.autonomy_level}  ${e.model_tier.padEnd(8)} ${spend.padStart(10)}  ${actions.padStart(6)} actions`,
    );
  }
}
