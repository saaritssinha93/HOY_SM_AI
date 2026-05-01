// Token → INR cost calculator.
//
// PRICING NUMBERS BELOW ARE PLACEHOLDERS. Verify against the current Anthropic pricing
// page (https://www.anthropic.com/pricing) before going live in Phase 1, and update
// USD_TO_INR if the FX rate has moved >5%.

import type { ModelTier } from "./types";

// USD per 1M tokens — verify on every model release / pricing change.
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
    input: 0.25,
    output: 1.25,
    cache_read: 0.03,
    cache_write: 0.3,
  },
  sonnet: {
    input: 3.0,
    output: 15.0,
    cache_read: 0.3,
    cache_write: 3.75,
  },
  opus: {
    input: 15.0,
    output: 75.0,
    cache_read: 1.5,
    cache_write: 18.75,
  },
};

// Update if INR moves >5% vs the rate this was set at.
const USD_TO_INR = 85;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
}

/**
 * Calculate the INR cost of a single model call.
 * Returns 4-decimal-place INR (e.g. 0.0042 for cheap Haiku calls).
 */
export function calculateCostInr(tier: ModelTier, usage: TokenUsage): number {
  const p = PRICING_PER_M_TOKENS_USD[tier];

  const usd =
    (usage.input_tokens * p.input) / 1_000_000 +
    (usage.output_tokens * p.output) / 1_000_000 +
    ((usage.cache_read_tokens ?? 0) * p.cache_read) / 1_000_000 +
    ((usage.cache_write_tokens ?? 0) * p.cache_write) / 1_000_000;

  return Number((usd * USD_TO_INR).toFixed(4));
}

/**
 * Format an INR amount for display (₹0.00 or ₹X for whole rupees).
 */
export function formatInr(amount: number): string {
  if (amount >= 1) {
    return `₹${amount.toFixed(2)}`;
  }
  return `₹${amount.toFixed(4)}`;
}
