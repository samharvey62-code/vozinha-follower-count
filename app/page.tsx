import { after } from "next/server";
import { ensureSnapshot, refreshIfStale } from "@/lib/refresh";
import LiveCounter from "@/components/LiveCounter";
import ProfileHeader from "@/components/ProfileHeader";
import ContextBlurb from "@/components/ContextBlurb";
import type { Sample } from "@/lib/interpolation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snap = await ensureSnapshot();
  after(refreshIfStale());

  const initial: Sample | null = snap
    ? {
        count: snap.count,
        prevCount: snap.prevCount,
        ts: snap.ts,
        prevTs: snap.prevTs,
        ok: snap.ok,
      }
    : null;

  return (
    <main className="page">
      <div className="starfield" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <section className="hero">
        <ProfileHeader
          fullName={snap?.fullName ?? "Vozinha"}
          username={snap?.username ?? "vozinha1"}
          isVerified={snap?.isVerified ?? true}
        />
        <LiveCounter initial={initial} />
      </section>

      <ContextBlurb />

      <footer className="footer">
        <p>
          Unofficial, non-commercial fan tracker. Not affiliated with Instagram, Meta, the FCF, or
          Vozinha. Follower data is read from public profile information and may briefly lag the real
          number.
        </p>
        <p className="footer-credit">
          Source:{" "}
          <a href="https://www.instagram.com/vozinha1/" target="_blank" rel="noopener noreferrer">
            instagram.com/vozinha1
          </a>
        </p>
      </footer>
    </main>
  );
}
