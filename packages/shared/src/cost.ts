// Token → INR cost calculator.
//
// Pricing verified against the Anthropic models catalog.
// Re-verify whenever Anthropic changes prices or USD/INR moves >5%.

import type { ModelTier } from "./types";

// USD per 1M tokens. Cache read = ~0.1× base input. Cache write = 1.25× base input (5-min TTL).
const PRICING_PER_M_TOKENS_USD: Record<
  ModelTier,
  {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  }
> = {
  haiku: {
    input: 1.0,
    output: 5.0,
    cache_read: 0.1,
    cache_write: 1.25,
  },
  sonnet: {
    input: 3.0,
    output: 15.0,
    cache_read: 0.3,
    cache_write: 3.75,
  },
  opus: {
    input: 5.0,
    output: 25.0,
    cache_read: 0.5,
    cache_write: 6.25,
  },
};

const USD_TO_INR = 85;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
}

export function calculateCostInr(tier: ModelTier, usage: TokenUsage): number {
  const p = PRICING_PER_M_TOKENS_USD[tier];

  const usd =
    (usage.input_tokens * p.input) / 1_000_000 +
    (usage.output_tokens * p.output) / 1_000_000 +
    ((usage.cache_read_tokens ?? 0) * p.cache_read) / 1_000_000 +
    ((usage.cache_write_tokens ?? 0) * p.cache_write) / 1_000_000;

  return Number((usd * USD_TO_INR).toFixed(4));
}

export function formatInr(amount: number): string {
  if (amount >= 1) return `₹${amount.toFixed(2)}`;
  return `₹${amount.toFixed(4)}`;
}
