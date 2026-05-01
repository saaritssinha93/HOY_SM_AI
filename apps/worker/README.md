# worker

The long-running agent loop. Polls inbox, runs scheduled standups, dispatches work to the 9 employees.

**Phase 1:** runs locally on Vanshika's Mac via `launchd` (built-in macOS scheduler — no extra cost).

**Later:** can move to Cloudflare Workers Cron Triggers (free tier) or self-hosted.

**What it does:**
- Every 5 min: check pending actions, advance state machine
- Every 1 hour: run agent standups
- Every Monday 9am: CEO writes the weekly memo
- On approval webhook: execute the approved action immediately
