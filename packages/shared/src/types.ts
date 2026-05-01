// Type definitions matching db/migrations/0001_initial_schema.sql.
// When the schema changes, update both the migration AND this file.

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const ModelTier = z.enum(["haiku", "sonnet", "opus"]);
export type ModelTier = z.infer<typeof ModelTier>;

export const AutonomyLevel = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type AutonomyLevel = z.infer<typeof AutonomyLevel>;

export const RunStatus = z.enum(["running", "succeeded", "failed"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const ActionState = z.enum([
  "proposed",
  "reviewing",
  "approved",
  "rejected",
  "edited",
  "executing",
  "succeeded",
  "failed",
]);
export type ActionState = z.infer<typeof ActionState>;

export const ApprovalDecision = z.enum(["approved", "rejected", "edited"]);
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const LeadStatus = z.enum([
  "new",
  "contacted",
  "replied",
  "visited_site",
  "converted",
  "dead",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const NamingSystem = z.enum(["hindi_urdu", "english_legacy"]);
export type NamingSystem = z.infer<typeof NamingSystem>;

// ============================================================================
// Tables
// ============================================================================

export interface Employee {
  id: string;
  role: string;
  prompt_path: string;
  prompt_version: string;
  model_tier: ModelTier;
  autonomy_level: AutonomyLevel;
  daily_token_budget: number;
  daily_action_limit: number;
  daily_inr_budget: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  employee_id: string;
  request_id: string;
  model_used: string;
  status: RunStatus;
  input: unknown;
  output: unknown | null;
  error: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_inr: number;
  duration_ms: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface Action {
  id: string;
  employee_id: string;
  run_id: string | null;
  type: string;
  payload: unknown;
  state: ActionState;
  idempotency_key: string;
  proposed_at: string;
  reviewed_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  result: unknown | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  action_id: string;
  decided_by: string;
  decision: ApprovalDecision;
  edits: unknown | null;
  reason: string | null;
  decided_at: string;
  latency_ms: number | null;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  employee_id: string | null;
  action_id: string | null;
  event: string;
  payload: unknown;
  request_id: string | null;
}

export interface Lead {
  id: string;
  ig_handle: string;
  profile_snapshot: unknown | null;
  source: string | null;
  status: LeadStatus;
  contact_attempt_at: string | null;
  contact_message: string | null;
  replied_at: string | null;
  reply_summary: string | null;
  visited_site_at: string | null;
  converted_at: string | null;
  conversion_order_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shopify_customer_id: string | null;
  ig_handle: string | null;
  email_hash: string | null;
  phone_hash: string | null;
  display_name: string | null;
  ltv_inr: number;
  order_count: number;
  is_repeat: boolean;
  first_order_at: string | null;
  last_order_at: string | null;
  last_dm_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  shopify_order_id: string;
  customer_id: string | null;
  total_inr: number;
  currency: string;
  items: unknown;
  fulfillment_status: string | null;
  financial_status: string | null;
  channel: string | null;
  is_stranger: boolean | null;
  placed_at: string;
  fulfilled_at: string | null;
  enrichment: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shopify_product_id: string | null;
  sku: string | null;
  name: string;
  handle: string | null;
  price_inr: number | null;
  naming_system: NamingSystem | null;
  needs_rename: boolean;
  has_worn_shot: boolean;
  has_heic_image: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  source: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostEntry {
  id: string;
  date: string;
  employee_id: string;
  tokens_in: number;
  tokens_out: number;
  cache_tokens: number;
  cost_inr: number;
  action_count: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

// ============================================================================
// Action payload types (per `actions.type`)
// ============================================================================

export const SendDmPayload = z.object({
  to_handle: z.string(),
  lead_id: z.string().uuid(),
  message: z.string(),
  reasoning: z.string(),
  predicted_reply_rate: z.number().min(0).max(1).optional(),
});
export type SendDmPayload = z.infer<typeof SendDmPayload>;

export const ProposeContentPayload = z.object({
  format: z.enum([
    "pasandida_mard",
    "founder_face",
    "stress_test",
    "comparison",
    "what_500_buys",
  ]),
  title: z.string(),
  hook_line: z.string(),
  script: z.string(),
  duration_estimate_sec: z.number().int().positive(),
  shot_list: z.array(z.string()),
  caption: z.string(),
  cta: z.enum(["link_in_bio", "dm_name", "comment_for_link"]),
  why_now: z.string(),
});
export type ProposeContentPayload = z.infer<typeof ProposeContentPayload>;

// ============================================================================
// Brand memory keys (matches /memory/*.md)
// ============================================================================

export const BRAND_MEMORY_FILES = [
  "brand_voice",
  "naming",
  "escalation_rules",
  "price_rules",
] as const;

export type BrandMemoryKey = (typeof BRAND_MEMORY_FILES)[number];
