# agents (Layer 2 — Agent Runtime)

The Claude Agent SDK runtime, model router, and the 9 employees themselves.

- **Model router** — routes to Haiku / Sonnet / Opus based on the agent's `model_tier`
- **Employee loader** — reads job descriptions from `/employees/*.md`
- **Standup runner** — schedules daily standups, posts results to DB
- **Tool registry** — gates which tools each employee can call

See [README §2](../../README.md#layer-2--agent-runtime) and §4.
