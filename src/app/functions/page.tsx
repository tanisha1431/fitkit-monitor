import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { KPICard } from "@/components/shared/KPICard"
import {
  getEdgeFunctionSummary,
  getRecentLogs,
  getLogStats,
  getInvocationSteps,
} from "@/lib/queries/functions"
import {
  StatusTag,
  CategoryTag,
  ErrorCategoryTag,
  StepLevelDot,
  stepLevelTint,
} from "@/components/shared/EdgeFunctionTags"
import type { EdgeFunctionLog, EdgeFunctionStep } from "@/types"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const RANGE_OPTIONS: Record<string, { hours: number; label: string }> = {
  "24h": { hours: 24, label: "Last 24h" },
  "7d": { hours: 24 * 7, label: "Last 7d" },
  "30d": { hours: 24 * 30, label: "Last 30d" },
}

const CATEGORY_OPTIONS = ["report", "app", "consent", "ops", "webhook"] as const
const STATUS_OPTIONS = ["success", "failed", "boot_failure"] as const

type Filters = {
  range: keyof typeof RANGE_OPTIONS
  category?: string
  status?: string
  q?: string
}

function readFilters(search: { range?: string; category?: string; status?: string; q?: string }): Filters {
  const range = (search.range && search.range in RANGE_OPTIONS
    ? search.range
    : "24h") as keyof typeof RANGE_OPTIONS
  return {
    range,
    category: search.category?.trim() || undefined,
    status: search.status?.trim() || undefined,
    q: search.q?.trim() || undefined,
  }
}

