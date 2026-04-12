import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ListingRow {
  id: string
  title: string | null
  category: string | null
  product_type: string | null
  status: string | null
  created_at: string
}

export default async function StorePage() {
  const supabase = await createClient()
  const [listingResult, orderCountResult] = await Promise.all([
    supabase
      .from("marketplace_listings")
      .select("id, title, category, product_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("marketplace_orders")
      .select("id", { count: "exact", head: true }),
  ])

  const listings = (listingResult.data || []) as ListingRow[]
  const publishedCount = listings.filter((listing) => listing.status === "published").length
  const draftCount = listings.filter((listing) => listing.status === "draft").length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Store Management"
        subtitle="Track listing health and marketplace order volume."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      {(listingResult.error || orderCountResult.error) ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-6 text-sm text-amber-100">
            Some marketplace datasets are unavailable. Verify access to `marketplace_listings` and `marketplace_orders`.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Listings" value={listings.length} />
        <MetricCard title="Published" value={publishedCount} />
        <MetricCard title="Drafts" value={draftCount} />
        <MetricCard title="Orders" value={orderCountResult.count || 0} />
      </div>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Recent listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listings.length ? listings.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">{listing.title || "Untitled listing"}</p>
                <p className="text-xs text-slate-400">
                  {listing.category || "category: n/a"} - {listing.product_type || "type: n/a"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={listing.status === "published" ? "default" : "secondary"}>
                  {listing.status || "unknown"}
                </Badge>
                <p className="text-xs text-slate-400">{new Date(listing.created_at).toLocaleString()}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No listings available.</p>
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