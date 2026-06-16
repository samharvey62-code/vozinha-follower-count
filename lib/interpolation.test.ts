import { describe, it, expect } from "vitest";
import { ratePerSec, project, isStale, STALE_AFTER_MS, MAX_RATE, type Sample } from "./interpolation";

const base = (over: Partial<Sample> = {}): Sample => ({
  count: 9_000_000,
  prevCount: 8_940_000,
  ts: 1_000_000,
  prevTs: 1_000_000 - 60_000, // 60s earlier
  ok: true,
  ...over,
});

describe("ratePerSec", () => {
  it("computes followers/sec from two samples (viral growth)", () => {
    // 60,000 over 60s = 1000/s
    expect(ratePerSec(base())).toBeCloseTo(1000, 5);
  });

  it("is 0 when the count did not change", () => {
    expect(ratePerSec(base({ prevCount: 9_000_000 }))).toBe(0);
  });

  it("clamps negative growth (unfollow blip) to 0", () => {
    expect(ratePerSec(base({ prevCount: 9_100_000 }))).toBe(0);
  });

  it("returns 0 for a non-positive time delta", () => {
    expect(ratePerSec(base({ prevTs: 1_000_000 }))).toBe(0);
  });

  it("clamps absurd rates to MAX_RATE", () => {
    // 100M over 1s would be 100M/s
    const s = base({ count: 100_000_000, prevCount: 0, prevTs: 1_000_000 - 1000 });
    expect(ratePerSec(s)).toBe(MAX_RATE);
  });
});

describe("project", () => {
  it("returns the exact count at the anchor time", () => {
    const s = base();
    expect(project(s, s.ts)).toBe(s.count);
  });

  it("never projects backwards before the anchor", () => {
    const s = base();
    expect(project(s, s.ts - 5000)).toBe(s.count);
  });

  it("projects forward linearly at the rate", () => {
    const s = base(); // 1000/s
    expect(project(s, s.ts + 10_000)).toBeCloseTo(9_000_000 + 10_000, 5);
  });

  it("caps accrued growth at the staleness window", () => {
    const s = base(); // 1000/s
    const wayLater = s.ts + STALE_AFTER_MS + 10 * 60 * 1000;
    // capped at STALE_AFTER_MS worth of growth (90s * 1000/s = 90,000)
    expect(project(s, wayLater)).toBeCloseTo(9_000_000 + (STALE_AFTER_MS / 1000) * 1000, 5);
  });

  it("holds steady when rate is 0", () => {
    const s = base({ prevCount: 9_000_000 });
    expect(project(s, s.ts + 50_000)).toBe(9_000_000);
  });
});

describe("isStale", () => {
  it("is false within the window", () => {
    const s = base();
    expect(isStale(s, s.ts + STALE_AFTER_MS - 1)).toBe(false);
  });
  it("is true past the window", () => {
    const s = base();
    expect(isStale(s, s.ts + STALE_AFTER_MS + 1)).toBe(true);
  });
});
