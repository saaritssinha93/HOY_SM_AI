// Agent runner — executes a single agent invocation with structured output.
//
// Architecture:
//   1. Check kill switch + rate limits (refuse early if budget exceeded)
//   2. Load employee + build cached system prompt (job description + brand memory)
//   3. Call Anthropic via messages.parse() with a Zod schema (guarantees valid output)
//   4. Record run, usage, cost; return the parsed proposal
//
// Prompt caching: the system prompt (employee.md + 4 memory files) is stable across runs
// and goes in a single `cache_control: ephemeral` block. After the first call, repeat calls
// from the same agent within 5 minutes pay ~10% the input cost. Verify via cache_read_input_tokens.

import Anthropic from "@anthropic-ai/sdk";
import {
  anthropic,
  buildSystemPrompt,
  calculateCostInr,
  db,
  type Employee,
} from "@hoy/shared";
import { assertNotPaused, assertWithinLimits, recordUsage } from "@hoy/control";
import type { z } from "zod";
import { getModelConfig, type ModelConfig } from "./router";
import { zodToJsonSchema } from "./zod-to-json-schema";

export interface RunAgentOptions<T> {
  /** The employee record (load via `loadEmployee(role)`). */
  employee: Employee;
  /** What you want the agent to do — goes into the user message. */
  task: string;
  /** Optional context to prepend to the task (DB rows, lead profile, etc.). */
  context?: string;
  /** Zod schema describing the expected proposal shape. */
  outputSchema: z.ZodType<T>;
  /** Schema name (for the JSON Schema title — helps Claude's output match). */
  outputName: string;
  /** Override the model config (e.g., CEO Monday planning uses Opus). */
  mode?: "default" | "weekly_planning";
  /** Optional request ID for tracing (defaults to a generated UUID). */
  requestId?: string;
}

export interface RunAgentResult<T> {
  /** The parsed, schema-valid proposal. */
  proposed: T;
  /** Run row ID (for storing on the resulting action). */
  run_id: string;
  /** Token usage breakdown. */
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
    cost_inr: number;
  };
  /** Model and config actually used. */
  model: string;
}

export class AgentParseError extends Error {
  constructor(public readonly raw: unknown) {
    super("Agent returned a response that did not match the expected schema");
    this.name = "AgentParseError";
  }
}

export async function runAgent<T>(opts: RunAgentOptions<T>): Promise<RunAgentResult<T>> {
  // 1. Pre-flight gates
  await assertNotPaused();
  await assertWithinLimits(opts.employee.id);

  // 2. Build the cached system prompt + pick model config
  const [systemPrompt, config] = await Promise.all([
    buildSystemPrompt(opts.employee.role),
    Promise.resolve(getModelConfig(opts.employee, opts.mode ?? "default")),
  ]);

  const requestId = opts.requestId ?? crypto.randomUUID();
  const userMessage = opts.context
    ? `## Context\n\n${opts.context}\n\n## Task\n\n${opts.task}`
    : opts.task;

  // 3. Open a run row (status: running)
  const { data: runRow, error: runErr } = await db()
    .from("runs")
    .insert({
      employee_id: opts.employee.id,
      request_id: requestId,
      model_used: config.model,
      status: "running",
      input: { task: opts.task, context: opts.context, mode: opts.mode ?? "default" },
    })
    .select("id, started_at")
    .single();
  if (runErr) throw runErr;
  const runId = runRow.id;
  const startedAt = new Date(runRow.started_at).getTime();

  try {
    // 4. Call Anthropic with structured output + prompt caching
    const response = await callAnthropic(systemPrompt, userMessage, opts.outputSchema, opts.outputName, config);

    const proposed = parseStructuredOutput(response, opts.outputSchema);

    const usage = response.usage;
    const cost_inr = calculateCostInr(opts.employee.model_tier, {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
    });

    // 5. Close the run row + record usage
    await Promise.all([
      db()
        .from("runs")
        .update({
          status: "succeeded",
          output: proposed as unknown,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cache_tokens: (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
          cost_inr,
          duration_ms: Date.now() - startedAt,
          ended_at: new Date().toISOString(),
        })
        .eq("id", runId),
      recordUsage(opts.employee.id, {
        tokens_in: usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
        tokens_out: usage.output_tokens,
        cache_tokens: (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
        cost_inr,
        action_count: 0, // updated when proposeAction is called downstream
      }),
    ]);

    return {
      proposed,
      run_id: runId,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
        cost_inr,
      },
      model: config.model,
    };
  } catch (err) {
    await db()
      .from("runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
        ended_at: new Date().toISOString(),
      })
      .eq("id", runId);
    throw err;
  }
}

// ============================================================================
// Internals
// ============================================================================

async function callAnthropic<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodType<T>,
  schemaName: string,
  config: ModelConfig,
): Promise<Anthropic.Message> {
  const client = anthropic();

  // Build the request. Note: `effort` and `format` both live inside output_config.
  const outputConfig: Record<string, unknown> = {
    format: {
      type: "json_schema",
      schema: zodToJsonSchema(schema, schemaName),
    },
  };
  if (config.effort) outputConfig.effort = config.effort;

  const params: Anthropic.MessageCreateParams = {
    model: config.model,
    max_tokens: config.max_tokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }, // ~90% cheaper on repeat reads within 5 min
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    ...(config.thinking.type === "adaptive" ? { thinking: { type: "adaptive" } } : {}),
    // The cast is needed because output_config is a newer field not in older SDK type defs.
    ...({ output_config: outputConfig } as Record<string, unknown>),
  };

  return client.messages.create(params);
}

function parseStructuredOutput<T>(response: Anthropic.Message, schema: z.ZodType<T>): T {
  // Find the first text block (skip thinking blocks)
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    throw new AgentParseError(response.content);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new AgentParseError(textBlock.text);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AgentParseError({ raw: parsed, errors: result.error.issues });
  }
  return result.data;
}
