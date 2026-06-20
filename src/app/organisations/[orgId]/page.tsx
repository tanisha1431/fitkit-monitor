import { TopBar } from "@/components/layout/TopBar"
import { KPICard } from "@/components/shared/KPICard"
import { StudentFilters } from "@/components/shared/StudentFilters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrgDetail } from "@/lib/queries/organisations"
import { getOrgFunctionActivity } from "@/lib/queries/functions"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, Download, CalendarCheck } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"

export const dynamic = "force-dynamic"

const REPORTS_BASE_URL = process.env.FITKIT_REPORTS_URL

function buildStudentPageHref(
  orgId: string,
  page: number,
  std?: string,
  div?: string,
  status?: string,
  tested?: string,
) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  if (std) params.set("std", std)
  if (div) params.set("div", div)
  if (status) params.set("status", status)
  if (tested) params.set("tested", tested)
  return `/organisations/${orgId}?${params.toString()}`
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "< 1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const consentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  pending: { label: "Pending", variant: "secondary" },
  bounced: { label: "Bounced", variant: "destructive" },
  none: { label: "No Request", variant: "outline" },
}

async function OrgFunctionActivitySection({ orgId }: { orgId: string }) {
  const activity = await getOrgFunctionActivity(orgId, 24 * 7)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edge Function Activity — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No edge function invocations tagged to this org in the last 7 days.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead className="text-right">Invocations</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
                <TableHead className="text-right">Avg ms</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((row) => (
                <TableRow key={row.function_name}>
                  <TableCell>
                    <Link
                      href={`/functions/${encodeURIComponent(row.function_name)}`}
                      className="font-mono text-xs hover:underline hover:text-emerald-400"
                    >
                      {row.function_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.invocations}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.errors}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.errorRate}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.avgDuration || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimeAgo(row.lastSeen)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        row.errorRate > 10
                          ? "offline"
                          : row.errorRate > 2
                          ? "degraded"
                          : "online"
                      }
                      label={
                        row.errorRate > 10
                          ? "Critical"
                          : row.errorRate > 2
                          ? "Warning"
                          : "Healthy"
                      }
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

