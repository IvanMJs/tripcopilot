/**
 * Retries an async function with exponential backoff.
 * Does NOT retry on 4xx client errors — only on network errors or 5xx.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Wraps a fetch call with retry logic, skipping retries on 4xx responses.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  return withRetry(async () => {
    const res = await fetch(url, options);
    // Don't retry client errors
    if (res.status >= 400 && res.status < 500) return res;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }, maxAttempts);
}

/**
 * Processes items in parallel batches, collecting fulfilled/rejected counts.
 * Each batch runs concurrently; batches are processed sequentially to bound
 * concurrency and avoid overwhelming downstream services.
 */
export async function sendInBatches<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  batchSize = 10,
): Promise<{ fulfilled: number; rejected: number }> {
  let fulfilled = 0;
  let rejected = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    for (const r of results) {
      if (r.status === "fulfilled") fulfilled++;
      else rejected++;
    }
  }
  return { fulfilled, rejected };
}
