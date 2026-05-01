import { getPendingActions } from "@/lib/queries";
import { approve, reject } from "./actions";
import type { Action } from "@hoy/shared";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default async function ApprovalsPage() {
  const pending = await getPendingActions();

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <span className="text-sm text-ink/60">
          {pending.length} waiting
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="border border-ink/10 rounded-md bg-white p-8 text-center text-ink/60">
          Nothing pending. Inbox zero.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((action) => (
            <ApprovalCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ action }: { action: Action }) {
  const payload = action.payload as Record<string, unknown>;

  return (
    <article className="border border-ink/10 rounded-md bg-white p-4">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium">{action.type}</div>
          <div className="text-xs text-ink/60">
            {action.employee_id.slice(0, 8)} · {timeAgo(action.proposed_at)}
          </div>
        </div>
      </header>

      <ActionPayloadDisplay type={action.type} payload={payload} />

      <footer className="mt-4 flex items-center gap-2">
        <form action={approve.bind(null, action.id)}>
          <button
            type="submit"
            className="px-3 py-1.5 bg-ink text-cream text-sm rounded hover:bg-ink/90"
          >
            Approve
          </button>
        </form>
        <form action={reject} className="flex items-center gap-2">
          <input type="hidden" name="action_id" value={action.id} />
          <input
            type="text"
            name="reason"
            placeholder="reason (optional)"
            className="px-2 py-1 text-sm border border-ink/20 rounded w-40"
          />
          <button
            type="submit"
            className="px-3 py-1.5 border border-ink/20 text-sm rounded hover:bg-ink/5"
          >
            Reject
          </button>
        </form>
      </footer>
    </article>
  );
}

function ActionPayloadDisplay({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  // Render specifically for known action types; fall back to JSON for others.
  switch (type) {
    case "send_dm":
      return (
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-ink/60">To:</span>{" "}
            <span className="font-mono">@{String(payload.to_handle ?? "")}</span>
          </div>
          <div className="bg-cream/50 border border-ink/5 rounded p-3 whitespace-pre-wrap">
            {String(payload.message ?? "")}
          </div>
          {payload.reasoning && (
            <details className="text-xs text-ink/60">
              <summary className="cursor-pointer">Why this DM</summary>
              <p className="mt-1">{String(payload.reasoning)}</p>
            </details>
          )}
        </div>
      );

    case "propose_content":
      return (
        <div className="space-y-2 text-sm">
          <div className="font-semibold">{String(payload.title ?? "")}</div>
          <div className="text-ink/60 text-xs uppercase tracking-wide">
            {String(payload.format ?? "")} · {String(payload.duration_estimate_sec ?? "?")}s
          </div>
          <div>
            <span className="text-ink/60">Hook:</span> {String(payload.hook_line ?? "")}
          </div>
          <details>
            <summary className="cursor-pointer text-ink/60 text-xs">Full script</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs bg-cream/50 border border-ink/5 rounded p-2">
              {String(payload.script ?? "")}
            </pre>
          </details>
          <div className="bg-cream/50 border border-ink/5 rounded p-2 text-xs">
            <strong>Caption:</strong> {String(payload.caption ?? "")}
          </div>
        </div>
      );

    default:
      return (
        <pre className="text-xs bg-cream/50 border border-ink/5 rounded p-2 overflow-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
}
