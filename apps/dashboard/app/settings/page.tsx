import { getEmployeesWithTodayUsage, getSettings } from "@/lib/queries";
import { setAutonomyAction, togglePauseAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, employeeRows] = await Promise.all([
    getSettings(),
    getEmployeesWithTodayUsage(),
  ]);

  const isPaused = settings.pause_all === true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Kill switch */}
      <section className="border border-ink/10 rounded-md bg-white p-4">
        <h2 className="font-semibold mb-2">Kill switch</h2>
        <p className="text-sm text-ink/60 mb-3">
          When on, every agent pauses before its next outbound action. Use this if something goes
          wrong and you want to stop the system fast.
        </p>
        <form action={togglePauseAction}>
          <input type="hidden" name="paused" value={isPaused ? "false" : "true"} />
          <button
            type="submit"
            className={`px-4 py-2 rounded text-sm font-medium ${
              isPaused
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {isPaused ? "Resume all agents" : "Pause all agents"}
          </button>
          <span className="ml-3 text-sm text-ink/60">
            Currently: <strong>{isPaused ? "PAUSED" : "running"}</strong>
          </span>
        </form>
      </section>

      {/* Autonomy levels */}
      <section className="border border-ink/10 rounded-md bg-white p-4">
        <h2 className="font-semibold mb-2">Autonomy per agent</h2>
        <p className="text-sm text-ink/60 mb-3">
          L0 = asks every time · L1 = asks for risky actions · L2 = full auto + daily summary
        </p>
        <div className="space-y-2">
          {employeeRows.map(({ employee }) => (
            <form
              key={employee.id}
              action={setAutonomyAction}
              className="flex items-center gap-3"
            >
              <input type="hidden" name="role" value={employee.role} />
              <span className="font-medium text-sm w-40">{employee.role}</span>
              {([0, 1, 2] as const).map((level) => (
                <button
                  key={level}
                  type="submit"
                  name="level"
                  value={String(level)}
                  className={`px-2.5 py-1 text-xs rounded border ${
                    employee.autonomy_level === level
                      ? "bg-ink text-cream border-ink"
                      : "bg-white border-ink/20 hover:bg-ink/5"
                  }`}
                >
                  L{level}
                </button>
              ))}
              {!employee.active && (
                <span className="text-xs text-ink/40 italic ml-2">dormant</span>
              )}
            </form>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink/50">
        Per-agent budgets (daily ₹, tokens, actions) are configured in the database — UI for
        editing them is coming. Use the CLI in the meantime.
      </p>
    </div>
  );
}
