import { supabase } from '@/lib/supabase'

export interface OrgListItem {
  id: string
  name: string
  type: string
  totalStudents: number
  testedStudents: number
  testedPercent: number
  lastActivity: string | null
  consentRate: number
  status: 'active' | 'low_activity' | 'inactive'
}

// PostgREST caps each request at 1000 rows. Get the total count once, then fetch
// every page concurrently so aggregates are computed over all rows without paying
// for dozens of sequential round trips.
async function fetchAllRows<T>(
  build: () => ReturnType<typeof supabase.from>,
  columns: string,
): Promise<T[]> {
  const pageSize = 1000
  const { count, error: countError } = await build()
    .select(columns, { count: 'exact', head: true })
  if (countError) throw countError
  if (!count) return []

  const pageCount = Math.ceil(count / pageSize)
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => {
      const from = page * pageSize
      return build()
        .select(columns)
        .range(from, from + pageSize - 1)
        .then(({ data, error }) => {
          if (error) throw error
          return (data ?? []) as T[]
        })
    }),
  )
  return pages.flat()
}

export async function getOrgList(): Promise<OrgListItem[]> {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, type')
    .order('name')

  if (!orgs || orgs.length === 0) return []

  // Bulk-fetch each table once, then aggregate in memory. Previously this looped
  // per-org running ~6 queries each (including a full consent_requests scan every
  // iteration), which took 13-18s and broke the RSC stream ("Connection closed").
  const [users, scores, consents] = await Promise.all([
    fetchAllRows<{ id: string; organization_id: string | null }>(
      () => supabase.from('users'),
      'id, organization_id',
    ),
    fetchAllRows<{ user_id: string | null; created_at: string | null }>(
      () => supabase.from('scores_overview'),
      'user_id, created_at',
    ),
    fetchAllRows<{ user_id: string | null; approved_at: string | null }>(
      () => supabase.from('consent_requests'),
      'user_id, approved_at',
    ),
  ])

  // user -> org lookup, and per-org student counts
  const userToOrg = new Map<string, string>()
  const totalByOrg = new Map<string, number>()
  for (const u of users) {
    if (!u.organization_id) continue
    userToOrg.set(u.id, u.organization_id)
    totalByOrg.set(u.organization_id, (totalByOrg.get(u.organization_id) ?? 0) + 1)
  }

  // tested students (distinct users with a score) and last activity per org
  const testedByOrg = new Map<string, Set<string>>()
  const lastActivityByOrg = new Map<string, string>()
  for (const s of scores) {
    if (!s.user_id) continue
    const orgId = userToOrg.get(s.user_id)
    if (!orgId) continue
    let set = testedByOrg.get(orgId)
    if (!set) testedByOrg.set(orgId, (set = new Set()))
    set.add(s.user_id)
    if (s.created_at) {
      const prev = lastActivityByOrg.get(orgId)
      if (!prev || s.created_at > prev) lastActivityByOrg.set(orgId, s.created_at)
    }
  }

  // consent totals/approvals per org
  const consentTotalByOrg = new Map<string, number>()
  const consentApprovedByOrg = new Map<string, number>()
  for (const c of consents) {
    if (!c.user_id) continue
    const orgId = userToOrg.get(c.user_id)
    if (!orgId) continue
    consentTotalByOrg.set(orgId, (consentTotalByOrg.get(orgId) ?? 0) + 1)
    if (c.approved_at) {
      consentApprovedByOrg.set(orgId, (consentApprovedByOrg.get(orgId) ?? 0) + 1)
    }
  }

  const now = Date.now()

  return orgs.map(org => {
    const totalStudents = totalByOrg.get(org.id) ?? 0
    const testedStudents = testedByOrg.get(org.id)?.size ?? 0
    const lastActivity = lastActivityByOrg.get(org.id) ?? null
    const totalConsents = consentTotalByOrg.get(org.id) ?? 0
    const approvedCount = consentApprovedByOrg.get(org.id) ?? 0

    const daysSinceActivity = lastActivity
      ? (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    return {
      id: org.id,
      name: org.name,
      type: org.type,
      totalStudents,
      testedStudents,
      testedPercent: totalStudents > 0 ? Math.round((testedStudents / totalStudents) * 100) : 0,
      lastActivity,
      consentRate: totalConsents > 0 ? Math.round((approvedCount / totalConsents) * 100) : 0,
      status: daysSinceActivity <= 7 ? 'active' : daysSinceActivity <= 30 ? 'low_activity' : 'inactive',
    }
  })
}

export interface StudentFilters {
  std?: string
  div?: string
  status?: 'complete' | 'partial' | 'none'
  testedToday?: boolean
  // Restrict the "tested today" / "done today" window to a specific calendar day
  // (YYYY-MM-DD, server-local). Defaults to today when omitted.
  onDate?: string
}

// Supabase encodes .in() filters into the request URL. A few thousand UUIDs blow
// past the URL length limit and the request silently returns zero rows (no error),
// which made every student in large orgs show 0 tests done. Chunk the ids — and
// page within each chunk past the 1000-row cap — to fetch them reliably.
async function fetchByUserIds<T>(
  table: string,
  columns: string,
  userIds: string[],
): Promise<T[]> {
  const idChunkSize = 150
  const pageSize = 1000
  const chunks: string[][] = []
  for (let i = 0; i < userIds.length; i += idChunkSize) {
    chunks.push(userIds.slice(i, i + idChunkSize))
  }

  const perChunk = await Promise.all(
    chunks.map(async chunk => {
      const rows: T[] = []
      for (let page = 0; ; page++) {
        const from = page * pageSize
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .in('user_id', chunk)
          .range(from, from + pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        rows.push(...(data as T[]))
        if (data.length < pageSize) break
      }
      return rows
    }),
  )
  return perChunk.flat()
}

export async function getOrgDetail(
  orgId: string,
  studentPage = 1,
  studentPageSize = 25,
  filters: StudentFilters = {},
) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('id', orgId)
    .single()

  if (!org) return null

  // Fetch teachers for this org
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, full_name, email_id, phone_number, role')
    .eq('organization_id', orgId)
    .order('full_name')

  // Paginate: the users query is otherwise capped at 1000 rows, hiding students
  // in large orgs (e.g. Udgam has 2000+).
  const userColumns =
    'id, name, report_access_key, is_consent_approved, guardian_email, gender, std, div, roll_no, created_at'
  type OrgUserRow = {
    id: string
    name: string | null
    report_access_key: string | null
    is_consent_approved: boolean | null
    guardian_email: string | null
    gender: string | null
    std: string | number | null
    div: string | number | null
    roll_no: string | number | null
    created_at: string | null
  }
  const users: OrgUserRow[] = []
  for (let page = 0; ; page++) {
    const from = page * 1000
    const { data, error } = await supabase
      .from('users')
      .select(userColumns)
      .eq('organization_id', orgId)
      .order('name')
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    users.push(...(data as unknown as OrgUserRow[]))
    if (data.length < 1000) break
  }

  const userIds = users.map(u => u.id)

  type ScoreRow = {
    user_id: string | null
    test_id: string | null
    test_config_id: string | null
    created_at: string | null
  }
  type ConsentRow = Record<string, unknown> & {
    user_id: string | null
    approved_at: string | null
    rejected_at: string | null
    email_status: string | null
  }

  // Scores and consents are independent, so fetch them concurrently. Both are
  // chunked (see fetchByUserIds) because a single .in() over thousands of ids
  // overflows the request URL and silently returns nothing.
  const [scores, consents] = userIds.length > 0
    ? await Promise.all([
        fetchByUserIds<ScoreRow>(
          'scores_overview',
          'user_id, test_id, test_config_id, created_at',
          userIds,
        ),
        fetchByUserIds<ConsentRow>('consent_requests', '*', userIds),
      ])
    : [[] as ScoreRow[], [] as ConsentRow[]]

  // Activity counts
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Day window for the "tested today" / "done today" figures. When a specific
  // date is requested, bound it to that calendar day [start, nextDayStart);
  // otherwise default to today with an open-ended upper bound (unchanged behaviour).
  let dayStart = todayStart
  let dayEnd: string | null = null
  if (filters.onDate) {
    const [y, m, d] = filters.onDate.split('-').map(Number)
    if (y && m && d) {
      dayStart = new Date(y, m - 1, d).toISOString()
      dayEnd = new Date(y, m - 1, d + 1).toISOString()
    }
  }
  const inDayWindow = (createdAt: string) =>
    createdAt >= dayStart && (dayEnd === null || createdAt < dayEnd)

  const todayScores = scores.filter(s => s.created_at && inDayWindow(s.created_at))
  const weekScores = scores.filter(s => s.created_at && s.created_at >= weekAgo)

  const testedTodayUsers = new Set(
    todayScores.map(s => s.user_id).filter((v): v is string => !!v),
  )
  const studentsToday = testedTodayUsers.size
  const studentsWeek = new Set(weekScores.map(s => s.user_id)).size
  const studentsSeason = new Set(scores.map(s => s.user_id)).size

  const consentFunnel = {
    sent: consents?.length ?? 0,
    delivered: consents?.filter(c => c.email_status === 'delivered' || c.approved_at || c.rejected_at).length ?? 0,
    approved: consents?.filter(c => c.approved_at).length ?? 0,
    rejected: consents?.filter(c => c.rejected_at).length ?? 0,
    bounced: consents?.filter(c => c.email_status === 'bounced').length ?? 0,
  }

  // Get test configs assigned to this org: organization_test_suites → test_suite_tests → test_configurations
  const { data: orgSuites } = await supabase
    .from('organization_test_suites')
    .select('test_suite_id')
    .eq('organization_id', orgId)

  const suiteIds = orgSuites?.map(s => s.test_suite_id).filter(Boolean) as string[] ?? []

  let assignedTestConfigIds: string[] = []
  if (suiteIds.length > 0) {
    const { data: suiteTests } = await supabase
      .from('test_suite_tests')
      .select('test_config_id')
      .in('test_suite_id', suiteIds)

    assignedTestConfigIds = (suiteTests ?? []).map(t => t.test_config_id).filter(Boolean) as string[]
  }
  const assignedTests = Array.from(new Set(assignedTestConfigIds))
  const totalTests = assignedTests.length
  const assignedSet = new Set(assignedTests)

  // Human-readable test names for the per-test breakdown (the one extra query).
  const { data: testConfigs } = assignedTests.length > 0
    ? await supabase
        .from('test_configurations')
        .select('id, display_name')
        .in('id', assignedTests)
    : { data: [] }
  const testNameById = new Map<string, string>(
    (testConfigs ?? []).map(c => [c.id as string, (c.display_name as string) ?? 'Untitled test']),
  )

  // Assigned tests in a stable, name-sorted order, so each student's done/pending
  // lists read consistently.
  const assignedTestsOrdered = assignedTests
    .map(id => ({ id, name: testNameById.get(id) ?? 'Untitled test' }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Per-user set of *assigned* tests completed, plus last activity — built once so
  // the student list, completion summary, and per-test breakdown all reuse it.
  const completedByUser = new Map<string, Set<string>>()
  const completedTodayByUser = new Map<string, Set<string>>()
  const lastActiveByUser = new Map<string, string>()
  for (const s of scores) {
    if (!s.user_id) continue
    if (s.test_config_id && assignedSet.has(s.test_config_id)) {
      let set = completedByUser.get(s.user_id)
      if (!set) completedByUser.set(s.user_id, (set = new Set()))
      set.add(s.test_config_id)
      if (s.created_at && inDayWindow(s.created_at)) {
        let todaySet = completedTodayByUser.get(s.user_id)
        if (!todaySet) completedTodayByUser.set(s.user_id, (todaySet = new Set()))
        todaySet.add(s.test_config_id)
      }
    }
    if (s.created_at) {
      const prev = lastActiveByUser.get(s.user_id)
      if (!prev || s.created_at > prev) lastActiveByUser.set(s.user_id, s.created_at)
    }
  }

  const consentByUser = new Map<string, (typeof consents)[number]>()
  for (const c of consents) {
    if (c.user_id && !consentByUser.has(c.user_id)) consentByUser.set(c.user_id, c)
  }

  const studentList = users.map(user => {
    const doneSet = completedByUser.get(user.id)
    const testsDone = doneSet?.size ?? 0
    const doneTests = assignedTestsOrdered.filter(t => doneSet?.has(t.id)).map(t => t.name)
    const pendingTests = assignedTestsOrdered.filter(t => !doneSet?.has(t.id)).map(t => t.name)

    const todaySet = completedTodayByUser.get(user.id)
    const doneTodayTests = assignedTestsOrdered.filter(t => todaySet?.has(t.id)).map(t => t.name)

    const userConsent = consentByUser.get(user.id)
    let consentStatus: 'approved' | 'rejected' | 'pending' | 'bounced' | 'none' = 'none'
    if (userConsent?.approved_at) consentStatus = 'approved'
    else if (userConsent?.rejected_at) consentStatus = 'rejected'
    else if (userConsent?.email_status === 'bounced') consentStatus = 'bounced'
    else if (userConsent) consentStatus = 'pending'

    const completionStatus: 'complete' | 'partial' | 'none' =
      totalTests > 0 && testsDone >= totalTests ? 'complete' : testsDone > 0 ? 'partial' : 'none'

    return {
      id: user.id,
      name: user.name,
      reportAccessKey: user.report_access_key,
      gender: user.gender,
      std: user.std,
      div: user.div,
      rollNo: user.roll_no,
      testsDone,
      totalTests,
      completionStatus,
      doneTests,
      pendingTests,
      doneTodayTests,
      testedToday: testedTodayUsers.has(user.id),
      lastActive: lastActiveByUser.get(user.id) ?? null,
      consentStatus,
    }
  })

  const availableClasses = Array.from(
    new Set(studentList.map(s => s.std).filter((v): v is string | number => v !== null && v !== undefined && v !== "")),
  )
    .map(v => String(v))
    .sort((a, b) => {
      const na = Number(a)
      const nb = Number(b)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })

  const availableSections = Array.from(
    new Set(studentList.map(s => s.div).filter((v): v is string | number => v !== null && v !== undefined && v !== "")),
  )
    .map(v => String(v))
    .sort((a, b) => a.localeCompare(b))

  const filteredStudentList = studentList.filter(s => {
    if (filters.std && String(s.std ?? "") !== filters.std) return false
    if (filters.div && String(s.div ?? "") !== filters.div) return false
    if (filters.status && s.completionStatus !== filters.status) return false
    if (filters.testedToday && !s.testedToday) return false
    return true
  })

  // Completion summary + per-test breakdown reflect the current filters, so the
  // headline numbers always match the student list below them.
  const completionSummary = {
    total: filteredStudentList.length,
    complete: filteredStudentList.filter(s => s.completionStatus === 'complete').length,
    partial: filteredStudentList.filter(s => s.completionStatus === 'partial').length,
    none: filteredStudentList.filter(s => s.completionStatus === 'none').length,
  }

  const filteredUserIds = new Set(filteredStudentList.map(s => s.id))
  const perTest = assignedTests
    .map(testId => {
      let completed = 0
      for (const [uid, set] of completedByUser) {
        if (filteredUserIds.has(uid) && set.has(testId)) completed++
      }
      return {
        id: testId,
        name: testNameById.get(testId) ?? 'Untitled test',
        completed,
        total: completionSummary.total,
      }
    })
    .sort((a, b) => b.completed - a.completed)

  // Per-class breakdown spans every class (ignores the class/section filter) so it
  // doubles as an at-a-glance overview of where each cohort stands.
  const perClassMap = new Map<string, { total: number; complete: number }>()
  for (const s of studentList) {
    const cls = s.std !== null && s.std !== undefined && String(s.std) !== "" ? String(s.std) : "—"
    const entry = perClassMap.get(cls) ?? { total: 0, complete: 0 }
    entry.total++
    if (s.completionStatus === 'complete') entry.complete++
    perClassMap.set(cls, entry)
  }
  const perClass = Array.from(perClassMap.entries())
    .map(([className, v]) => ({ className, total: v.total, complete: v.complete }))
    .sort((a, b) => {
      const na = Number(a.className)
      const nb = Number(b.className)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return a.className.localeCompare(b.className)
    })

  const totalStudentCount = filteredStudentList.length
  const totalStudentPages = Math.max(1, Math.ceil(totalStudentCount / studentPageSize))
  const from = (studentPage - 1) * studentPageSize
  const paginatedStudentList = filteredStudentList.slice(from, from + studentPageSize)

  return {
    org,
    teachers: teachers ?? [],
    totalStudents: users.length,
    studentsToday,
    studentsWeek,
    studentsSeason,
    consentFunnel,
    completionSummary,
    perTest,
    perClass,
    studentList: paginatedStudentList,
    totalStudentCount,
    totalStudentPages,
    studentPage,
    availableClasses,
    availableSections,
    activeFilters: filters,
  }
}
