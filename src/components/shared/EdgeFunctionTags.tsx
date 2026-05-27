import { cn } from "@/lib/utils"

type TagSize = "xs" | "sm"

function Tag({
  children,
  className,
  size = "sm",
}: {
  children: React.ReactNode
  className?: string
  size?: TagSize
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap",
        size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_STYLES: Record<string, { dot: string; ring: string; label: string }> = {
  success: {
    dot: "bg-emerald-400",
    ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    label: "success",
  },
  failed: {
    dot: "bg-red-400",
    ring: "border-red-500/40 bg-red-500/10 text-red-300",
    label: "failed",
  },
  boot_failure: {
    dot: "bg-fuchsia-400",
    ring: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300",
    label: "boot_failure",
  },
}

const FALLBACK_STATUS = {
  dot: "bg-zinc-400",
  ring: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
}

export function StatusTag({
  status,
  size = "sm",
}: {
  status: string | null | undefined
  size?: TagSize
}) {
  const s = (status ?? "").toLowerCase()
  const style = STATUS_STYLES[s] ?? { ...FALLBACK_STATUS, label: status ?? "—" }
  return (
    <Tag className={style.ring} size={size}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {STATUS_STYLES[s]?.label ?? (status || "—")}
    </Tag>
  )
}

const CATEGORY_STYLES: Record<string, string> = {
  report: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  app: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  consent: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  ops: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  webhook: "border-orange-500/40 bg-orange-500/10 text-orange-300",
}

export function CategoryTag({
  category,
  size = "sm",
}: {
  category: string | null | undefined
  size?: TagSize
}) {
  if (!category) return null
  const style = CATEGORY_STYLES[category.toLowerCase()] ?? "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
  return (
    <Tag className={style} size={size}>
      {category}
    </Tag>
  )
}

const ERROR_CATEGORY_STYLES: Record<string, string> = {
  validation_error: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  custom_error: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  db_error: "border-red-500/40 bg-red-500/10 text-red-300",
  unhandled_error: "border-red-600/50 bg-red-600/15 text-red-200",
  auth_error: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  not_found: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  rate_limit: "border-pink-500/40 bg-pink-500/10 text-pink-300",
}

export function ErrorCategoryTag({
  category,
  size = "sm",
}: {
  category: string | null | undefined
  size?: TagSize
}) {
  if (!category) return null
  const key = category.toLowerCase()
  const style = ERROR_CATEGORY_STYLES[key] ?? "border-red-500/40 bg-red-500/10 text-red-300"
  return (
    <Tag className={style} size={size}>
      {category}
    </Tag>
  )
}

const STEP_LEVEL_DOT: Record<string, string> = {
  error: "bg-red-400",
  warn: "bg-yellow-400",
  info: "bg-emerald-400",
  debug: "bg-zinc-400",
}

export function StepLevelDot({ level }: { level: string | undefined }) {
  const cls = STEP_LEVEL_DOT[(level ?? "info").toLowerCase()] ?? "bg-emerald-400"
  return <span className={cn("h-2 w-2 rounded-full", cls)} aria-hidden />
}

const STEP_LEVEL_TINT: Record<string, string> = {
  error: "bg-red-500/10 border-l-2 border-red-500",
  warn: "bg-yellow-500/10 border-l-2 border-yellow-500",
}

export function stepLevelTint(level: string | undefined): string {
  return STEP_LEVEL_TINT[(level ?? "").toLowerCase()] ?? "border-l-2 border-transparent"
}
