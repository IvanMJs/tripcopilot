/**
 * In-memory sliding window rate limiter.
 *
 * Supports multiple limits: by IP, by userId, by endpoint.
 * Returns { allowed, remaining, resetIn } so callers can set proper headers.
 * Cleans up stale entries automatically on each check.
 */

interface RateLimitConfig {
  /** Window length in milliseconds (e.g. 60_000 = 1 minute, 3_600_000 = 1 hour). */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Unique key for this limiter bucket, e.g. "ip:1.2.3.4" or "user:abc123". */
  identifier: string;
}

interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Seconds until the oldest request falls out of the window (i.e. the window resets). */
  resetIn: number;
}

// Each bucket stores sorted timestamps of requests within the current window.
const store = new Map<string, number[]>();

/** Remove all buckets whose window has fully expired to avoid unbounded memory growth. */
function pruneStaleKeys(windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  store.forEach((timestamps, key) => {
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
      store.delete(key);
    }
  });
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { windowMs, maxRequests, identifier } = config;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Periodic lightweight cleanup — runs on every call but is O(n buckets) at most.
  pruneStaleKeys(windowMs);

  // Get or create the timestamps list for this identifier.
  const timestamps = store.get(identifier) ?? [];

  // Slide the window: remove timestamps that are older than the current window.
  const inWindow = timestamps.filter((ts) => ts >= windowStart);

  if (inWindow.length >= maxRequests) {
    // Rate limited. Calculate when the oldest request will fall out of the window.
    const oldestInWindow = inWindow[0];
    const resetInMs = oldestInWindow + windowMs - now;
    const resetIn = Math.max(1, Math.ceil(resetInMs / 1000));

    store.set(identifier, inWindow);

    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  // Request is allowed — record this timestamp.
  inWindow.push(now);
  store.set(identifier, inWindow);

  const remaining = Math.max(0, maxRequests - inWindow.length);
  // Reset is relative to the oldest entry in the window (or a full window from now).
  const resetIn =
    inWindow.length > 0
      ? Math.max(1, Math.ceil((inWindow[0] + windowMs - now) / 1000))
      : Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    remaining,
    resetIn,
  };
}
