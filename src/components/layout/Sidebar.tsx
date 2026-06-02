"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity,
  BarChart3,
  Building2,
  Mail,
  Zap,
  Smartphone,
  AlertTriangle,
  Database,
  ScrollText,
  Search,
} from "lucide-react"

const navItems = [
  { href: "/", label: "System Health", icon: Activity },
  { href: "/overview", label: "Business Overview", icon: BarChart3 },
  { href: "/organisations", label: "Organisations", icon: Building2 },
  { href: "/consent", label: "Consent Pipeline", icon: Mail },
  { href: "/functions", label: "Edge Functions", icon: Zap },
  { href: "/app-events", label: "App Events", icon: Smartphone },
  { href: "/errors", label: "Errors", icon: AlertTriangle },
  { href: "/cache", label: "Cache Monitor", icon: Database },
  { href: "/lookup", label: "Lookup", icon: Search },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Activity className="h-6 w-6 text-emerald-500" />
        <div>
          <h1 className="text-sm font-bold leading-none">FitKit</h1>
          <p className="text-xs text-muted-foreground">Mission Control</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
