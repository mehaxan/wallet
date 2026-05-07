import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const CacheKeys = {
  dashboard: (userId: string) => `wallet:dashboard:${userId}`,
  transactions: (userId: string, page: number) => `wallet:txn:${userId}:${page}`,
  taxSummary: (userId: string, fy: string) => `wallet:tax:${userId}:${fy}`,
  netWorth: (userId: string) => `wallet:networth:${userId}`,
  accounts: (userId: string) => `wallet:accounts:${userId}`,
  categories: (userId: string) => `wallet:categories:${userId}`,
  budgets: (userId: string, month: number, year: number) => `wallet:budget:${userId}:${year}-${month}`,
  goals: (userId: string) => `wallet:goals:${userId}`,
  dps: (userId: string) => `wallet:dps:${userId}`,
  investments: (userId: string) => `wallet:investments:${userId}`,
  assets: (userId: string) => `wallet:assets:${userId}`,
  loans: (userId: string) => `wallet:loans:${userId}`,
  taxConfig: (fy: string) => `wallet:taxconfig:${fy}`,
} as const;

export const TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
} as const;

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch {
    return fetcher();
  }
}

export async function invalidateUser(userId: string) {
  const keys = [
    CacheKeys.dashboard(userId),
    CacheKeys.accounts(userId),
    CacheKeys.netWorth(userId),
    CacheKeys.goals(userId),
    CacheKeys.dps(userId),
    CacheKeys.investments(userId),
    CacheKeys.assets(userId),
    CacheKeys.loans(userId),
  ];
  if (keys.length > 0) await redis.del(...keys);
}
