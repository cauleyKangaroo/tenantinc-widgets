// ===========================================================================
// Cross-widget GET memoization.
//
// Every widget is its own AMD bundle, so a module-level cache would only
// dedupe within one widget. The store lives on window so widgets on the
// same page CAN share it — adopted so far by tier-selection and
// rental-flow; the other widgets (#03/#05/#07) still fetch independently
// and should adopt this helper to kill the page-wide duplication.
//
// Scope rules:
// - GETs only, enforced structurally: keys are always "GET <url>" and the
//   API exposes no way to memoize anything else. Writes must instead call
//   `memoInvalidate()` for the reads they stale (e.g. holds → availability).
// - In-flight dedupe is unconditional (two callers, one fetch).
// - TTL is per-volatility, chosen by the CALLER via `ttlMs`:
//     stable facility data (properties, rate-management, documents) → 60s
//     price/vacancy payloads (space-groups groups)                  → 30s
//     units/available and per-unit quotes → 0 (in-flight dedupe ONLY —
//       availability changes with every hold; quotes 409-flip when units
//       are claimed; caching either serves wrong money)
// - `fresh: true` bypasses the cache AND replaces the entry. Completion
//   bookkeeping is generation-checked so an older in-flight response can
//   never overwrite a newer one (the fresh/fresh race).
// - Expired entries are lazily evicted on read; the cache is bounded.
// ===========================================================================

interface MemoEntry { at: number; data: unknown; gen: number }
interface MemoStore {
  cache: Map<string, MemoEntry>;
  inflight: Map<string, { p: Promise<unknown>; gen: number }>;
  /** Per-key newest generation — only that request may write the cache. */
  latest: Map<string, number>;
  gen: number;
}

const STORE_KEY = '__tiWidgetRequestMemo';
const MAX_ENTRIES = 200;

function store(): MemoStore {
  const w = window as unknown as Record<string, MemoStore | undefined>;
  if (!w[STORE_KEY]) w[STORE_KEY] = { cache: new Map(), inflight: new Map(), latest: new Map(), gen: 0 };
  w[STORE_KEY]!.latest ??= new Map(); // upgrade stores created by older bundles
  return w[STORE_KEY]!;
}

/** TTL presets by data volatility — callers pick, defaults conservative. */
export const MEMO_TTL = {
  /** Facility identity/content: name, hours, documents, rate config. */
  stable: 60_000,
  /** Pricing/vacancy payloads (space-group groups). */
  pricing: 30_000,
  /** Availability lists and per-unit quotes: NEVER cached, dedupe only. */
  volatile: 0,
} as const;

export function memoGet<T>(
  url: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; fresh?: boolean },
): Promise<T> {
  const s = store();
  const key = `GET ${url}`; // method baked into the key; only GETs exist here
  const ttl = opts?.ttlMs ?? MEMO_TTL.stable;

  const hit = s.cache.get(key);
  if (hit && Date.now() - hit.at >= Math.max(ttl, 1)) s.cache.delete(key); // lazy eviction

  if (!opts?.fresh) {
    const live = s.cache.get(key);
    if (live && ttl > 0 && Date.now() - live.at < ttl) return Promise.resolve(live.data as T);
    const running = s.inflight.get(key);
    if (running) return running.p as Promise<T>;
  }

  const gen = ++s.gen;
  s.latest.set(key, gen);
  const p = fetcher()
    .then((data) => {
      // Only the key's LATEST request may write the cache — comparing to
      // the cached entry isn't enough when two fresh requests overlap
      // (an older completion could otherwise be served to later callers
      // until the newer one lands).
      if (s.latest.get(key) === gen) {
        if (ttl > 0) s.cache.set(key, { at: Date.now(), data, gen });
        else s.cache.delete(key);
      }
      if (s.inflight.get(key)?.gen === gen) s.inflight.delete(key);
      if (s.cache.size > MAX_ENTRIES) {
        const oldest = [...s.cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) s.cache.delete(oldest[0]);
      }
      return data;
    })
    .catch((err) => {
      if (s.inflight.get(key)?.gen === gen) s.inflight.delete(key); // errors never cached
      throw err;
    });
  s.inflight.set(key, { p, gen });
  return p;
}

/**
 * Drop cached GETs whose URL contains `urlSubstring`. Writes that change
 * server state MUST call this for the reads they invalidate — e.g. a unit
 * hold/release invalidates 'units/available'.
 */
export function memoInvalidate(urlSubstring: string): void {
  const s = store();
  for (const key of [...s.cache.keys()]) {
    if (key.includes(urlSubstring)) s.cache.delete(key);
  }
}
