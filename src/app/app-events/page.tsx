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
import { KPICard } from "@/components/shared/KPICard"
import {
  SeverityTag,
  EventTypeTag,
  DeviceTag,
  severityTint,
  eventShortName,
  EVENT_GROUPS,
} from "@/components/shared/AppEventTags"
import {
  getAppEventStats,
  getAppEventSummary,
  getPaginatedAppEvents,
  getDeviceHealth,
  getHttpErrorSummary,
  type AppEventFilters,
} from "@/lib/queries/app-events"
import type { AppEvent } from "@/types"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 30

const RANGE_OPTIONS: Record<string, { hours?: number; label: string }> = {
  "24h": { hours: 24, label: "Last 24h" },
  "7d": { hours: 24 * 7, label: "Last 7d" },
  "30d": { hours: 24 * 30, label: "Last 30d" },
  all: { hours: undefined, label: "All time" },
}

const SEVERITY_OPTIONS = ["info", "warn", "error"] as const

type Filters = {
  range: keyof typeof RANGE_OPTIONS
  type?: string
  severity?: string
  device?: string
  session?: string
  student?: string
  studentName?: string
  user?: string
  org?: string
  q?: string
}

type SearchParams = {
  range?: string
  type?: string
  severity?: string
  device?: string
  session?: string
  student?: string
  studentName?: string
  user?: string
  org?: string
  q?: string
  page?: string
}

function readFilters(s: SearchParams): Filters {
  const range = (s.range && s.range in RANGE_OPTIONS
    ? s.range
    : "24h") as keyof typeof RANGE_OPTIONS
  return {
    range,
    type: s.type?.trim() || undefined,
    severity: s.severity?.trim() || undefined,
    device: s.device?.trim() || undefined,
    session: s.session?.trim() || undefined,
    student: s.student?.trim() || undefined,
    studentName: s.studentName?.trim() || undefined,
    user: s.user?.trim() || undefined,
    org: s.org?.trim() || undefined,
    q: s.q?.trim() || undefined,
  }
}

function buildHref(next: Partial<Filters> & { page?: number; clear?: boolean }) {
  if (next.clear) return "/app-events"
  const sp = new URLSearchParams()
  if (next.range && next.range !== "24h") sp.set("range", next.range)
  if (next.type) sp.set("type", next.type)
  if (next.severity) sp.set("severity", next.severity)
  if (next.device) sp.set("device", next.device)
  if (next.session) sp.set("session", next.session)
  if (next.student) sp.set("student", next.student)
  if (next.studentName) sp.set("studentName", next.studentName)
  if (next.user) sp.set("user", next.user)
  if (next.org) sp.set("org", next.org)
  if (next.q) sp.set("q", next.q)
  if (next.page && next.page > 1) sp.set("page", String(next.page))
  const qs = sp.toString()
  return qs ? `/app-events?${qs}` : "/app-events"
}

function toQueryFilters(filters: Filters): AppEventFilters {
  return {
    eventType: filters.type,
    severity: filters.severity,
    deviceType: filters.device,
    sessionId: filters.session,
    studentId: filters.student,
    studentName: filters.studentName,
    userId: filters.user,
    orgId: filters.org,
    q: filters.q,
    hours: RANGE_OPTIONS[filters.range].hours,
  }
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

// Envelope keys present on every test_lifecycle.* event — shown last/de-emphasized.
const ENVELOPE_KEYS = new Set([
  "test_lifecycle.event",
  "user.teacher_id",
  "user.organization_id",
  "timestamp",
])

// JSON-encoded string attributes (spec §7.4) — pretty-print if parseable.
function renderAttrValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch {
        return value
      }
    }
    return value === "" ? '""' : value
  }
  return String(value)
}

function AttributesGrid({ attributes }: { attributes: AppEvent["attributes"] }) {
  const entries = Object.entries(attributes ?? {})
  const main = entries.filter(([k]) => !ENVELOPE_KEYS.has(k))
  const envelope = entries.filter(([k]) => ENVELOPE_KEYS.has(k))

  const renderRows = (rows: [string, unknown][]) =>
    rows.map(([k, v]) => {
      const rendered = renderAttrValue(v)
      // Render as a full-width wrapping block when multiline or long, so nothing
      // overflows/clips horizontally (UUIDs, JSON-string previews, etc.).
      const block = rendered.includes("\n") || rendered.length > 60
      return (
        <div key={k} className={block ? "col-span-2 md:col-span-4" : ""}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
            {k}
          </p>
          {block ? (
            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-foreground/5 p-2.5 text-sm leading-snug text-foreground/90">
              {rendered}
            </pre>
          ) : (
            <p className="text-base text-foreground/90 break-words [overflow-wrap:anywhere]">
              {rendered}
            </p>
          )}
        </div>
      )
    })

  return (
    <div className="space-y-3">
      {main.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
          {renderRows(main)}
        </div>
      )}
      {envelope.length > 0 && (
        <details className="pt-1">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-muted-foreground/60 hover:text-muted-foreground">
            envelope
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4 opacity-70">
            {renderRows(envelope)}
          </div>
        </details>
      )}
    </div>
  )
}

