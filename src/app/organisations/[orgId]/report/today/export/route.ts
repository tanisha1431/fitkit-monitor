import { getOrgDetail } from "@/lib/queries/organisations"

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params

  // Optional ?date=YYYY-MM-DD selects which day's tested students to export;
  // defaults to today inside getOrgDetail when omitted/invalid.
  const dateParam = new URL(request.url).searchParams.get("date") ?? undefined
  const onDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined

  // Large page size returns the entire tested list for the day in one slice.
  const detail = await getOrgDetail(orgId, 1, 1_000_000, { testedToday: true, onDate })
  if (!detail) {
    return new Response("Organisation not found", { status: 404 })
  }

  // Sort class-wise, then by section and roll number within each class.
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
    "Tests Done",
    "Total Tests",
    "Completed Today",
    "Tests Remaining",
  ]

  const rows = students.map(s =>
    [
      classKey(s.std),
      s.div,
      s.rollNo,
      s.name,
      s.testsDone,
      s.totalTests,
      s.doneTodayTests.join("; "),
      s.pendingTests.join("; "),
    ]
      .map(csvCell)
      .join(","),
  )

  const csv = [header.join(","), ...rows].join("\n")
  const safeName = detail.org.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  const dateSuffix = onDate ?? "today"

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}_tested_${dateSuffix}.csv"`,
    },
  })
}
