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
