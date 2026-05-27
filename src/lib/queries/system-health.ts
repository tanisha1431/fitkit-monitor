import { supabase } from '@/lib/supabase'

export async function getSupabaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  try {
    const start = Date.now()
    const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true })
    const latencyMs = Date.now() - start
    return { ok: !error, latencyMs }
  } catch {
    return { ok: false, latencyMs: 0 }
  }
}

export async function getFunctionLogsStats() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .schema('logs' as never)
    .from('edge_function_logs')
    .select('function_name, status, duration_ms, cache_hit')
    .gte('timestamp', dayAgo)
    .limit(50000)

  if (!data || data.length === 0) {
    return {
      totalInvocations: 0,
      errorCount: 0,
      avgDuration: 0,
      cacheMissRate: 0,
      perFunction: [],
    }
  }

  type Row = {
    function_name: string
    status: string | null
    duration_ms: number | null
    cache_hit: boolean | null
  }
  const rows = data as Row[]

  const errorCount = rows.filter(r => r.status === 'failed' || r.status === 'boot_failure').length
  const durations = rows.map(r => r.duration_ms).filter((d): d is number => typeof d === 'number')
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  const cacheRows = rows.filter(r => r.cache_hit !== null)
  const cacheMisses = cacheRows.filter(r => !r.cache_hit).length
  const cacheMissRate = cacheRows.length > 0
    ? Math.round((cacheMisses / cacheRows.length) * 100)
    : 0

  const byFunction: Record<string, { total: number; errors: number; durations: number[] }> = {}
  for (const row of rows) {
    if (!byFunction[row.function_name]) {
      byFunction[row.function_name] = { total: 0, errors: 0, durations: [] }
    }
    const e = byFunction[row.function_name]
    e.total++
    if (row.status === 'failed' || row.status === 'boot_failure') e.errors++
    if (typeof row.duration_ms === 'number') e.durations.push(row.duration_ms)
  }

  const perFunction = Object.entries(byFunction).map(([name, stats]) => ({
    name,
    invocations: stats.total,
    errorRate: stats.total > 0 ? Number(((stats.errors / stats.total) * 100).toFixed(1)) : 0,
    avgDuration: stats.durations.length > 0
      ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
      : 0,
  })).sort((a, b) => b.invocations - a.invocations)

  return {
    totalInvocations: rows.length,
    errorCount,
    avgDuration,
    cacheMissRate,
    perFunction,
  }
}
