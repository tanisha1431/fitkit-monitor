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

  const { data: users } = await supabase
    .from('users')
    .select('id, name, report_access_key, is_consent_approved, guardian_email, gender, std, div, roll_no, created_at')
    .eq('organization_id', orgId)
    .order('name')

  const userIds = users?.map(u => u.id) ?? []

  // Get scores for these users
  const { data: scores } = userIds.length > 0
    ? await supabase
        .from('scores_overview')
        .select('user_id, test_id, test_config_id, created_at')
        .in('user_id', userIds)
    : { data: [] }

  // Activity counts
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const todayScores = scores?.filter(s => s.created_at && s.created_at >= todayStart) ?? []
  const weekScores = scores?.filter(s => s.created_at && s.created_at >= weekAgo) ?? []

  const studentsToday = new Set(todayScores.map(s => s.user_id)).size
  const studentsWeek = new Set(weekScores.map(s => s.user_id)).size
  const studentsSeason = new Set((scores ?? []).map(s => s.user_id)).size

  // Consent funnel
  const { data: consents } = userIds.length > 0
    ? await supabase.from('consent_requests').select('*').in('user_id', userIds)
    : { data: [] }

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
  const totalTests = new Set(assignedTestConfigIds).size

  const studentList = (users ?? []).map(user => {
    const userScores = scores?.filter(s => s.user_id === user.id) ?? []
    const assignedSet = new Set(assignedTestConfigIds)
    const uniqueTests = new Set(
      userScores.map(s => s.test_config_id).filter(id => assignedSet.has(id))
    ).size
    const lastScore = userScores.sort((a, b) =>
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    )[0]

    const userConsent = consents?.find(c => c.user_id === user.id)
    let consentStatus: 'approved' | 'rejected' | 'pending' | 'bounced' | 'none' = 'none'
    if (userConsent?.approved_at) consentStatus = 'approved'
    else if (userConsent?.rejected_at) consentStatus = 'rejected'
    else if (userConsent?.email_status === 'bounced') consentStatus = 'bounced'
    else if (userConsent) consentStatus = 'pending'

    return {
      id: user.id,
      name: user.name,
      reportAccessKey: user.report_access_key,
      gender: user.gender,
      std: user.std,
      div: user.div,
      rollNo: user.roll_no,
      testsDone: uniqueTests,
      totalTests,
      lastActive: lastScore?.created_at ?? null,
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
    return true
  })

  const totalStudentCount = filteredStudentList.length
  const totalStudentPages = Math.max(1, Math.ceil(totalStudentCount / studentPageSize))
  const from = (studentPage - 1) * studentPageSize
  const paginatedStudentList = filteredStudentList.slice(from, from + studentPageSize)

  return {
    org,
    teachers: teachers ?? [],
    totalStudents: users?.length ?? 0,
    studentsToday,
    studentsWeek,
    studentsSeason,
    consentFunnel,
    studentList: paginatedStudentList,
    totalStudentCount,
    totalStudentPages,
    studentPage,
    availableClasses,
    availableSections,
    activeFilters: filters,
  }
}
