export interface ServiceStatus {
  name: string
  status: 'online' | 'degraded' | 'offline'
  detail: string
}

export interface FunctionStats {
  name: string
  invocations: number
  errorRate: number
  avgDuration: number
}

export interface KPI {
  label: string
  value: string | number
  subLabel?: string
}

export interface ChartDataPoint {
  date: string
  count: number
}

export interface ConsentFunnel {
  sent: number
  delivered: number
  approved: number
  rejected: number
  bounced: number
  complained?: number
}

export type EdgeFunctionStepLevel = 'debug' | 'info' | 'warn' | 'error'

export interface EdgeFunctionStep {
  step: string
  level: EdgeFunctionStepLevel
  ts_offset_ms: number
  message?: string | null
  metadata?: Record<string, unknown> | null
}

export interface EdgeFunctionLogMetadata {
  schema_version?: number
  env?: string | null
  params?: Record<string, unknown> | null
  steps?: EdgeFunctionStep[]
  [key: string]: unknown
}

export type EdgeFunctionStatus = 'success' | 'failed' | 'boot_failure'

// ---------------------------------------------------------------------------
// logs.app_events — the FitKit app event stream (test_lifecycle.* + http_error)
// See the Monitor Integration Spec. Sibling of EdgeFunctionLog, different table.
// ---------------------------------------------------------------------------

export type AppEventSeverity = 'info' | 'warn' | 'error'

// Closed enum, 21 values (spec §8). Ingest rejects anything else.
export const APP_EVENT_TYPES = [
  'test_lifecycle.session_started',
  'test_lifecycle.session_ended',
  'test_lifecycle.student_scanned',
  'test_lifecycle.student_test_started',
  'test_lifecycle.student_skipped',
  'test_lifecycle.student_completed',
  'test_lifecycle.test_data_received',
  'test_lifecycle.test_skipped',
  'test_lifecycle.result_saved_locally',
  'test_lifecycle.result_synced_to_server',
  'test_lifecycle.result_sync_failed',
  'test_lifecycle.background_sync_completed',
  'test_lifecycle.device_config_sent',
  'test_lifecycle.device_command_failed',
  'test_lifecycle.data_conversion_failed',
  'test_lifecycle.ble_listener_race_averted',
  'test_lifecycle.ble_listener_leak_detected',
  'test_lifecycle.protocol_multiple_frames_in_buffer',
  'test_lifecycle.protocol_non_zero_flags',
  'test_lifecycle.protocol_duplicate_detected',
  'http_error',
] as const

export type AppEventType = (typeof APP_EVENT_TYPES)[number]

// attributes is jsonb with dotted-namespace keys (e.g. "student.id", "device.type",
// "http.status_code"). Numbers/bools are real JSON; large/structured payloads
// (*.body, test.raw_data_preview) are JSON-encoded strings — parse client-side.
export type AppEventAttributes = Record<string, unknown>

export interface AppEvent {
  id: number
  client_event_id: string // uuid v4 — idempotency key; dedupe on this (at-least-once delivery)
  timestamp: string // when it happened on-device (authoritative for ordering/display), UTC
  event_type: AppEventType | string
  severity: AppEventSeverity | string
  message: string
  user_id: string | null // the logged-in teacher (operator), NOT the student; null pre-login
  org_id: string | null // teacher's org; null pre-login
  session_id: string | null // groups one testing session; null for background_sync/http_error
  attributes: AppEventAttributes
  received_at: string // backend ingest time; received_at − timestamp ≈ batching+network delay
}

// Mirrors logs.edge_function_logs per the dashboard brief.
export interface EdgeFunctionLog {
  id: number
  execution_id: string | null
  timestamp: string
  function_name: string
  category: string | null
  method: string | null
  path: string | null
  status_code: number | null
  status: EdgeFunctionStatus | string | null
  duration_ms: number | null
  error_step: string | null
  error_category: string | null
  error_message: string | null
  user_id: string | null
  org_id: string | null
  cache_hit: boolean | null
  metadata: EdgeFunctionLogMetadata | null
  created_at: string
}
