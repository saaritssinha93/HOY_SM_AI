// LLM judge — Haiku-based brand-voice and unbacked-claim checker.
// Runs after the blocklist passes. Catches the things regex can't:
//   • Off-brand voice (corporate, ChatGPT-isms, sales-y)
//   • Unbacked factual claims phrased in ways the blocklist won't catch
//   • Tone mismatches per channel
//
// Caching: the system prompt (judge instructions + brand voice excerpt) is stable.
// We cache it so repeat calls within 5 min cost ~10% the input.

import { anthropic, loadBrandMemory } from "@hoy/shared";
import type { Channel, ModerationConcern } from "./types";

const HAIKU_MODEL = "claude-haiku-4-5";

export interface JudgeInput {
  text: string;
  channel: Channel;
  role?: string;
}

interface JudgeRawResponse {
  allow: boolean;
  concerns: Array<{
    rule: string;
    severity: "fail" | "warn";
    message: string;
  }>;
}

export async function runLlmJudge(input: JudgeInput): Promise<ModerationConcern[]> {
  const memory = await loadBrandMemory();

  const systemPrompt = buildJudgeSystemPrompt(memory.brand_voice, memory.price_rules);

  const userMessage = [
    `Channel: ${input.channel}`,
    `Sender role: ${input.role ?? "unknown"}`,
    "",
    "Text to judge:",
    "---",
    input.text,
    "---",
    "",
    "Respond with JSON only.",
  ].join("\n");

  const response = await anthropic().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    // Fail closed: if the judge gave us nothing, treat as a fail.
    return [
      {
        source: "llm_judge",
        rule: "judge_no_response",
        severity: "fail",
        message: "Judge returned no text. Failing closed — review manually.",
      },
    ];
  }

  let parsed: JudgeRawResponse;
  try {
    parsed = JSON.parse(extractJson(textBlock.text));
  } catch {
    return [
      {
        source: "llm_judge",
        rule: "judge_invalid_json",
        severity: "fail",
        message: "Judge returned invalid JSON. Failing closed — review manually.",
      },
    ];
  }

  return parsed.concerns.map((c) => ({
    source: "llm_judge",
    rule: c.rule,
    severity: c.severity,
    message: c.message,
  }));
}

// ============================================================================
// Internals
// ============================================================================

function buildJudgeSystemPrompt(brandVoice: string, priceRules: string): string {
  return `You are a brand-safety reviewer for House of Yeashi (HOY) — an anti-tarnish demi-fine jewelry brand.

Your job: judge whether outgoing text is safe to send. You are a gate, not a writer — do not rewrite anything; only flag concerns.

Things to check for:

1. **Off-brand voice.** HOY's voice is playful Hindi-English code-mixing in Saarit's "Pasandida-mard" style. Reject corporate phrasing ("Discover", "Elevate", "Curated for the modern woman"), ChatGPT openers ("In a world where…", "Picture this:", "Let me tell you about…"), and generic AI-isms.
2. **Unbacked factual claims.** No "100% waterproof", no "real gold", no "lasts forever", no delivery dates, no specific shipping times.
3. **Tone mismatch by channel.**
   - ig_dm: warm, peer-to-peer, lighter Hindi-English than captions
   - ig_caption: full Hindi-English voice, hook in first line
   - email: cleaner English, light Hindi acceptable
   - site_copy: cleaner English, direct
4. **Claims that contradict /memory rules** (excerpts below).

Output a JSON object. ONLY JSON. No prose before or after.

Schema:
{
  "allow": boolean,            // false if ANY concern has severity "fail"
  "concerns": [
    {
      "rule": "string",        // short snake_case rule name (you invent these)
      "severity": "fail" | "warn",
      "message": "string"      // 1-line explanation, actionable
    }
  ]
}

If everything is fine, return: {"allow": true, "concerns": []}.

---
BRAND VOICE EXCERPT:
${trim(brandVoice)}
---
PRICE RULES EXCERPT:
${trim(priceRules)}
---`;
}

function trim(text: string, maxLines = 50): string {
  const lines = text.split("\n").slice(0, maxLines);
  return lines.join("\n");
}

function extractJson(text: string): string {
  // Haiku usually returns clean JSON, but it sometimes wraps in ```json ... ```
  const fenced = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(text);
  if (fenced) return fenced[1]!;
  return text.trim();
}
