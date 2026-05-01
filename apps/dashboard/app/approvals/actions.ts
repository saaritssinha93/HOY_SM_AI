"use server";

import { revalidatePath } from "next/cache";
import { approveAction, rejectAction } from "@hoy/control";

export async function approve(actionId: string) {
  await approveAction(actionId, { decided_by: "vanshika" });
  revalidatePath("/approvals");
  revalidatePath("/");
}

export async function reject(formData: FormData) {
  const actionId = String(formData.get("action_id") ?? "");
  const reason = String(formData.get("reason") ?? "no reason given");
  if (!actionId) throw new Error("Missing action_id");

  await rejectAction(actionId, reason, { decided_by: "vanshika" });
  revalidatePath("/approvals");
  revalidatePath("/");
}
