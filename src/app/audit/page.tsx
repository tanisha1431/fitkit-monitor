import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuditPage() {
  return (
    <>
      <TopBar title="Audit Log" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon — Unified chronological feed of all platform events:
              new students, consent events, test results, and function errors.
              Filterable by org, event type, and date range. CSV export.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
