import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConsentPage() {
  return (
    <>
      <TopBar title="Consent Pipeline" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consent Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon — Funnel visualization (Sent → Delivered → Approved / Rejected / Bounced),
              students pending &gt; 7 days, bounced emails table, and org filters.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
