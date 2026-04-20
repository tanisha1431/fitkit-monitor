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

export async function getOrgList(): Promise<OrgListItem[]> {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, type')
    .order('name')

  if (!orgs) return []

  const results: OrgListItem[] = []

  for (const org of orgs) {
    const [usersRes, scoresRes, consentRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('scores_overview').select('user_id, created_at').eq('user_id', org.id), // need to join through users
      supabase.from('consent_requests').select('user_id, approved_at')
    ])

    // Get users for this org
    const { data: orgUsers } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', org.id)

    const userIds = orgUsers?.map(u => u.id) ?? []
    const totalStudents = userIds.length

    // Get tested students
    let testedStudents = 0
    let lastActivity: string | null = null
    if (userIds.length > 0) {
      const { data: scores } = await supabase
        .from('scores_overview')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (scores && scores.length > 0) {
        testedStudents = new Set(scores.map(s => s.user_id)).size
        lastActivity = scores[0].created_at
      }

      // Consent rate
      const { data: consents } = await supabase
        .from('consent_requests')
        .select('approved_at')
        .in('user_id', userIds)

      const approvedCount = consents?.filter(c => c.approved_at).length ?? 0
      const totalConsents = consents?.length ?? 0

      const now = Date.now()
      const lastActivityTime = lastActivity ? new Date(lastActivity).getTime() : 0
      const daysSinceActivity = lastActivity ? (now - lastActivityTime) / (1000 * 60 * 60 * 24) : Infinity

      results.push({
        id: org.id,
        name: org.name,
        type: org.type,
        totalStudents,
        testedStudents,
        testedPercent: totalStudents > 0 ? Math.round((testedStudents / totalStudents) * 100) : 0,
        lastActivity,
        consentRate: totalConsents > 0 ? Math.round((approvedCount / totalConsents) * 100) : 0,
        status: daysSinceActivity <= 7 ? 'active' : daysSinceActivity <= 30 ? 'low_activity' : 'inactive',
      })
    } else {
      results.push({
        id: org.id,
        name: org.name,
        type: org.type,
        totalStudents: 0,
        testedStudents: 0,
        testedPercent: 0,
        lastActivity: null,
        consentRate: 0,
        status: 'inactive',
      })
    }
  }

  return results
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
