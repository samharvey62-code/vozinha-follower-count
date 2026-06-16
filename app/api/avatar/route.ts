import { NextResponse } from "next/server";
import { request as undiciRequest } from "undici";
import { getStore } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy Vozinha's current profile picture through our own origin (Instagram's
 * CDN blocks hotlinking). Falls back to the static SVG on any failure.
 */
export async function GET(req: Request) {
  const fallback = NextResponse.redirect(new URL("/vozinha-fallback.svg", req.url));
  let url: string | undefined;
  try {
    url = (await getStore().get())?.profilePicUrl;
  } catch {
    return fallback;
  }
  if (!url) return fallback;

  try {
    const res = await undiciRequest(url, {
      method: "GET",
      headers: {
        "User-Agent":
          process.env.IG_USER_AGENT ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*",
      },
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      await res.body.dump().catch(() => {});
      return fallback;
    }
    const ct = res.headers["content-type"];
    const buf = Buffer.from(await res.body.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": typeof ct === "string" ? ct : "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return fallback;
  }
}
