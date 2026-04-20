import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "online" | "degraded" | "offline" | "active" | "low_activity" | "inactive"
  label?: string
}

const statusConfig = {
  online: { color: "bg-emerald-500", text: "Online" },
  degraded: { color: "bg-yellow-500", text: "Degraded" },
  offline: { color: "bg-red-500", text: "Offline" },
  active: { color: "bg-emerald-500", text: "Active" },
  low_activity: { color: "bg-yellow-500", text: "Low Activity" },
  inactive: { color: "bg-red-500", text: "Inactive" },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("h-2 w-2 rounded-full", config.color)} />
      {label ?? config.text}
    </span>
  )
}
