import type { Snapshot } from "./snapshot";

const KEY = "vozinha:snapshot";

interface Store {
  get(): Promise<Snapshot | null>;
  set(s: Snapshot): Promise<void>;
  /** Best-effort distributed lock: true if acquired (key set with TTL). */
  tryLock(key: string, ttlSec: number): Promise<boolean>;
}

let store: Store | undefined;

/**
 * In-memory store for local dev. Pinned to globalThis so it survives Next.js
 * module reloads in dev. NOT shared across serverless isolates — production must
 * use Upstash.
 */
function makeMemoryStore(): Store {
  const g = globalThis as unknown as {
    __vozinhaMem?: { snap: Snapshot | null; locks: Record<string, number> };
  };
  if (!g.__vozinhaMem) g.__vozinhaMem = { snap: null, locks: {} };
  return {
    async get() {
      return g.__vozinhaMem!.snap;
    },
    async set(s) {
      g.__vozinhaMem!.snap = s;
    },
    async tryLock(key, ttlSec) {
      const now = Date.now();
      if (now < (g.__vozinhaMem!.locks[key] || 0)) return false;
      g.__vozinhaMem!.locks[key] = now + ttlSec * 1000;
      return true;
    },
  };
}

type RedisClient = {
  get: (k: string) => Promise<unknown>;
  set: (k: string, v: unknown, opts?: { nx?: boolean; ex?: number }) => Promise<unknown>;
};

function makeUpstashStore(url: string, token: string): Store {
  let clientPromise: Promise<RedisClient> | null = null;
  async function client() {
    if (!clientPromise) {
      clientPromise = import("@upstash/redis").then(
        ({ Redis }) => new Redis({ url, token }) as unknown as RedisClient
      );
    }
    return clientPromise;
  }
  return {
    async get() {
      const c = await client();
      const v = (await c.get(KEY)) as Snapshot | null;
      return v ?? null;
    },
    async set(s) {
      const c = await client();
      await c.set(KEY, s);
    },
    async tryLock(key, ttlSec) {
      const c = await client();
      const res = await c.set(key, "1", { nx: true, ex: ttlSec });
      return res === "OK";
    },
  };
}

export function getStore(): Store {
  if (store) return store;
  // Accept Upstash-native names OR the Vercel KV integration names.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  store = url && token ? makeUpstashStore(url, token) : makeMemoryStore();
  return store;
}

export const SNAPSHOT_KEY = KEY;
