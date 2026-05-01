// Concrete employee functions — the thin layer between the generic agent runner
// and HOY's specific business actions.
//
// Each function:
//   1. Loads the employee + the relevant DB context (lead, brief, order, etc.)
//   2. Calls runAgent() with a Zod schema for the proposal shape
//   3. Runs the result through @hoy/safety (moderation gate)
//   4. Calls proposeAction() to put it in the approval queue
//   5. Returns the action_id so callers (CLI, dashboard) can track it
//
// Phase 1 has the three employees the runtime needs to demo the 20-strangers
// experiment: Sales Head (drafts cold DMs), Marketing Head (drafts Reels),
// and the CEO (sends the Monday memo — see standup.ts when built).

export * from "./sales-head";
export * from "./marketing-head";
