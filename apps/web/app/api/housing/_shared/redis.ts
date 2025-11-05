import Redis from "ioredis";

const GLOBAL_KEY = "__cl_redis";

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = global as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Redis(url, { maxRetriesPerRequest: 2 });
  }
  return g[GLOBAL_KEY] as Redis;
}
