import { TopBar } from "@/components/layout/TopBar"
import { KPICard } from "@/components/shared/KPICard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getOverviewKPIs, getConsentStats, getTestsPerDay, getStudentsPerDay } from "@/lib/queries/overview"
import { BarChartCard } from "@/components/charts/BarChartCard"
import { TimeFilter } from "@/components/shared/TimeFilter"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

function getDateRange(period: string) {
  const now = new Date()
  const to = now.toISOString()
  let from: string

  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      from = start.toISOString()
      break
    }
    case "yesterday": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      from = start.toISOString()
      return { from, to: end.toISOString() }
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      from = start.toISOString()
      break
    }
    case "season":
      from = new Date(now.getFullYear(), 0, 1).toISOString()
      break
    case "week":
    default:
      from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      break
  }

  return { from, to }
}

async function OverviewContent({ period }: { period: string }) {
  const { from, to } = getDateRange(period)

  const [kpis, consentStats, testsPerDay, studentsPerDay] = await Promise.all([
    getOverviewKPIs(from, to),
    getConsentStats(from, to),
    getTestsPerDay(from, to),
    getStudentsPerDay(from, to),
  ])

  const approvalRate = consentStats.sent > 0
    ? Math.round((consentStats.approved / consentStats.sent) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total Students" value={kpis.totalStudents} subLabel="All time" />
        <KPICard label="Tests Performed" value={kpis.testsPerformed} subLabel="Selected period" />
        <KPICard label="Total Organisations" value={kpis.totalOrgs} subLabel="All time" />
        <KPICard label="New Students" value={kpis.newStudents} subLabel="Selected period" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent Approval Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl font-bold">{approvalRate}%</span>
            <span className="text-sm text-muted-foreground">approved</span>
          </div>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: "Sent", value: consentStats.sent },
              { label: "Delivered", value: consentStats.delivered },
              { label: "Approved", value: consentStats.approved },
              { label: "Rejected", value: consentStats.rejected },
              { label: "Bounced", value: consentStats.bounced },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-semibold">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <BarChartCard title="Tests Performed Per Day (Selected Period)" data={testsPerDay} color="hsl(142, 71%, 45%)" />
        <BarChartCard title="New Students Per Day (Selected Period)" data={studentsPerDay} color="hsl(217, 91%, 60%)" />
      </div>
    </div>
  )
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = "week" } = await searchParams

  return (
    <>
      <TopBar title="Business Overview" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <TimeFilter />
        </div>
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
                ))}
              </div>
              <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
              </div>
            </div>
          }
        >
          <OverviewContent period={period} />
        </Suspense>
      </div>
    </>
  )
}
