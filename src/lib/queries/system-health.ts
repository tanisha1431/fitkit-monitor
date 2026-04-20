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
    .from('function_logs')
    .select('function_name, status, duration_ms, cache_hit')
    .gte('created_at', dayAgo)

  if (!data || data.length === 0) {
    return {
      totalInvocations: 0,
      errorCount: 0,
      avgDuration: 0,
      cacheMissRate: 0,
      perFunction: [],
    }
  }

  const errorCount = data.filter(r => r.status === 'failed').length
  const durations = data.map(r => r.duration_ms).filter(Boolean) as number[]
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  const cacheRows = data.filter(r => r.cache_hit !== null)
  const cacheMisses = cacheRows.filter(r => !r.cache_hit).length
  const cacheMissRate = cacheRows.length > 0 ? Math.round((cacheMisses / cacheRows.length) * 100) : 0

  // Per function breakdown
  const byFunction: Record<string, { total: number; errors: number; durations: number[] }> = {}
  data.forEach(row => {
    const fn = row.function_name
    if (!byFunction[fn]) byFunction[fn] = { total: 0, errors: 0, durations: [] }
    byFunction[fn].total++
    if (row.status === 'failed') byFunction[fn].errors++
    if (row.duration_ms) byFunction[fn].durations.push(row.duration_ms)
  })

  const perFunction = Object.entries(byFunction).map(([name, stats]) => ({
    name,
    invocations: stats.total,
    errorRate: stats.total > 0 ? Number(((stats.errors / stats.total) * 100).toFixed(1)) : 0,
    avgDuration: stats.durations.length > 0
      ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
      : 0,
  })).sort((a, b) => b.invocations - a.invocations)

  return {
    totalInvocations: data.length,
    errorCount,
    avgDuration,
    cacheMissRate,
    perFunction,
  }
}
