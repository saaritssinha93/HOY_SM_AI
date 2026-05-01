import Link from "next/link";
import { getTodaySnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

function inr(n: number): string {
  return n >= 1 ? `₹${n.toFixed(0)}` : `₹${n.toFixed(2)}`;
}

export default async function TodayPage() {
  const snap = await getTodaySnapshot();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Today</h1>
        {snap.is_paused && (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
            ALL AGENTS PAUSED
          </span>
        )}
      </div>

      {/* Snapshot tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Approvals waiting"
          value={String(snap.pending_approvals)}
          href="/approvals"
          highlight={snap.pending_approvals > 0}
        />
        <Tile label="Revenue today" value={inr(snap.todays_revenue_inr)} href="/orders" />
        <Tile
          label="Orders"
          value={`${snap.todays_orders}${snap.todays_stranger_orders > 0 ? ` (${snap.todays_stranger_orders} 🎉 stranger)` : ""}`}
          href="/orders"
        />
        <Tile label="Spend today" value={inr(snap.todays_spend_inr)} href="/employees" />
      </div>

      {/* Employees row */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg font-semibold">Employees</h2>
          <Link href="/employees" className="text-sm text-ink/60 hover:text-ink">
            All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {snap.employees.map((e) => (
            <Link
              key={e.id}
              href={`/employees`}
              className="border border-ink/10 rounded-md px-3 py-2 hover:border-ink/30 bg-white"
            >
              <div className="text-sm font-medium">{e.role}</div>
              <div className="text-xs text-ink/60">
                {e.model_tier} · L{e.autonomy_level}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink/40 pt-4">
        20-strangers experiment is the top priority. Check{" "}
        <Link className="underline" href="/leads">
          Leads
        </Link>{" "}
        for the funnel.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`border rounded-md p-3 bg-white hover:border-ink/30 ${
        highlight ? "border-accent" : "border-ink/10"
      }`}
    >
      <div className="text-xs text-ink/60 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Link>
  );
}
