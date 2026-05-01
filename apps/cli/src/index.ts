// HOY CLI — terminal control surface.
//
// Usage from repo root:
//   npm run hoy -- <command> [args]
//
// Or from apps/cli/:
//   npm run hoy -- <command> [args]

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Set HOY_REPO_ROOT so brand memory loader can find /memory and /employees.
const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.HOY_REPO_ROOT = process.env.HOY_REPO_ROOT ?? join(__dirname, "..", "..", "..");

const HELP = `
HOY CLI — terminal control for the multi-agent ops system.

USAGE:
  hoy <command> [args]

LEAD COMMANDS:
  hoy lead add <ig_handle> [--bio "..."] [--followers N] [--location "..."] [--source "..."]
  hoy lead list [--status new|contacted|replied|converted]

DRAFT COMMANDS (require ANTHROPIC_API_KEY in .env):
  hoy draft sales --lead <id>
  hoy draft marketing --format <pasandida_mard|founder_face|stress_test|comparison|what_500_buys> [--brief "..."]

APPROVAL COMMANDS:
  hoy approve <action_id>
  hoy reject <action_id> [reason]
  hoy pending

CONTROL COMMANDS:
  hoy pause-all
  hoy resume-all
  hoy autonomy <role> <0|1|2>

STATUS COMMANDS:
  hoy status                  show today's snapshot
  hoy employees               list employees with today's usage

  hoy help                    show this message
`;

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP.trim());
    return;
  }

  switch (command) {
    case "lead": {
      const { handleLead } = await import("./commands/lead");
      await handleLead(rest);
      break;
    }
    case "draft": {
      const { handleDraft } = await import("./commands/draft");
      await handleDraft(rest);
      break;
    }
    case "approve":
    case "reject":
    case "pending":
    case "pause-all":
    case "resume-all":
    case "autonomy":
    case "status":
    case "employees": {
      const { handleControl } = await import("./commands/control");
      await handleControl(command, rest);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run `hoy help` for usage.");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n[error]", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack && process.env.HOY_DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
