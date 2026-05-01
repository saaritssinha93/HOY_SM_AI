# integrations (Layer 4 — External APIs)

Thin client wrappers around external APIs. Each wrapper handles:

- **Retries** with exponential backoff (3 tries, 1s/4s/16s)
- **Rate-limit awareness** (reads `X-RateLimit-*` headers)
- **Idempotency keys** (so retries don't double-send)
- **Audit logging** (every API call logged with request ID)
- **Schema validation** (Zod on responses)

| Integration | Phase | Status |
|---|---|---|
| Shopify Admin API | 1 | Not started |
| Gmail | 1 | Wired via MCP |
| Google Sheets | 1 | Not started |
| Razorpay | 2 | Pending KYC |
| Instagram Graph API | 3 | Needs Meta App Review (start now) |

See [README §2 → Layer 4](../../README.md#layer-4--integrations).
