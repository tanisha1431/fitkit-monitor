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
