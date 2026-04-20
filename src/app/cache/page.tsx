import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CachePage() {
  return (
    <>
      <TopBar title="Cache Monitor" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redis Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon — Upstash REST API stats (memory, keys, daily requests),
              cache hit rate trend, leaderboard cache status table, and manual refresh button.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
