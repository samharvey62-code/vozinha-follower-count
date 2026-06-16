"use client";

import { useEffect, useRef, useState } from "react";
import Counter from "./Counter";
import GrowthRate from "./GrowthRate";
import LiveBadge from "./LiveBadge";
import ShareButton from "./ShareButton";
import { project, ratePerSec, isStale, type Sample } from "@/lib/interpolation";

const POLL_MS = 7000;

/** Coarse, screen-reader-friendly summary (updates per fetch, not per frame). */
function approxLabel(count: number): string {
  if (count <= 0) return "Loading live follower count";
  if (count >= 1_000_000) return `Approximately ${(count / 1_000_000).toFixed(1)} million followers, updating live`;
  if (count >= 1_000) return `Approximately ${Math.round(count / 1000)} thousand followers, updating live`;
  return `${count} followers, updating live`;
}

export default function LiveCounter({ initial }: { initial: Sample | null }) {
  const [sample, setSample] = useState<Sample | null>(initial);
  const sampleRef = useRef<Sample | null>(initial);
  const [displayed, setDisplayed] = useState<number>(initial?.count ?? 0);
  const [now, setNow] = useState<number>(initial?.ts ?? 0);

  useEffect(() => {
    sampleRef.current = sample;
  }, [sample]);

  // Poll the cached count endpoint.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/count", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled || j == null || typeof j.count !== "number") return;
        const next: Sample = {
          count: j.count,
          prevCount: typeof j.prevCount === "number" ? j.prevCount : j.count,
          ts: typeof j.ts === "number" ? j.ts : Date.now(),
          prevTs: typeof j.prevTs === "number" ? j.prevTs : Date.now(),
          ok: Boolean(j.ok),
        };
        setSample(next);
      } catch {
        /* keep last sample; interpolation continues */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Per-frame projection anchored to the real timestamp.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = sampleRef.current;
      const t = Date.now();
      setNow(t);
      if (s) setDisplayed(project(s, t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hasData = !!sample && sample.count > 0;
  const rate = sample ? ratePerSec(sample) : 0;
  const stale = sample ? isStale(sample, now || sample.ts) : false;
  const value = Math.floor(displayed);

  return (
    <div className="counter-block">
      <LiveBadge ok={sample?.ok ?? false} ts={sample?.ts ?? null} now={now} hasData={hasData} />
      <Counter value={value} />
      <GrowthRate ratePerSec={rate} stale={stale} hasData={hasData} />
      <p className="sr-only" aria-live="polite" role="status">
        {approxLabel(sample?.count ?? 0)}
      </p>
      <ShareButton count={value} />
    </div>
  );
}
