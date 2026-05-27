import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/shared/KPICard"
import { Skeleton } from "@/components/ui/skeleton"
import { getCacheHitRate } from "@/lib/queries/functions"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

const CACHED_FUNCTION = "test-leaderboard"

async function CacheContent() {
  const { totals, buckets } = await getCacheHitRate(CACHED_FUNCTION, 24)
  const maxBucketTotal = buckets.reduce((m, b) => (b.total > m ? b.total : m), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Cache Requests (24h)"
          value={totals.total.toLocaleString()}
          subLabel={CACHED_FUNCTION}
        />
        <KPICard
          label="Hit Rate"
          value={`${totals.hitRate}%`}
          subLabel={`${totals.hits.toLocaleString()} hits`}
        />
        <KPICard
          label="Miss Rate"
          value={totals.total > 0
            ? `${Number((100 - totals.hitRate).toFixed(1))}%`
            : "—"}
          subLabel={`${totals.misses.toLocaleString()} misses`}
        />
        <KPICard
          label="Buckets"
          value={buckets.length}
          subLabel="Hourly samples"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Hit rate by hour — last 24h ({CACHED_FUNCTION})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cache observations in the last 24 hours.
            </p>
          ) : (
            <div className="space-y-1.5">
              {buckets.map(b => {
                const widthPct = maxBucketTotal > 0
                  ? Math.max(2, Math.round((b.total / maxBucketTotal) * 100))
                  : 0
                const hitPct = b.total > 0
                  ? Math.round((b.hits / b.total) * 100)
                  : 0
                const label = new Date(b.hour).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                })
                return (
                  <div key={b.hour} className="flex items-center gap-3 text-xs">
                    <span className="w-[110px] shrink-0 text-muted-foreground tabular-nums">
                      {label}
                    </span>
                    <div
                      className="relative h-4 overflow-hidden rounded bg-foreground/5"
                      style={{ width: `${widthPct}%`, minWidth: "40px" }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-500/70"
                        style={{ width: `${hitPct}%` }}
                      />
                    </div>
                    <span className="w-[60px] shrink-0 text-right tabular-nums text-foreground/80">
                      {b.hitRate}%
                    </span>
                    <span className="w-[80px] shrink-0 text-right tabular-nums text-muted-foreground">
                      {b.total.toLocaleString()} req
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About cache_hit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only functions with cached responses populate{" "}
            <span className="font-mono">cache_hit</span>. Currently{" "}
            <span className="font-mono">{CACHED_FUNCTION}</span> is the sole consumer.
            Rows where <span className="font-mono">cache_hit</span> is null are excluded from this view.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CachePage() {
  return (
    <>
      <TopBar title="Cache Monitor" />
      <div className="p-6 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          }
        >
          <CacheContent />
        </Suspense>
      </div>
    </>
  )
}
