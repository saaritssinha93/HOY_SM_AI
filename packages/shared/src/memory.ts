// Brand memory loader — reads /memory/*.md and /employees/*.md from the repo root.
// Cached in-process for 60s so we don't re-read on every agent run.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_MEMORY_FILES, type BrandMemoryKey } from "./types";

const REPO_ROOT = process.env.HOY_REPO_ROOT ?? process.cwd();
const MEMORY_DIR = join(REPO_ROOT, "memory");
const EMPLOYEES_DIR = join(REPO_ROOT, "employees");

const TTL_MS = 60_000;

let brandCache: Record<BrandMemoryKey, string> | null = null;
let brandCachedAt = 0;

const promptCache = new Map<string, { content: string; cachedAt: number }>();

/**
 * Load all brand memory files (`/memory/*.md`) into a single object.
 * Cached for 60 seconds.
 */
export async function loadBrandMemory(): Promise<Record<BrandMemoryKey, string>> {
  const now = Date.now();
  if (brandCache && now - brandCachedAt < TTL_MS) {
    return brandCache;
  }

  const entries = await Promise.all(
    BRAND_MEMORY_FILES.map(async (name): Promise<[BrandMemoryKey, string]> => {
      const path = join(MEMORY_DIR, `${name}.md`);
      const content = await readFile(path, "utf8");
      return [name, content];
    }),
  );

  brandCache = Object.fromEntries(entries) as Record<BrandMemoryKey, string>;
  brandCachedAt = now;
  return brandCache;
}

/**
 * Load a single employee's job description (system prompt) from `/employees/<role>.md`.
 * Cached per-role for 60 seconds.
 */
export async function loadEmployeePrompt(role: string): Promise<string> {
  const now = Date.now();
  const cached = promptCache.get(role);
  if (cached && now - cached.cachedAt < TTL_MS) {
    return cached.content;
  }

  const path = join(EMPLOYEES_DIR, `${role}.md`);
  const content = await readFile(path, "utf8");
  promptCache.set(role, { content, cachedAt: now });
  return content;
}

/**
 * Build the full system prompt for an agent: their job description + the brand memory appended.
 * This is what gets passed to the model as the `system` parameter.
 *
 * The brand memory is appended in a stable order so prompt caching can hit on it across runs.
 */
export async function buildSystemPrompt(role: string): Promise<string> {
  const [employeePrompt, memory] = await Promise.all([
    loadEmployeePrompt(role),
    loadBrandMemory(),
  ]);

  const memoryBlock = BRAND_MEMORY_FILES.map(
    (key) => `\n\n---\n\n# /memory/${key}.md\n\n${memory[key]}`,
  ).join("");

  return `${employeePrompt}\n\n${memoryBlock}`;
}

/**
 * Clear caches — useful for tests or when prompt files are edited and a re-read is needed immediately.
 */
export function _resetMemoryCache(): void {
  brandCache = null;
  brandCachedAt = 0;
  promptCache.clear();
}
