import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SeverityTag } from "@/components/shared/AppEventTags"
import { AppEventRow } from "@/app/app-events/page"
import { getSessionTrail } from "@/lib/queries/app-events"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{label}</p>
      <p className={`text-sm text-foreground/90 break-words ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

async function SessionTrail({ sessionId }: { sessionId: string }) {
  const events = await getSessionTrail(sessionId)

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No events found for session <span className="font-mono">{sessionId}</span>.
          </p>
        </CardContent>
      </Card>
    )
  }

  const started = events.find((e) => e.event_type === "test_lifecycle.session_started")
  const ended = events.find((e) => e.event_type === "test_lifecycle.session_ended")
  const first = events[0]
  const startedAt = events[0].timestamp
  const endedAt = events[events.length - 1].timestamp
  const sa = started?.attributes ?? {}
  const ea = ended?.attributes ?? {}

  const warnCount = events.filter((e) => e.severity === "warn").length
  const errorCount = events.filter((e) => e.severity === "error").length

  return (
    <div className="space-y-6">
      <Card className={errorCount > 0 ? "border-red-500/40" : ""}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-mono">{sessionId}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{events.length} events</span>
              {warnCount > 0 && <SeverityTag severity="warn" size="xs" />}
              {errorCount > 0 && <SeverityTag severity="error" size="xs" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <Field label="Suite" value={fmt(sa["suite.name"])} />
            <Field label="Total tests" value={fmt(sa["suite.total_tests"])} />
            <Field label="Device types" value={fmt(sa["suite.device_types"])} />
            <Field label="End reason" value={fmt(ea["session.end_reason"])} />
            <Field label="Students completed" value={fmt(ea["session.students_completed"])} />
            <Field label="Students skipped" value={fmt(ea["session.students_skipped"])} />
            <Field label="Tests saved" value={fmt(ea["session.tests_saved"])} />
            <Field label="Tests failed" value={fmt(ea["session.tests_failed"])} />
            <Field
              label="Duration"
              value={
                ea["session.duration_seconds"] != null
                  ? `${ea["session.duration_seconds"]}s`
                  : "—"
              }
            />
            <Field label="Started" value={new Date(startedAt).toLocaleString()} />
            <Field label="Ended" value={ended ? new Date(endedAt).toLocaleString() : "in progress / —"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {first.user_id && (
              <span>
                teacher:{" "}
                <Link
                  href={`/app-events?range=all&user=${first.user_id}`}
                  className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline"
                >
                  {first.user_id}
                </Link>
              </span>
            )}
            {first.org_id && (
              <span>
                org:{" "}
                <Link
                  href={`/organisations/${first.org_id}`}
                  className="font-mono text-foreground/80 hover:text-emerald-400 hover:underline"
                >
                  {first.org_id}
                </Link>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((event) => (
              <AppEventRow key={event.id} event={event} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function SessionTrailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const decoded = decodeURIComponent(sessionId)

  return (
    <>
      <TopBar title="Session Trail" />
      <div className="p-6 space-y-6">
        <div className="mb-2 flex items-center gap-3 text-sm">
          <Link href="/app-events" className="text-muted-foreground hover:underline">
            ← Back to App Events
          </Link>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          }
        >
          <SessionTrail sessionId={decoded} />
        </Suspense>
      </div>
    </>
  )
}
