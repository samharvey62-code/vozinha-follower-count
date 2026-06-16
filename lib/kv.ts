import type { Snapshot } from "./snapshot";

const KEY = "vozinha:snapshot";

interface Store {
  get(): Promise<Snapshot | null>;
  set(s: Snapshot): Promise<void>;
}

let store: Store | undefined;

/**
 * In-memory store for local dev. Pinned to globalThis so it survives Next.js
 * module reloads in dev. NOT shared across serverless isolates — production must
 * use Upstash.
 */
function makeMemoryStore(): Store {
  const g = globalThis as unknown as { __vozinhaMem?: { snap: Snapshot | null } };
  if (!g.__vozinhaMem) g.__vozinhaMem = { snap: null };
  return {
    async get() {
      return g.__vozinhaMem!.snap;
    },
    async set(s) {
      g.__vozinhaMem!.snap = s;
    },
  };
}

function makeUpstashStore(url: string, token: string): Store {
  let clientPromise: Promise<{ get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<unknown> }> | null = null;
  async function client() {
    if (!clientPromise) {
      clientPromise = import("@upstash/redis").then(({ Redis }) => new Redis({ url, token }));
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
  };
}

export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  store = url && token ? makeUpstashStore(url, token) : makeMemoryStore();
  return store;
}

export const SNAPSHOT_KEY = KEY;
