// `hoy lead add` and `hoy lead list` — manage the 20-strangers funnel.

import { db, type Lead } from "@hoy/shared";
import { parseArgs } from "node:util";

export async function handleLead(args: string[]): Promise<void> {
  const subcommand = args[0];
  const rest = args.slice(1);

  switch (subcommand) {
    case "add":
      return addLead(rest);
    case "list":
      return listLeads(rest);
    default:
      console.error("Usage: hoy lead <add|list> [args]");
      process.exit(1);
  }
}

async function addLead(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      bio: { type: "string" },
      followers: { type: "string" },
      location: { type: "string" },
      source: { type: "string" },
    },
    allowPositionals: true,
  });

  const handle = positionals[0];
  if (!handle) {
    console.error("Missing IG handle. Usage: hoy lead add <ig_handle> [--bio ...] [--followers N]");
    process.exit(1);
  }

  const cleanHandle = handle.replace(/^@/, "");

  const profile_snapshot: Record<string, unknown> = {};
  if (values.bio) profile_snapshot.bio = values.bio;
  if (values.followers) profile_snapshot.follower_count = Number(values.followers);
  if (values.location) profile_snapshot.location = values.location;

  const { data, error } = await db()
    .from("leads")
    .insert({
      ig_handle: cleanHandle,
      profile_snapshot: Object.keys(profile_snapshot).length > 0 ? profile_snapshot : null,
      source: values.source ?? "manual",
      status: "new",
    })
    .select("id, ig_handle, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.error(`Lead @${cleanHandle} already exists.`);
      process.exit(1);
    }
    throw error;
  }

  console.log(`✓ Added lead @${data.ig_handle}`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Status: ${data.status}`);
  console.log(`\nNext: hoy draft sales --lead ${data.id}`);
}

async function listLeads(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      status: { type: "string" },
    },
  });

  let query = db().from("leads").select("*").order("created_at", { ascending: false }).limit(50);
  if (values.status) {
    query = query.eq("status", values.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const leads = (data ?? []) as Lead[];

  if (leads.length === 0) {
    console.log("No leads yet. Add one with: hoy lead add <ig_handle>");
    return;
  }

  for (const lead of leads) {
    const profile = (lead.profile_snapshot ?? {}) as { follower_count?: number; location?: string };
    const meta = [
      profile.follower_count ? `${profile.follower_count} followers` : null,
      profile.location,
      lead.source,
    ]
      .filter(Boolean)
      .join(" · ");

    console.log(`@${lead.ig_handle.padEnd(25)} ${lead.status.padEnd(15)} ${meta}`);
    console.log(`  ${lead.id}`);
  }

  console.log(`\n${leads.length} lead${leads.length === 1 ? "" : "s"}`);
}
