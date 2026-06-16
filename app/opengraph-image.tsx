import { ImageResponse } from "next/og";
import { getStore } from "@/lib/kv";

export const runtime = "nodejs";
export const alt = "Vozinha Live Follower Count";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let count: number | null = null;
  try {
    count = (await getStore().get())?.count ?? null;
  } catch {
    /* render the generic card */
  }
  const big = count ? count.toLocaleString("en-US") : "LIVE";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #04122e 0%, #0b0b0f 65%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 3, color: "#9db8ff" }}>
          VOZINHA · @vozinha1 · LIVE
        </div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, marginTop: 8, marginBottom: 8 }}>
          {big}
        </div>
        <div style={{ display: "flex", fontSize: 40, color: "#cfe0ff" }}>
          Instagram followers — and climbing
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#9aa0aa", marginTop: 26 }}>
          Cape Verde&apos;s World Cup hero · Man of the Match vs Spain
        </div>
      </div>
    ),
    { ...size }
  );
}
