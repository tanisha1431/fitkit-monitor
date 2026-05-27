import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getPaginatedLogs,
  getInvocationByExecutionId,
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

const PAGE_SIZE = 20

const RANGE_OPTIONS: Record<string, { hours?: number; label: string }> = {
  all: { hours: undefined, label: "All time" },
  "24h": { hours: 24, label: "Last 24h" },
  "7d": { hours: 24 * 7, label: "Last 7d" },
  "30d": { hours: 24 * 30, label: "Last 30d" },
}

const STATUS_OPTIONS = ["success", "failed", "boot_failure"] as const

type DetailFilters = {
  range: keyof typeof RANGE_OPTIONS
  status?: string
  errorsOnly: boolean
  userId?: string
  orgId?: string
}

function readFilters(s: {
  range?: string
  status?: string
  errors?: string
  user?: string
  org?: string
}): DetailFilters {
  const range = (s.range && s.range in RANGE_OPTIONS
    ? s.range
    : "all") as keyof typeof RANGE_OPTIONS
  return {
    range,
    status: s.status?.trim() || undefined,
    errorsOnly: s.errors === "1",
    userId: s.user?.trim() || undefined,
    orgId: s.org?.trim() || undefined,
  }
}

function buildHref(
  name: string,
  next: Partial<DetailFilters> & { page?: number; clear?: boolean; exec?: string },
) {
  if (next.clear) return `/functions/${encodeURIComponent(name)}`
  const sp = new URLSearchParams()
  if (next.range && next.range !== "all") sp.set("range", next.range)
  if (next.status) sp.set("status", next.status)
  if (next.errorsOnly) sp.set("errors", "1")
  if (next.userId) sp.set("user", next.userId)
  if (next.orgId) sp.set("org", next.orgId)
  if (next.page && next.page > 1) sp.set("page", String(next.page))
  if (next.exec) sp.set("exec", next.exec)
  const qs = sp.toString()
  return qs
    ? `/functions/${encodeURIComponent(name)}?${qs}`
    : `/functions/${encodeURIComponent(name)}`
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isFailed(log: EdgeFunctionLog): boolean {
  return log.status === "failed" || log.status === "boot_failure"
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

function FilterBar({ name, filters }: { name: string; filters: DetailFilters }) {
  const anyActive =
    filters.range !== "all" ||
    filters.status ||
    filters.errorsOnly ||
    filters.userId ||
    filters.orgId

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
                href={buildHref(name, { ...filters, range: k })}
              >
                {RANGE_OPTIONS[k].label}
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            <FilterPill
              active={!filters.status && !filters.errorsOnly}
              href={buildHref(name, { ...filters, status: undefined, errorsOnly: false })}
            >
              All
            </FilterPill>
            {STATUS_OPTIONS.map((s) => (
              <FilterPill
                key={s}
                active={filters.status === s}
                href={buildHref(name, { ...filters, status: s, errorsOnly: false })}
              >
                {s}
              </FilterPill>
            ))}
            <FilterPill
              active={filters.errorsOnly}
              href={buildHref(name, { ...filters, errorsOnly: !filters.errorsOnly, status: undefined })}
            >
              Errors only
            </FilterPill>
          </div>
        </div>
        <form action={`/functions/${encodeURIComponent(name)}`} method="get" className="flex flex-wrap items-center gap-2">
          {filters.range !== "all" && <input type="hidden" name="range" value={filters.range} />}
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          {filters.errorsOnly && <input type="hidden" name="errors" value="1" />}
          <input
            type="text"
            name="user"
            defaultValue={filters.userId ?? ""}
            placeholder="user_id (UUID)"
            className="h-9 flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
          />
          <input
            type="text"
            name="org"
            defaultValue={filters.orgId ?? ""}
            placeholder="org_id (UUID)"
            className="h-9 flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            type="submit"
            className="h-9 rounded-md border border-border bg-accent/30 px-3 text-sm hover:bg-accent"
          >
            Apply
          </button>
          {anyActive && (
            <Link
              href={buildHref(name, { clear: true, range: "all", errorsOnly: false })}
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

function DetailField({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{label}</p>
      <p className={`text-sm text-foreground/90 ${mono ? "font-mono" : ""} break-words`}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function InvocationDetail({ log }: { log: EdgeFunctionLog }) {
  const steps = getInvocationSteps(log)
  const failed = isFailed(log)

  return (
    <div className="space-y-4">
      <Card className={failed ? "border-red-500/40" : ""}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <StatusTag status={log.status} />
              <CategoryTag category={log.category} />
              {failed && <ErrorCategoryTag category={log.error_category} />}
              <span className="font-mono">{log.function_name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{log.method ?? "—"}</span>
              <span>HTTP {log.status_code ?? "—"}</span>
              <span className="tabular-nums">
                {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
              </span>
              <span className="font-mono">{log.execution_id?.slice(0, 8) ?? "—"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <DetailField label="execution_id" value={log.execution_id} mono />
            <DetailField label="user_id" value={log.user_id} mono />
            <DetailField label="org_id" value={log.org_id} mono />
            <DetailField
              label="cache_hit"
              value={log.cache_hit === null ? null : String(log.cache_hit)}
            />
            <DetailField label="path" value={log.path} mono className="col-span-2 md:col-span-4" />
            {failed && (
              <>
                <DetailField label="error_step" value={log.error_step} />
                <DetailField label="error_category" value={log.error_category} />
                <DetailField
                  label="error_message"
                  value={log.error_message}
                  className="col-span-2 md:col-span-4"
                />
              </>
            )}
          </div>

          {log.metadata?.params && Object.keys(log.metadata.params as object).length > 0 && (
            <details open>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Params
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-foreground/5 p-3 text-xs leading-snug">
                {JSON.stringify(log.metadata.params, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps ({steps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps recorded.</p>
          ) : (
            <div className="space-y-1">
              {steps.map((step, i) => (
                <StepRow key={i} step={step} totalDuration={log.duration_ms ?? null} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function InvocationByExec({ executionId }: { executionId: string }) {
  const log = await getInvocationByExecutionId(executionId)
  if (!log) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No invocation found for execution_id <span className="font-mono">{executionId}</span>.
          </p>
        </CardContent>
      </Card>
    )
  }
  return <InvocationDetail log={log} />
}

function CollapsibleRow({ log, fnName }: { log: EdgeFunctionLog; fnName: string }) {
  const failed = isFailed(log)
  const steps = getInvocationSteps(log)

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
          {failed && log.error_category && (
            <ErrorCategoryTag category={log.error_category} size="xs" />
          )}
          <span className="text-xs text-muted-foreground tabular-nums w-[180px]">
            {new Date(log.timestamp).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">HTTP {log.status_code ?? "—"}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            {steps.length} step{steps.length === 1 ? "" : "s"}
          </span>
          {failed && log.error_step && (
            <span className="font-mono text-sm text-red-300 truncate">
              ↳ {log.error_step}
            </span>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground/70">
            {log.execution_id?.slice(0, 8) ?? ""}
          </span>
        </div>
        {failed && log.error_message && (
          <div className="ml-8 mt-1.5 text-sm text-red-300/80 break-words">
            {log.error_message}
          </div>
        )}
      </summary>
      <div className="border-t border-border/60 px-4 py-3 space-y-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
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
            href={`/functions/${encodeURIComponent(fnName)}?exec=${log.execution_id ?? ""}`}
            className="ml-auto hover:text-emerald-400 hover:underline"
          >
            Open full detail →
          </Link>
        </div>
        {steps.length === 0 ? (
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

async function FunctionLogList({
  name,
  page,
  filters,
}: {
  name: string
  page: number
  filters: DetailFilters
}) {
  const { logs, total } = await getPaginatedLogs(name, page, PAGE_SIZE, {
    status: filters.status,
    hours: RANGE_OPTIONS[filters.range].hours,
    hasError: filters.errorsOnly,
    userId: filters.userId,
    orgId: filters.orgId,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (logs.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            No invocations match your filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  const failures = logs.filter(isFailed).length
  const withDur = logs.filter((l) => typeof l.duration_ms === "number") as Array<
    EdgeFunctionLog & { duration_ms: number }
  >
  const avgDuration =
    withDur.length > 0
      ? Math.round(withDur.reduce((sum, l) => sum + l.duration_ms, 0) / withDur.length)
      : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Matching invocations</p>
            <p className="text-2xl font-bold mt-1">{total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Failures (this page)</p>
            <p className="text-2xl font-bold mt-1">{failures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Duration (this page)</p>
            <p className="text-2xl font-bold mt-1">{avgDuration}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Latest</p>
            <p className="text-2xl font-bold mt-1">
              {logs.length > 0 ? formatTimeAgo(logs[0].timestamp) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <CollapsibleRow key={log.id} log={log} fnName={name} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total.toLocaleString()} invocations)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref(name, { ...filters, page: page - 1 })}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref(name, { ...filters, page: page + 1 })}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function FunctionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<{
    page?: string
    exec?: string
    range?: string
    status?: string
    errors?: string
    user?: string
    org?: string
  }>
}) {
  const { name } = await params
  const sp = await searchParams
  const decodedName = decodeURIComponent(name)
  const execId = sp.exec?.trim() || undefined
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const filters = readFilters(sp)

  return (
    <>
      <TopBar title={`Function: ${decodedName}`} />
      <div className="p-6 space-y-6">
        <div className="mb-2 flex items-center gap-3 text-sm">
          <Link href="/functions" className="text-muted-foreground hover:underline">
            ← Back to Functions
          </Link>
          {execId && (
            <Link
              href={`/functions/${encodeURIComponent(decodedName)}`}
              className="text-muted-foreground hover:underline"
            >
              View all invocations
            </Link>
          )}
        </div>

        {!execId && <FilterBar name={decodedName} filters={filters} />}

        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          }
        >
          {execId ? (
            <InvocationByExec executionId={execId} />
          ) : (
            <FunctionLogList name={decodedName} page={page} filters={filters} />
          )}
        </Suspense>
      </div>
    </>
  )
}
