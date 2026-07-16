// Upstash Redis REST API client adapter (fetch-based, zero NPM dependencies).
export async function runRedisCommand(
  command: string[],
): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // fallback gracefully if credentials are not configured
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`Upstash Redis REST error: ${res.status} - ${errBody}`);
      return null;
    }

    const data = (await res.json()) as { result: any };
    return data.result;
  } catch (e) {
    console.error("Upstash Redis connection failed:", e);
    return null;
  }
}

/**
 * Enforces rate limiting on a specific store.
 * Returns true if allowed, false if rate limit exceeded.
 */
export async function isRateLimitAllowed(
  storeId: string,
  limitPerMinute: number = 20,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Use a fixed window key per minute
  const minuteStamp = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${storeId}:${minuteStamp}`;

  const currentCount = await runRedisCommand(["INCR", key]);
  if (currentCount === null) {
    // If Redis is not configured or fails, we fail open/fallback to true
    return { allowed: true, current: 0, limit: limitPerMinute };
  }

  // If first time incrementing, set key expiration to 60 seconds
  if (currentCount === 1) {
    await runRedisCommand(["EXPIRE", key, "60"]);
  }

  return {
    allowed: currentCount <= limitPerMinute,
    current: currentCount,
    limit: limitPerMinute,
  };
}
