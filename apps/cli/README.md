# cli

Local terminal commands for power use. Same operations available in the dashboard, but faster from a shell.

| Command | Purpose |
|---|---|
| `hoy approve <action_id>` | Approve a pending action |
| `hoy reject <action_id> [reason]` | Reject a pending action |
| `hoy pause-all` | Kill switch — stops every agent |
| `hoy resume-all` | Lift the kill switch |
| `hoy autonomy <agent> <0\|1\|2>` | Set an agent's autonomy level |
| `hoy budget <agent> <inr>` | Set an agent's daily ₹ cap |
| `hoy purge-customer <id>` | Delete a customer's data (DPDP compliance) |
| `hoy eval <agent>` | Run the golden test cases for an agent |
