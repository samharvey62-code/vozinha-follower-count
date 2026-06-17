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

// Real-data refresh cadence (default ~12 min, env-overridable via
// REFRESH_INTERVAL_MS). The counter interpolates continuously between refreshes,
// so a slower cadence still looks live while keeping Apify usage within its free
// tier. The lock spans one refresh (an Apify call can take tens of seconds) to
// prevent a stampede.
const FRESH_MS = Number(process.env.REFRESH_INTERVAL_MS) || 12 * 60_000;
const LOCK_KEY = "vozinha:refresh-lock";
const LOCK_TTL_SEC = 60;

/**
 * If the cached snapshot is missing or older than maxAgeMs, try to acquire a
 * short global lock and refresh. Designed to run in `after()` so ordinary
 * traffic keeps the count fresh without an external cron — while the lock bounds
 * upstream calls to ~one per LOCK_TTL_SEC no matter how many concurrent
 * requests or serverless instances are live.
 *
 * Pass the snapshot the caller already read as `known` to avoid a redundant
 * KV round-trip on the common fresh path.
 */
export async function refreshIfStale(
  known?: Snapshot | null,
  maxAgeMs = FRESH_MS
): Promise<void> {
  const store = getStore();
  const snap = known !== undefined ? known : await store.get();
  if (snap && snap.ok && Date.now() - snap.ts < maxAgeMs) return;
  if (!(await store.tryLock(LOCK_KEY, LOCK_TTL_SEC))) return;
  try {
    await refreshSnapshot();
  } catch {
    /* swallow — a later request will retry */
  }
}
