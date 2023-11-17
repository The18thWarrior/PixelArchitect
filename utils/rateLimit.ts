import type { NextApiRequest, NextApiResponse } from 'next'
import { LRUCache } from 'lru-cache'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  })

  return {
    check: (res: NextApiResponse, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0]
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount)
        }
        tokenCount[0] += 1

        const currentUsage = tokenCount[0]
        const isRateLimited = currentUsage >= limit
        res.setHeader('X-RateLimit-Limit', limit)
        res.setHeader(
          'X-RateLimit-Remaining',
          isRateLimited ? 0 : limit - currentUsage
        )

        return isRateLimited ? reject() : resolve()
      }),
  }
}

export async function checkLimit(req : NextApiRequest, res: NextApiResponse, limiter: { check: (arg0: NextApiResponse, arg1: number, arg2: string) => any }) {
  try {
    if (!req.query.sub || req.query.sub.length === 0) {
      res.status(400).json({error: 'No sub included'})
      return false;
    } else {
      await limiter.check(res, 25, req.query.sub as string) // 25 requests per hour
      return true;
    }
  } catch {
    res.status(429).json({ error: 'Rate limit exceeded' })
    return false;
  }
}