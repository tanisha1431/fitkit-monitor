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
import { Suspense } from "react"
import Link from "next/link"
import { getRecentErrors, getErrorsByStep } from "@/lib/queries/functions"
import { StatusTag, ErrorCategoryTag } from "@/components/shared/EdgeFunctionTags"

export const dynamic = "force-dynamic"

const RANGES: Record<string, { hours: number; label: string }> = {
  "24h": { hours: 24, label: "Last 24h" },
  "7d": { hours: 24 * 7, label: "Last 7d" },
  "30d": { hours: 24 * 30, label: "Last 30d" },
}

function rangeKey(value: string | undefined): keyof typeof RANGES {
  if (value && value in RANGES) return value as keyof typeof RANGES
  return "7d"
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type ErrorsParams = {
  range: keyof typeof RANGES
  fn?: string
  cat?: string
  user?: string
  org?: string
}

function buildHref(p: Partial<ErrorsParams> & { clear?: boolean }) {
  if (p.clear) return "/errors"
  const sp = new URLSearchParams()
  if (p.range && p.range !== "7d") sp.set("range", p.range)
  if (p.fn) sp.set("fn", p.fn)
  if (p.cat) sp.set("cat", p.cat)
  if (p.user) sp.set("user", p.user)
  if (p.org) sp.set("org", p.org)
  const qs = sp.toString()
  return qs ? `/errors?${qs}` : "/errors"
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

async function ErrorsContent({ params }: { params: ErrorsParams }) {
  const hours = RANGES[params.range].hours
  const [errors, byStep] = await Promise.all([
    getRecentErrors({
      hours,
      functionName: params.fn,
      errorCategory: params.cat,
      userId: params.user,
      orgId: params.org,
      limit: 200,
    }),
    getErrorsByStep(hours),
  ])

  const categories = Array.from(
    new Set(byStep.map((b) => b.error_category).filter((c): c is string => Boolean(c))),
  ).sort()

  const anyFilter = params.fn || params.cat || params.user || params.org

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Range</span>
              {(Object.keys(RANGES) as Array<keyof typeof RANGES>).map((k) => (
                <FilterPill
                  key={k}
                  active={params.range === k}
                  href={buildHref({ ...params, range: k })}
                >
                  {RANGES[k].label}
                </FilterPill>
              ))}
            </div>
            {categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Category
                </span>
                <FilterPill
                  active={!params.cat}
                  href={buildHref({ ...params, cat: undefined })}
                >
                  All
                </FilterPill>
                {categories.map((c) => (
                  <FilterPill
                    key={c}
                    active={params.cat === c}
                    href={buildHref({ ...params, cat: c })}
                  >
                    {c}
                  </FilterPill>
                ))}
              </div>
            )}
          </div>
          <form action="/errors" method="get" className="flex flex-wrap items-center gap-2">
            {params.range !== "7d" && <input type="hidden" name="range" value={params.range} />}
            {params.cat && <input type="hidden" name="cat" value={params.cat} />}
            <input
              type="text"
              name="fn"
              defaultValue={params.fn ?? ""}
              placeholder="function name"
              className="h-9 flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
            />
            <input
              type="text"
              name="user"
              defaultValue={params.user ?? ""}
              placeholder="user_id (UUID)"
              className="h-9 flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
            />
            <input
              type="text"
              name="org"
              defaultValue={params.org ?? ""}
              placeholder="org_id (UUID)"
              className="h-9 flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-accent/30 px-3 text-sm hover:bg-accent"
            >
              Apply
            </button>
            {anyFilter && (
              <Link
                href={buildHref({ range: params.range })}
                className="h-9 inline-flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent"
              >
                Clear filters
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top failure points — {RANGES[params.range].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byStep.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Error Step</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStep.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Link
                        href={buildHref({ ...params, fn: row.function_name })}
                        className="font-mono text-sm hover:underline hover:text-emerald-400"
                      >
                        {row.function_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.error_step ?? "—"}</TableCell>
                    <TableCell>
                      {row.error_category ? (
                        <Link
                          href={buildHref({ ...params, cat: row.error_category })}
                          className="hover:opacity-80"
                        >
                          <ErrorCategoryTag category={row.error_category} size="xs" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{row.count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimeAgo(row.lastSeen)}
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
          <CardTitle className="text-base">
            Recent errors ({errors.length})
            {anyFilter && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {[params.fn, params.cat, params.user && `user:${params.user.slice(0, 8)}`, params.org && `org:${params.org.slice(0, 8)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching errors.</p>
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <Link
                  key={err.id}
                  href={`/functions/${encodeURIComponent(err.function_name)}?exec=${err.execution_id ?? ""}`}
                  className="block rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 hover:bg-red-500/10"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusTag status={err.status ?? "failed"} size="xs" />
                    <span className="font-mono">{err.function_name}</span>
                    {err.error_category && (
                      <ErrorCategoryTag category={err.error_category} size="xs" />
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(err.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      HTTP {err.status_code ?? "—"}
                    </span>
                    {err.user_id && (
                      <span className="text-xs text-muted-foreground">
                        user:<span className="font-mono ml-1">{err.user_id.slice(0, 8)}</span>
                      </span>
                    )}
                    {err.org_id && (
                      <span className="text-xs text-muted-foreground">
                        org:<span className="font-mono ml-1">{err.org_id.slice(0, 8)}</span>
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs text-muted-foreground/60">
                      {err.execution_id?.slice(0, 8) ?? ""}
                    </span>
                  </div>
                  {(err.error_step || err.error_message) && (
                    <div className="mt-1.5 text-sm text-red-300/90">
                      {err.error_step && <span className="font-mono">↳ {err.error_step}</span>}
                      {err.error_message && (
                        <span className="ml-2 break-words">{err.error_message}</span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string
    fn?: string
    cat?: string
    user?: string
    org?: string
  }>
}) {
  const { range, fn, cat, user, org } = await searchParams
  const r = rangeKey(range)

  return (
    <>
      <TopBar title="Errors" />
      <div className="p-6 space-y-6">
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          }
        >
          <ErrorsContent
            params={{
              range: r,
              fn: fn?.trim() || undefined,
              cat: cat?.trim() || undefined,
              user: user?.trim() || undefined,
              org: org?.trim() || undefined,
            }}
          />
        </Suspense>
      </div>
    </>
  )
}
