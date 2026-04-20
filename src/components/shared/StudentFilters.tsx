"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface StudentFiltersProps {
  availableClasses: string[]
  availableSections: string[]
}

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"

export function StudentFilters({ availableClasses, availableSections }: StudentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStd = searchParams.get("std") ?? ""
  const currentDiv = searchParams.get("div") ?? ""

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("std")
    params.delete("div")
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  const hasActive = Boolean(currentStd || currentDiv)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Class</label>
        <select
          value={currentStd}
          onChange={(e) => updateParam("std", e.target.value)}
          className={selectClass}
        >
          <option value="">All classes</option>
          {availableClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Section</label>
        <select
          value={currentDiv}
          onChange={(e) => updateParam("div", e.target.value)}
          className={selectClass}
        >
          <option value="">All sections</option>
          {availableSections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="h-8 rounded-lg border border-input bg-transparent px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
