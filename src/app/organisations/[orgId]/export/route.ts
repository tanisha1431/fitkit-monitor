import { getOrgDetail, type StudentFilters } from "@/lib/queries/organisations"

export const dynamic = "force-dynamic"

function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  // Quote if the value contains a comma, quote, or newline; escape inner quotes.
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

const consentLabels: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  bounced: "Bounced",
  none: "No Request",
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params
  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const filters: StudentFilters = {
    std: url.searchParams.get("std")?.trim() || undefined,
    div: url.searchParams.get("div")?.trim() || undefined,
    status:
      status === "complete" || status === "partial" || status === "none"
        ? status
        : undefined,
  }

  // Page size large enough to return the entire filtered list in one slice.
  const detail = await getOrgDetail(orgId, 1, 1_000_000, filters)
  if (!detail) {
    return new Response("Organisation not found", { status: 404 })
  }

  const header = [
    "Name",
    "Class",
    "Section",
    "Gender",
    "Roll No",
    "Tests Done",
    "Total Tests",
    "Completion",
    "Last Active",
    "Consent",
  ]

  const rows = detail.studentList.map(s =>
    [
      s.name,
      s.std,
      s.div,
      s.gender,
      s.rollNo,
      s.testsDone,
      s.totalTests,
      s.completionStatus,
      s.lastActive ?? "",
      consentLabels[s.consentStatus] ?? s.consentStatus,
    ]
      .map(csvCell)
      .join(","),
  )

  const csv = [header.join(","), ...rows].join("\n")
  const safeName = detail.org.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}_students.csv"`,
    },
  })
}