async function OrgDetailContent({
  orgId,
  studentPage,
  stdFilter,
  divFilter,
  statusFilter,
  testedFilter,
}: {
  orgId: string
  studentPage: number
  stdFilter?: string
  divFilter?: string
  statusFilter?: "complete" | "partial" | "none"
  testedFilter?: "today"
}) {
  const detail = await getOrgDetail(orgId, studentPage, 25, {
    std: stdFilter,
    div: divFilter,
    status: statusFilter,
    testedToday: testedFilter === "today",
  })
  if (!detail) notFound()

  const {
    org,
    teachers,
    totalStudents,
    studentsToday,
    studentsWeek,
    studentsSeason,
    consentFunnel,
    completionSummary,
    perTest,
    perClass,
    studentList,
    totalStudentCount,
    totalStudentPages,
    availableClasses,
    availableSections,
  } = detail

  const filtersActive = Boolean(stdFilter || divFilter || statusFilter || testedFilter)
  const studentsHeading = filtersActive
    ? `Students (${totalStudentCount} filtered)`
    : `Students (${totalStudentCount})`

  const exportParams = new URLSearchParams()
  if (stdFilter) exportParams.set("std", stdFilter)
  if (divFilter) exportParams.set("div", divFilter)
  if (statusFilter) exportParams.set("status", statusFilter)
  if (testedFilter) exportParams.set("tested", testedFilter)
  const exportHref = `/organisations/${orgId}/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`

  const summaryTotal = completionSummary.total

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-bold">{org.name}</h3>
        <Badge variant="outline" className="capitalize">{org.type}</Badge>
        <span className="text-sm text-muted-foreground">{totalStudents} students</span>
      </div>

      {/* Test completion summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Test Completion</CardTitle>
          <span className="text-sm text-muted-foreground">
            {summaryTotal.toLocaleString()} student{summaryTotal === 1 ? "" : "s"}
            {filtersActive ? " (filtered)" : ""}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500"
              style={{ width: `${pct(completionSummary.complete, summaryTotal)}%` }}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${pct(completionSummary.partial, summaryTotal)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Fully tested{" "}
              <span className="font-semibold">{completionSummary.complete.toLocaleString()}</span>
              <span className="text-muted-foreground">
                ({pct(completionSummary.complete, summaryTotal)}%)
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              In progress{" "}
              <span className="font-semibold">{completionSummary.partial.toLocaleString()}</span>
              <span className="text-muted-foreground">
                ({pct(completionSummary.partial, summaryTotal)}%)
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              Not started{" "}
              <span className="font-semibold">{completionSummary.none.toLocaleString()}</span>
              <span className="text-muted-foreground">
                ({pct(completionSummary.none, summaryTotal)}%)
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <KPICard
          label="Tested Today"
          value={`${studentsToday.toLocaleString()} / ${totalStudents.toLocaleString()}`}
          subLabel={`${pct(studentsToday, totalStudents)}% of students`}
        />
        <KPICard
          label="Tested This Week"
          value={`${studentsWeek.toLocaleString()} / ${totalStudents.toLocaleString()}`}
          subLabel={`${pct(studentsWeek, totalStudents)}% of students`}
        />
        <KPICard
          label="Tested All-time"
          value={`${studentsSeason.toLocaleString()} / ${totalStudents.toLocaleString()}`}
          subLabel={`${pct(studentsSeason, totalStudents)}% of students`}
        />
      </div>

      {/* Per-test breakdown */}
      {perTest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion by Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {perTest.map((test) => (
              <div key={test.id} className="flex items-center gap-4">
                <span className="w-48 shrink-0 truncate text-sm" title={test.name}>
                  {test.name}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct(test.completed, test.total)}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {test.completed.toLocaleString()} / {test.total.toLocaleString()} (
                  {pct(test.completed, test.total)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-class breakdown */}
      {perClass.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Fully Tested</TableHead>
                  <TableHead className="w-1/3">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perClass.map((row) => (
                  <TableRow key={row.className}>
                    <TableCell className="font-medium">{row.className}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.complete.toLocaleString()} ({pct(row.complete, row.total)}%)
                    </TableCell>
                    <TableCell>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${pct(row.complete, row.total)}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Teachers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No teachers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{teacher.email_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{teacher.phone_number || "—"}</TableCell>
                    <TableCell>
                      {teacher.role ? (
                        <Badge variant="outline" className="capitalize text-xs">{teacher.role}</Badge>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edge function activity for this org */}
      <Suspense fallback={null}>
        <OrgFunctionActivitySection orgId={orgId} />
      </Suspense>

      {/* Consent Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {[
              { label: "Sent", value: consentFunnel.sent, color: "text-blue-400" },
              { label: "Delivered", value: consentFunnel.delivered, color: "text-cyan-400" },
              { label: "Approved", value: consentFunnel.approved, color: "text-emerald-400" },
              { label: "Rejected", value: consentFunnel.rejected, color: "text-red-400" },
              { label: "Bounced", value: consentFunnel.bounced, color: "text-orange-400" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-4">
                <div className="text-center">
                  <p className={`text-xl font-bold ${step.color}`}>{step.value}</p>
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground">&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">{studentsHeading}</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <StudentFilters
              availableClasses={availableClasses}
              availableSections={availableSections}
            />
            <Link
              href={`/organisations/${orgId}/report/today`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Today&apos;s Report
            </Link>
            <a
              href={exportHref}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {studentList.length === 0 && studentPage === 1 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filtersActive
                ? "No students match the selected filters."
                : "No students in this organisation."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead className="text-right">Tests Done</TableHead>
                    <TableHead>Tests Remaining</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentList.map((student) => {
                    const config = consentStatusConfig[student.consentStatus]
                    const classLabel = student.std
                      ? `${student.std}${student.div ? `-${student.div}` : ""}`
                      : "—"
                    const reportUrl = `${REPORTS_BASE_URL}/${student.reportAccessKey}/tests/overview`

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          <a
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-emerald-400 transition-colors"
                          >
                            {student.name}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{classLabel}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.gender || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.rollNo ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${
                                  student.completionStatus === "complete"
                                    ? "bg-emerald-500"
                                    : student.completionStatus === "partial"
                                    ? "bg-amber-500"
                                    : "bg-transparent"
                                }`}
                                style={{ width: `${pct(student.testsDone, student.totalTests)}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-sm tabular-nums">
                              {student.testsDone}/{student.totalTests}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {student.completionStatus === "complete" ? (
                            <span className="text-xs text-emerald-400">All done</span>
                          ) : student.completionStatus === "none" ? (
                            <span className="text-xs text-muted-foreground">
                              Not started — all {student.totalTests} pending
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {student.pendingTests.map((name) => (
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
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(student.lastActive)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalStudentPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {studentPage} of {totalStudentPages} ({totalStudentCount} students)
                  </p>
                  <div className="flex gap-2">
                    {studentPage > 1 && (
                      <Link
                        href={buildStudentPageHref(orgId, studentPage - 1, stdFilter, divFilter, statusFilter, testedFilter)}
                        className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                      >
                        Previous
                      </Link>
                    )}
                    {studentPage < totalStudentPages && (
                      <Link
                        href={buildStudentPageHref(orgId, studentPage + 1, stdFilter, divFilter, statusFilter, testedFilter)}
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
        </CardContent>
      </Card>
    </div>
  )
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ page?: string; std?: string; div?: string; status?: string; tested?: string }>
}) {
  const { orgId } = await params
  const { page: pageParam, std: stdParam, div: divParam, status: statusParam, tested: testedParam } = await searchParams
  const studentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const stdFilter = stdParam?.trim() || undefined
  const divFilter = divParam?.trim() || undefined
  const statusFilter =
    statusParam === "complete" || statusParam === "partial" || statusParam === "none"
      ? statusParam
      : undefined
  const testedFilter = testedParam === "today" ? testedParam : undefined

  return (
    <>
      <TopBar title="Organisation Detail" />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/organisations" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to Organisations
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
                ))}
              </div>
              <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
              <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
          }
        >
          <OrgDetailContent
            orgId={orgId}
            studentPage={studentPage}
            stdFilter={stdFilter}
            divFilter={divFilter}
            statusFilter={statusFilter}
            testedFilter={testedFilter}
          />
        </Suspense>
      </div>
    </>
  )
}
