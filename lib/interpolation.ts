/**
 * Pure functions that drive the client-side "live" counter. Kept free of React
 * and globals (no Date.now()) so they are deterministic and unit-testable.
 */

export interface Sample {
  count: number;
  prevCount: number;
  ts: number; // ms epoch of latest real reading
  prevTs: number; // ms epoch of baseline reading
  ok: boolean;
}

/** Stop inventing followers once a sample is older than this (no fresh data).
 *  Exceeds the ~12-min refresh cadence so the counter keeps ticking between real
 *  updates, and only flags "stale" if refreshes actually stop. */
export const STALE_AFTER_MS = 15 * 60_000;
/** Absurd-rate guard (followers/sec). */
export const MAX_RATE = 10_000;

/** Followers per second derived from the two real samples. Clamped to [0, MAX_RATE]. */
export function ratePerSec(s: Pick<Sample, "count" | "prevCount" | "ts" | "prevTs">): number {
  const dt = (s.ts - s.prevTs) / 1000;
  if (dt <= 0) return 0;
  const r = (s.count - s.prevCount) / dt;
  if (!Number.isFinite(r) || r < 0) return 0;
  return Math.min(r, MAX_RATE);
}

/**
 * Projected displayed value at time `now`, anchored to the real timestamp.
 * Grows linearly at the derived rate, but caps the accrued growth at
 * STALE_AFTER_MS so a stale "growing fast" sample doesn't run away from reality.
 */
export function project(s: Sample, now: number): number {
  const rate = ratePerSec(s);
  if (rate === 0 || now <= s.ts) return s.count;
  const growthMs = Math.min(now - s.ts, STALE_AFTER_MS);
  return s.count + rate * (growthMs / 1000);
}

/** True once we've had no fresh real value for longer than STALE_AFTER_MS. */
export function isStale(s: Sample, now: number): boolean {
  return now - s.ts > STALE_AFTER_MS;
}