export function AppEventRow({ event }: { event: AppEvent }) {
  const attrs = event.attributes ?? {}
  const deviceType = (attrs["device.type"] as string) || null
  const studentName = (attrs["student.name"] as string) || null
  const testName = (attrs["test.name"] as string) || null

  return (
    <details className={`group rounded-md border border-border ${severityTint(event.severity)}`}>
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-accent/30">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground/70 transition-transform group-open:rotate-90">
            ▸
          </span>
          <SeverityTag severity={event.severity} size="xs" />
          <EventTypeTag eventType={event.event_type} size="xs" />
          {deviceType && <DeviceTag deviceType={deviceType} size="xs" />}
          {studentName && (
            <span className="text-sm font-medium text-foreground/90">👤 {studentName}</span>
          )}
          {testName && <span className="text-sm text-muted-foreground">{testName}</span>}
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(event.timestamp).toLocaleString()}
          </span>
          <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {event.session_id && (
              <span className="font-mono" title="session_id">
                ⛓ {event.session_id.slice(0, 8)}
              </span>
            )}
            <span className="font-mono" title="client_event_id">
              {event.client_event_id.slice(0, 8)}
            </span>
          </span>
        </div>
      </summary>
      <div className="border-t border-border/60 px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
          {event.session_id && (
            <span>
              session:{" "}
              <Link
                href={`/app-events/sessions/${event.session_id}`}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline [overflow-wrap:anywhere]"
              >
                {event.session_id}
              </Link>
            </span>
          )}
          {event.user_id && (
            <span>
              teacher:{" "}
              <Link
                href={buildHref({ range: "all", user: event.user_id })}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline [overflow-wrap:anywhere]"
              >
                {event.user_id}
              </Link>
            </span>
          )}
          {event.org_id && (
            <span>
              org:{" "}
              <Link
                href={`/organisations/${event.org_id}`}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline [overflow-wrap:anywhere]"
              >
                {event.org_id}
              </Link>
            </span>
          )}
          {typeof attrs["student.id"] === "string" && attrs["student.id"] !== "" && (
            <span>
              student:{" "}
              <Link
                href={buildHref({ range: "all", student: attrs["student.id"] as string })}
                className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline [overflow-wrap:anywhere]"
              >
                {attrs["student.id"] as string}
              </Link>
            </span>
          )}
        </div>
        <p className="text-base text-foreground/90 [overflow-wrap:anywhere]">{event.message}</p>
        <AttributesGrid attributes={attrs} />
      </div>
    </details>
  )
}

async function StatsSection({ filters }: { filters: Filters }) {
  const [stats, summary] = await Promise.all([
    getAppEventStats(),
    getAppEventSummary({ hours: RANGE_OPTIONS[filters.range].hours }),
  ])

  const totals = summary.reduce(
    (acc, s) => {
      acc.total += s.total
      acc.warn += s.warn
      acc.error += s.error
      return acc
    },
    { total: 0, warn: 0, error: 0 },
  )

  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard
        label={`Events — ${RANGE_OPTIONS[filters.range].label}`}
        value={totals.total}
        subLabel={`${stats.totalEvents.toLocaleString()} all-time`}
      />
      <KPICard label="Warnings" value={totals.warn} subLabel="severity = warn" />
      <KPICard label="Errors" value={totals.error} subLabel="severity = error" />
      <KPICard
        label="Latest Event"
        value={formatTimeAgo(stats.latestEvent)}
        subLabel={stats.latestEvent ? new Date(stats.latestEvent).toLocaleString() : "No events yet"}
      />
    </div>
  )
}

