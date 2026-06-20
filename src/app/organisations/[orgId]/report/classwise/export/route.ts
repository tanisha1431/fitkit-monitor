import { getOrgDetail, type StudentFilters } from "@/lib/queries/organisations"

export const dynamic = "force-dynamic"

function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  // Quote if the value contains a comma, quote, or newline; escape inner quotes.
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function classKey(std: unknown) {
  return std !== null && std !== undefined && String(std) !== "" ? String(std) : "—"
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
    testedToday: url.searchParams.get("tested") === "today",
  }

  // Page size large enough to return the entire filtered list in one slice.
  const detail = await getOrgDetail(orgId, 1, 1_000_000, filters)
  if (!detail) {
    return new Response("Organisation not found", { status: 404 })
  }

  // Sort class-wise, then by section and roll number within each class so the
  // export reads like a stack of class registers.
  const students = [...detail.studentList].sort((a, b) => {
    const ca = classKey(a.std)
    const cb = classKey(b.std)
    const na = Number(ca)
    const nb = Number(cb)
    const clsCmp =
      !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : ca.localeCompare(cb)
    if (clsCmp !== 0) return clsCmp
    const divCmp = String(a.div ?? "").localeCompare(String(b.div ?? ""))
    if (divCmp !== 0) return divCmp
    const ra = Number(a.rollNo)
    const rb = Number(b.rollNo)
    if (!Number.isNaN(ra) && !Number.isNaN(rb)) return ra - rb
    return String(a.rollNo ?? "").localeCompare(String(b.rollNo ?? ""))
  })

  const header = [
    "Class",
    "Section",
    "Roll No",
    "Name",
    "Gender",
    "Tests Done",
    "Total Tests",
    "Completion",
    "Tests Completed",
    "Tests Remaining",
    "Last Active",
    "Consent",
  ]

  const rows = students.map(s =>
    [
      classKey(s.std),
      s.div,
      s.rollNo,
      s.name,
      s.gender,
      s.testsDone,
      s.totalTests,
      s.completionStatus,
      s.doneTests.join("; "),
      s.pendingTests.join("; "),
      s.lastActive ?? "",
      consentLabels[s.consentStatus] ?? s.consentStatus,
    ]
      .map(csvCell)
      .join(","),
  )

  const csv = [header.join(","), ...rows].join("\n")
  const safeName = detail.org.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  const classSuffix = filters.std ? `_class_${filters.std}` : "_classwise"

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}${classSuffix}.csv"`,
    },
  })
}
