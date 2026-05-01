# control (Layer 3 — Control Plane)

The approval gate that every outbound action passes through.

- **State machine**: `proposed → reviewing → approved/rejected/edited → executing → succeeded/failed`
- **Autonomy levels** (L0/L1/L2) per agent
- **Risky-action rules** (any spend ≥ ₹500, public post, new-account DM, etc.)
- **Rate limits** per agent (actions/hr, tokens/day, ₹/day)
- **Kill switch** — `hoy pause-all` writes a flag every agent reads

See [README §3](../../README.md#3-the-approval-gate).
