"use client";

function renderValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function SuggestionDiffCard({
  before,
  after,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">현재 내용</h4>
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={`before-${key}`}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{key}</div>
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{renderValue(before[key])}</pre>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-emerald-700">제안 내용</h4>
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={`after-${key}`}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">{key}</div>
              <pre className="whitespace-pre-wrap break-words text-sm text-emerald-800">{renderValue(after[key])}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
