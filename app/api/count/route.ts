import { NextResponse, after } from "next/server";
import { ensureSnapshot, refreshIfStale } from "@/lib/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CDN-cached for 5s with SWR so a viral traffic spike hits the edge, not the store.
const CACHE = "public, s-maxage=5, stale-while-revalidate=30";

export async function GET() {
  const snap = await ensureSnapshot();
  // Keep the cache fresh from ordinary traffic (lock-bounded, runs after response).
  after(refreshIfStale());
  if (!snap) {
    return NextResponse.json(
      { ok: false, count: null },
      { status: 200, headers: { "Cache-Control": CACHE } }
    );
  }
  return NextResponse.json(snap, { headers: { "Cache-Control": CACHE } });
}
