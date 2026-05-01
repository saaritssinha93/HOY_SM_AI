// `hoy draft sales` and `hoy draft marketing` — trigger an agent to draft a proposal.
// These cost real Anthropic tokens (Sonnet 4.6 by default).

import { parseArgs } from "node:util";
import { marketingHeadDraftReel, salesHeadDraftDm } from "@hoy/agents";

export async function handleDraft(args: string[]): Promise<void> {
  const subcommand = args[0];
  const rest = args.slice(1);

  switch (subcommand) {
    case "sales":
      return draftSales(rest);
    case "marketing":
      return draftMarketing(rest);
    default:
      console.error("Usage: hoy draft <sales|marketing> [args]");
      process.exit(1);
  }
}

async function draftSales(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      lead: { type: "string" },
    },
  });

  if (!values.lead) {
    console.error("Missing --lead <id>. Find one with: hoy lead list");
    process.exit(1);
  }

  console.log(`Drafting DM for lead ${values.lead}…\n`);
  const result = await salesHeadDraftDm({ leadId: values.lead });

  console.log("✓ Draft created");
  console.log("─".repeat(60));
  console.log(result.message);
  console.log("─".repeat(60));
  console.log(`\nWhy this DM:\n  ${result.reasoning}`);
  console.log(`\nPredicted reply rate: ${(result.predicted_reply_rate * 100).toFixed(0)}%`);
  console.log(`Cost: ₹${result.cost_inr.toFixed(4)}`);
  console.log(`\nApprove from dashboard or run: hoy approve ${result.action_id}`);
}

const VALID_FORMATS = [
  "pasandida_mard",
  "founder_face",
  "stress_test",
  "comparison",
  "what_500_buys",
] as const;

async function draftMarketing(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      format: { type: "string" },
      brief: { type: "string" },
    },
  });

  const format = values.format as (typeof VALID_FORMATS)[number] | undefined;
  if (!format || !VALID_FORMATS.includes(format)) {
    console.error(`--format required. One of: ${VALID_FORMATS.join(", ")}`);
    process.exit(1);
  }

  console.log(`Drafting ${format} Reel${values.brief ? ` (brief: "${values.brief}")` : ""}…\n`);
  const result = await marketingHeadDraftReel({ format, brief: values.brief });

  console.log(`✓ Draft created: "${result.draft.title}"`);
  console.log("─".repeat(60));
  console.log(`Hook: ${result.draft.hook_line}`);
  console.log(`\nScript:\n${result.draft.script}`);
  console.log(`\nCaption:\n${result.draft.caption}`);
  console.log("─".repeat(60));
  console.log(`Format: ${result.draft.format} · ${result.draft.duration_estimate_sec}s · CTA: ${result.draft.cta}`);
  console.log(`Why now: ${result.draft.why_now}`);
  console.log(`Cost: ₹${result.cost_inr.toFixed(4)}`);
  console.log(`\nApprove from dashboard or run: hoy approve ${result.action_id}`);
}
