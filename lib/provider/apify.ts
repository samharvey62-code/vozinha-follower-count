import type { FollowerData, FollowerProvider } from "./types";

const TIMEOUT_MS = 50_000; // Apify run-sync is usually ~5s; cap below the function's maxDuration

/**
 * Apify Instagram Profile Scraper. Routes the scrape through Apify's managed,
 * non-blocked IPs (immune to the datacenter-IP blocking that affects the direct
 * provider). Requires APIFY_TOKEN.
 */
export const apifyProvider: FollowerProvider = {
  name: "apify",
  async getFollowerCount(username: string): Promise<FollowerData | null> {
    const token = process.env.APIFY_TOKEN;
    if (!token) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(
          token
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
          signal: controller.signal,
        }
      );
      if (!res.ok) return null;
      const items = (await res.json()) as Array<Record<string, unknown>>;
      const item = Array.isArray(items) ? items[0] : null;
      const count = item?.["followersCount"];
      if (typeof count !== "number" || !Number.isFinite(count)) return null;
      return {
        count,
        fullName: (item?.["fullName"] as string) || undefined,
        isVerified: Boolean(item?.["verified"]),
        profilePicUrl:
          (item?.["profilePicUrlHD"] as string) ||
          (item?.["profilePicUrl"] as string) ||
          undefined,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};
