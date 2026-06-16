import { getProvider } from "./provider";
import { getStore } from "./kv";
import { makeSnapshot, type Snapshot } from "./snapshot";

export interface RefreshResult {
  ok: boolean;
  snapshot: Snapshot | null;
  served: "fresh" | "stale" | "none";
}

/**
 * The single writer: fetch from the active provider and persist a snapshot.
 * On failure, keep the last-known snapshot (marked ok:false) so readers keep
 * serving a value. This is the only function that touches Instagram.
 */
export async function refreshSnapshot(): Promise<RefreshResult> {
  const username = process.env.TARGET_USERNAME || "vozinha1";
  const provider = getProvider();
  const store = getStore();
  const now = Date.now();

  const prev = await store.get();
  const data = await provider.getFollowerCount(username);

  if (!data) {
    if (prev) {
      const stale: Snapshot = { ...prev, ok: false };
      await store.set(stale);
      return { ok: false, snapshot: stale, served: "stale" };
    }
    return { ok: false, snapshot: null, served: "none" };
  }

  const snap = makeSnapshot({
    count: data.count,
    now,
    prev,
    source: provider.name,
    username,
    fullName: data.fullName,
    isVerified: data.isVerified,
    profilePicUrl: data.profilePicUrl,
  });
  await store.set(snap);
  return { ok: true, snapshot: snap, served: "fresh" };
}

let inflight: Promise<Snapshot | null> | null = null;

/**
 * Return the current snapshot, lazily populating it with ONE refresh if the
 * cache is empty (cold start / first visitor). Concurrent calls within an
 * isolate share a single in-flight refresh to avoid a stampede.
 */
export async function ensureSnapshot(): Promise<Snapshot | null> {
  const existing = await getStore().get();
  if (existing) return existing;
  if (!inflight) {
    inflight = refreshSnapshot()
      .then((r) => r.snapshot)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
