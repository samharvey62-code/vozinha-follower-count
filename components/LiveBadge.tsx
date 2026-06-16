"use client";

function fmtAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function LiveBadge({
  ok,
  ts,
  now,
  hasData,
}: {
  ok: boolean;
  ts: number | null;
  now: number;
  hasData: boolean;
}) {
  if (!hasData || ts === null) {
    return (
      <div className="badge connecting">
        <span className="dot" aria-hidden="true" />
        connecting…
      </div>
    );
  }

  const ageMs = Math.max(0, now - ts);
  let state: "live" | "recent" | "stale";
  let label: string;
  if (!ok || ageMs > 5 * 60 * 1000) {
    state = "stale";
    label = `last verified ${fmtAge(ageMs)} ago`;
  } else if (ageMs > 30_000) {
    state = "recent";
    label = `updated ${fmtAge(ageMs)} ago`;
  } else {
    state = "live";
    label = "LIVE";
  }

  return (
    <div className={`badge ${state}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </div>
  );
}
