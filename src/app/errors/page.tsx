import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ErrorsPage() {
  return (
    <>
      <TopBar title="Error Log" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon — Unified error view from function_logs (status = failed) and Sentry API.
              Filters by function name, org, and date range. Error frequency charts.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
