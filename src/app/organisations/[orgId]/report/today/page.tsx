import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrgDetail } from "@/lib/queries/organisations"
import { ReportDatePicker } from "@/components/shared/ReportDatePicker"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download } from "lucide-react"

export const dynamic = "force-dynamic"

// Local-time YYYY-MM-DD for a given date (the report's day windows are server-local).
function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Validate an incoming ?date= value, falling back to today.
function resolveDate(raw: string | undefined): string {
  const today = toDateKey(new Date())
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today
  // Don't allow future dates — there is no data past today.
  return raw > today ? today : raw
}

type ReportStudent = Awaited<ReturnType<typeof getOrgDetail>> extends infer T
  ? T extends { studentList: Array<infer S> }
    ? S
    : never
  : never

function classKey(std: unknown) {
  return std !== null && std !== undefined && String(std) !== "" ? String(std) : "—"
}

function sortRollNo(a: unknown, b: unknown) {
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return String(a ?? "").localeCompare(String(b ?? ""))
}

async function TodayReportContent({ orgId, date }: { orgId: string; date: string }) {
  // Large page size returns the full tested list for the day in one slice.
  const detail = await getOrgDetail(orgId, 1, 1_000_000, { testedToday: true, onDate: date })
  if (!detail) notFound()

  const { org, studentList } = detail
  const students = studentList as ReportStudent[]

  // Group tested-today students by class, then sort within each class by
  // section and roll number so the report reads like a class register.
  const byClass = new Map<string, ReportStudent[]>()
  for (const s of students) {
    const key = classKey(s.std)
    const list = byClass.get(key) ?? []
    list.push(s)
    byClass.set(key, list)
  }
  const classes = Array.from(byClass.entries())
    .map(([className, list]) => ({
      className,
      students: list.sort((a, b) => {
        const divCmp = String(a.div ?? "").localeCompare(String(b.div ?? ""))
        if (divCmp !== 0) return divCmp
        return sortRollNo(a.rollNo, b.rollNo)
      }),
    }))
    .sort((a, b) => {
      const na = Number(a.className)
      const nb = Number(b.className)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return a.className.localeCompare(b.className)
    })

  const isToday = date === toDateKey(new Date())
  const [dy, dm, dd] = date.split("-").map(Number)
  const dateLabel = new Date(dy, dm - 1, dd).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{org.name} — Testing Report</h3>
          <p className="text-sm text-muted-foreground">
            {dateLabel} · {students.length} student{students.length === 1 ? "" : "s"} tested{" "}
            {isToday ? "today" : "on this date"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportDatePicker value={date} max={toDateKey(new Date())} />
          <a
            href={`/organisations/${orgId}/report/today/export?date=${date}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No students were tested {isToday ? "today" : "on this date"} in this organisation.
          </CardContent>
        </Card>
      ) : (
        classes.map(({ className, students: classStudents }) => (
          <Card key={className}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base">Class {className}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {classStudents.length} student{classStudents.length === 1 ? "" : "s"}
              </span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Completed Today</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.div ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.rollNo ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {s.testsDone}/{s.totalTests}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {s.doneTodayTests.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.doneTodayTests.map((name) => (
                              <Badge
                                key={name}
                                variant="outline"
                                className="border-emerald-500/40 text-emerald-300 text-[10px] font-normal"
                              >
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {s.pendingTests.length === 0 ? (
                          <span className="text-xs text-emerald-400">All done</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.pendingTests.map((name) => (
                              <Badge
                                key={name}
                                variant="outline"
                                className="border-amber-500/40 text-amber-300 text-[10px] font-normal"
                              >
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

export default async function TodayReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { orgId } = await params
  const { date: dateParam } = await searchParams
  const date = resolveDate(dateParam)

  return (
    <>
      <TopBar title="Testing Report" />
      <div className="p-6">
        <div className="mb-4">
          <Link
            href={`/organisations/${orgId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to Organisation
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-8 w-80" />
              <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
              <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
          }
        >
          <TodayReportContent key={date} orgId={orgId} date={date} />
        </Suspense>
      </div>
    </>
  )
}
