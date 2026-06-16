"use client";

import { useState } from "react";

export default function ShareButton({ count }: { count: number }) {
  const [copied, setCopied] = useState(false);

  const shareText =
    count > 0
      ? `Vozinha is at ${count.toLocaleString("en-US")} Instagram followers and climbing 📈 Cape Verde's World Cup hero — watch it live:`
      : `Watch Cape Verde's World Cup hero Vozinha gain Instagram followers live:`;

  async function onShare() {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Vozinha Live Follower Count", text: shareText, url });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const xHref =
    typeof window !== "undefined"
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`
      : "https://twitter.com/intent/tweet";

  return (
    <div className="share">
      <button type="button" className="share-btn" onClick={onShare}>
        {copied ? "Link copied!" : "Share"}
      </button>
      <a className="share-x" href={xHref} target="_blank" rel="noopener noreferrer">
        Post on X
      </a>
    </div>
  );
}
