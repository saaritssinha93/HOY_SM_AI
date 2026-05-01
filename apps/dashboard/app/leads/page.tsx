import { getLeadsFunnel } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "Sourced",
  contacted: "Contacted",
  replied: "Replied",
  visited_site: "Visited site",
  converted: "Converted",
  dead: "Dead",
};

export default async function LeadsPage() {
  const funnel = await getLeadsFunnel();
  const sourced = funnel.find((f) => f.status === "new")?.count ?? 0;
  const contacted = funnel.find((f) => f.status === "contacted")?.count ?? 0;
  const replied = funnel.find((f) => f.status === "replied")?.count ?? 0;
  const converted = funnel.find((f) => f.status === "converted")?.count ?? 0;

  const replyRate = contacted > 0 ? ((replied / contacted) * 100).toFixed(0) : "—";
  const conversionRate = contacted > 0 ? ((converted / contacted) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">20-strangers experiment</h1>
        <p className="text-sm text-ink/60 mt-1">
          The top-priority funnel: get HOY's first 3 stranger sales.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Reply rate" value={`${replyRate}%`} />
        <Stat label="Conversion rate" value={`${conversionRate}%`} />
        <Stat label="Stranger sales" value={String(converted)} highlight={converted > 0} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Funnel</h2>
        <div className="border border-ink/10 rounded-md bg-white">
          {funnel.map((f, i) => (
            <div
              key={f.status}
              className={`flex items-center justify-between px-4 py-3 ${
                i > 0 ? "border-t border-ink/5" : ""
              }`}
            >
              <span className="text-sm">{STATUS_LABEL[f.status] ?? f.status}</span>
              <span className="font-mono text-sm">{f.count}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink/50">
        Sales Head sources leads and drafts cold DMs. Approve them on the{" "}
        <a className="underline" href="/approvals">
          Approvals
        </a>{" "}
        page.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`border rounded-md p-3 bg-white ${
        highlight ? "border-accent" : "border-ink/10"
      }`}
    >
      <div className="text-xs text-ink/60 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
