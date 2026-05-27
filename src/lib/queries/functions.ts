import { supabase } from '@/lib/supabase'
import type { EdgeFunctionLog, EdgeFunctionStep } from '@/types'

const LOGS_TABLE = 'edge_function_logs'

function logsTable() {
  return supabase.schema('logs' as never).from(LOGS_TABLE)
}

function isoMinusHours(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

export interface FunctionSummaryRow {
  name: string
  category: string | null
  invocations: number
  errors: number
  errorRate: number
  avgDuration: number
  p95Duration: number
  latest: string
}

export interface FunctionsListFilters {
  hours?: number
  category?: string
  status?: string
  q?: string
}

export async function getEdgeFunctionSummary(
  filters: FunctionsListFilters = {},
): Promise<FunctionSummaryRow[]> {
  const since = isoMinusHours(filters.hours ?? 24)

  let q = logsTable()
    .select('function_name, category, status, duration_ms, timestamp')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(50000)

  if (filters.category) q = q.eq('category', filters.category)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.q) q = q.ilike('function_name', `%${filters.q}%`)

  const { data, error } = await q

  if (error || !data || data.length === 0) return []

  const byFunction: Record<string, {
    category: string | null
    total: number
    errors: number
    durations: number[]
    latest: string
  }> = {}

  for (const row of data as Array<{
    function_name: string
    category: string | null
    status: string | null
    duration_ms: number | null
    timestamp: string
  }>) {
    if (!byFunction[row.function_name]) {
      byFunction[row.function_name] = {
        category: row.category,
        total: 0,
        errors: 0,
        durations: [],
        latest: row.timestamp,
      }
    }
    const entry = byFunction[row.function_name]
    entry.total++
    if (row.status === 'failed' || row.status === 'boot_failure') entry.errors++
    if (typeof row.duration_ms === 'number') entry.durations.push(row.duration_ms)
    if (row.timestamp > entry.latest) entry.latest = row.timestamp
  }

  return Object.entries(byFunction)
    .map(([name, s]) => {
      const sorted = [...s.durations].sort((a, b) => a - b)
      return {
        name,
        category: s.category,
        invocations: s.total,
        errors: s.errors,
        errorRate: s.total > 0 ? Number(((s.errors / s.total) * 100).toFixed(1)) : 0,
        avgDuration: sorted.length > 0
          ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
          : 0,
        p95Duration: percentile(sorted, 0.95),
        latest: s.latest,
      }
    })
    .sort((a, b) => b.invocations - a.invocations)
}

export interface RecentLogsFilters {
  functionName?: string
  category?: string
  status?: string
  q?: string
  hours?: number
}

export async function getRecentLogs(
  filters: RecentLogsFilters = {},
  limit = 50,
): Promise<EdgeFunctionLog[]> {
  let q = logsTable()
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (filters.functionName) q = q.eq('function_name', filters.functionName)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.q) q = q.ilike('function_name', `%${filters.q}%`)
  if (typeof filters.hours === 'number') {
    q = q.gte('timestamp', isoMinusHours(filters.hours))
  }

  const { data } = await q
  return (data ?? []) as unknown as EdgeFunctionLog[]
}

export interface PaginatedLogsFilters {
  status?: string
  hours?: number
  hasError?: boolean
  userId?: string
  orgId?: string
}

export async function getPaginatedLogs(
  functionName: string,
  page: number,
  pageSize: number,
  filters: PaginatedLogsFilters = {},
): Promise<{ logs: EdgeFunctionLog[]; total: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let countQ = logsTable().select('id', { count: 'exact', head: true }).eq('function_name', functionName)
  let dataQ = logsTable().select('*').eq('function_name', functionName)

  if (filters.status) {
    countQ = countQ.eq('status', filters.status)
    dataQ = dataQ.eq('status', filters.status)
  }
  if (filters.hasError) {
    countQ = countQ.in('status', ['failed', 'boot_failure'])
    dataQ = dataQ.in('status', ['failed', 'boot_failure'])
  }
  if (filters.userId) {
    countQ = countQ.eq('user_id', filters.userId)
    dataQ = dataQ.eq('user_id', filters.userId)
  }
  if (filters.orgId) {
    countQ = countQ.eq('org_id', filters.orgId)
    dataQ = dataQ.eq('org_id', filters.orgId)
  }
  if (typeof filters.hours === 'number') {
    const since = isoMinusHours(filters.hours)
    countQ = countQ.gte('timestamp', since)
    dataQ = dataQ.gte('timestamp', since)
  }

  const [{ count }, { data }] = await Promise.all([
    countQ,
    dataQ.order('timestamp', { ascending: false }).range(from, to),
  ])

  return {
    logs: (data ?? []) as unknown as EdgeFunctionLog[],
    total: count ?? 0,
  }
}

