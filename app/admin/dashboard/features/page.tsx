import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function FeaturesPage() {
  const supabase = await createClient()

  const [connectResult, marketplaceResult, epkResult, musicResult] = await Promise.all([
    supabase.from("connect_sessions").select("id", { count: "exact", head: true }),
    supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
    supabase.from("artist_epk_settings").select("id", { count: "exact", head: true }),
    supabase.from("artist_music").select("id", { count: "exact", head: true }),
  ])

  const items = [
    {
      name: "In-person Connect",
      href: "/admin/dashboard/connect",
      count: connectResult.count || 0,
      hasError: Boolean(connectResult.error),
    },
    {
      name: "Marketplace",
      href: "/admin/dashboard/marketplace/orders",
      count: marketplaceResult.count || 0,
      hasError: Boolean(marketplaceResult.error),
    },
    {
      name: "EPK",
      href: "/admin/dashboard/epk",
      count: epkResult.count || 0,
      hasError: Boolean(epkResult.error),
    },
    {
      name: "Music",
      href: "/admin/dashboard/music",
      count: musicResult.count || 0,
      hasError: Boolean(musicResult.error),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature Operations"
        subtitle="Feature readiness and usage signals across core platform modules."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Card key={item.name} className="border-slate-700 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm text-slate-300">
                <span>{item.name}</span>
                <Badge variant={item.hasError ? "destructive" : "default"}>
                  {item.hasError ? "degraded" : "healthy"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold text-white">{item.count}</p>
              <p className="text-xs text-slate-400">records observed</p>
              <Button asChild size="sm" variant="outline" className="w-full border-slate-700 text-slate-200">
                <Link href={item.href}>Open module</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}