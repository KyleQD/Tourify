import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface FollowRequestRow {
  id: string
  requester_id: string
  target_id: string
  status: string
  created_at: string
}

interface ConnectSessionRow {
  id: string
  status: string
  created_at: string
}

export default async function NetworkPage() {
  const supabase = await createClient()

  const [
    followsCountResult,
    followRequestsResult,
    connectSessionsResult,
  ] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }),
    supabase
      .from("follow_requests")
      .select("id, requester_id, target_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("connect_sessions")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const followRequests = (followRequestsResult.data || []) as FollowRequestRow[]
  const connectSessions = (connectSessionsResult.data || []) as ConnectSessionRow[]
  const followCount = followsCountResult.count || 0
  const pendingFollowRequests = followRequests.filter((request) => request.status === "pending").length
  const confirmedConnectSessions = connectSessions.filter((session) => session.status === "confirmed").length
  const activeConnectSessions = connectSessions.filter((session) => session.status === "active").length
  const hasAnyError =
    Boolean(followsCountResult.error) ||
    Boolean(followRequestsResult.error) ||
    Boolean(connectSessionsResult.error)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Network Operations"
        subtitle="Monitor follows, requests, and in-person connect conversion."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      {hasAnyError ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-6 text-sm text-amber-100">
            Some network datasets are unavailable. Confirm table access for `follows`, `follow_requests`, and `connect_sessions`.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Follows" value={followCount} />
        <MetricCard title="Pending requests" value={pendingFollowRequests} />
        <MetricCard title="Confirmed connect sessions" value={confirmedConnectSessions} />
        <MetricCard title="Active connect sessions" value={activeConnectSessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Recent follow requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {followRequests.length ? followRequests.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-700 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-300">
                    {item.requester_id.slice(0, 8)} {"->"} {item.target_id.slice(0, 8)}
                  </p>
                  <Badge variant={item.status === "pending" ? "secondary" : "default"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No follow requests available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Recent connect sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectSessions.length ? connectSessions.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-700 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-300">session {item.id.slice(0, 8)}</p>
                  <Badge variant={item.status === "confirmed" ? "default" : "secondary"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No connect sessions available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-slate-700 bg-slate-900/60">
      <CardHeader>
        <CardTitle className="text-sm text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold text-white">{value}</CardContent>
    </Card>
  )
}