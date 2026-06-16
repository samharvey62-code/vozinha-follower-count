import type { FollowerData, FollowerProvider } from "./types";
import { request as undiciRequest, type Dispatcher } from "undici";

const APP_ID = "936619743392459";
const DEFAULT_UA =
  process.env.IG_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Below this we treat the response as a soft-block / garbage value, not a real count. */
const MIN_PLAUSIBLE = 1000;
const TIMEOUT_MS = 8000;

/**
 * Fetch a public profile via Instagram's unauthenticated web_profile_info endpoint.
 *
 * Uses undici's low-level `request()` rather than `fetch()` on purpose: the WHATWG
 * `fetch` (Node's global) auto-adds `Sec-Fetch-*` headers that Instagram rejects
 * with `400 SecFetch Policy violation`. `request()` sends only the headers we set.
 *
 * `dispatcher` is an optional undici Agent (the proxy provider passes a ProxyAgent).
 */
export async function fetchWebProfile(
  username: string,
  dispatcher?: Dispatcher
): Promise<FollowerData | null> {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await undiciRequest(url, {
      method: "GET",
      headers: {
        "x-ig-app-id": APP_ID,
        "User-Agent": DEFAULT_UA,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });

    if (res.statusCode < 200 || res.statusCode >= 300) {
      await res.body.dump().catch(() => {}); // free the socket
      return null; // 4xx/5xx (incl. 429 rate-limit, 400 policy, 401/403 block)
    }

    const text = await res.body.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return null; // 200 + HTML login wall
    }

    const user = (json as { data?: { user?: Record<string, unknown> } })?.data?.user;
    if (!user) return null; // soft-block returns { data: { user: null } }

    const edge = user["edge_followed_by"] as { count?: unknown } | undefined;
    const count = edge?.count;
    if (typeof count !== "number" || !Number.isFinite(count) || count < MIN_PLAUSIBLE) {
      return null;
    }

    return {
      count,
      fullName: (user["full_name"] as string) || undefined,
      isVerified: Boolean(user["is_verified"]),
      profilePicUrl:
        (user["profile_pic_url_hd"] as string) ||
        (user["profile_pic_url"] as string) ||
        undefined,
    };
  } catch {
    return null; // network / abort / timeout
  } finally {
    clearTimeout(timer);
  }
}

export const directProvider: FollowerProvider = {
  name: "direct",
  getFollowerCount(username: string) {
    return fetchWebProfile(username);
  },
};
