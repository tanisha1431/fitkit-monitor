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
import { ExternalLink } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"

export const dynamic = "force-dynamic"

const REPORTS_BASE_URL = process.env.FITKIT_REPORTS_URL

function buildStudentPageHref(orgId: string, page: number, std?: string, div?: string) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  if (std) params.set("std", std)
  if (div) params.set("div", div)
  return `/organisations/${orgId}?${params.toString()}`
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
}: {
  orgId: string
  studentPage: number
  stdFilter?: string
  divFilter?: string
}) {
  const detail = await getOrgDetail(orgId, studentPage, 25, { std: stdFilter, div: divFilter })
  if (!detail) notFound()

  const {
    org,
    teachers,
    totalStudents,
    studentsToday,
    studentsWeek,
    studentsSeason,
    consentFunnel,
    studentList,
    totalStudentCount,
    totalStudentPages,
    availableClasses,
    availableSections,
  } = detail

  const filtersActive = Boolean(stdFilter || divFilter)
  const studentsHeading = filtersActive
    ? `Students (${totalStudentCount} filtered)`
    : `Students (${totalStudentCount})`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-bold">{org.name}</h3>
        <Badge variant="outline" className="capitalize">{org.type}</Badge>
        <span className="text-sm text-muted-foreground">{totalStudents} students</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Students Tested Today" value={studentsToday} />
        <KPICard label="Students Tested This Week" value={studentsWeek} />
        <KPICard label="Students Tested This Season" value={studentsSeason} />
      </div>

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
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">{studentsHeading}</CardTitle>
          <StudentFilters
            availableClasses={availableClasses}
            availableSections={availableSections}
          />
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
                        <TableCell className="text-right">
                          {student.testsDone}/{student.totalTests}
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
                        href={buildStudentPageHref(orgId, studentPage - 1, stdFilter, divFilter)}
                        className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                      >
                        Previous
                      </Link>
                    )}
                    {studentPage < totalStudentPages && (
                      <Link
                        href={buildStudentPageHref(orgId, studentPage + 1, stdFilter, divFilter)}
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
  searchParams: Promise<{ page?: string; std?: string; div?: string }>
}) {
  const { orgId } = await params
  const { page: pageParam, std: stdParam, div: divParam } = await searchParams
  const studentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const stdFilter = stdParam?.trim() || undefined
  const divFilter = divParam?.trim() || undefined

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
          />
        </Suspense>
      </div>
    </>
  )
}
