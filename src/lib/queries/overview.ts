import { supabase } from '@/lib/supabase'

export async function getOverviewKPIs(dateFrom?: string, dateTo?: string) {
  const now = new Date().toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const from = dateFrom || weekAgo
  const to = dateTo || now

  const [studentsRes, testsRes, orgsRes, newStudentsRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('scores_overview').select('id', { count: 'exact', head: true })
      .gte('created_at', from).lte('created_at', to),
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true })
      .gte('created_at', from).lte('created_at', to),
  ])

  return {
    totalStudents: studentsRes.count ?? 0,
    testsPerformed: testsRes.count ?? 0,
    totalOrgs: orgsRes.count ?? 0,
    newStudents: newStudentsRes.count ?? 0,
  }
}

export async function getConsentStats(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('consent_requests')
    .select('email_status, approved_at, rejected_at')

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data } = await query
  if (!data) return { sent: 0, delivered: 0, approved: 0, rejected: 0, bounced: 0, complained: 0 }

  return {
    sent: data.length,
    delivered: data.filter(r => r.email_status === 'delivered' || r.approved_at || r.rejected_at).length,
    approved: data.filter(r => r.approved_at).length,
    rejected: data.filter(r => r.rejected_at).length,
    bounced: data.filter(r => r.email_status === 'bounced').length,
    complained: data.filter(r => r.email_status === 'complained').length,
  }
}

export async function getTestsPerDay(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('scores_overview')
    .select('created_at')
    .order('created_at', { ascending: true })

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data } = await query

  if (!data) return []

  const grouped: Record<string, number> = {}
  data.forEach(row => {
    const day = new Date(row.created_at!).toISOString().split('T')[0]
    grouped[day] = (grouped[day] || 0) + 1
  })

  return Object.entries(grouped).map(([date, count]) => ({ date, count }))
}

export async function getStudentsPerDay(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('users')
    .select('created_at')
    .order('created_at', { ascending: true })

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data } = await query

  if (!data) return []

  const grouped: Record<string, number> = {}
  data.forEach(row => {
    const day = new Date(row.created_at!).toISOString().split('T')[0]
    grouped[day] = (grouped[day] || 0) + 1
  })

  return Object.entries(grouped).map(([date, count]) => ({ date, count }))
}
