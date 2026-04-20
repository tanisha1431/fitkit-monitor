import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TopBar } from "@/components/layout/TopBar"
import { KPICard } from "@/components/shared/KPICard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { getSupabaseHealth, getFunctionLogsStats } from "@/lib/queries/system-health"
import { getLogStats } from "@/lib/queries/functions"
// TODO: Uncomment when Upstash and Sentry are configured
// import { getRedisInfo } from "@/lib/upstash"
// import { getSentryIssues } from "@/lib/sentry"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

function ServiceCard({
  name,
  status,
  detail,
}: {
  name: string
  status: "online" | "degraded" | "offline"
  detail: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{name}</p>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{detail}</p>
      </CardContent>
    </Card>
  )
}

async function ServiceStatusCards() {
  const [supabaseHealth, logStats] = await Promise.all([
    getSupabaseHealth(),
    getLogStats(),
  ])

  const logDetail = logStats.totalLogs > 0
    ? `${logStats.totalLogs.toLocaleString()} logs stored`
    : "No logs synced yet"

  return (
    <div className="grid grid-cols-4 gap-4">
      <ServiceCard
        name="Supabase"
        status={supabaseHealth.ok ? (supabaseHealth.latencyMs > 1000 ? "degraded" : "online") : "offline"}
        detail={supabaseHealth.ok ? `${supabaseHealth.latencyMs}ms ping` : "Unreachable"}
      />
      <ServiceCard
        name="Edge Fn Logs"
        status={logStats.totalLogs > 0 ? "online" : "degraded"}
        detail={logDetail}
      />
      {/* TODO: Uncomment when Upstash and Sentry are configured */}
      <ServiceCard name="Redis" status="offline" detail="Not configured yet" />
      <ServiceCard name="Sentry" status="offline" detail="Not configured yet" />
    </div>
  )
}

async function FunctionLogsSection() {
  const stats = await getFunctionLogsStats()

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total Invocations" value={stats.totalInvocations} subLabel="Last 24 hours" />
        <KPICard label="Error Count" value={stats.errorCount} subLabel="Last 24 hours" />
        <KPICard label="Avg Duration" value={`${stats.avgDuration}ms`} subLabel="Last 24 hours" />
        <KPICard label="Cache Miss Rate" value={`${stats.cacheMissRate}%`} subLabel="Last 24 hours" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Functions Health</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.perFunction.length === 0 ? (
            <p className="text-sm text-muted-foreground">No function logs in the last 24 hours.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function Name</TableHead>
                  <TableHead className="text-right">Invocations</TableHead>
                  <TableHead className="text-right">Error Rate</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.perFunction.map((fn) => (
                  <TableRow
                    key={fn.name}
                    className={fn.errorRate > 10 ? "bg-red-500/10" : ""}
                  >
                    <TableCell className="font-mono text-sm">{fn.name}</TableCell>
                    <TableCell className="text-right">{fn.invocations}</TableCell>
                    <TableCell className="text-right">{fn.errorRate}%</TableCell>
                    <TableCell className="text-right">{fn.avgDuration}ms</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge
                        status={
                          fn.errorRate > 10
                            ? "offline"
                            : fn.errorRate > 2
                            ? "degraded"
                            : "online"
                        }
                        label={
                          fn.errorRate > 10
                            ? "Critical"
                            : fn.errorRate > 2
                            ? "Warning"
                            : "Healthy"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  )
}

export default function SystemHealthPage() {
  return (
    <>
      <TopBar title="System Health" />
      <div className="p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <ServiceStatusCards />
        </Suspense>
        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
        }>
          <FunctionLogsSection />
        </Suspense>
      </div>
    </>
  )
}
