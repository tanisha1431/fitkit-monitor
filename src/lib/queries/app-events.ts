import { supabase } from '@/lib/supabase'
import type { AppEvent } from '@/types'

const APP_EVENTS_TABLE = 'app_events'

// Same `logs` schema as edge_function_logs; service-role client required
// (PostgREST denies anon access to the logs schema).
function appEventsTable() {
  return supabase.schema('logs' as never).from(APP_EVENTS_TABLE)
}

function isoMinusHours(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

// Dotted jsonb keys (e.g. "student.id") MUST be double-quoted in the PostgREST
// path or they're read as a nested `student -> id` path and match nothing.
// Verified against the live table: `attributes->>"session.id"` works.
function attr(key: string) {
  return `attributes->>"${key}"`
}

// Spec §7.1: at-least-once delivery — the same client_event_id can arrive more
// than once. The backend should dedupe, but the monitor shouldn't assume one
// physical row per logical event. Keep the first (newest, since we order desc).
function dedupeByClientEventId(rows: AppEvent[]): AppEvent[] {
  const seen = new Set<string>()
  const out: AppEvent[] = []
  for (const row of rows) {
    const key = row.client_event_id
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    out.push(row)
  }
  return out
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

// ---------------------------------------------------------------------------
// Live feed — all events, newest first (spec §6 "Live feed")
// ---------------------------------------------------------------------------

export interface AppEventFilters {
  eventType?: string
  severity?: string
  deviceType?: string // attributes->>"device.type"
  studentId?: string // attributes->>"student.id" — the student, not the teacher
  studentName?: string // ilike on attributes->>"student.name" (partial match)
  sessionId?: string
  userId?: string // the teacher (operator)
  orgId?: string
  q?: string // ilike on message
  hours?: number
}

// Minimal builder shape we chain on. Cast in/out preserves the caller's own
// select() type (T) while keeping us off PostgREST's deep recursive generics.
interface FilterableQuery {
  eq(col: string, val: string): FilterableQuery
  ilike(col: string, val: string): FilterableQuery
  gte(col: string, val: string): FilterableQuery
}

function applyAppEventFilters<T>(q: T, filters: AppEventFilters): T {
  let out = q as unknown as FilterableQuery
  if (filters.eventType) out = out.eq('event_type', filters.eventType)
  if (filters.severity) out = out.eq('severity', filters.severity)
  if (filters.sessionId) out = out.eq('session_id', filters.sessionId)
  if (filters.userId) out = out.eq('user_id', filters.userId)
  if (filters.orgId) out = out.eq('org_id', filters.orgId)
  if (filters.deviceType) out = out.eq(attr('device.type'), filters.deviceType)
  if (filters.studentId) out = out.eq(attr('student.id'), filters.studentId)
  if (filters.studentName) out = out.ilike(attr('student.name'), `%${filters.studentName}%`)
  if (filters.q) out = out.ilike('message', `%${filters.q}%`)
  if (typeof filters.hours === 'number') {
    out = out.gte('timestamp', isoMinusHours(filters.hours))
  }
  return out as unknown as T
}

export async function getRecentAppEvents(
  filters: AppEventFilters = {},
  limit = 50,
): Promise<AppEvent[]> {
  const q = applyAppEventFilters(
    appEventsTable().select('*'),
    filters,
  )
    .order('timestamp', { ascending: false })
    .limit(limit)
  const { data } = await q
  return dedupeByClientEventId((data ?? []) as unknown as AppEvent[])
}

export async function getPaginatedAppEvents(
  page: number,
  pageSize: number,
  filters: AppEventFilters = {},
): Promise<{ events: AppEvent[]; total: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const countQ = applyAppEventFilters(
    appEventsTable().select('id', { count: 'exact', head: true }),
    filters,
  )
  const dataQ = applyAppEventFilters(appEventsTable().select('*'), filters)
    .order('timestamp', { ascending: false })
    .range(from, to)

  const [{ count }, { data }] = await Promise.all([countQ, dataQ])

  return {
    events: dedupeByClientEventId((data ?? []) as unknown as AppEvent[]),
    total: count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Session trail — the full lifecycle of one testing session (spec §6)
// Ordered by timestamp ascending (on-device order), not received_at.
// ---------------------------------------------------------------------------

export async function getSessionTrail(sessionId: string): Promise<AppEvent[]> {
  const { data } = await appEventsTable()
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })
    .limit(5000)

  return dedupeByClientEventId((data ?? []) as unknown as AppEvent[])
}

// ---------------------------------------------------------------------------
// Summary by event_type (for an overview / pills)
// ---------------------------------------------------------------------------

export interface AppEventTypeSummary {
  eventType: string
  total: number
  info: number
  warn: number
  error: number
  latest: string
}

export async function getAppEventSummary(
  filters: AppEventFilters = {},
): Promise<AppEventTypeSummary[]> {
  const q = applyAppEventFilters(
    appEventsTable().select('event_type, severity, timestamp, client_event_id'),
    { ...filters, hours: filters.hours ?? 24 },
  )
    .order('timestamp', { ascending: false })
    .limit(50000)

  const { data } = await q
  const rows = dedupeByClientEventId((data ?? []) as unknown as AppEvent[])

  const agg: Record<string, AppEventTypeSummary> = {}
  for (const row of rows) {
    const key = row.event_type
    if (!agg[key]) {
      agg[key] = { eventType: key, total: 0, info: 0, warn: 0, error: 0, latest: row.timestamp }
    }
    const e = agg[key]
    e.total++
    if (row.severity === 'info') e.info++
    else if (row.severity === 'warn') e.warn++
    else if (row.severity === 'error') e.error++
    if (row.timestamp > e.latest) e.latest = row.timestamp
  }

  return Object.values(agg).sort((a, b) => b.total - a.total)
}

export async function getAppEventStats() {
  const [{ count }, { data: latest }, { data: oldest }] = await Promise.all([
    appEventsTable().select('id', { count: 'exact', head: true }),
    appEventsTable().select('timestamp').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
    appEventsTable().select('timestamp').order('timestamp', { ascending: true }).limit(1).maybeSingle(),
  ])

  return {
    totalEvents: count ?? 0,
    latestEvent: (latest as { timestamp: string } | null)?.timestamp ?? null,
    oldestEvent: (oldest as { timestamp: string } | null)?.timestamp ?? null,
  }
}

// ---------------------------------------------------------------------------
// Errors board — severity = 'error' (spec §6)
// ---------------------------------------------------------------------------

export async function getAppErrors(
  filters: AppEventFilters = {},
  limit = 200,
): Promise<AppEvent[]> {
  const q = applyAppEventFilters(appEventsTable().select('*'), {
    ...filters,
    severity: 'error',
    hours: filters.hours ?? 24 * 7,
  })
    .order('timestamp', { ascending: false })
    .limit(limit)
  const { data } = await q
  return dedupeByClientEventId((data ?? []) as unknown as AppEvent[])
}

// Anomaly trend — the data-loss / device-storm signals (spec §6 "Errors board").
// protocol_duplicate_detected and result_sync_failed bucketed per hour.
export interface AnomalyHourBucket {
  hour: string
  protocolDuplicates: number
  syncFailures: number
}

export async function getAnomalyTrend(hours = 24): Promise<AnomalyHourBucket[]> {
  const since = isoMinusHours(hours)
  const { data } = await appEventsTable()
    .select('event_type, timestamp, client_event_id')
    .in('event_type', [
      'test_lifecycle.protocol_duplicate_detected',
      'test_lifecycle.result_sync_failed',
    ])
    .gte('timestamp', since)
    .limit(50000)

  const rows = dedupeByClientEventId((data ?? []) as unknown as AppEvent[])

  const buckets: Record<string, AnomalyHourBucket> = {}
  for (const row of rows) {
    const hour = row.timestamp.slice(0, 13) + ':00:00Z'
    if (!buckets[hour]) buckets[hour] = { hour, protocolDuplicates: 0, syncFailures: 0 }
    if (row.event_type === 'test_lifecycle.protocol_duplicate_detected') buckets[hour].protocolDuplicates++
    else buckets[hour].syncFailures++
  }

  return Object.values(buckets).sort((a, b) => a.hour.localeCompare(b.hour))
}

// ---------------------------------------------------------------------------
// Device health — protocol_* and ble_listener_* grouped by device type (spec §6)
// ---------------------------------------------------------------------------

export interface DeviceHealthRow {
  deviceType: string
  total: number
  duplicates: number // protocol_duplicate_detected
  multiFrame: number // protocol_multiple_frames_in_buffer
  listenerLeaks: number // ble_listener_leak_detected
  racesAverted: number // ble_listener_race_averted
  commandFailures: number // device_command_failed
  conversionFailures: number // data_conversion_failed
  lastSeen: string
}

const DEVICE_HEALTH_EVENTS = [
  'test_lifecycle.protocol_duplicate_detected',
  'test_lifecycle.protocol_multiple_frames_in_buffer',
  'test_lifecycle.protocol_non_zero_flags',
  'test_lifecycle.ble_listener_leak_detected',
  'test_lifecycle.ble_listener_race_averted',
  'test_lifecycle.device_command_failed',
  'test_lifecycle.data_conversion_failed',
]

export async function getDeviceHealth(hours = 24 * 7): Promise<DeviceHealthRow[]> {
  const since = isoMinusHours(hours)
  const { data } = await appEventsTable()
    .select('event_type, timestamp, attributes, client_event_id')
    .in('event_type', DEVICE_HEALTH_EVENTS)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(50000)

  const rows = dedupeByClientEventId((data ?? []) as unknown as AppEvent[])

  const agg: Record<string, DeviceHealthRow> = {}
  for (const row of rows) {
    const deviceType = (row.attributes?.['device.type'] as string) || 'unknown'
    if (!agg[deviceType]) {
      agg[deviceType] = {
        deviceType,
        total: 0,
        duplicates: 0,
        multiFrame: 0,
        listenerLeaks: 0,
        racesAverted: 0,
        commandFailures: 0,
        conversionFailures: 0,
        lastSeen: row.timestamp,
      }
    }
    const e = agg[deviceType]
    e.total++
    switch (row.event_type) {
      case 'test_lifecycle.protocol_duplicate_detected': e.duplicates++; break
      case 'test_lifecycle.protocol_multiple_frames_in_buffer': e.multiFrame++; break
      case 'test_lifecycle.ble_listener_leak_detected': e.listenerLeaks++; break
      case 'test_lifecycle.ble_listener_race_averted': e.racesAverted++; break
      case 'test_lifecycle.device_command_failed': e.commandFailures++; break
      case 'test_lifecycle.data_conversion_failed': e.conversionFailures++; break
    }
    if (row.timestamp > e.lastSeen) e.lastSeen = row.timestamp
  }

  return Object.values(agg).sort((a, b) => b.total - a.total)
}

// ---------------------------------------------------------------------------
// HTTP errors — event_type = 'http_error' grouped by function + status (spec §6)
// ---------------------------------------------------------------------------

export interface HttpErrorRow {
  func: string // http.function
  statusCode: number | null // http.status_code
  errorType: string | null // error.type
  count: number
  lastSeen: string
}

export async function getHttpErrorSummary(hours = 24): Promise<HttpErrorRow[]> {
  const since = isoMinusHours(hours)
  const { data } = await appEventsTable()
    .select('attributes, timestamp, client_event_id')
    .eq('event_type', 'http_error')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(50000)

  const rows = dedupeByClientEventId((data ?? []) as unknown as AppEvent[])

  const agg: Record<string, HttpErrorRow> = {}
  for (const row of rows) {
    const func = (row.attributes?.['http.function'] as string) || 'unknown'
    const statusCode = (row.attributes?.['http.status_code'] as number) ?? null
    const errorType = (row.attributes?.['error.type'] as string) ?? null
    const key = `${func}::${statusCode}`
    if (!agg[key]) {
      agg[key] = { func, statusCode, errorType, count: 0, lastSeen: row.timestamp }
    }
    agg[key].count++
    if (row.timestamp > agg[key].lastSeen) agg[key].lastSeen = row.timestamp
  }

  return Object.values(agg).sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// Session duration percentiles (from session_ended) — optional health metric
// ---------------------------------------------------------------------------

export async function getSessionDurationStats(hours = 24 * 7): Promise<{
  count: number
  avgSeconds: number
  p95Seconds: number
}> {
  const since = isoMinusHours(hours)
  const { data } = await appEventsTable()
    .select('attributes, client_event_id, timestamp')
    .eq('event_type', 'test_lifecycle.session_ended')
    .gte('timestamp', since)
    .limit(50000)

  const rows = dedupeByClientEventId((data ?? []) as unknown as AppEvent[])
  const durations = rows
    .map(r => r.attributes?.['session.duration_seconds'])
    .filter((d): d is number => typeof d === 'number')
    .sort((a, b) => a - b)

  return {
    count: durations.length,
    avgSeconds: durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    p95Seconds: percentile(durations, 0.95),
  }
}

// ---------------------------------------------------------------------------
// Lookup by UUID — teacher (user_id), org, session, student, or client_event_id
// Mirrors the edge-function lookupByUuid. student.id lives in attributes.
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

export interface AppEventLookupResult {
  query: string
  bySession: AppEvent[]
  byTeacher: AppEvent[] // user_id
  byOrg: AppEvent[]
  byStudent: AppEvent[] // attributes->>"student.id"
}

export async function lookupAppEventsByUuid(
  query: string,
  perBucket = 50,
): Promise<AppEventLookupResult> {
  const q = query.trim()
  if (!isUuid(q)) {
    return { query: q, bySession: [], byTeacher: [], byOrg: [], byStudent: [] }
  }

  const byField = (col: string) =>
    appEventsTable()
      .select('*')
      .eq(col, q)
      .order('timestamp', { ascending: false })
      .limit(perBucket)

  const [sessionRes, teacherRes, orgRes, studentRes] = await Promise.all([
    byField('session_id'),
    byField('user_id'),
    byField('org_id'),
    byField(attr('student.id')),
  ])

  return {
    query: q,
    bySession: dedupeByClientEventId((sessionRes.data ?? []) as unknown as AppEvent[]),
    byTeacher: dedupeByClientEventId((teacherRes.data ?? []) as unknown as AppEvent[]),
    byOrg: dedupeByClientEventId((orgRes.data ?? []) as unknown as AppEvent[]),
    byStudent: dedupeByClientEventId((studentRes.data ?? []) as unknown as AppEvent[]),
  }
}