export async function getInvocationByExecutionId(
  executionId: string,
): Promise<EdgeFunctionLog | null> {
  const { data } = await logsTable()
    .select('*')
    .eq('execution_id', executionId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as unknown as EdgeFunctionLog | null) ?? null
}

export async function getLogStats() {
  const [{ count }, { data: latest }, { data: oldest }] = await Promise.all([
    logsTable().select('id', { count: 'exact', head: true }),
    logsTable().select('timestamp').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
    logsTable().select('timestamp').order('timestamp', { ascending: true }).limit(1).maybeSingle(),
  ])

  return {
    totalLogs: count ?? 0,
    latestLog: (latest as { timestamp: string } | null)?.timestamp ?? null,
    oldestLog: (oldest as { timestamp: string } | null)?.timestamp ?? null,
  }
}

export interface ErrorRow {
  id: number
  timestamp: string
  function_name: string
  error_category: string | null
  error_step: string | null
  error_message: string | null
  status: string | null
  status_code: number | null
  user_id: string | null
  org_id: string | null
  execution_id: string | null
}

export interface ErrorsFilters {
  functionName?: string
  errorCategory?: string
  userId?: string
  orgId?: string
  hours?: number
  limit?: number
}

export async function getRecentErrors(filters: ErrorsFilters = {}): Promise<ErrorRow[]> {
  const since = isoMinusHours(filters.hours ?? 24 * 7)

  let q = logsTable()
    .select('id, timestamp, function_name, error_category, error_step, error_message, status, status_code, user_id, org_id, execution_id')
    .in('status', ['failed', 'boot_failure'])
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(filters.limit ?? 200)

  if (filters.functionName) q = q.eq('function_name', filters.functionName)
  if (filters.errorCategory) q = q.eq('error_category', filters.errorCategory)
  if (filters.userId) q = q.eq('user_id', filters.userId)
  if (filters.orgId) q = q.eq('org_id', filters.orgId)

  const { data } = await q
  return (data ?? []) as unknown as ErrorRow[]
}

export interface ErrorStepAggregate {
  function_name: string
  error_step: string | null
  error_category: string | null
  count: number
  lastSeen: string
}

export async function getErrorsByStep(hours = 24 * 7): Promise<ErrorStepAggregate[]> {
  const since = isoMinusHours(hours)

  const { data } = await logsTable()
    .select('function_name, error_step, error_category, timestamp')
    .in('status', ['failed', 'boot_failure'])
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(10000)

  if (!data) return []

  const agg: Record<string, ErrorStepAggregate> = {}
  for (const row of data as Array<{
    function_name: string
    error_step: string | null
    error_category: string | null
    timestamp: string
  }>) {
    const key = `${row.function_name}::${row.error_step ?? ''}::${row.error_category ?? ''}`
    if (!agg[key]) {
      agg[key] = {
        function_name: row.function_name,
        error_step: row.error_step,
        error_category: row.error_category,
        count: 0,
        lastSeen: row.timestamp,
      }
    }
    agg[key].count++
    if (row.timestamp > agg[key].lastSeen) agg[key].lastSeen = row.timestamp
  }

  return Object.values(agg).sort((a, b) => b.count - a.count)
}

export interface CacheHourBucket {
  hour: string
  total: number
  hits: number
  hitRate: number
}

