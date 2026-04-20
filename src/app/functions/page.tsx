import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { KPICard } from "@/components/shared/KPICard"
import { getEdgeFunctionSummary, getRecentLogs, getLogStats } from "@/lib/queries/functions"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStepCount(metadata: Record<string, unknown> | null): number {
  if (!metadata) return 0
  const steps = metadata.steps
  return Array.isArray(steps) ? steps.length : 0
}

async function LogStatsSection() {
  const stats = await getLogStats()

  return (
    <div className="grid grid-cols-3 gap-4">
      <KPICard
        label="Total Invocations"
        value={stats.totalLogs}
        subLabel={stats.oldestLog ? `Since ${new Date(stats.oldestLog).toLocaleDateString()}` : "No logs yet"}
      />
      <KPICard
        label="Latest Invocation"
        value={stats.latestLog ? formatTimeAgo(stats.latestLog) : "—"}
        subLabel={stats.latestLog ? new Date(stats.latestLog).toLocaleString() : "Waiting for edge function calls"}
      />
      <KPICard
        label="Logging"
        value="Live"
        subLabel="1 row per invocation, steps in metadata"
      />
    </div>
  )
}

async function FunctionSummaryTable() {
  const summary = await getEdgeFunctionSummary()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Functions — Last 24 Hours</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No edge function invocations in the last 24 hours.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead className="text-right">Invocations</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
                <TableHead className="text-right">Avg (ms)</TableHead>
                <TableHead className="text-right">p95 (ms)</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((fn) => (
                <TableRow
                  key={fn.name}
                  className={fn.errorRate > 10 ? "bg-red-500/10" : ""}
                >
                  <TableCell>
                    <Link
                      href={`/functions/${encodeURIComponent(fn.name)}`}
                      className="font-mono text-sm hover:underline hover:text-emerald-400"
                    >
                      {fn.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{fn.invocations}</TableCell>
                  <TableCell className="text-right">{fn.errors}</TableCell>
                  <TableCell className="text-right">{fn.errorRate}%</TableCell>
                  <TableCell className="text-right">{fn.avgDuration || "—"}</TableCell>
                  <TableCell className="text-right">{fn.p95Duration || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimeAgo(fn.latest)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      status={fn.errorRate > 10 ? "offline" : fn.errorRate > 2 ? "degraded" : "online"}
                      label={fn.errorRate > 10 ? "Critical" : fn.errorRate > 2 ? "Warning" : "Healthy"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

async function RecentInvocations() {
  const logs = await getRecentLogs(undefined, 30)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Invocations</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No invocations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Time</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Steps</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="w-[80px]">Execution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className={log.level === 'error' ? 'bg-red-500/10' : ''}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/functions/${encodeURIComponent(log.function_name)}?exec=${log.execution_id}`}
                      className="font-mono text-xs hover:underline hover:text-emerald-400"
                    >
                      {log.function_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.level === 'error' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {getStepCount(log.metadata as Record<string, unknown>)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {log.status_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.execution_id?.slice(0, 8)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export default function FunctionsPage() {
  return (
    <>
      <TopBar title="Edge Function Monitor" />
      <div className="p-6 space-y-6">
        <Suspense fallback={
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        }>
          <LogStatsSection />
        </Suspense>
        <Suspense fallback={<Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>}>
          <FunctionSummaryTable />
        </Suspense>
        <Suspense fallback={<Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>}>
          <RecentInvocations />
        </Suspense>
      </div>
    </>
  )
}
