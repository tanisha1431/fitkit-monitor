const MANAGEMENT_API_KEY = process.env.SUPABASE_MANAGEMENT_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Extract project ref from URL: https://xxxx.supabase.co → xxxx
function getProjectRef(): string {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (!match) throw new Error('Cannot extract project ref from SUPABASE_URL')
  return match[1]
}

// Raw shape from Supabase Logs API — metadata is an array of objects
export interface RawLogEvent {
  id: string
  event_message: string
  timestamp: number // microseconds
  metadata: Record<string, unknown>[]
}

// Normalized shape we work with
export interface LogEvent {
  id: string
  event_message: string
  timestamp: number // microseconds
  function_name: string
  level: string
  execution_id: string | null
  method: string | null
  status_code: number | null
  path: string | null
  duration_ms: number | null
  region: string | null
  metadata: Record<string, unknown>
}

// Flatten the metadata array into a single object
function flattenMetadata(meta: Record<string, unknown>[] | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {}
  if (!Array.isArray(meta)) return meta
  const flat: Record<string, unknown> = {}
  for (const item of meta) {
    for (const [key, value] of Object.entries(item)) {
      // If value is an array of objects, flatten one more level
      if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'object' && value[0] !== null) {
        flat[key] = value[0]
      } else {
        flat[key] = value
      }
    }
  }
  return flat
}

function normalizeLog(raw: RawLogEvent): LogEvent {
  const meta = flattenMetadata(raw.metadata)
  const request = meta.request as Record<string, unknown> | undefined
  const response = meta.response as Record<string, unknown> | undefined

  // Extract function name from path: /functions/v1/function-name
  const path = (request?.path as string) ?? ''
  const fnMatch = path.match(/\/functions\/v1\/([^/?]+)/)
  const functionName = fnMatch?.[1]
    ?? (meta.function_id as string)
    ?? 'unknown'

  return {
    id: raw.id,
    event_message: raw.event_message,
    timestamp: raw.timestamp,
    function_name: functionName,
    level: (meta.level as string) ?? ((response?.status_code as number) >= 400 ? 'error' : 'info'),
    execution_id: (meta.execution_id as string) ?? null,
    method: (request?.method as string) ?? null,
    status_code: (response?.status_code as number) ?? null,
    path: path || null,
    duration_ms: (response?.origin_time as number) ?? null,
    region: (meta.region as string) ?? null,
    metadata: meta,
  }
}

// Fetch edge function invocation logs (not general API gateway logs)
export async function fetchEdgeFunctionLogs(params: {
  startTime: string
  endTime: string
}): Promise<LogEvent[]> {
  const ref = getProjectRef()

  // Query function_edge_logs for edge function execution logs (console.log, errors, etc.)
  const queries = [
    `select id, event_message, timestamp, metadata
     from function_edge_logs
     where timestamp >= '${params.startTime}'
       and timestamp < '${params.endTime}'
     order by timestamp desc
     limit 5000`,
  ]

  const results: LogEvent[] = []

  for (const sql of queries) {
    const url = `https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${MANAGEMENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`Supabase Logs API error (${res.status}): ${body}`)
      continue
    }

    let data: unknown
    try {
      data = await res.json()
    } catch {
      console.error('Failed to parse Supabase Logs API response')
      continue
    }
    const body = data as Record<string, unknown>
    const rawLogs = body?.result ?? body
    if (!Array.isArray(rawLogs)) {
      console.error('Unexpected Supabase Logs API response:', JSON.stringify(data).slice(0, 200))
      continue
    }
    results.push(...(rawLogs as RawLogEvent[]).map(normalizeLog))
  }

  // Dedupe by id, sort by timestamp desc
  const seen = new Set<string>()
  return results
    .filter(log => {
      if (seen.has(log.id)) return false
      seen.add(log.id)
      return true
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}

// Simple in-memory cache to avoid hammering the API (rate limit is strict)
let _cache: { logs: LogEvent[]; timestamp: number; key: string } | null = null
const CACHE_TTL_MS = 60_000 // 1 minute

export async function fetchEdgeFunctionLogsCached(params: {
  startTime: string
  endTime: string
}): Promise<LogEvent[]> {
  const key = `${params.startTime}|${params.endTime}`
  if (_cache && _cache.key === key && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.logs
  }
  const logs = await fetchEdgeFunctionLogs(params)
  _cache = { logs, timestamp: Date.now(), key }
  return logs
}
