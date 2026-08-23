import Link from "next/link"
import { Building2, MapPin, Search, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import { DirectoryControls } from "./directory-controls"

/**
 * VEN-278/279/280/281/282/283/284 — Venue directory.
 *
 * Server-rendered shell + results: the initial grid paints from a DB query
 * using URL search params (shareable/indexable). Only published venues appear;
 * cards link via STORED url_slug; no fabricated ratings — the star block only
 * renders when real review data exists.
 */

interface DirectoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

async function loadDirectory(params: Record<string, string>) {
  const supabase = await createClient()
  const offset = Math.max((params.page ? parseInt(params.page, 10) - 1 : 0) * PAGE_SIZE, 0)

  let query = supabase
    .from("venue_profiles")
    .select(
      "id, venue_name, url_slug, description, city, state, capacity, venue_types, avatar_url, verification_status",
      { count: "exact", head: false },
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const q = params.q?.trim()
  if (q) {
    query = query.or(`venue_name.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%`)
  }
  if (params.type) query = query.contains("venue_types", [params.type])
  if (params.city) query = query.ilike("city", `%${params.city}%`)
  if (params.min_capacity) {
    const cap = parseInt(params.min_capacity, 10)
    if (!Number.isNaN(cap)) query = query.gte("capacity", cap)
  }

  const { data, count, error } = await query
  return { venues: data ?? [], total: count ?? data?.length ?? 0, error }
}

export default async function VenuesDirectoryPage({ searchParams }: DirectoryPageProps) {
  const raw = await searchParams
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, first(v)]))

  const { venues, total } = await loadDirectory(params)
  const page = Math.max(parseInt(params.page || "1", 10) || 1, 1)
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-bold">Discover Venues</h1>
          <p className="mb-8 text-xl text-green-100">Find the perfect venue for your next event</p>
          <form action="/venues" method="get" className="relative mx-auto max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            {/* Progressive enhancement: works without JS; island enhances it. */}
            <Input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Search venues by name, city, or description..."
              className="border-white/20 bg-white/10 py-3 pl-10 pr-4 text-white placeholder-gray-300 focus:bg-white/20"
            />
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <DirectoryControls total={total} page={page} totalPages={totalPages} params={params} />

        {venues.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-4 h-16 w-16 text-gray-500" />
            <h3 className="mb-2 text-xl font-semibold text-gray-300">No venues found</h3>
            <p className="text-gray-400">
              {params.q
                ? `No published venues match "${params.q}". Try a different search term.`
                : "No published venues are currently available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => {
              // VEN-280: stored url_slug is the canonical link; id is last resort.
              const href = `/venues/${encodeURIComponent(venue.url_slug || venue.id)}`
              return (
                <Link key={venue.id} href={href} className="group block">
                  <Card className="cursor-pointer border-gray-700 bg-gray-800 transition-colors hover:border-green-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">
                            {venue.avatar_url ? (
                              <img src={venue.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              venue.venue_name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-lg text-white transition-colors group-hover:text-green-400">
                              {venue.venue_name}
                            </CardTitle>
                            {(venue.city || venue.state) && (
                              <div className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                                <MapPin className="h-3 w-3" />
                                <span>{[venue.city, venue.state].filter(Boolean).join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {venue.verification_status === "verified" && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="mb-4 line-clamp-2 text-sm text-gray-300">
                        {venue.description || "No description available."}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {venue.capacity && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{venue.capacity.toLocaleString()}</span>
                            </div>
                          )}
                          {/* VEN-284: no rating is shown unless real review data exists. */}
                        </div>
                        <div className="flex gap-1">
                          {(venue.venue_types ?? []).slice(0, 2).map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="border-green-600/30 bg-green-600/20 text-xs text-green-400"
                            >
                              {type}
                            </Badge>
                          ))}
                          {(venue.venue_types ?? []).length > 2 && (
                            <Badge variant="outline" className="border-gray-600 text-xs text-gray-400">
                              +{(venue.venue_types ?? []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
