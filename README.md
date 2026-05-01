# HOY_SM_AI

**A multi-agent operations system for House of Yeashi (™).**

Nine AI "employees" — a CEO and eight specialist department heads — that run the day-to-day work of a demi-fine jewelry brand: outreach, content, website, customer care, research, finance, and ops. Every outbound action is gated by founder approval. Built on the Claude Agent SDK.

---

## Status

| | |
|---|---|
| **Stage** | Phase 0 — design & scaffolding |
| **Project owner / builder** | Vanshika Srivastava (curator at HOY, operator of this system) |
| **Brand founder / voice** | Saarit Sinha (the on-camera Pasandida-mard voice) |
| **Brand** | House of Yeashi — anti-tarnish 316L + PVD gold jewelry, ₹200–₹2,000 |
| **Channels** | Instagram (@houseofyeashi), Shopify (www.houseofyeashi.in, Whisper theme) |
| **Current state** | ~192 IG followers · ~30 sales (all friends) · 0 stranger conversions yet · AOV <₹500 |
| **Top priority** | The 20-strangers experiment — get first stranger sales |

---

## Table of Contents

1. [The Company](#1-the-company)
2. [The 8-Layer Architecture](#2-the-8-layer-architecture)
3. [The Approval Gate](#3-the-approval-gate)
4. [Employee Contract](#4-employee-contract)
5. [Data Model](#5-data-model)
6. [Safety, Compliance & Brand Guardrails](#6-safety-compliance--brand-guardrails)
7. [Observability & Governance](#7-observability--governance)
8. [Phased Rollout](#8-phased-rollout)
9. [Operating Costs](#9-operating-costs)
10. [Repo Layout](#10-repo-layout)
11. [Glossary](#11-glossary)

---

## 1. The Company

### Org chart

```
                          ┌────────────────────────┐
                          │  YOU — Founder/Owner   │
                          │  (approvals + vision)  │
                          └───────────▲────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │  1. CEO / Chief of Staff│
                          └───────────┬────────────┘
        ┌──────────┬──────────┬───────┼───────┬──────────┬──────────┐
        ▼          ▼          ▼       ▼       ▼          ▼          ▼
   ┌─────────┐┌────────┐┌──────────┐┌──────┐┌──────────┐┌────────┐┌──────────┐
   │2.Marketing││3.Sales │4.Operations││5.Re-││6.Finance ││7.Web   ││8.Exec   │
   │  Head   ││ Head   ││  Head    ││search││  Head    ││Developer││Assistant │
   └─────────┘└────────┘└──────────┘└──────┘└──────────┘└────────┘└──────────┘
                                                                         │
                                                                         ▼
                                                                  ┌─────────────┐
                                                                  │ 9. HR (later)│
                                                                  └─────────────┘
```

### Roster

| # | Role | Job | Tools | Phase |
|---|---|---|---|---|
| 1 | **CEO / Chief of Staff** | Reads all dept reports; sends Monday memo with top 3 priorities; routes incoming work; batches approvals | Reads all DBs; approves nothing without founder | 1 |
| 2 | **Marketing Head** | Drafts Reels in Pasandida-mard voice; plans IG calendar; writes captions; runs email campaigns | Brand memory, Gmail, IG Insights | 1 |
| 3 | **Sales Head** | Runs the 20-strangers experiment; drafts cold DMs; tracks reply→conversion funnel; flags warm leads | Sheets, IG profile lookups, lead DB | 1 |
| 4 | **Operations Head** | Watches Shopify orders; drafts shipping updates; handles return requests | Shopify Admin API, Gmail | 2 |
| 5 | **Research Analyst** | Weekly competitor scan; customer insight from DMs/reviews; trend reports | Web search, IG search | 3 |
| 6 | **Finance** | Tracks revenue, COGS per piece, margin per SKU, monthly P&L; flags AOV drops or return spikes | Shopify orders, Razorpay, costs sheet | 3 |
| 7 | **Web Developer** | Site punch list — footer fix, "Diruba" typo, .heic re-uploads, product renames, worn-shot images | Shopify Admin API, theme files | 2 |
| 8 | **Executive Assistant** | Triages founder Gmail; sends daily approval queue; schedules content drops; push notifications | Gmail (MCP), push notifications | 1 |
| 9 | **HR / People Ops** | (Dormant until team ≥4) Onboarding docs, OOO handoffs, role descriptions | — | 4+ |

### Company rules

1. **All cross-department work routes through the CEO.** No agent talks directly to another specialist. Prevents agent loops; keeps the founder informed.
2. **Every employee writes a daily standup** to a shared log: what I did · what I'm blocked on · what needs approval. The CEO compiles these into the Monday brief.
3. **Approval gates are per-agent**, with autonomy levels the founder sets and can change anytime.
4. **Job descriptions are versioned in git.** Editing an agent's prompt is a commit, with a reason. Diffable over time.
5. **Brand memory is the source of truth for voice + naming.** Agents read `/memory/brand_voice.md` on every run.

---

## 2. The 8-Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 8 — Governance         job descriptions, weekly reviews,  │
│                               kill switch, hiring/firing process │
├──────────────────────────────────────────────────────────────────┤
│  Layer 7 — Safety & Compliance  content moderation, PII rules,   │
│                                 escalation triggers, audit log   │
├──────────────────────────────────────────────────────────────────┤
│  Layer 6 — Observability      structured logs, metrics, alerts,  │
│                               dashboard, cost tracking           │
├──────────────────────────────────────────────────────────────────┤
│  Layer 5 — Data & Memory      brand voice, catalog, customer     │
│                               ledger, lead pipeline, KB          │
├──────────────────────────────────────────────────────────────────┤
│  Layer 4 — Integrations       Shopify, IG Graph, Gmail, Cal,     │
│                               Razorpay, Sheets — each w/ retry   │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3 — Control Plane      approval state machine, autonomy   │
│                               levels, rate limits, kill switch   │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2 — Agent Runtime      CEO orchestrator + 8 specialists,  │
│                               model router (Haiku/Sonnet/Opus)   │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1 — Infrastructure     compute, DB, secrets, queue, cache │
└──────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Infrastructure

**Constraint: only Claude API costs money. Everything else uses free tiers or open source.**

| Component | Choice | Cost | Why |
|---|---|---|---|
| Compute (agents) | Local Mac + `launchd` cron | Free | Your laptop runs them; built into macOS |
| Compute (dashboard) | **Cloudflare Pages** | Free | Generous free tier; explicitly allows commercial use (Cloudflare Pages Hobby is gray for businesses) |
| Database | **Postgres on Supabase** (free tier) | Free | 500 MB; network-accessible so the dashboard can read it; commercial use OK |
| Auth | **Supabase Auth** (magic link) | Free | Vanshika-only access |
| Secrets | `.env` files, gitignored | Free | Discipline, not a service |
| Queue | DB table `pending_actions` | Free | DB-backed queue handles <1000 actions/day fine |
| Cache | Anthropic prompt caching (built-in) | Free | Cuts repeat-context cost ~90% |
| Source control | Git + GitHub free tier | Free | |

### Layer 2 — Agent Runtime

**Model routing** (cost discipline):

| Tier | Model | Used for | Cost (rough) |
|---|---|---|---|
| Cheap | Claude Haiku 4.5 | Classification, formatting, JSON extraction, daily standups | ~₹0.30 / 1M in |
| Default | Claude Sonnet 4.6 | DM drafts, captions, customer replies, research summaries | ~₹3 / 1M in |
| Premium | Claude Opus 4.7 | CEO weekly planning, ambiguous escalations only | ~₹15 / 1M in |

CEO uses Opus only on Mondays. Daily ops use Sonnet. Bulk classification uses Haiku. Wrong defaults = 10× cost difference.

### Layer 3 — Control Plane

See [Section 3](#3-the-approval-gate).

### Layer 4 — Integrations

Each integration is a thin client wrapper with retries, rate-limit awareness, idempotency keys, audit logging, and Pydantic schema validation.

| Integration | Status | Phase | Notes |
|---|---|---|---|
| Shopify Admin API | Needs key | 1 | REST + GraphQL, well-documented |
| Gmail | Wired (MCP) | 1 | Done |
| Google Calendar | Wired (MCP) | 1 | Done |
| Google Sheets | Needs auth | 1 | Lead pipeline + dashboard v1 |
| Razorpay | KYC pending | 2 | Read-only for Finance agent |
| Instagram Graph API | Needs Business acct + Meta App Review | 3 | **Start review NOW — 1–3 week wait** |
| WhatsApp Business | Deferred | 4+ | Heavy compliance |

### Layer 5 — Data & Memory

See [Section 5](#5-data-model).

### Layer 6 — Observability

See [Section 7](#7-observability--governance).

### Layer 7 — Safety & Compliance

See [Section 6](#6-safety-compliance--brand-guardrails).

### Layer 8 — Governance

See [Section 7](#7-observability--governance).

---

## 3. The Approval Gate

### State machine

Every outbound action moves through this machine. Every transition writes to `audit_log` (append-only).

```
proposed ──► reviewing ──► approved ──► executing ──► succeeded
                       │                            └─► failed (auto-retry 2x → human)
                       ├─► rejected
                       └─► edited ──► approved
```

### Autonomy levels

The founder sets one level per agent. Can change anytime via CLI: `hoy autonomy <agent> <level>`.

| Level | Behavior | Example |
|---|---|---|
| **L0** | Asks before every action | Sales Head in Phase 1 (every cold DM approved) |
| **L1** | Asks for "risky" actions only | Web Developer (auto-fix typos, ask before deletions) |
| **L2** | Full auto + end-of-day summary | Exec Assistant (auto-triage Gmail) |

### What counts as "risky" (L1 triggers approval)

- Any spend ≥ ₹500
- Any public post (IG, story, email blast)
- Any DM to a new account (no prior interaction)
- Any product price change
- Any customer refund
- Any deletion (product, image, message)
- Any action flagged by content moderation

### Approval channels

- **Phase 1**: Gmail — agent emails the founder a batched approval queue with `[approve] [edit] [reject]` reply tokens
- **Phase 3**: Web dashboard — one-click approval UI
- **Always available**: CLI fallback for power use (`hoy approve <action_id>`)

### Rate limits (hard caps per agent)

- Max actions/hour
- Max tokens/day
- Max ₹/day

Hit a cap → agent pauses + alerts founder.

### Kill switch

`hoy pause-all` writes a flag to DB. Every agent checks the flag before each action. Resume with `hoy resume-all`.

---

## 4. Employee Contract

Every agent implements the same interface. New employees can't be added without all of these.

```python
class Employee:
    role: str                       # "Sales Head"
    job_description_path: str       # /employees/sales_head.md (versioned in git)
    tools: list[Tool]               # scoped permissions
    model_tier: "haiku"|"sonnet"|"opus"
    autonomy_level: 0 | 1 | 2
    daily_token_budget: int
    daily_action_limit: int
    escalation_rules: list[Rule]    # see Section 6

    def standup() -> DailyReport:
        """What I did, blocked on, need approval for. Posted to #ceo-standups."""

    def execute(task: Task) -> Result:
        """Idempotent. Returns audit record. Honors approval gate."""

    def escalate(situation: str) -> EscalationTicket:
        """Hand off to founder with full context."""
```

### Hiring a new employee — checklist

1. Write the job description (markdown file in `/employees/`)
2. Define tools + scope
3. Set model tier, autonomy (start at L0), budgets
4. Write 10 golden test cases the agent must pass
5. Two-week probation at L0 before promotion to L1
6. Add to org chart in this README

### Firing / retraining

- Error rate >5% over 2 weeks → mandatory job description review
- Negative ROI over 1 month → fire (delete from `/employees/` + DB)

---

## 5. Data Model

Postgres on Supabase, ~10 tables. Schema lives in `/db/schema.sql`. Migrations via `supabase migration` or `drizzle-kit`.

| Table | Purpose | Key fields |
|---|---|---|
| `employees` | Agent registry | role, prompt_version, autonomy, budgets |
| `runs` | Every agent invocation | timestamp, agent, input, output, tokens, cost_inr |
| `actions` | Proposed/executed actions | state, agent, payload, idempotency_key |
| `approvals` | Approval requests | action_id, decision, decided_at, latency_ms |
| `audit_log` | Append-only outbound record | timestamp, agent, action, request_id, result |
| `leads` | The 20-strangers funnel | profile, contact_attempt, reply, converted |
| `customers` | Shopify + DM history merged | email, ig_handle, ltv, repeat_flag |
| `orders` | Shopify mirror w/ enrichment | order_id, total, items, fulfillment_status |
| `products` | Catalog + naming-system status | sku, name, renamed_yet, has_worn_shot |
| `knowledge` | FAQs, return policy, sizing | category, question, answer, source |
| `costs` | Per-agent daily token/INR spend | date, agent, tokens_in, tokens_out, inr |

### Brand memory (separate, in git)

| File | Contents |
|---|---|
| `/memory/brand_voice.md` | Voice guide, sample lines, banned phrases |
| `/memory/naming.md` | Hindi/Urdu naming world (Dilruba, Lakeer, Pari…); legacy English names to migrate |
| `/memory/escalation_rules.md` | When agents must hand off to founder |
| `/memory/price_rules.md` | Never quote prices in DMs; link to website |

Every agent reads these on boot.

---

## 6. Safety, Compliance & Brand Guardrails

### Content moderation pipeline

Every outbound text passes through:

1. **Regex blocklist** — slurs, competitor names, exact-price quotes, unverified claims
2. **LLM judge** (Haiku) — "Does this match HOY's brand voice? Any unbacked factual claim?"
3. Only if both pass → action moves to approval state

### PII handling (DPDP Act, India)

- Customer addresses/phones never in agent-readable logs (hashed for analytics)
- Customer DMs stored encrypted at rest
- Right to deletion: `hoy purge-customer <id>` purges all data for one customer

### Brand guardrails (in every agent's system prompt)

- Never claim "100% waterproof" → say "waterproof for daily wear"
- Never quote exact prices in DMs (link to website — prices change)
- Never promise delivery dates (Shopify shows real estimate)
- Never agree to discounts beyond ₹100 without escalation
- Always speak in Saarit's Hindi-English voice for IG; cleaner English for email

### Mandatory escalation triggers

Agent stops, writes an escalation ticket, pings founder immediately:

- Customer mentions "lawyer", "scam", "fraud", "police", "consumer court"
- Refund request > ₹2,000
- Negative public comment on a post
- Any media or press inquiry
- Any situation the agent itself flags as "I'm not sure"

---

## 7. Observability & Governance

### What every agent must emit

1. **Structured log (JSONL)** — `{ts, agent, action, status, tokens, cost_inr, duration_ms, request_id}`
2. **Metric** — incremented counters (`actions_per_agent`, `approvals_pending`, `cost_today`)
3. **Trace** — for multi-step tasks, the full reasoning chain (debugging weird outputs)

### Alerts (push to founder's phone via Notifier)

- Any agent error rate >5% in last hour
- Daily cost > ₹X (founder sets X)
- Approvals pending >24h (founder forgot to approve)
- Any escalation ticket created

### Dashboard

A custom web dashboard at a real URL (e.g. `hoy-ops.vercel.app` or own domain) — built in Phase 1. Founder logs in to approve actions, see live agent status, and run the company.

**Stack:**
- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui** for components
- **Supabase Auth** (email magic link — Saarit-only access)
- **Cloudflare Pages** hosting (free tier)
- Reads/writes the same Supabase Postgres the agents use
- Mobile-friendly (approve from phone)

**Pages:**
- `/` — today's snapshot: pending approvals, sales, DMs sent, spend
- `/approvals` — full approval queue with one-click approve / edit / reject
- `/employees` — per-agent status, last activity, error rate, ₹ spent today
- `/employees/[role]` — drill into one agent: standups, runs, prompt history
- `/leads` — the 20-strangers funnel
- `/orders` — Shopify orders w/ enrichment
- `/settings` — autonomy levels, daily budgets, kill switch
- `/audit` — append-only log of every outbound action

### Governance rituals

- **Daily** — agent standups → CEO compiles → founder gets morning brief
- **Weekly** — CEO sends Monday memo with top 3 priorities + last week's wins/losses
- **Monthly** — agent performance review: hours saved, errors, ₹/lead, ₹/sale, ₹/resolved DM
- **Quarterly** — fire or retrain any agent with >5% error rate or negative ROI

---

## 8. Phased Rollout

### Phase 0 — Foundations (this week)

- [ ] Install Claude Agent SDK; TypeScript monorepo (shared types between agents + dashboard)
- [ ] Repo skeleton matching this README's layout
- [ ] Supabase project + Postgres schema (10 tables)
- [ ] Brand memory files in `/memory/`
- [ ] `.env` template + secrets handling
- [ ] Approval state machine — DB-backed, with Gmail UI
- [ ] Kill switch CLI
- [ ] Per-agent rate limits + cost cap

### Phase 1 — Hire the first 4 employees + ship the dashboard (week 1–4)

- [ ] **CEO** — Monday memo + standup compiler
- [ ] **Sales Head** — runs the 20-strangers experiment
- [ ] **Marketing Head** — drafts Reel scripts + captions
- [ ] **Exec Assistant** — Gmail triage + approval queue delivery
- [ ] **Integrations**: Shopify, Gmail
- [ ] **Dashboard v1** at a real URL (Next.js on Cloudflare Pages):
    - [ ] Today snapshot + approval queue (one-click)
    - [ ] Employees page (status, errors, spend)
    - [ ] Leads / 20-strangers funnel
    - [ ] Settings (autonomy, budgets, kill switch)
    - [ ] Mobile-friendly
    - [ ] Supabase magic-link auth
- [ ] **Eval harness**: 10 golden DM examples Sales Head must pass

**Phase 1 success criteria**: 20 cold DMs sent (founder-approved via dashboard) in week 1; first stranger reply by week 2.

### Phase 2 — Shopify automation (week 3–4)

- [ ] **Web Developer** — burn down site punch list (footer, typo, .heic, renames, worn shots)
- [ ] **Operations Head** — order watching, shipping updates, return drafts
- [ ] Email campaigns moved from drafts to scheduled

### Phase 3 — Instagram operations (month 2)

Gating item: Meta App Review approval (start in Phase 0).

- [ ] **Research Analyst** — weekly competitor + trend report
- [ ] **Finance** — revenue + margin tracking
- [ ] DM Triage as a Sales sub-agent (drafts replies in voice)

### Phase 4 — Scale (month 3+)

- [ ] **HR** — only if team ≥4 people
- [ ] Influencer outreach as a Marketing sub-agent
- [ ] Dashboard v2 — analytics deep-dives, cohort views, public-facing brand metrics
- [ ] WhatsApp Business (if volume justifies)

---

## 9. Operating Costs

Rough INR/month estimates. Mostly Anthropic API + minor hosting.

**Only Claude API costs money. All hosting/infra is free until you genuinely outgrow free tiers (past Phase 3).**

| Tier | Volume | Claude API cost | Infra | Total |
|---|---|---|---|---|
| **Phase 1** (now) | ~30 actions/day | ₹2,500–4,000 | **₹0** | **₹2,500–4,000** |
| **Phase 3** (post-IG launch) | ~200 actions/day | ₹8,000–15,000 | **₹0** (still free tiers) | **₹8,000–15,000** |
| **Scale** (1000+ orders/mo) | ~1,000 actions/day | ₹25,000–50,000 | ₹0–3,000 (only if you outgrow Supabase free) | **₹25,000–53,000** |

Hard daily caps configured per agent so cost never surprises. Model routing (Haiku for cheap stuff, Sonnet default, Opus only for CEO Mondays) is the main cost lever — wrong defaults = 10× the bill.

---

## 10. Repo Layout

TypeScript monorepo (pnpm workspaces) so the dashboard and agents share types.

```
HOY_SM_AI/
├── README.md                  ← this file (the spec)
├── package.json               ← workspace root
├── pnpm-workspace.yaml
├── .env.example               ← required keys (Anthropic, Shopify, Gmail, IG, Supabase)
├── .gitignore
│
├── employees/                 ← job descriptions (system prompts), one .md per role
│   ├── ceo.md
│   ├── sales_head.md
│   ├── marketing_head.md
│   ├── operations_head.md
│   ├── research_analyst.md
│   ├── finance.md
│   ├── web_developer.md
│   ├── exec_assistant.md
│   └── hr.md                  ← dormant
│
├── memory/                    ← brand source of truth (read by every agent)
│   ├── brand_voice.md
│   ├── naming.md
│   ├── escalation_rules.md
│   └── price_rules.md
│
├── packages/
│   ├── shared/                ← types, db client, brand memory loader
│   ├── agents/                ← Layer 2 — runtime, model router, all employees
│   ├── control/               ← Layer 3 — approval state machine, kill switch
│   ├── integrations/          ← Layer 4 — Shopify, IG, Gmail clients
│   ├── safety/                ← Layer 7 — moderation, PII, escalations
│   └── observability/         ← Layer 6 — logging, metrics, alerts
│
├── apps/
│   ├── dashboard/             ← Next.js 15 app on Cloudflare Pages — the URL
│   │   ├── app/
│   │   │   ├── page.tsx              ← today snapshot
│   │   │   ├── approvals/page.tsx
│   │   │   ├── employees/page.tsx
│   │   │   ├── employees/[role]/page.tsx
│   │   │   ├── leads/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── audit/page.tsx
│   │   ├── components/        ← shadcn/ui
│   │   └── middleware.ts      ← Supabase auth gate
│   ├── worker/                ← long-running agent loop (local or Railway)
│   └── cli/                   ← `hoy approve`, `hoy pause-all`, etc.
│
├── db/
│   ├── schema.sql
│   └── migrations/
│
├── evals/                     ← golden test cases per agent
│   └── sales_head_dms.jsonl
│
└── logs/                      ← gitignored, JSONL
```

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Employee / Agent** | A Claude Agent SDK agent with a job description, tools, autonomy level, and budgets |
| **CEO** | The orchestrator agent. Routes work, batches approvals, writes the Monday memo |
| **Approval Gate** | The state machine every outbound action passes through |
| **Autonomy Level** | L0/L1/L2 — how much an agent can do without asking |
| **Standup** | Daily report each agent writes for the CEO to compile |
| **Escalation** | When an agent stops and hands off to the founder |
| **Brand Memory** | The source-of-truth files in `/memory/` every agent reads |
| **20-strangers experiment** | Phase 1 outreach project — get first stranger sales |
| **Pasandida-mard voice** | Saarit's signature Hindi-English Reel format |
| **Dashboard** | The Next.js web app at `hoy-ops.vercel.app` where the founder runs the company |

---

*This README is the spec. When you change how the company works, change this file first.*
