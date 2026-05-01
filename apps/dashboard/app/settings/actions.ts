"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pauseAll, resumeAll } from "@hoy/control";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export async function togglePauseAction(formData: FormData) {
  const want = formData.get("paused") === "true";
  if (want) {
    await pauseAll();
  } else {
    await resumeAll();
  }
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function setAutonomyAction(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const level = Number(formData.get("level") ?? 0);
  if (!role || ![0, 1, 2].includes(level)) {
    throw new Error("Invalid autonomy update");
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("employees")
    .update({ autonomy_level: level })
    .eq("role", role);
  if (error) throw error;

  await sb.from("audit_log").insert({
    event: "autonomy_changed",
    payload: { role, level, decided_by: "vanshika" },
  });

  revalidatePath("/settings");
  revalidatePath("/employees");
}

export async function signOutAction() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
