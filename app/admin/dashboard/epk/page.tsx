import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EpkSettingRow {
  id: string
  user_id: string
  is_public: boolean | null
  epk_slug: string | null
  updated_at: string | null
}

export default async function EPKPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("artist_epk_settings")
    .select("id, user_id, is_public, epk_slug, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30)

  const settings = (data || []) as EpkSettingRow[]
  const publicCount = settings.filter((item) => item.is_public).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="EPK Management"
        subtitle="Monitor published EPK coverage and recent EPK updates."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      {error ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-6 text-sm text-amber-100">
            Could not load EPK settings data. Verify access to `artist_epk_settings`.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="EPKs tracked" value={settings.length} />
        <MetricCard title="Public EPKs" value={publicCount} />
        <MetricCard title="Private EPKs" value={Math.max(settings.length - publicCount, 0)} />
      </div>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Recent EPK updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.length ? settings.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-100">user {item.user_id.slice(0, 8)}</p>
                <p className="text-xs text-slate-400">slug: {item.epk_slug || "(not set)"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.is_public ? "default" : "secondary"}>
                  {item.is_public ? "public" : "private"}
                </Badge>
                <p className="text-xs text-slate-400">
                  {item.updated_at ? new Date(item.updated_at).toLocaleString() : "unknown update"}
                </p>
                {item.epk_slug ? (
                  <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
                    <Link href={`/epk/${item.epk_slug}`}>Preview</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No EPK settings found.</p>
          )}
        </CardContent>
      </Card>
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