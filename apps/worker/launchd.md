# Scheduling the worker via macOS launchd

The worker runs as one-shot commands. macOS `launchd` invokes them on a schedule.

## Recommended schedule

| Job | Cadence | Why |
|---|---|---|
| `execute-pending` | every 5 minutes | Pick up approved actions and "execute" them quickly |
| `standup` | daily, 08:00 IST | Each agent writes its standup; CEO compiles the brief |
| `weekly-memo` | Mondays, 09:00 IST | CEO Opus run that summarizes the week + sets priorities |

## Setting up the `execute-pending` job

1. Create `~/Library/LaunchAgents/in.houseofyeashi.execute-pending.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>in.houseofyeashi.execute-pending</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npm</string>
    <string>run</string>
    <string>execute-pending</string>
    <string>--prefix</string>
    <string>/Users/vanshikasrivastava/Documents/HOY_Socialmedia_PM_AI/HOY_SM_AI/apps/worker</string>
  </array>

  <key>StartInterval</key>
  <integer>300</integer>

  <key>StandardOutPath</key>
  <string>/Users/vanshikasrivastava/Documents/HOY_Socialmedia_PM_AI/HOY_SM_AI/logs/execute-pending.log</string>

  <key>StandardErrorPath</key>
  <string>/Users/vanshikasrivastava/Documents/HOY_Socialmedia_PM_AI/HOY_SM_AI/logs/execute-pending.err.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
```

2. Verify your `npm` path with `which npm` and update the plist if it's different
3. Load it: `launchctl load ~/Library/LaunchAgents/in.houseofyeashi.execute-pending.plist`
4. Verify: `launchctl list | grep houseofyeashi`
5. To stop: `launchctl unload ~/Library/LaunchAgents/in.houseofyeashi.execute-pending.plist`

## Calendar-based schedules (standup, weekly-memo)

For "every weekday at 08:00", use `StartCalendarInterval` instead of `StartInterval`:

```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key>
  <integer>8</integer>
  <key>Minute</key>
  <integer>0</integer>
</dict>
```

For "Mondays at 09:00":

```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Weekday</key>
  <integer>1</integer>
  <key>Hour</key>
  <integer>9</integer>
  <key>Minute</key>
  <integer>0</integer>
</dict>
```

Weekday: 0 = Sunday, 1 = Monday, …, 6 = Saturday.

## Caveats

- **Your Mac must be awake** when the job fires. launchd does NOT wake the machine.
- For 24/7 reliability, move the worker to a small cloud VM (Fly.io free tier, Cloudflare Workers Cron Triggers) — Phase 4.
- All timestamps in launchd are in **local time** (your Mac's timezone), not UTC.
