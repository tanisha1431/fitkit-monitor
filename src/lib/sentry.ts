const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN!
const SENTRY_ORG = process.env.SENTRY_ORG!
const SENTRY_PROJECT = process.env.SENTRY_PROJECT!

export interface SentryIssue {
  id: string
  title: string
  culprit: string
  count: string
  firstSeen: string
  lastSeen: string
  level: string
}

export async function getSentryIssues(): Promise<{ ok: boolean; issues: SentryIssue[] }> {
  try {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=is:unresolved`,
      {
        headers: { 'Authorization': `Bearer ${SENTRY_TOKEN}` },
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return { ok: false, issues: [] }
    const issues = await res.json()
    return { ok: true, issues }
  } catch {
    return { ok: false, issues: [] }
  }
}
