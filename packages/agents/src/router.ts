// Model router — picks the right Claude model and thinking/effort config per agent.
//
// Routing rules (from the README):
//   - Haiku 4.5  → cheap classification, formatting (Exec Assistant, Finance)
//   - Sonnet 4.6 → daily ops, drafts, customer comms (Sales, Marketing, Web Dev, Operations)
//   - Opus 4.7   → CEO weekly planning ONLY (Mondays), and ambiguous escalations
//
// Adaptive thinking is recommended on 4.6+. Effort controls cost vs depth.

import type { Employee, ModelTier } from "@hoy/shared";

export interface ModelConfig {
  /** Anthropic model ID string. */
  model: string;
  /** Whether to enable adaptive thinking (Sonnet/Opus only — not supported on Haiku). */
  thinking: { type: "adaptive" } | { type: "disabled" };
  /** Effort level — controls thinking depth and overall token spend. Haiku doesn't support effort. */
  effort: "low" | "medium" | "high" | "max" | null;
  /** Hard cap on output tokens for this run. */
  max_tokens: number;
}

const MODEL_IDS: Record<ModelTier, string> = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
};

/**
 * Get the model config for an employee.
 * Special case: CEO uses Opus only on Mondays for the weekly memo. Daily ops use Sonnet.
 */
export function getModelConfig(employee: Employee, mode: "default" | "weekly_planning" = "default"): ModelConfig {
  // CEO override: weekly planning runs use Opus regardless of the registered tier.
  if (employee.role === "ceo" && mode === "weekly_planning") {
    return {
      model: MODEL_IDS.opus,
      thinking: { type: "adaptive" },
      effort: "high",
      max_tokens: 16_000,
    };
  }

  // CEO daily ops: use Sonnet, not the registered Opus tier (cost discipline).
  if (employee.role === "ceo" && mode === "default") {
    return {
      model: MODEL_IDS.sonnet,
      thinking: { type: "adaptive" },
      effort: "medium",
      max_tokens: 8_000,
    };
  }

  // Everyone else: route by registered tier.
  switch (employee.model_tier) {
    case "haiku":
      return {
        model: MODEL_IDS.haiku,
        thinking: { type: "disabled" },
        effort: null,
        max_tokens: 4_000,
      };
    case "sonnet":
      return {
        model: MODEL_IDS.sonnet,
        thinking: { type: "adaptive" },
        effort: "medium",
        max_tokens: 8_000,
      };
    case "opus":
      return {
        model: MODEL_IDS.opus,
        thinking: { type: "adaptive" },
        effort: "high",
        max_tokens: 16_000,
      };
  }
}
