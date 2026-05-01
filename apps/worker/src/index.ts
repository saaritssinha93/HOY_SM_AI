// Worker entry point — dispatches to one job per invocation.
//
// Designed to run as a one-shot CLI (not a long-running daemon). Schedule via
// macOS launchd / Linux cron — see launchd.md for templates.
//
// Usage:
//   npm run execute-pending        — runs the executor (every 5 min ideal)
//   npm run standup                — collects standups (daily 8am ideal)
//   npm run weekly-memo            — CEO writes Monday memo (Mondays 9am)

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Set HOY_REPO_ROOT so the brand memory loader can find /memory and /employees.
// This file lives at apps/worker/src/index.ts → repo root is 3 dirs up.
const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.HOY_REPO_ROOT = process.env.HOY_REPO_ROOT ?? join(__dirname, "..", "..", "..");

const command = process.argv[2];

async function main() {
  switch (command) {
    case "execute-pending": {
      const { executePending } = await import("./jobs/execute-pending");
      const result = await executePending();
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "standup":
    case "weekly-memo":
      console.log(`[${command}] not yet implemented in Phase 1 — coming with the CEO agent's loop.`);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available: execute-pending, standup, weekly-memo");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
