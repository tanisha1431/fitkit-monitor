"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface ReportDatePickerProps {
  // Currently selected date (YYYY-MM-DD).
  value: string
  // Latest date that can be selected (YYYY-MM-DD) — defaults to no max.
  max?: string
}

export function ReportDatePicker({ value, max }: ReportDatePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set("date", next)
    else params.delete("date")
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Date</label>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
      />
    </div>
  )
}