function buildHref(next: Partial<Filters> & { clear?: boolean }) {
  if (next.clear) return "/functions"
  const sp = new URLSearchParams()
  if (next.range && next.range !== "24h") sp.set("range", next.range)
  if (next.category) sp.set("category", next.category)
  if (next.status) sp.set("status", next.status)
  if (next.q) sp.set("q", next.q)
  const qs = sp.toString()
  return qs ? `/functions?${qs}` : "/functions"
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function FilterPill({
  active,
  href,
  children,
}: {
  active: boolean
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}

function FilterBar({ filters }: { filters: Filters }) {
  const anyActive = filters.range !== "24h" || filters.category || filters.status || filters.q

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Range</span>
            {(Object.keys(RANGE_OPTIONS) as Array<keyof typeof RANGE_OPTIONS>).map((k) => (
              <FilterPill
                key={k}
                active={filters.range === k}
                href={buildHref({ ...filters, range: k })}
              >
                {RANGE_OPTIONS[k].label}
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Category</span>
            <FilterPill
              active={!filters.category}
              href={buildHref({ ...filters, category: undefined })}
            >
              All
            </FilterPill>
            {CATEGORY_OPTIONS.map((c) => (
              <FilterPill
                key={c}
                active={filters.category === c}
                href={buildHref({ ...filters, category: c })}
              >
                {c}
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            <FilterPill
              active={!filters.status}
              href={buildHref({ ...filters, status: undefined })}
            >
              All
            </FilterPill>
            {STATUS_OPTIONS.map((s) => (
              <FilterPill
                key={s}
                active={filters.status === s}
                href={buildHref({ ...filters, status: s })}
              >
                {s}
              </FilterPill>
            ))}
          </div>
        </div>
        <form action="/functions" method="get" className="flex items-center gap-2">
          {filters.range !== "24h" && <input type="hidden" name="range" value={filters.range} />}
          {filters.category && <input type="hidden" name="category" value={filters.category} />}
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search function name…"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            type="submit"
            className="h-9 rounded-md border border-border bg-accent/30 px-3 text-sm hover:bg-accent"
          >
            Search
          </button>
          {anyActive && (
            <Link
              href={buildHref({ clear: true, range: "24h" })}
              className="h-9 inline-flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent"
            >
              Reset
            </Link>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

async function LogStatsSection() {
  const stats = await getLogStats()

  return (
    <div className="grid grid-cols-3 gap-4">
      <KPICard
        label="Total Invocations"
        value={stats.totalLogs}
        subLabel={
          stats.oldestLog ? `Since ${new Date(stats.oldestLog).toLocaleDateString()}` : "No logs yet"
        }
      />
      <KPICard
        label="Latest Invocation"
        value={stats.latestLog ? formatTimeAgo(stats.latestLog) : "—"}
        subLabel={
          stats.latestLog
            ? new Date(stats.latestLog).toLocaleString()
            : "Waiting for edge function calls"
        }
      />
      <KPICard
        label="Logging"
        value="Live"
        subLabel="1 row per invocation, steps in metadata"
      />
    </div>
  )
}

async function FunctionSummaryTable({ filters }: { filters: Filters }) {
  const summary = await getEdgeFunctionSummary({
    hours: RANGE_OPTIONS[filters.range].hours,
    category: filters.category,
    status: filters.status,
    q: filters.q,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Functions — {RANGE_OPTIONS[filters.range].label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No edge function invocations match your filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead>Category</TableHead>
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
                  <TableCell>
                    <CategoryTag category={fn.category} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {fn.invocations}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {fn.errors}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {fn.errorRate}%
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {fn.avgDuration || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {fn.p95Duration || "—"}
                  </TableCell>
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

function StepRow({
  step,
  totalDuration,
}: {
  step: EdgeFunctionStep
  totalDuration: number | null
}) {
  const dur =
    typeof step.metadata?.duration_ms === "number" ? (step.metadata.duration_ms as number) : null
  const pctOfTotal =
    dur !== null && totalDuration && totalDuration > 0
      ? Math.min(100, Math.round((dur / totalDuration) * 100))
      : null

  return (
    <div className={`rounded-md px-3 py-2 text-sm ${stepLevelTint(step.level)}`}>
      <div className="flex items-center gap-3">
        <StepLevelDot level={step.level} />
        <span className="w-[70px] shrink-0 tabular-nums text-xs text-muted-foreground">
          +{step.ts_offset_ms ?? 0}ms
        </span>
        <span className="w-[170px] shrink-0 truncate font-mono text-sm">{step.step}</span>
        <span className="flex-1 break-words whitespace-pre-wrap text-foreground/90">
          {step.message ?? ""}
        </span>
        {dur !== null && (
          <span className="shrink-0 text-right tabular-nums text-sm text-foreground/80">
            {dur}ms
            {pctOfTotal !== null && (
              <span className="ml-1.5 text-xs text-muted-foreground">{pctOfTotal}%</span>
            )}
          </span>
        )}
      </div>
      {pctOfTotal !== null && (
        <div className="mt-1.5 ml-[88px] h-1.5 rounded-full bg-foreground/5">
          <div
            className="h-1.5 rounded-full bg-emerald-500/60"
            style={{ width: `${Math.max(2, pctOfTotal)}%` }}
          />
        </div>
      )}
      {step.metadata && Object.keys(step.metadata).length > 0 && (
        <details className="mt-1.5 ml-[88px]">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-muted-foreground/70 hover:text-muted-foreground">
            metadata
          </summary>
          <pre className="mt-1.5 overflow-x-auto rounded bg-foreground/5 p-2 text-xs leading-snug text-foreground/80">
            {JSON.stringify(step.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function InvocationRow({ log }: { log: EdgeFunctionLog }) {
  const failed = log.status === "failed" || log.status === "boot_failure"
  const steps = getInvocationSteps(log)
  const stepsCount = steps.length

  return (
    <details
      className={`group rounded-md border ${failed ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"}`}
    >
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-accent/30">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground/70 transition-transform group-open:rotate-90">
            ▸
          </span>
          <StatusTag status={log.status} size="xs" />
          <CategoryTag category={log.category} size="xs" />
          <Link
            href={`/functions/${encodeURIComponent(log.function_name)}`}
            className="font-mono text-sm hover:underline hover:text-emerald-400"
          >
            {log.function_name}
          </Link>
          {failed && log.error_category && (
            <ErrorCategoryTag category={log.error_category} size="xs" />
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(log.timestamp).toLocaleString()}
          </span>
          <span className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            <span className="tabular-nums">HTTP {log.status_code ?? "—"}</span>
            <span className="tabular-nums">
              {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
            </span>
            <span className="tabular-nums">
              {stepsCount} step{stepsCount === 1 ? "" : "s"}
            </span>
            <span className="font-mono">{log.execution_id?.slice(0, 8) ?? "—"}</span>
          </span>
        </div>
        {failed && (log.error_step || log.error_message) && (
          <div className="ml-8 mt-1.5 text-sm text-red-300/90">
            {log.error_step && <span className="font-mono">↳ {log.error_step}</span>}
            {log.error_message && (
              <span className="ml-2 break-words">{log.error_message}</span>
            )}
          </div>
        )}
      </summary>
      <div className="border-t border-border/60 px-4 py-3 space-y-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {log.path && <span className="font-mono">{log.method ?? ""} {log.path}</span>}
          {log.user_id && (
            <span>
              user:{" "}
              <Link
                href={`/lookup?q=${log.user_id}`}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline"
              >
                {log.user_id}
              </Link>
            </span>
          )}
          {log.org_id && (
            <span>
              org:{" "}
              <Link
                href={`/organisations/${log.org_id}`}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline"
              >
                {log.org_id}
              </Link>
            </span>
          )}
          <Link
            href={`/functions/${encodeURIComponent(log.function_name)}?exec=${log.execution_id ?? ""}`}
            className="ml-auto hover:text-emerald-400 hover:underline"
          >
            Open full detail →
          </Link>
        </div>
        {stepsCount === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No steps recorded.</p>
        ) : (
          <div className="space-y-1">
            {steps.map((s, i) => (
              <StepRow key={i} step={s} totalDuration={log.duration_ms ?? null} />
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

async function RecentInvocations({ filters }: { filters: Filters }) {
  const logs = await getRecentLogs(
    {
      category: filters.category,
      status: filters.status,
      q: filters.q,
      hours: RANGE_OPTIONS[filters.range].hours,
    },
    30,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Invocations</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No invocations match your filters.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <InvocationRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function FunctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string; status?: string; q?: string }>
}) {
  const params = await searchParams
  const filters = readFilters(params)

  return (
    <>
      <TopBar title="Edge Function Monitor" />
      <div className="p-6 space-y-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <LogStatsSection />
        </Suspense>

        <FilterBar filters={filters} />

        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          }
        >
          <FunctionSummaryTable filters={filters} />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          }
        >
          <RecentInvocations filters={filters} />
        </Suspense>
      </div>
    </>
  )
}
