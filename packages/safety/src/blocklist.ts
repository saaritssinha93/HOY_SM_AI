// Regex blocklist — fast, free, runs first. If anything here fires as `fail`,
// we reject without bothering the LLM judge.
//
// This is a STARTING list. Add to it whenever Vanshika catches a draft that
// should have been blocked. Each rule is a single regex with a clear message
// and an explicit channel scope — broad-match traps are worse than gaps.

import type { Channel, ModerationConcern } from "./types";

interface BlocklistRule {
  name: string;
  severity: "fail" | "warn";
  pattern: RegExp;
  /** Which channels this rule applies to. Empty = all. */
  channels: Channel[];
  message: string;
}

const RULES: BlocklistRule[] = [
  // ── PRICE RULES (per /memory/price_rules.md) ────────────────────────────
  {
    name: "exact_price_in_dm",
    severity: "fail",
    pattern: /(?:₹|rs\.?\s*|inr\s*)\s*\d/i,
    channels: ["ig_dm", "ig_comment"],
    message: "Never quote exact prices in DMs/comments. Link to the product page instead.",
  },
  {
    name: "usd_or_eur_price",
    severity: "fail",
    pattern: /[$€£]\s*\d/,
    channels: ["ig_dm", "ig_caption", "ig_comment", "email"],
    message: "HOY operates in INR only. Never quote USD/EUR/GBP prices.",
  },
  {
    name: "discount_too_large",
    severity: "warn",
    pattern: /(?:flat\s+)?(?:₹|rs\.?\s*)?\s*(?:[2-9]\d{2,}|[1-9]\d{3,})\s*(?:off|discount)/i,
    channels: [],
    message: "Discount over ₹100 — requires founder approval per /memory/price_rules.md.",
  },
  {
    name: "dm_for_price",
    severity: "fail",
    pattern: /\bDM\s+(?:me\s+)?(?:for\s+)?price\b/i,
    channels: ["ig_dm", "ig_caption", "ig_comment"],
    message: "Don't say 'DM for price'. We link to the website (prices change).",
  },

  // ── PRODUCT CLAIM RULES (per /memory/brand_voice.md) ────────────────────
  {
    name: "absolute_waterproof_claim",
    severity: "fail",
    pattern: /\b(?:100\s*%?|completely|fully|forever|lifetime|permanent(?:ly)?)\s*(?:water|sweat|shower)\s*proof\b/i,
    channels: [],
    message: "No absolute waterproof claims. Use 'waterproof for daily wear'.",
  },
  {
    name: "forever_anti_tarnish",
    severity: "fail",
    pattern: /\b(?:forever|lifetime|permanent(?:ly)?|never)\s*(?:tarnish|fade|change\s*color|go\s*green)\b/i,
    channels: [],
    message: "Don't promise jewelry will never tarnish. Use 'anti-tarnish' or 'won't go green in 2 weeks'.",
  },
  {
    name: "real_gold_claim",
    severity: "fail",
    pattern: /\b(?:real|solid|pure|genuine|24k|22k|18k)\s*gold\b/i,
    channels: [],
    message: "HOY uses PVD gold plating, not solid gold. Don't claim real/solid/24k/etc gold.",
  },

  // ── SHIPPING / DELIVERY (per /memory/price_rules.md) ────────────────────
  {
    name: "delivery_date_promise",
    severity: "fail",
    pattern: /\b(?:tomorrow|next\s*day|in\s*\d+\s*days?|within\s*\d+\s*(?:hour|day)s?|same\s*day)\s*delivery\b/i,
    channels: [],
    message: "Don't promise delivery dates. Link to Shopify order tracking.",
  },
  {
    name: "free_shipping_promise",
    severity: "warn",
    pattern: /\bfree\s*shipping\b/i,
    channels: ["ig_dm", "email"],
    message: "Only promise free shipping if Shopify already shows it for that order.",
  },

  // ── COLD-DM SPAM PATTERNS (per /employees/sales_head.md) ────────────────
  {
    name: "generic_spam_opener",
    severity: "fail",
    pattern: /^\s*(?:hi+|hey+|hello+)[,\s!]+(?:sis|beautiful|babe|love|gorgeous|hun|dear)\b/i,
    channels: ["ig_dm"],
    message: "Generic openers ('hi sis', 'hey beautiful') = spam DM red flag.",
  },
  {
    name: "thirsty_pitch_opener",
    severity: "warn",
    pattern: /^\s*(?:we|i)\s+(?:would\s+love\s+to|want\s+to|are\s+excited\s+to)\s+(?:partner|collaborate|introduce|share)/i,
    channels: ["ig_dm"],
    message: "Opener reads as a pitch. Open with something specific about the recipient instead.",
  },

  // ── PRESSURE / URGENCY (off-brand) ──────────────────────────────────────
  {
    name: "limited_time_pressure",
    severity: "warn",
    pattern: /\b(?:limited\s*time|hurry|don'?t\s*miss|last\s*chance|ending\s*soon|act\s*now)\b/i,
    channels: [],
    message: "Urgency language is off-brand. HOY's voice is playful, not pushy.",
  },
  {
    name: "buy_now_imperative",
    severity: "warn",
    pattern: /\bBUY\s*NOW\b/,
    channels: ["ig_dm", "ig_caption", "email"],
    message: "'BUY NOW' is too pushy. Use a softer CTA.",
  },
];

export function runBlocklist(text: string, channel: Channel): ModerationConcern[] {
  const concerns: ModerationConcern[] = [];

  for (const rule of RULES) {
    if (rule.channels.length > 0 && !rule.channels.includes(channel)) continue;
    const match = rule.pattern.exec(text);
    if (!match) continue;
    concerns.push({
      source: "blocklist",
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      match: match[0],
    });
  }

  return concerns;
}
