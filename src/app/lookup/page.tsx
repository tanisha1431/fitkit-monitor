import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { lookupByUuid, isUuid, getInvocationSteps } from "@/lib/queries/functions"
import {
  StatusTag,
  CategoryTag,
  ErrorCategoryTag,
} from "@/components/shared/EdgeFunctionTags"
import type { EdgeFunctionLog } from "@/types"
import Link from "next/link"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

function CompactRow({ log }: { log: EdgeFunctionLog }) {
  const failed = log.status === "failed" || log.status === "boot_failure"
  const steps = getInvocationSteps(log)
  return (
    <Link
      href={`/functions/${encodeURIComponent(log.function_name)}?exec=${log.execution_id ?? ""}`}
      className={`block rounded-md border px-4 py-3 hover:bg-accent/30 ${
        failed ? "border-red-500/30 bg-red-500/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusTag status={log.status} size="xs" />
        <CategoryTag category={log.category} size="xs" />
        {failed && log.error_category && (
          <ErrorCategoryTag category={log.error_category} size="xs" />
        )}
        <span className="font-mono">{log.function_name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(log.timestamp).toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">HTTP {log.status_code ?? "—"}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
        </span>
        <span className="text-sm text-muted-foreground">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground/70">
          {log.execution_id?.slice(0, 8) ?? ""}
        </span>
      </div>
      {failed && (log.error_step || log.error_message) && (
        <div className="mt-1.5 text-sm text-red-300/90">
          {log.error_step && <span className="font-mono">↳ {log.error_step}</span>}
          {log.error_message && (
            <span className="ml-2 break-words">{log.error_message}</span>
          )}
        </div>
      )}
    </Link>
  )
}

async function LookupResults({ q }: { q: string }) {
  if (!q) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Paste an execution_id, user_id, or org_id (UUID) to find invocations.
          </p>
        </CardContent>
      </Card>
    )
  }
  if (!isUuid(q)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{q}</span> is not a valid UUID.
          </p>
        </CardContent>
      </Card>
    )
  }

  const result = await lookupByUuid(q, 50)

  const nothingMatched =
    !result.byExecution && result.byUser.length === 0 && result.byOrg.length === 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm">
            Lookup for <span className="font-mono">{q}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            execution_id: {result.byExecution ? "1 match" : "no match"} · user_id:{" "}
            {result.byUser.length} · org_id: {result.byOrg.length}
          </p>
        </CardContent>
      </Card>

      {nothingMatched && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No invocations found for this UUID in the last 30 days. (Logs rotate after 30
              days.)
            </p>
          </CardContent>
        </Card>
      )}

      {result.byExecution && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matched execution_id</CardTitle>
          </CardHeader>
          <CardContent>
            <CompactRow log={result.byExecution} />
          </CardContent>
        </Card>
      )}

      {result.byUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Invocations for user_id {q.slice(0, 8)}… ({result.byUser.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.byUser.map((log) => (
                <CompactRow key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result.byOrg.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Invocations for org_id {q.slice(0, 8)}… ({result.byOrg.length})
              </CardTitle>
              <Link
                href={`/organisations/${q}`}
                className="text-sm text-muted-foreground hover:text-emerald-400 hover:underline"
              >
                Open org page →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.byOrg.map((log) => (
                <CompactRow key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""

  return (
    <>
      <TopBar title="Lookup" />
      <div className="p-6 space-y-6">
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          }
        >
          <LookupResults q={query} />
        </Suspense>
      </div>
    </>
  )
}
