export interface Snapshot {
  /** Latest real follower count. */
  count: number;
  /** Baseline count used for the growth-rate calculation. */
  prevCount: number;
  /** ms epoch of the latest real reading. */
  ts: number;
  /** ms epoch of the baseline reading. */
  prevTs: number;
  /** Was the most recent poll successful? false = serving a stale value. */
  ok: boolean;
  /** Provider that produced the latest real value. */
  source: string;
  username: string;
  fullName?: string;
  isVerified?: boolean;
  profilePicUrl?: string;
}

/**
 * Build a fresh snapshot from a new reading plus the previous snapshot.
 * The baseline (prevCount/prevTs) advances only when the count actually changes,
 * so the derived growth rate reflects real movement rather than 0 between
 * identical polls.
 */
export function makeSnapshot(args: {
  count: number;
  now: number;
  prev: Snapshot | null;
  source: string;
  username: string;
  fullName?: string;
  isVerified?: boolean;
  profilePicUrl?: string;
}): Snapshot {
  const { count, now, prev, source, username, fullName, isVerified, profilePicUrl } = args;

  let prevCount = count;
  let prevTs = now;
  if (prev && prev.count > 0) {
    if (prev.count !== count) {
      // count moved → previous real reading is the baseline
      prevCount = prev.count;
      prevTs = prev.ts;
    } else {
      // unchanged → keep the older baseline so the last known rate is preserved
      prevCount = prev.prevCount;
      prevTs = prev.prevTs;
    }
  }

  return {
    count,
    prevCount,
    ts: now,
    prevTs,
    ok: true,
    source,
    username,
    fullName: fullName ?? prev?.fullName,
    isVerified: isVerified ?? prev?.isVerified,
    profilePicUrl: profilePicUrl ?? prev?.profilePicUrl,
  };
}
