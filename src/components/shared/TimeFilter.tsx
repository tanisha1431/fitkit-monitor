"use client"

import { useRouter, useSearchParams } from "next/navigation"

const periods = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "season", label: "This Season" },
]

export function TimeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get("period") || "week"

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("period", e.target.value)
        router.push(`?${params.toString()}`)
      }}
      className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
    >
      {periods.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  )
}
