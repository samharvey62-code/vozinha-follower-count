import type { FollowerProvider } from "./types";
import { fetchWebProfile } from "./direct";

/**
 * Same request as the direct provider, but routed through a residential proxy
 * (PROXY_URL). Escape hatch for when the host's datacenter IP is blocked by
 * Instagram.
 */
export const proxyProvider: FollowerProvider = {
  name: "proxy",
  async getFollowerCount(username: string) {
    const proxyUrl = process.env.PROXY_URL;
    if (!proxyUrl) return null;
    try {
      const { ProxyAgent } = await import("undici");
      return await fetchWebProfile(username, new ProxyAgent(proxyUrl));
    } catch {
      return null; // proxy/undici failure → caller serves last-known value
    }
  },
};
