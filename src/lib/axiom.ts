const AXIOM_TOKEN = process.env.AXIOM_TOKEN!
const AXIOM_ORG_ID = process.env.AXIOM_ORG_ID!
const AXIOM_DATASET = process.env.AXIOM_DATASET!

export async function queryAxiom(apl: string) {
  const res = await fetch(`https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AXIOM_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Axiom-Org-Id': AXIOM_ORG_ID,
    },
    body: JSON.stringify({ apl }),
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Axiom query failed: ${res.statusText}`)
  return res.json()
}

export async function checkAxiomHealth(): Promise<{ ok: boolean; lastEventTime?: string }> {
  try {
    const res = await fetch(`https://api.axiom.co/v1/datasets/${AXIOM_DATASET}`, {
      headers: {
        'Authorization': `Bearer ${AXIOM_TOKEN}`,
        'X-Axiom-Org-Id': AXIOM_ORG_ID,
      },
      next: { revalidate: 30 },
    })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return { ok: true, lastEventTime: data.lastEventTime }
  } catch {
    return { ok: false }
  }
}
