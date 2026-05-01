import { getRecentAuditEntries } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  ts: string;
  employee_id: string | null;
  action_id: string | null;
  event: string;
  payload: unknown;
}

export default async function AuditPage() {
  const rows = (await getRecentAuditEntries(100)) as AuditRow[];

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="text-sm text-ink/60">
        Every state change, every approval, every API call. Append-only.
      </p>

      {rows.length === 0 ? (
        <div className="border border-ink/10 rounded-md bg-white p-8 text-center text-ink/60">
          Nothing logged yet. The audit log fills as agents run.
        </div>
      ) : (
        <div className="border border-ink/10 rounded-md bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-ink/5 align-top">
                  <td className="px-3 py-2 text-xs font-mono text-ink/60 whitespace-nowrap">
                    {new Date(row.ts).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.event}</td>
                  <td className="px-3 py-2 text-xs text-ink/70">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(row.payload, null, 0)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
