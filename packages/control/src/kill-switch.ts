// The kill switch — global pause flag stored in the `settings` table.
//
// Every agent is required to call `assertNotPaused()` before taking any
// outbound action. The CLI command `hoy pause-all` flips this flag.

import { db } from "@hoy/shared";

const KEY = "pause_all";

export async function isPaused(): Promise<boolean> {
  const { data, error } = await db()
    .from("settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();

  if (error) throw error;
  return data?.value === true;
}

export async function pauseAll(): Promise<void> {
  await setFlag(true);
}

export async function resumeAll(): Promise<void> {
  await setFlag(false);
}

async function setFlag(value: boolean): Promise<void> {
  const { error } = await db()
    .from("settings")
    .upsert(
      { key: KEY, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}

export class SystemPaused extends Error {
  constructor() {
    super(
      "System is paused (kill switch active). " +
        "Lift with `hoy resume-all` or via the dashboard Settings page.",
    );
    this.name = "SystemPaused";
  }
}

/**
 * Throw if the kill switch is active. Every agent calls this before any
 * outbound action.
 */
export async function assertNotPaused(): Promise<void> {
  if (await isPaused()) {
    throw new SystemPaused();
  }
}
