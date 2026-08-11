'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Map, Loader2, Copy, Trash2, Upload, Download, Send, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSiteMaps } from '@/hooks/use-site-maps'
import { SiteMapEditor } from './site-map-editor'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import { AdminEmptyState } from '@/app/admin/dashboard/components/admin-empty-state'
import { AdminSurfaceCard } from '@/app/admin/dashboard/components/admin-surface-card'
import { cn } from '@/lib/utils'
import {
  SiteMapCreateSheet,
  defaultCreateForm,
  resolveCreateWorldSize,
  type SiteMapCreateFormState,
  type MapTemplateOption,
} from './site-map-create-sheet'
import { featureUnavailableMessage, isFeatureUnavailableResponse } from '@/lib/api/feature-unavailable'

interface SiteMapManagerProps {
  eventId?: string
  tourId?: string
  compact?: boolean
  eventLabel?: string | null
}

export function SiteMapManager({ eventId, tourId, compact = false, eventLabel }: SiteMapManagerProps) {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [createForm, setCreateForm] = useState<SiteMapCreateFormState>(defaultCreateForm)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<MapTemplateOption[]>([])
  const [openingBuilder, setOpeningBuilder] = useState(false)

  const { siteMaps, loading, error, createSiteMap, deleteSiteMap, refreshSiteMaps, getSiteMapById, upsertSiteMap } = useSiteMaps({
    eventId,
    tourId,
    includeData: false,
  })

  const selectedSiteMap = useMemo(
    () => siteMaps.find((siteMap) => siteMap.id === selectedMapId) ?? null,
    [siteMaps, selectedMapId]
  )

  useEffect(() => {
    const deepLinkId = searchParams.get('siteMapId')
    if (!deepLinkId) return
    setSelectedMapId(deepLinkId)
    if (!siteMaps.some((map) => map.id === deepLinkId) && !loading) {
      void getSiteMapById(deepLinkId)
    }
  }, [searchParams, siteMaps, loading, getSiteMapById])

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch('/api/admin/logistics/site-map-templates', { credentials: 'include' })
        const data = await response.json()
        if (data.success) setTemplates(data.data || [])
      } catch {
        setTemplates([])
      }
    }
    void loadTemplates()
  }, [])

  useEffect(() => {
    if (!showCreateDialog || !eventLabel) return
    setCreateForm((prev) => {
      if (prev.name.trim()) return prev
      return { ...prev, name: `${eventLabel} Site Map` }
    })
  }, [showCreateDialog, eventLabel])

  // Dismiss the "Opening builder…" overlay once the newly created/selected map
  // has actually resolved into state — avoids the race where an arbitrary timeout
  // fires before React has committed the upsertSiteMap state update.
  useEffect(() => {
    if (openingBuilder && selectedSiteMap) {
      setOpeningBuilder(false)
    }
  }, [openingBuilder, selectedSiteMap])

  function syncSiteMapQuery(siteMapId: string | null) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', 'site-maps')
    if (siteMapId) next.set('siteMapId', siteMapId)
    else next.delete('siteMapId')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function openSiteMap(siteMapId: string) {
    // Mount editor immediately from local state; URL sync is secondary
    setOpeningBuilder(true)
    setSelectedMapId(siteMapId)
    syncSiteMapQuery(siteMapId)
    // Overlay is dismissed reactively by the useEffect below once selectedSiteMap resolves
  }

  function closeSiteMap() {
    setSelectedMapId(null)
    syncSiteMapQuery(null)
  }

  async function handleCreateSiteMap() {
    if (!createForm.name.trim()) {
      toast({ title: 'Site map name is required', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      const world = resolveCreateWorldSize(createForm)

      let response: Response
      if (createForm.backgroundImage) {
        // Only use multipart when there's an actual file to upload
        const formData = new FormData()
        formData.append('name', createForm.name.trim())
        formData.append('description', createForm.description.trim())
        formData.append('width', String(world.width))
        formData.append('height', String(world.height))
        formData.append('scale', String(world.scale))
        formData.append('scaleUnit', world.scaleUnit)
        formData.append('templateId', createForm.templateId)
        formData.append('backgroundColor', '#0f172a')
        formData.append('gridEnabled', 'true')
        formData.append('gridSize', '20')
        formData.append('isPublic', 'false')
        if (eventId) formData.append('eventId', eventId)
        if (tourId) formData.append('tourId', tourId)
        formData.append('backgroundImage', createForm.backgroundImage)
        response = await fetch('/api/admin/logistics/site-maps', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      } else {
        // JSON path — no multipart overhead for the common case
        response = await fetch('/api/admin/logistics/site-maps', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: createForm.name.trim(),
            description: createForm.description.trim(),
            width: world.width,
            height: world.height,
            scale: world.scale,
            scaleUnit: world.scaleUnit,
            templateId: createForm.templateId,
            backgroundColor: '#0f172a',
            gridEnabled: true,
            gridSize: 20,
            isPublic: false,
            eventId: eventId || undefined,
            tourId: tourId || undefined,
          }),
        })
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success || !data.data?.id) {
        toast({
          title: data.error || 'Failed to create site map',
          description: data.details || undefined,
          variant: 'destructive',
        })
        return
      }

      // Seed list immediately so the editor can mount without waiting on GET
      upsertSiteMap(data.data)
      toast({ title: 'Site map created — opening builder' })
      setCreateForm(defaultCreateForm)
      setShowCreateDialog(false)
      openSiteMap(data.data.id)
      void getSiteMapById(data.data.id)
    } catch (err) {
      toast({
        title: 'Failed to create site map',
        description: err instanceof Error ? err.message : 'Network error',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function copyChildResources(sourceId: string, targetId: string) {
    const [zonesRes, tentsRes, layersRes, elemsRes] = await Promise.all([
      fetch(`/api/admin/logistics/site-maps/${sourceId}/zones`, { credentials: 'include' }),
      fetch(`/api/admin/logistics/site-maps/${sourceId}/tents`, { credentials: 'include' }),
      fetch(`/api/admin/logistics/site-maps/layers?siteMapId=${sourceId}`, { credentials: 'include' }),
      fetch(`/api/admin/logistics/site-maps/${sourceId}/elements`, { credentials: 'include' }),
    ])

    const zonesData = zonesRes.ok ? await zonesRes.json() : { data: [] }
    const tentsData = tentsRes.ok ? await tentsRes.json() : { data: [] }
    const layersData = layersRes.ok ? await layersRes.json() : { data: [] }
    const elemsData = elemsRes.ok ? await elemsRes.json() : { data: [] }

    const layers = layersData?.data ?? []
    for (const layer of layers) {
      await fetch('/api/admin/logistics/site-maps/layers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteMapId: targetId,
          name: layer.name,
          layerType: layer.layer_type || layer.layerType || 'custom',
          color: layer.color,
          zIndex: layer.z_index ?? layer.zIndex ?? 0,
          isVisible: layer.is_visible ?? layer.isVisible ?? true,
          isLocked: layer.is_locked ?? layer.isLocked ?? false,
        }),
      })
    }

    const zones = zonesData?.data ?? []
    for (const zone of zones) {
      await fetch(`/api/admin/logistics/site-maps/${targetId}/zones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zone.name,
          zoneType: zone.zone_type || zone.zoneType || 'other',
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          color: zone.color,
          borderColor: zone.border_color || zone.borderColor || zone.color,
          capacity: zone.capacity,
          tags: zone.tags || [],
        }),
      })
    }

    const tents = tentsData?.data ?? []
    for (const tent of tents) {
      await fetch(`/api/admin/logistics/site-maps/${targetId}/tents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tentNumber: tent.tent_number || tent.tentNumber,
          tentType: tent.tent_type || tent.tentType || 'custom',
          width: tent.width,
          height: tent.height,
          capacity: tent.capacity,
          x: tent.x,
          y: tent.y,
        }),
      })
    }

    const elements: any[] = elemsData?.data ?? []
    if (elements.length > 0) {
      await fetch(`/api/admin/logistics/site-maps/${targetId}/elements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upsert: true,
          sync: true,
          elements: elements.map((el) => ({
            name: el.name,
            elementType: el.element_type || el.elementType || 'custom',
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            color: el.color,
            strokeColor: el.stroke_color || el.strokeColor,
            strokeWidth: el.stroke_width || el.strokeWidth,
            properties: el.properties || {},
          })),
        }),
      })
    }
  }

  async function handleDuplicateSiteMap(siteMap: any) {
    const created = await createSiteMap({
      name: `${siteMap.name} (Copy)`,
      description: siteMap.description || '',
      width: siteMap.width,
      height: siteMap.height,
      scale: siteMap.scale || 1,
    })

    if (!created) {
      toast({ title: 'Failed to duplicate site map', variant: 'destructive' })
      return
    }

    try {
      await copyChildResources(siteMap.id, created.id)
    } catch (err) {
      console.warn('[SiteMapManager] Could not copy child resources during duplicate:', err)
    }

    toast({ title: 'Site map duplicated' })
    await refreshSiteMaps()
    openSiteMap(created.id)
  }

  async function handleSaveTemplate(siteMap: any) {
    const templateName = window.prompt('Template name')
    if (!templateName?.trim()) return

    const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/save-template`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        category: 'custom',
        description: `Template from ${siteMap.name}`,
      }),
    })
    const data = await response.json()
    if (!data.success) {
      toast({ title: data.error || 'Failed to save template', variant: 'destructive' })
      return
    }

    toast({ title: 'Template saved' })
  }

  async function handlePublishToWorkMode(siteMap: any) {
    const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/publish-work-mode`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast({
        title: isFeatureUnavailableResponse(response.status, data)
          ? featureUnavailableMessage(data, 'Work Mode publish is temporarily unavailable.')
          : (data.error || 'Failed to publish site map'),
        variant: 'destructive',
      })
      return
    }

    toast({ title: 'Site map published to Work Mode' })
    await refreshSiteMaps()
  }

  async function handleDeleteSiteMap(siteMapId: string) {
    const didDelete = await deleteSiteMap(siteMapId)
    if (!didDelete) {
      toast({ title: 'Failed to delete site map', variant: 'destructive' })
      return
    }

    if (selectedMapId === siteMapId) closeSiteMap()
    toast({ title: 'Site map deleted' })
  }

  const scopeLabel = eventLabel || (eventId ? 'Event scoped' : tourId ? 'Tour scoped' : 'No event linked')

  return (
    <div className="space-y-5">
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Site Maps</h2>
            <p className="text-sm text-slate-400">Create, edit, and publish event layouts</p>
            <Badge
              variant="outline"
              className={cn(
                'mt-2 text-[10px] uppercase tracking-wide',
                eventId || tourId
                  ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                  : 'border-amber-400/30 bg-amber-400/10 text-amber-100'
              )}
            >
              {scopeLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,.sitemapjson"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    const importData = JSON.parse(text)
                    const res = await fetch('/api/admin/logistics/site-maps/import', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ importData, eventId, tourId }),
                    })
                    if (res.ok) {
                      toast({ title: 'Site map imported successfully' })
                      await refreshSiteMaps()
                    } else {
                      toast({ title: 'Import failed', variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: 'Invalid file format', variant: 'destructive' })
                  }
                  e.target.value = ''
                }}
              />
              <Button variant="outline" className="border-slate-600 text-slate-200" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </span>
              </Button>
            </label>
            <Button
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Site Map
            </Button>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] uppercase tracking-wide',
              eventId || tourId
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-100'
            )}
          >
            {scopeLabel}
          </Badge>
          <Button
            size="sm"
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      )}

      <SiteMapCreateSheet
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        form={createForm}
        onFormChange={setCreateForm}
        templates={templates}
        eventId={eventId}
        tourId={tourId}
        eventLabel={eventLabel}
        isCreating={isCreating}
        onSubmit={handleCreateSiteMap}
      />

      {error ? (
        <AdminSurfaceCard className="border-rose-500/30 bg-rose-950/20 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-rose-100">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-400/40 text-rose-100"
              onClick={() => void refreshSiteMaps()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </AdminSurfaceCard>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-slate-700/50 bg-slate-900/50"
            />
          ))}
        </div>
      ) : siteMaps.length === 0 ? (
        <AdminEmptyState
          icon={Map}
          title="No site maps yet"
          description="Create a layout to assign zones, pin load-in tasks, and publish to Work Mode."
          action={{ label: 'Create site map', onClick: () => setShowCreateDialog(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {siteMaps.map((siteMap) => (
            <AdminSurfaceCard
              key={siteMap.id}
              className="group cursor-pointer border-slate-700/50 bg-slate-950/60 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/30"
              onClick={() => openSiteMap(siteMap.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">{siteMap.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {siteMap.description || 'No description'}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'shrink-0 capitalize',
                    siteMap.status === 'published'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  )}
                >
                  {siteMap.status || 'draft'}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {siteMap.width}×{siteMap.height} · {formatSafeDate(siteMap.updated_at || siteMap.created_at)}
                </span>
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDuplicateSiteMap(siteMap)
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400"
                    onClick={async (event) => {
                      event.stopPropagation()
                      try {
                        const res = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/export`, {
                          credentials: 'include',
                        })
                        if (res.ok) {
                          const data = await res.json()
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${siteMap.name.replace(/\s+/g, '-')}.sitemapjson`
                          a.click()
                          URL.revokeObjectURL(url)
                        }
                      } catch {
                        toast({ title: 'Export failed', variant: 'destructive' })
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] text-slate-400"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleSaveTemplate(siteMap)
                    }}
                  >
                    Template
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-emerald-400"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handlePublishToWorkMode(siteMap)
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-400"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteSiteMap(siteMap.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </AdminSurfaceCard>
          ))}
        </div>
      )}

      {openingBuilder && !selectedSiteMap && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 text-sm text-slate-200 backdrop-blur-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-300" />
          Opening builder…
        </div>
      )}

      {selectedSiteMap ? (
        <SiteMapEditor
          siteMap={selectedSiteMap as any}
          onClose={closeSiteMap}
          onSave={() => void refreshSiteMaps()}
          onDelete={(siteMapId: string) => void handleDeleteSiteMap(siteMapId)}
          onPublish={async (siteMap) => {
            await handlePublishToWorkMode(siteMap)
          }}
          eventId={eventId}
        />
      ) : null}
    </div>
  )
}
