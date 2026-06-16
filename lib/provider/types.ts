export interface FollowerData {
  /** Exact follower count. */
  count: number;
  fullName?: string;
  isVerified?: boolean;
  profilePicUrl?: string;
}

export interface FollowerProvider {
  /** Stable identifier stored on the snapshot (`direct` | `proxy` | `apify`). */
  name: string;
  /**
   * Resolve the current follower data for a username.
   * MUST NOT throw. Returns `null` on ANY failure (block, 4xx/5xx, timeout,
   * non-JSON, missing/implausible value) so the caller can serve the last-known value.
   */
  getFollowerCount(username: string): Promise<FollowerData | null>;
}
