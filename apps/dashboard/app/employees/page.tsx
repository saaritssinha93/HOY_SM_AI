import { getEmployeesWithTodayUsage } from "@/lib/queries";

export const dynamic = "force-dynamic";

const AUTONOMY_LABEL: Record<number, string> = {
  0: "L0 — asks every time",
  1: "L1 — asks for risky actions",
  2: "L2 — full auto + summary",
};

export default async function EmployeesPage() {
  const rows = await getEmployeesWithTodayUsage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Employees</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(({ employee, today }) => (
          <article
            key={employee.id}
            className={`border rounded-md p-4 bg-white ${
              employee.active ? "border-ink/10" : "border-ink/5 opacity-60"
            }`}
          >
            <header className="flex items-baseline justify-between mb-2">
              <h2 className="font-semibold">{employee.role}</h2>
              <span className="text-xs text-ink/60 uppercase">{employee.model_tier}</span>
            </header>

            <p className="text-xs text-ink/60 mb-3">
              {AUTONOMY_LABEL[employee.autonomy_level]}
            </p>

            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-ink/50">Spend today</dt>
                <dd className="font-mono">₹{(today?.cost_inr ?? 0).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-ink/50">Actions</dt>
                <dd className="font-mono">
                  {today?.action_count ?? 0} / {employee.daily_action_limit}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">Tokens</dt>
                <dd className="font-mono">
                  {((today?.tokens_in ?? 0) + (today?.tokens_out ?? 0)).toLocaleString()}
                </dd>
              </div>
            </dl>

            {!employee.active && (
              <p className="text-xs text-ink/50 mt-3 italic">
                Dormant. {employee.notes ?? "Activate via Settings when ready."}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
