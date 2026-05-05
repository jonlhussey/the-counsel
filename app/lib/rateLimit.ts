// app/lib/rateLimit.ts
// Simple per-IP rate limiter. For production with real traffic,
// replace with Vercel KV or Upstash Redis.

type Entry = { count: number; resetAt: number };
const HOUR_MS = 60 * 60 * 1000;

const buckets = new Map<string, Map<string, Entry>>();

function getBucket(name: string): Map<string, Entry> {
  let bucket = buckets.get(name);
  if (!bucket) {
    bucket = new Map();
    buckets.set(name, bucket);
  }
  return bucket;
}

export function checkRateLimit(
  ip: string,
  bucketName: string,
  maxPerHour: number
): { ok: boolean; remaining: number } {
  const bucket = getBucket(bucketName);
  const now = Date.now();
  const entry = bucket.get(ip);

  if (!entry || now > entry.resetAt) {
    bucket.set(ip, { count: 1, resetAt: now + HOUR_MS });
    return { ok: true, remaining: maxPerHour - 1 };
  }
  if (entry.count >= maxPerHour) {
    return { ok: false, remaining: 0 };
  }
  entry.count += 1;
  return { ok: true, remaining: maxPerHour - entry.count };
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
