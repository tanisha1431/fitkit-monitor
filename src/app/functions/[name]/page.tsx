import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getPaginatedLogs } from "@/lib/queries/functions"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface StepLog {
  step: unknown
  message: unknown
  level: unknown
  ts: unknown
  metadata?: Record<string, unknown>
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function InvocationCard({ log }: { log: Record<string, unknown> }) {
  const meta = log.metadata as Record<string, unknown> | null
  const steps: StepLog[] = Array.isArray(meta?.steps) ? meta.steps as StepLog[] : []
  const execId = typeof log.execution_id === "string" ? log.execution_id : ""

  const renderMessage = (value: unknown) => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
    try {
      return JSON.stringify(value)
    } catch {
      return "—"
    }
  }

  return (
    <Card className={log.level === "error" ? "border-red-500/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant={log.level === "error" ? "destructive" : "outline"}
              className="text-xs"
            >
              {renderMessage(log.status_code)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(log.timestamp as string).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatTimeAgo(log.timestamp as string)})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{renderMessage(log.duration_ms)}ms</span>
            <span className="font-mono">{execId.slice(0, 8)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{renderMessage(log.message)}</p>
        ) : (
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex gap-3 py-1 px-2 rounded text-xs ${
                  step.level === "error"
                    ? "bg-red-500/10 text-red-400"
                    : step.level === "warn"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "text-muted-foreground"
                }`}
              >
                <span className="text-muted-foreground/60 w-[70px] shrink-0 tabular-nums">
                  +{(typeof step.ts === "number" ? step.ts : Number(step.ts)) - (typeof steps[0]?.ts === "number" ? steps[0]?.ts : Number(steps[0]?.ts))}ms
                </span>
                <span className="font-mono w-[100px] shrink-0 text-foreground/70">
                  {renderMessage(step.step)}
                </span>
                <span className="break-words whitespace-pre-wrap">
                  {renderMessage(step.message)}
                  {step.metadata && (
                    <span className="text-muted-foreground/50 ml-2">
                      {JSON.stringify(step.metadata)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const PAGE_SIZE = 20

async function FunctionLogs({ name, page }: { name: string; page: number }) {
  const { logs, total } = await getPaginatedLogs(name, page, PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {logs.length === 0 && page === 1 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">No invocations found for this function.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Invocations</p>
                <p className="text-2xl font-bold mt-1">{total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Errors (this page)</p>
                <p className="text-2xl font-bold mt-1">{logs.filter(l => l.level === "error").length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Duration (this page)</p>
                <p className="text-2xl font-bold mt-1">
                  {logs.filter(l => l.duration_ms).length > 0
                    ? Math.round(logs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / logs.filter(l => l.duration_ms).length)
                    : 0}ms
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Latest</p>
                <p className="text-2xl font-bold mt-1">{logs.length > 0 ? formatTimeAgo(logs[0].timestamp) : "—"}</p>
              </CardContent>
            </Card>
          </div>

          {logs.map((log) => (
            <InvocationCard key={log.id} log={log as unknown as Record<string, unknown>} />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} invocations)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/functions/${encodeURIComponent(name)}?page=${page - 1}`}
                    className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/functions/${encodeURIComponent(name)}?page=${page + 1}`}
                    className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default async function FunctionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { name } = await params
  const { page: pageParam } = await searchParams
  const decodedName = decodeURIComponent(name)
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

  return (
    <>
      <TopBar title={`Function: ${decodedName}`} />
      <div className="p-6 space-y-6">
        <div className="mb-4">
          <Link href="/functions" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to Functions
          </Link>
        </div>
        <Suspense fallback={<Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>}>
          <FunctionLogs name={decodedName} page={page} />
        </Suspense>
      </div>
    </>
  )
}