export async function getCacheHitRate(
  functionName = 'test-leaderboard',
  hours = 24,
): Promise<{
  totals: { total: number; hits: number; misses: number; hitRate: number }
  buckets: CacheHourBucket[]
}> {
  const since = isoMinusHours(hours)

  const { data } = await logsTable()
    .select('cache_hit, timestamp')
    .eq('function_name', functionName)
    .not('cache_hit', 'is', null)
    .gte('timestamp', since)
    .limit(50000)

  const rows = (data ?? []) as Array<{ cache_hit: boolean | null; timestamp: string }>

  let total = 0
  let hits = 0
  const buckets: Record<string, { total: number; hits: number }> = {}

  for (const row of rows) {
    total++
    if (row.cache_hit) hits++
    const hour = row.timestamp.slice(0, 13) + ':00:00Z'
    if (!buckets[hour]) buckets[hour] = { total: 0, hits: 0 }
    buckets[hour].total++
    if (row.cache_hit) buckets[hour].hits++
  }

  const ordered = Object.entries(buckets)
    .map(([hour, b]) => ({
      hour,
      total: b.total,
      hits: b.hits,
      hitRate: b.total > 0 ? Number(((b.hits / b.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  return {
    totals: {
      total,
      hits,
      misses: total - hits,
      hitRate: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
    },
    buckets: ordered,
  }
}

export interface OrgFunctionActivity {
  function_name: string
  invocations: number
  errors: number
  errorRate: number
  avgDuration: number
  lastSeen: string
}

export async function getOrgFunctionActivity(
  orgId: string,
  hours = 24 * 7,
): Promise<OrgFunctionActivity[]> {
  const since = isoMinusHours(hours)

  const { data } = await logsTable()
    .select('function_name, status, duration_ms, timestamp')
    .eq('org_id', orgId)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(20000)

  if (!data || data.length === 0) return []

  const agg: Record<string, { total: number; errors: number; durations: number[]; lastSeen: string }> = {}
  for (const row of data as Array<{
    function_name: string
    status: string | null
    duration_ms: number | null
    timestamp: string
  }>) {
    if (!agg[row.function_name]) {
      agg[row.function_name] = { total: 0, errors: 0, durations: [], lastSeen: row.timestamp }
    }
    const e = agg[row.function_name]
    e.total++
    if (row.status === 'failed' || row.status === 'boot_failure') e.errors++
    if (typeof row.duration_ms === 'number') e.durations.push(row.duration_ms)
    if (row.timestamp > e.lastSeen) e.lastSeen = row.timestamp
  }

  return Object.entries(agg)
    .map(([fn, s]) => ({
      function_name: fn,
      invocations: s.total,
      errors: s.errors,
      errorRate: s.total > 0 ? Number(((s.errors / s.total) * 100).toFixed(1)) : 0,
      avgDuration: s.durations.length > 0
        ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
        : 0,
      lastSeen: s.lastSeen,
    }))
    .sort((a, b) => b.invocations - a.invocations)
}

export function getInvocationSteps(log: EdgeFunctionLog): EdgeFunctionStep[] {
  const steps = log.metadata?.steps
  return Array.isArray(steps) ? steps : []
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

export interface LookupHit {
  log: EdgeFunctionLog
  match: 'execution_id' | 'user_id' | 'org_id'
}

export interface LookupResult {
  query: string
  byExecution: EdgeFunctionLog | null
  byUser: EdgeFunctionLog[]
  byOrg: EdgeFunctionLog[]
}

export async function lookupByUuid(query: string, perBucket = 25): Promise<LookupResult> {
  const q = query.trim()
  if (!isUuid(q)) {
    return { query: q, byExecution: null, byUser: [], byOrg: [] }
  }

  const [execRes, userRes, orgRes] = await Promise.all([
    logsTable()
      .select('*')
      .eq('execution_id', q)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
    logsTable()
      .select('*')
      .eq('user_id', q)
      .order('timestamp', { ascending: false })
      .limit(perBucket),
    logsTable()
      .select('*')
      .eq('org_id', q)
      .order('timestamp', { ascending: false })
      .limit(perBucket),
  ])

  return {
    query: q,
    byExecution: (execRes.data as unknown as EdgeFunctionLog | null) ?? null,
    byUser: (userRes.data ?? []) as unknown as EdgeFunctionLog[],
    byOrg: (orgRes.data ?? []) as unknown as EdgeFunctionLog[],
  }
}
