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

// --- Severity (info | warn | error) ----------------------------------------

const SEVERITY_STYLES: Record<string, { dot: string; ring: string }> = {
  info: { dot: "bg-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  warn: { dot: "bg-yellow-400", ring: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  error: { dot: "bg-red-400", ring: "border-red-500/40 bg-red-500/10 text-red-300" },
}

const FALLBACK_SEVERITY = { dot: "bg-zinc-400", ring: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" }

export function SeverityTag({
  severity,
  size = "sm",
}: {
  severity: string | null | undefined
  size?: TagSize
}) {
  const s = (severity ?? "").toLowerCase()
  const style = SEVERITY_STYLES[s] ?? FALLBACK_SEVERITY
  return (
    <Tag className={style.ring} size={size}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {severity || "—"}
    </Tag>
  )
}

// Left-border tint for a row, keyed by severity (matches the steps list look).
const SEVERITY_TINT: Record<string, string> = {
  error: "bg-red-500/10 border-l-2 border-red-500",
  warn: "bg-yellow-500/10 border-l-2 border-yellow-500",
}

export function severityTint(severity: string | null | undefined): string {
  return SEVERITY_TINT[(severity ?? "").toLowerCase()] ?? "border-l-2 border-transparent"
}

// --- Event type -------------------------------------------------------------
// 21-value closed enum grouped into families for color + filtering.

export interface EventGroup {
  key: string
  label: string
  color: string
  types: string[] // full event_type values
}

export const EVENT_GROUPS: EventGroup[] = [
  {
    key: "session",
    label: "Session",
    color: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    types: ["test_lifecycle.session_started", "test_lifecycle.session_ended"],
  },
  {
    key: "student",
    label: "Student",
    color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    types: [
      "test_lifecycle.student_scanned",
      "test_lifecycle.student_test_started",
      "test_lifecycle.student_skipped",
      "test_lifecycle.student_completed",
    ],
  },
  {
    key: "test",
    label: "Test",
    color: "border-teal-500/40 bg-teal-500/10 text-teal-300",
    types: ["test_lifecycle.test_data_received", "test_lifecycle.test_skipped"],
  },
  {
    key: "sync",
    label: "Sync",
    color: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    types: [
      "test_lifecycle.result_saved_locally",
      "test_lifecycle.result_synced_to_server",
      "test_lifecycle.result_sync_failed",
      "test_lifecycle.background_sync_completed",
    ],
  },
  {
    key: "device",
    label: "Device",
    color: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    types: [
      "test_lifecycle.device_config_sent",
      "test_lifecycle.device_command_failed",
      "test_lifecycle.data_conversion_failed",
    ],
  },
  {
    key: "ble",
    label: "BLE / Protocol",
    color: "border-pink-500/40 bg-pink-500/10 text-pink-300",
    types: [
      "test_lifecycle.ble_listener_race_averted",
      "test_lifecycle.ble_listener_leak_detected",
      "test_lifecycle.protocol_multiple_frames_in_buffer",
      "test_lifecycle.protocol_non_zero_flags",
      "test_lifecycle.protocol_duplicate_detected",
    ],
  },
  {
    key: "http",
    label: "HTTP",
    color: "border-red-500/40 bg-red-500/10 text-red-300",
    types: ["http_error"],
  },
]

const EVENT_META: Record<string, { short: string; color: string; group: string }> = (() => {
  const map: Record<string, { short: string; color: string; group: string }> = {}
  for (const g of EVENT_GROUPS) {
    for (const t of g.types) {
      map[t] = {
        short: t.replace("test_lifecycle.", ""),
        color: g.color,
        group: g.label,
      }
    }
  }
  return map
})()

export function eventShortName(eventType: string): string {
  return EVENT_META[eventType]?.short ?? eventType.replace("test_lifecycle.", "")
}

export function EventTypeTag({
  eventType,
  size = "sm",
}: {
  eventType: string
  size?: TagSize
}) {
  const meta = EVENT_META[eventType]
  const color = meta?.color ?? "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
  return (
    <Tag className={cn("font-mono", color)} size={size}>
      {meta?.short ?? eventType}
    </Tag>
  )
}

// --- Device type ------------------------------------------------------------

export function DeviceTag({
  deviceType,
  size = "sm",
}: {
  deviceType: string | null | undefined
  size?: TagSize
}) {
  if (!deviceType) return null
  return (
    <Tag className="border-sky-500/40 bg-sky-500/10 text-sky-300" size={size}>
      {deviceType}
    </Tag>
  )
}
