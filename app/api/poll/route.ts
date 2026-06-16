import { NextRequest, NextResponse } from "next/server";
import { refreshSnapshot } from "@/lib/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorized if no secret is configured (dev), or the request carries
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically),
 * or `?secret=<CRON_SECRET>` (handy for manual/cron-job.org triggering).
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await refreshSnapshot();
  return NextResponse.json(
    {
      ok: r.ok,
      served: r.served,
      count: r.snapshot?.count ?? null,
      baseline: r.snapshot?.prevCount ?? null,
      source: r.snapshot?.source ?? null,
      ts: r.snapshot?.ts ?? null,
    },
    { status: r.served === "none" ? 503 : 200 }
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
