# logs/

Local JSONL logs (gitignored — only this README is tracked).

**Structured format**, one JSON object per line:
```json
{"ts": "...", "agent": "sales_head", "action": "draft_dm", "status": "succeeded", "tokens": 1240, "cost_inr": 3.7, "duration_ms": 2100, "request_id": "..."}
```

See [README §7](../README.md#7-observability--governance) for the full observability spec.
