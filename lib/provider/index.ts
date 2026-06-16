import type { FollowerProvider } from "./types";
import { directProvider } from "./direct";
import { proxyProvider } from "./proxy";
import { apifyProvider } from "./apify";

/**
 * Select the active provider from FOLLOWER_PROVIDER. Swapping the data source in
 * production is a single env-var change — no code change.
 */
export function getProvider(): FollowerProvider {
  switch ((process.env.FOLLOWER_PROVIDER || "direct").toLowerCase()) {
    case "proxy":
      return proxyProvider;
    case "apify":
      return apifyProvider;
    default:
      return directProvider;
  }
}

export type { FollowerProvider, FollowerData } from "./types";
