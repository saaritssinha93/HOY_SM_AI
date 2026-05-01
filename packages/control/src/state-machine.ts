// Approval state machine — see README §3.
//
//   proposed ──► reviewing ──► approved ──► executing ──► succeeded
//                          └─► rejected                 └─► failed (one auto-retry → executing)
//                          └─► edited ──► approved
//
// Every transition is validated against this table. Anything else throws.

import type { ActionState } from "@hoy/shared";

const ALLOWED_TRANSITIONS: Record<ActionState, readonly ActionState[]> = {
  proposed: ["reviewing", "rejected"],
  reviewing: ["approved", "rejected", "edited"],
  edited: ["approved", "rejected"],
  approved: ["executing"],
  executing: ["succeeded", "failed"],
  // failed allows ONE retry path back to executing — controlled by the worker
  failed: ["executing"],
  // terminal states — no further transitions
  rejected: [],
  succeeded: [],
};

export const TERMINAL_STATES: ReadonlySet<ActionState> = new Set([
  "rejected",
  "succeeded",
]);

export function canTransition(from: ActionState, to: ActionState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStates(from: ActionState): readonly ActionState[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTerminal(state: ActionState): boolean {
  return TERMINAL_STATES.has(state);
}

export class IllegalStateTransition extends Error {
  constructor(
    public readonly from: ActionState,
    public readonly to: ActionState,
  ) {
    super(
      `Illegal state transition: ${from} → ${to}. ` +
        `Allowed from "${from}": [${ALLOWED_TRANSITIONS[from].join(", ") || "(terminal)"}]`,
    );
    this.name = "IllegalStateTransition";
  }
}
