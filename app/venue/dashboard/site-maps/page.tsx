'use client'

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Map, Eye, Calendar, Loader2, ExternalLink, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { VenueSiteMapViewer } from "@/components/venue/site-map-viewer"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"

interface SharedSiteMap {
  id: string
  name: string
  description?: string
  width: number
  height: number
  status: string
  event_id?: string
  tour_id?: string
  created_at: string
  updated_at: string
  permissions: {
    can_edit?: boolean
    can_export?: boolean
  }
}

export default function VenueSiteMapsPage() {
  const { toast } = useToast()
  const { venue } = useCurrentVenue()
  const [maps, setMaps] = useState<SharedSiteMap[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMap, setSelectedMap] = useState<SharedSiteMap | null>(null)
  // VEN-228: real Create Site Map flow.
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    width: 1600,
    height: 900,
  })

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const query = venue?.id ? `?venue_id=${encodeURIComponent(venue.id)}` : ""
      const resp = await fetch(`/api/site-maps/shared${query}`, { credentials: "include" })
      const data = await resp.json()
      const rows = Array.isArray(data.data) ? data.data : []
      // Prefer venue-scoped rows when the API returns venue_id / venue_profile_id
      const scoped = venue?.id
        ? rows.filter((row: { venue_id?: string; venue_profile_id?: string }) => {
            const venueId = row.venue_id || row.venue_profile_id
            return !venueId || venueId === venue.id
          })
        : rows
      if (data.success) setMaps(scoped)
      else setMaps([])
    } catch {
      setMaps([])
    } finally {
      setIsLoading(false)
    }
  }, [venue?.id])

  useEffect(() => {
    void load()
  }, [load])

  // VEN-228 — persist a new draft map owned by the acting venue account.
  const handleCreateMap = async () => {
    if (!venue?.id) return
    if (!createForm.name.trim()) return
    setIsCreating(true)
    try {
      const mod = await import("@/lib/supabase/client")
      type LooseDb = {
        from: (
          table: "site_maps",
        ) => {
          insert: (
            values: Record<string, unknown>,
          ) => {
            select: (columns?: string) => {
              single: () => PromiseLike<{ data: any; error: { message: string } | null }>
            }
          }
        }
      }
      const db = mod.default as unknown as LooseDb
      const { data: created, error } = await db
        .from("site_maps")
        .insert({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          width: Number(createForm.width) || 1600,
          height: Number(createForm.height) || 900,
          status: "draft",
          created_by: undefined,
          venue_profile_id: venue.id,
        })
        .select("id, name")
        .single()
      if (error) throw error

      toast({ title: "Site map created", description: `${created.name} is ready to edit.` })
      setIsCreateOpen(false)
      setCreateForm({ name: "", description: "", width: 1600, height: 900 })
      await load()
      if (created?.id) {
        const created2 = maps.find(m => m.id === created.id)
        if (created2) setSelectedMap({ ...created, permissions: { can_edit: true, can_export: true } } as SharedSiteMap)
      }
    } catch (err) {
      toast({
        title: "Could not create site map",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }


  if (selectedMap) {
    return (
      <VenueSiteMapViewer
        siteMapId={selectedMap.id}
        siteMapName={selectedMap.name}
        canEdit={selectedMap.permissions?.can_edit || false}
        onBack={() => setSelectedMap(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-500/15 p-2.5 text-emerald-300">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Site Maps</h1>
            <p className="text-sm text-slate-400">View and edit maps for your venue and shared event plans</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-slate-600">
            <Link href="/venue/edit">Update venue profile</Link>
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Site Map
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      ) : maps.length === 0 ? (
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-md bg-slate-800/50 p-6">
              <Map className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">No site maps yet</h3>
            <p className="max-w-sm text-center text-sm text-slate-400">
              Maps shared by organizers appear here. You can also upload floor plans in Documents while building your first map.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => setIsCreateOpen(true)}>
                Create your first site map
              </Button>
              <Button asChild variant="outline" className="border-slate-600">
                <Link href="/venue/documents">Upload floor plan</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-600">
                <Link href="/venue/overview">Venue profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {maps.map(map => (
            <Card
              key={map.id}
              className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/40 transition-all cursor-pointer"
              onClick={() => setSelectedMap(map)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
                      <Map className="h-5 w-5 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{map.name}</h3>
                      {map.description && (
                        <p className="text-sm text-slate-400 mt-0.5">{map.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{map.width} x {map.height}px</span>
                        <span>Updated {formatSafeDate(map.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={map.permissions?.can_edit
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : "bg-green-500/20 text-green-300 border-green-500/30"
                    }>
                      {map.permissions?.can_edit ? 'Edit' : 'View'}
                    </Badge>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VEN-228 — Create Site Map */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>New Site Map</DialogTitle>
            <DialogDescription className="text-slate-400">
              Draft maps stay private until published.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="map-name">Name</Label>
              <Input
                id="map-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Hall — General Layout"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="map-description">Description</Label>
              <Textarea
                id="map-description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional context for collaborators…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="map-width">Width (px)</Label>
                <Input
                  id="map-width"
                  type="number"
                  min={200}
                  value={createForm.width}
                  onChange={(e) => setCreateForm((f) => ({ ...f, width: Number(e.target.value) || 1600 }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="map-height">Height (px)</Label>
                <Input
                  id="map-height"
                  type="number"
                  min={200}
                  value={createForm.height}
                  onChange={(e) => setCreateForm((f) => ({ ...f, height: Number(e.target.value) || 900 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateMap()}
              disabled={isCreating || !createForm.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isCreating ? "Creating…" : "Create map"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