function FilterBar({ filters }: { filters: Filters }) {
  const anyActive =
    filters.range !== "24h" ||
    filters.type ||
    filters.severity ||
    filters.device ||
    filters.session ||
    filters.student ||
    filters.studentName ||
    filters.user ||
    filters.org ||
    filters.q

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Range</span>
            {(Object.keys(RANGE_OPTIONS) as Array<keyof typeof RANGE_OPTIONS>).map((k) => (
              <FilterPill key={k} active={filters.range === k} href={buildHref({ ...filters, range: k })}>
                {RANGE_OPTIONS[k].label}
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Severity</span>
            <FilterPill active={!filters.severity} href={buildHref({ ...filters, severity: undefined })}>
              All
            </FilterPill>
            {SEVERITY_OPTIONS.map((s) => (
              <FilterPill key={s} active={filters.severity === s} href={buildHref({ ...filters, severity: s })}>
                {s}
              </FilterPill>
            ))}
          </div>
        </div>
        <form action="/app-events" method="get" className="flex flex-wrap items-end gap-2">
          {filters.range !== "24h" && <input type="hidden" name="range" value={filters.range} />}
          {filters.severity && <input type="hidden" name="severity" value={filters.severity} />}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Event type</span>
            <select
              name="type"
              defaultValue={filters.type ?? ""}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">All types</option>
              {EVENT_GROUPS.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.types.map((t) => (
                    <option key={t} value={t}>
                      {eventShortName(t)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <input
            type="text"
            name="device"
            defaultValue={filters.device ?? ""}
            placeholder="device.type"
            className="h-9 w-[130px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none self-end"
          />
          <input
            type="text"
            name="studentName"
            defaultValue={filters.studentName ?? ""}
            placeholder="student name…"
            className="h-9 w-[150px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none self-end"
          />
          <input
            type="text"
            name="student"
            defaultValue={filters.student ?? ""}
            placeholder="student.id (UUID)"
            className="h-9 w-[170px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none self-end"
          />
          <input
            type="text"
            name="user"
            defaultValue={filters.user ?? ""}
            placeholder="teacher user_id"
            className="h-9 w-[170px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none self-end"
          />
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="message…"
            className="h-9 flex-1 min-w-[140px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none self-end"
          />
          <button
            type="submit"
            className="h-9 rounded-md border border-border bg-accent/30 px-3 text-sm hover:bg-accent self-end"
          >
            Apply
          </button>
          {anyActive && (
            <Link
              href={buildHref({ clear: true })}
              className="h-9 inline-flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent self-end"
            >
              Reset
            </Link>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

async function EventTypeSummary({ filters }: { filters: Filters }) {
  const summary = await getAppEventSummary({ hours: RANGE_OPTIONS[filters.range].hours })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Events by type — {RANGE_OPTIONS[filters.range].label}</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Info</TableHead>
                <TableHead className="text-right">Warn</TableHead>
                <TableHead className="text-right">Error</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((row) => (
                <TableRow key={row.eventType} className={row.error > 0 ? "bg-red-500/10" : ""}>
                  <TableCell>
                    <Link href={buildHref({ ...filters, type: row.eventType })} className="hover:opacity-80">
                      <EventTypeTag eventType={row.eventType} size="xs" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-300/80">
                    {row.info || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-yellow-300/80">
                    {row.warn || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-red-300/80">
                    {row.error || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(row.latest)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

async function DeviceAndHttpSection({ filters }: { filters: Filters }) {
  const hours = RANGE_OPTIONS[filters.range].hours ?? 24 * 365
  const [devices, http] = await Promise.all([getDeviceHealth(hours), getHttpErrorSummary(hours)])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device health</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No device / protocol events in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right" title="protocol_duplicate_detected">Dupes</TableHead>
                  <TableHead className="text-right" title="protocol_multiple_frames_in_buffer">Multi-frame</TableHead>
                  <TableHead className="text-right" title="ble_listener_leak_detected">Leaks</TableHead>
                  <TableHead className="text-right" title="device_command_failed">Cmd fail</TableHead>
                  <TableHead className="text-right" title="data_conversion_failed">Conv fail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.deviceType}>
                    <TableCell>
                      <DeviceTag deviceType={d.deviceType} size="xs" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{d.duplicates || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{d.multiFrame || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{d.listenerLeaks || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-red-300/80">
                      {d.commandFailures || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-red-300/80">
                      {d.conversionFailures || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">HTTP errors</CardTitle>
        </CardHeader>
        <CardContent>
          {http.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No HTTP errors in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {http.map((h) => (
                  <TableRow key={`${h.func}-${h.statusCode}`}>
                    <TableCell className="font-mono text-sm">{h.func}</TableCell>
                    <TableCell className="tabular-nums text-sm">{h.statusCode ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.errorType ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{h.count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(h.lastSeen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function LiveFeed({ filters, page }: { filters: Filters; page: number }) {
  const { events, total } = await getPaginatedAppEvents(page, PAGE_SIZE, toQueryFilters(filters))
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const activeFilterChips = [
    filters.type && `type:${eventShortName(filters.type)}`,
    filters.severity && `severity:${filters.severity}`,
    filters.device && `device:${filters.device}`,
    filters.session && `session:${filters.session.slice(0, 8)}`,
    filters.studentName && `name:${filters.studentName}`,
    filters.student && `student:${filters.student.slice(0, 8)}`,
    filters.user && `teacher:${filters.user.slice(0, 8)}`,
    filters.org && `org:${filters.org.slice(0, 8)}`,
    filters.q && `“${filters.q}”`,
  ].filter(Boolean)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Live feed
          {activeFilterChips.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {activeFilterChips.join(" · ")}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events match your filters.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <AppEventRow key={event.id} event={event} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total.toLocaleString()} events)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ ...filters, page: page - 1 })}
                  className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ ...filters, page: page + 1 })}
                  className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CardSkeleton({ height }: { height: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className={`${height} w-full`} />
      </CardContent>
    </Card>
  )
}

export default async function AppEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filters = readFilters(sp)
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)

  return (
    <>
      <TopBar title="App Events" />
      <div className="p-6 space-y-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <StatsSection filters={filters} />
        </Suspense>

        <FilterBar filters={filters} />

        <Suspense fallback={<CardSkeleton height="h-48" />}>
          <EventTypeSummary filters={filters} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height="h-48" />}>
          <DeviceAndHttpSection filters={filters} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height="h-64" />}>
          <LiveFeed filters={filters} page={page} />
        </Suspense>
      </div>
    </>
  )
}
