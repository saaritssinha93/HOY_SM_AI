# evals/

Golden test cases per agent (one `.jsonl` file per role).

**Run before promoting any job description change** — catches prompt drift.

Format (per line):
```json
{"input": "...", "expected_behavior": "...", "must_include": ["..."], "must_not_include": ["..."]}
```

See [README §4](../README.md#4-employee-contract) — every new employee needs 10 golden examples before going live.
