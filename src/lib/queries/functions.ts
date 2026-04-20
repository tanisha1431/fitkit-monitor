import { supabase } from '@/lib/supabase'

export interface EdgeFunctionLog {
  id: number
  event_id: string | null
  function_name: string
  level: string | null
  message: string | null
  timestamp: string
  execution_id: string | null
  method: string | null
  path: string | null
  status_code: number | null
  duration_ms: number | null
  region: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getEdgeFunctionSummary() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('edge_function_logs')
    .select('function_name, level, status_code, duration_ms, timestamp')
    .gte('timestamp', dayAgo)
    .order('timestamp', { ascending: false })

  if (!data || data.length === 0) return []

  const byFunction: Record<string, {
    total: number
    errors: number
    durations: number[]
    latest: string
  }> = {}

  data.forEach(row => {
    const fn = row.function_name
    if (!byFunction[fn]) byFunction[fn] = { total: 0, errors: 0, durations: [], latest: row.timestamp }
    byFunction[fn].total++
    if (row.level === 'error' || (row.status_code && row.status_code >= 400)) {
      byFunction[fn].errors++
    }
    if (row.duration_ms) byFunction[fn].durations.push(row.duration_ms)
    if (row.timestamp > byFunction[fn].latest) byFunction[fn].latest = row.timestamp
  })

  return Object.entries(byFunction)
    .map(([name, stats]) => {
      const sorted = [...stats.durations].sort((a, b) => a - b)
      const p95Index = Math.floor(sorted.length * 0.95)
      return {
        name,
        invocations: stats.total,
        errors: stats.errors,
        errorRate: stats.total > 0 ? Number(((stats.errors / stats.total) * 100).toFixed(1)) : 0,
        avgDuration: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
        p95Duration: sorted.length > 0 ? sorted[p95Index] ?? sorted[sorted.length - 1] : 0,
        latest: stats.latest,
      }
    })
    .sort((a, b) => b.invocations - a.invocations)
}

export async function getRecentLogs(functionName?: string, limit = 100) {
  let query = supabase
    .from('edge_function_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (functionName) {
    query = query.eq('function_name', functionName)
  }

  const { data } = await query
  return (data ?? []) as EdgeFunctionLog[]
}

export async function getPaginatedLogs(
  functionName: string,
  page: number,
  pageSize: number
): Promise<{ logs: EdgeFunctionLog[]; total: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { count } = await supabase
    .from('edge_function_logs')
    .select('id', { count: 'exact', head: true })
    .eq('function_name', functionName)

  const { data } = await supabase
    .from('edge_function_logs')
    .select('*')
    .eq('function_name', functionName)
    .order('timestamp', { ascending: false })
    .range(from, to)

  return { logs: (data ?? []) as EdgeFunctionLog[], total: count ?? 0 }
}

export async function getLogStats() {
  const { count } = await supabase
    .from('edge_function_logs')
    .select('id', { count: 'exact', head: true })

  const { data: latest } = await supabase
    .from('edge_function_logs')
    .select('timestamp')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  const { data: oldest } = await supabase
    .from('edge_function_logs')
    .select('timestamp')
    .order('timestamp', { ascending: true })
    .limit(1)
    .single()

  return {
    totalLogs: count ?? 0,
    latestLog: latest?.timestamp ?? null,
    oldestLog: oldest?.timestamp ?? null,
  }
}
