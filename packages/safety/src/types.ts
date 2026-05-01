// Channels — the place where outbound text is going.
// Some rules apply only to some channels (e.g. exact prices forbidden in IG DMs but OK in email).

export type Channel = "ig_dm" | "ig_caption" | "ig_comment" | "email" | "site_copy" | "internal";

export type Severity = "fail" | "warn";

export interface ModerationConcern {
  source: "blocklist" | "llm_judge";
  rule: string;
  severity: Severity;
  message: string;
  match?: string; // substring that matched (blocklist only)
}

export interface ModerationResult {
  allow: boolean; // false if any "fail" concern
  concerns: ModerationConcern[];
  source_text: string;
  channel: Channel;
}

export interface ModerateInput {
  text: string;
  channel: Channel;
  /** Employee role context — passed to the judge (e.g. "sales_head"). */
  role?: string;
  /** Skip the LLM judge (blocklist only). Faster + free; use for low-risk text. */
  blocklist_only?: boolean;
}
