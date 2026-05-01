// Minimal Zod → JSON Schema converter for the structured output API.
//
// We avoid pulling in `zod-to-json-schema` as a dependency to keep the package light.
// This handles the subset of Zod we actually use in HOY action payloads:
// objects, strings, numbers, booleans, enums, arrays, optionals, unions of literals.
//
// For anything more exotic, swap in `zod-to-json-schema` later.

import { z } from "zod";

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  description?: string;
  additionalProperties?: boolean;
  title?: string;
  minimum?: number;
  maximum?: number;
}

export function zodToJsonSchema(schema: z.ZodType, name?: string): JsonSchema {
  const result = convert(schema);
  if (name) result.title = name;
  return result;
}

function convert(schema: z.ZodType): JsonSchema {
  const def = (schema as unknown as { _def: { typeName: string } })._def;
  const t = def.typeName;

  switch (t) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber": {
      const numDef = def as unknown as { checks?: Array<{ kind: string; value: number }> };
      const out: JsonSchema = { type: "number" };
      for (const check of numDef.checks ?? []) {
        if (check.kind === "min") out.minimum = check.value;
        if (check.kind === "max") out.maximum = check.value;
        if (check.kind === "int") out.type = "integer";
      }
      return out;
    }
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral":
      return { const: (def as unknown as { value: unknown }).value };
    case "ZodEnum":
      return { type: "string", enum: (def as unknown as { values: string[] }).values };
    case "ZodArray":
      return {
        type: "array",
        items: convert((def as unknown as { type: z.ZodType }).type),
      };
    case "ZodObject": {
      const shape = ((def as unknown as { shape: () => Record<string, z.ZodType> }).shape ??
        (def as unknown as { shape: Record<string, z.ZodType> }).shape) as
        | (() => Record<string, z.ZodType>)
        | Record<string, z.ZodType>;
      const shapeObj = typeof shape === "function" ? shape() : shape;

      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shapeObj)) {
        properties[key] = convert(value);
        const valueDef = (value as unknown as { _def: { typeName: string } })._def;
        if (valueDef.typeName !== "ZodOptional" && valueDef.typeName !== "ZodDefault") {
          required.push(key);
        }
      }
      return {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      };
    }
    case "ZodOptional":
      return convert((def as unknown as { innerType: z.ZodType }).innerType);
    case "ZodDefault":
      return convert((def as unknown as { innerType: z.ZodType }).innerType);
    case "ZodNullable": {
      const inner = convert((def as unknown as { innerType: z.ZodType }).innerType);
      return { ...inner, type: [inner.type as string, "null"] };
    }
    case "ZodUnion": {
      // Treat unions of literals as enums; otherwise fall back to anyOf-less guess.
      const opts = (def as unknown as { options: z.ZodType[] }).options;
      const allLiterals = opts.every(
        (o) => (o as unknown as { _def: { typeName: string } })._def.typeName === "ZodLiteral",
      );
      if (allLiterals) {
        return {
          type: "string",
          enum: opts.map((o) => (o as unknown as { _def: { value: string } })._def.value),
        };
      }
      // Fallback: convert the first option (good enough for our schemas)
      return convert(opts[0]!);
    }
    default:
      // Catch-all: emit a permissive object so Anthropic doesn't reject.
      return { type: "object", additionalProperties: false };
  }
}
