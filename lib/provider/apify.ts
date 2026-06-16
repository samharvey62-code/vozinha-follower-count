import type { FollowerData, FollowerProvider } from "./types";

/**
 * Apify Instagram Profile Scraper. Most robust escape hatch (handles proxies for
 * you). Requires APIFY_TOKEN. ~$11/mo at low volume.
 */
export const apifyProvider: FollowerProvider = {
  name: "apify",
  async getFollowerCount(username: string): Promise<FollowerData | null> {
    const token = process.env.APIFY_TOKEN;
    if (!token) return null;
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(
          token
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
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
    }
  },
};
