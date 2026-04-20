import { Card, CardContent } from "@/components/ui/card"

interface KPICardProps {
  label: string
  value: string | number
  subLabel?: string
}

export function KPICard({ label, value, subLabel }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
      </CardContent>
    </Card>
  )
}
