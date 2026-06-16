"use client";

export default function GrowthRate({
  ratePerSec,
  stale,
  hasData,
}: {
  ratePerSec: number;
  stale: boolean;
  hasData: boolean;
}) {
  if (!hasData) return <div className="growth muted">&nbsp;</div>;

  if (ratePerSec <= 0) {
    return <div className="growth muted">{stale ? "holding steady" : "no change right now"}</div>;
  }

  const perMin = ratePerSec * 60;
  const label =
    perMin >= 100_000
      ? `+${Math.round(ratePerSec).toLocaleString("en-US")} / sec`
      : `+${Math.round(perMin).toLocaleString("en-US")} / min`;

  return (
    <div className="growth up">
      <span className="arrow" aria-hidden="true">
        ▲
      </span>
      <span>{label}</span>
    </div>
  );
}
