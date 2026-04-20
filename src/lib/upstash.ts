const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL!
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!

export interface RedisInfo {
  memoryUsed: string
  totalKeys: number
  dailyRequests: number
  maxDailyRequests: number
}

export async function getRedisInfo(): Promise<RedisInfo & { ok: boolean }> {
  try {
    const res = await fetch(`${UPSTASH_URL}/info`, {
      headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` },
      next: { revalidate: 30 },
    })
    if (!res.ok) return { ok: false, memoryUsed: '0', totalKeys: 0, dailyRequests: 0, maxDailyRequests: 100000 }
    const data = await res.json()
    const info = data.result || ''
    const memMatch = info.match(/used_memory_human:(\S+)/)
    const keysMatch = info.match(/db0:keys=(\d+)/)
    return {
      ok: true,
      memoryUsed: memMatch?.[1] ?? '0',
      totalKeys: parseInt(keysMatch?.[1] ?? '0'),
      dailyRequests: 0,
      maxDailyRequests: 100000,
    }
  } catch {
    return { ok: false, memoryUsed: '0', totalKeys: 0, dailyRequests: 0, maxDailyRequests: 100000 }
  }
}
