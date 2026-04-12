import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PublicProfileRow {
  id: string
  username: string | null
  full_name: string | null
  updated_at: string | null
}

export default async function WebsitePage() {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from("profiles")
    .select("id, username, full_name, updated_at", { count: "exact" })
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(20)

  const profiles = (data || []) as PublicProfileRow[]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Website Management"
        subtitle="Monitor public profile coverage and recent website-facing updates."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Public profiles</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-white">{count || 0}</CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Data status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={error ? "destructive" : "default"}>{error ? "degraded" : "healthy"}</Badge>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Public root</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
              <Link href="/">Open public site</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Recently updated public profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length ? profiles.map((profile) => (
            <div key={profile.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">{profile.full_name || "Unnamed profile"}</p>
                <p className="text-xs text-slate-400">@{profile.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">
                  {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "unknown update"}
                </p>
                {profile.username ? (
                  <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
                    <Link href={`/profile/${profile.username}`}>Preview</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No public profiles found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}