# safety (Layer 7 — Safety & Compliance)

Guardrails that protect HOY's brand and stay compliant.

- **Content moderation pipeline** — regex blocklist + Haiku judge before any outbound text
- **PII handling** — customer addresses/phones hashed, DMs encrypted at rest
- **Brand guardrails** — enforced in agent prompts (no exact prices in DMs, no "100% waterproof", etc.)
- **Mandatory escalation triggers** — DM mentions "lawyer", refund > ₹2,000, press inquiry, etc.

See [README §6](../../README.md#6-safety-compliance--brand-guardrails) and `/memory/escalation_rules.md`.
