# Brand memory

The source of truth for brand voice, product naming, escalation rules, and price rules. **Every agent reads these on boot.**

| File | Purpose |
|---|---|
| `brand_voice.md` | Voice guide, sample lines, banned phrases |
| `naming.md` | Hindi/Urdu naming world; legacy English names to migrate |
| `escalation_rules.md` | When agents must hand off to Vanshika |
| `price_rules.md` | Pricing & discount rules |

Treat these like a brand bible — versioned in git. When the brand voice or rules evolve, edit here first; agents will pick up changes automatically on their next run.
