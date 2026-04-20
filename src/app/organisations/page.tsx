import { TopBar } from "@/components/layout/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { getOrgList } from "@/lib/queries/organisations"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "< 1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function OrgTable() {
  const orgs = await getOrgList()

  return (
    <Card>
      <CardContent className="pt-6">
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No organisations found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Tested</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Consent Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      href={`/organisations/${org.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {org.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{org.totalStudents}</TableCell>
                  <TableCell className="text-right">{org.testedPercent}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimeAgo(org.lastActivity)}
                  </TableCell>
                  <TableCell className="text-right">{org.consentRate}%</TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export default function OrganisationsPage() {
  return (
    <>
      <TopBar title="Organisations" />
      <div className="p-6">
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          }
        >
          <OrgTable />
        </Suspense>
      </div>
    </>
  )
}
