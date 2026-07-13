"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Music, Users2 } from "lucide-react"
import { toast } from "sonner"

import {
  EntityAccountPicker,
  type EntityAccountSelection,
} from "@/components/admin/operations-builder/entity-account-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildAdminHiringHref, buildAdminRosterHref, type AdminOpsContextParams } from "@/lib/admin/admin-ops-context"

interface EventPartiesPanelProps {
  eventId: string
  orgId?: string | null
  venueAccountId?: string | null
  venueName?: string | null
  artistAccountIds?: string[]
  employerParams?: AdminOpsContextParams
  onPartiesChanged?: () => void
}

function mapVenue(row: any): EntityAccountSelection {
  return {
    id: String(row.id || ""),
    label: row.name || row.venue_name || "Venue",
    meta: [row.city, row.state].filter(Boolean).join(", ") || undefined,
  }
}

function mapArtist(row: any): EntityAccountSelection {
  return {
    id: String(row.id || ""),
    label: row.name || row.display_name || "Artist",
    meta: row.location || undefined,
  }
}

function mapCrew(row: any): EntityAccountSelection {
  return {
    id: String(row.id || row.staff_member_id || ""),
    label: row.name || row.full_name || "Staff",
    meta: row.specialty || row.role || undefined,
  }
}

export function EventPartiesPanel({
  eventId,
  orgId,
  venueAccountId,
  venueName,
  artistAccountIds = [],
  employerParams = {},
  onPartiesChanged,
}: EventPartiesPanelProps) {
  const [venueSelected, setVenueSelected] = useState<EntityAccountSelection[]>(
    venueAccountId ? [{ id: venueAccountId, label: venueName || "Venue account" }] : []
  )
  const [artists, setArtists] = useState<EntityAccountSelection[]>(
    artistAccountIds.map((id) => ({ id, label: `Artist ${id.slice(0, 8)}…` }))
  )
  const [staff, setStaff] = useState<EntityAccountSelection[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setVenueSelected(venueAccountId ? [{ id: venueAccountId, label: venueName || "Venue account" }] : [])
  }, [venueAccountId, venueName])

  useEffect(() => {
    setArtists(artistAccountIds.map((id) => ({ id, label: `Artist ${id.slice(0, 8)}…` })))
  }, [artistAccountIds])

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      setIsSaving(true)
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to update parties")
        onPartiesChanged?.()
        toast.success("Parties updated")
      } catch (error: any) {
        toast.error(error?.message || "Failed to update parties")
      } finally {
        setIsSaving(false)
      }
    },
    [eventId, onPartiesChanged]
  )

  const rosterHref = buildAdminRosterHref({ eventId, ...employerParams })
  const hiringHref = buildAdminHiringHref({ eventId, ...employerParams })

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-white">Parties</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300">
            <Link href={rosterHref}>
              <Users2 className="mr-2 h-4 w-4" />
              Roster
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300">
            <Link href={hiringHref}>Hiring</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Building2 className="h-4 w-4 text-cyan-400" />
            Venue account
            {venueSelected[0] ? (
              <Badge variant="secondary" className="bg-slate-700 text-slate-100">
                {venueSelected[0].label}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                Missing
              </Badge>
            )}
          </div>
          <EntityAccountPicker
            label="Attach venue profile"
            placeholder="Search venues…"
            searchUrl="/api/tours/planner/venues"
            mapResult={mapVenue}
            selected={venueSelected}
            multi={false}
            onSelect={(selection) => {
              setVenueSelected([selection])
              void persist({ venue_id: selection.id, venue_name: selection.label })
            }}
            onRemove={() => {
              setVenueSelected([])
              void persist({ venue_id: null })
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Music className="h-4 w-4 text-purple-400" />
            Artists
          </div>
          <EntityAccountPicker
            label="Attach artist accounts"
            placeholder="Search artists…"
            searchUrl="/api/tours/planner/artists"
            mapResult={mapArtist}
            selected={artists}
            onSelect={(selection) => {
              if (artists.some((item) => item.id === selection.id)) return
              const next = [...artists, selection]
              setArtists(next)
              void persist({ artist_ids: next.map((item) => item.id) })
            }}
            onRemove={(id) => {
              const next = artists.filter((item) => item.id !== id)
              setArtists(next)
              void persist({ artist_ids: next.map((item) => item.id) })
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users2 className="h-4 w-4 text-amber-400" />
            Staff from roster
            {orgId ? <span className="text-xs text-slate-500">org {orgId.slice(0, 8)}…</span> : null}
          </div>
          <EntityAccountPicker
            label="Attach staff"
            placeholder="Search crew…"
            searchUrl="/api/tours/planner/crew"
            mapResult={mapCrew}
            selected={staff}
            onSelect={(selection) => {
              if (staff.some((item) => item.id === selection.id)) return
              const next = [...staff, selection]
              setStaff(next)
              void persist({ staff_ids: next.map((item) => item.id) })
            }}
            onRemove={(id) => {
              const next = staff.filter((item) => item.id !== id)
              setStaff(next)
              void persist({ staff_ids: next.map((item) => item.id) })
            }}
          />
          {isSaving ? <p className="text-xs text-slate-500">Saving…</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
