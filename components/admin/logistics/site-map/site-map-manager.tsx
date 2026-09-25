'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useAdminActingRequest } from '@/hooks/use-admin-acting-request'

interface SiteMapManagerProps {
  eventId?: string
  tourId?: string
  compact?: boolean
  eventLabel?: string | null
  libraryStatus?: 'all' | 'draft' | 'published' | 'archived'
}

export function SiteMapManager({ eventId, tourId, compact = false, eventLabel, libraryStatus = 'all' }: SiteMapManagerProps) {
  const { toast } = useToast()
  const { adminFetch, actingContextKey, isAdminReady } = useAdminActingRequest()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [createForm, setCreateForm] = useState<SiteMapCreateFormState>(defaultCreateForm)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<MapTemplateOption[]>([])
  const [openingBuilder, setOpeningBuilder] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>(libraryStatus)
  const [sortOrder, setSortOrder] = useState<'updated' | 'event-date' | 'name'>('updated')
  const hasCreationScope = Boolean(eventId || tourId)
  const scopeKey = `${actingContextKey}:${eventId || ''}:${tourId || ''}`
  const scopeKeyRef = useRef(scopeKey)
  scopeKeyRef.current = scopeKey
  const previousScopeKeyRef = useRef<string | null>(isAdminReady ? scopeKey : null)
  const blockedDeepLinkRef = useRef<{ scopeKey: string; siteMapId: string } | null>(null)

  const {
    siteMaps,
    selectedSiteMap: hookSelectedSiteMap,
    loading,
    error,
    createSiteMap,
    deleteSiteMap,
    selectSiteMap,
    refreshSiteMaps,
    getSiteMapById,
    upsertSiteMap,
  } = useSiteMaps({
    eventId,
    tourId,
    includeData: false,
  })

  useEffect(() => {
    setStatusFilter(libraryStatus)
  }, [libraryStatus])

  const selectedSiteMap = useMemo(() => {
    if (!selectedMapId) return null
    if (hookSelectedSiteMap?.id === selectedMapId) return hookSelectedSiteMap
    return siteMaps.find((siteMap) => siteMap.id === selectedMapId) ?? null
  }, [hookSelectedSiteMap, siteMaps, selectedMapId])
  const visibleSiteMaps = useMemo(() => {
    const needle = librarySearch.trim().toLowerCase()
    const rows = siteMaps.filter((siteMap) => {
      const eventContext = (siteMap as any).event_context || {}
      const tourContext = (siteMap as any).tour_context || {}
      const matchesSearch = !needle || [
        siteMap.name,
        siteMap.description,
        eventContext.title,
        eventContext.venue_name,
        eventContext.venue_city,
        tourContext.name,
      ].some((value) => String(value || '').toLowerCase().includes(needle))
      const matchesStatus = statusFilter === 'all' || (siteMap.status || 'draft') === statusFilter
      return matchesSearch && matchesStatus
    })
    return [...rows].sort((a, b) => {
      if (sortOrder === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
      if (sortOrder === 'event-date') {
        return Date.parse(String((a as any).event_context?.start_at || '9999')) - Date.parse(String((b as any).event_context?.start_at || '9999'))
      }
      return Date.parse(String(b.updated_at || b.created_at || 0)) - Date.parse(String(a.updated_at || a.created_at || 0))
    })
  }, [librarySearch, siteMaps, sortOrder, statusFilter])

  useEffect(() => {
    if (!isAdminReady) return
    if (previousScopeKeyRef.current === null) {
      previousScopeKeyRef.current = scopeKey
      return
    }
    if (previousScopeKeyRef.current === scopeKey) return
    previousScopeKeyRef.current = scopeKey
    const staleDeepLinkId = searchParams.get('siteMapId')
    if (staleDeepLinkId) {
      blockedDeepLinkRef.current = { scopeKey, siteMapId: staleDeepLinkId }
      const next = new URLSearchParams(searchParams.toString())
      next.set('tab', 'maps')
      next.delete('siteMapId')
      if (eventId) next.set('eventId', eventId)
      else next.delete('eventId')
      if (tourId) next.set('tourId', tourId)
      else next.delete('tourId')
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    }
    setSelectedMapId(null)
    setOpeningBuilder(false)
    setShowCreateDialog(false)
    setCreationError(null)
  }, [eventId, isAdminReady, pathname, router, scopeKey, searchParams, tourId])

  useEffect(() => {
    const deepLinkId = searchParams.get('siteMapId')
    if (!deepLinkId) {
      blockedDeepLinkRef.current = null
      return
    }
    if (
      blockedDeepLinkRef.current?.scopeKey === scopeKey
      && blockedDeepLinkRef.current.siteMapId === deepLinkId
    ) return
    setSelectedMapId(deepLinkId)
    const knownMap = siteMaps.find((map) => map.id === deepLinkId)
    if (knownMap) {
      selectSiteMap(deepLinkId)
    } else if (hookSelectedSiteMap?.id !== deepLinkId && !loading) {
      void getSiteMapById(deepLinkId)
    }
  }, [getSiteMapById, hookSelectedSiteMap, loading, scopeKey, searchParams, selectSiteMap, siteMaps])

  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      if (!isAdminReady) {
        setTemplates([])
        return
      }
      setTemplates([])
      try {
        const response = await adminFetch('/api/admin/logistics/site-map-templates')
        const data = await response.json()
        if (!cancelled && data.success) setTemplates(data.data || [])
      } catch {
        if (!cancelled) setTemplates([])
      }
    }
    void loadTemplates()
    return () => {
      cancelled = true
    }
  }, [actingContextKey, adminFetch, isAdminReady])

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
    next.set('tab', 'maps')
    if (siteMapId) next.set('siteMapId', siteMapId)
    else next.delete('siteMapId')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function openSiteMap(siteMapId: string) {
    // Mount editor immediately from local state; URL sync is secondary
    setOpeningBuilder(true)
    selectSiteMap(siteMapId)
    setSelectedMapId(siteMapId)
    syncSiteMapQuery(siteMapId)
    // Overlay is dismissed reactively by the useEffect below once selectedSiteMap resolves
  }

  function closeSiteMap() {
    setSelectedMapId(null)
    syncSiteMapQuery(null)
  }

  async function handleCreateSiteMap() {
    if (!isAdminReady) {
      toast({ title: 'Select an organization account before continuing.', variant: 'destructive' })
      return
    }
    if (!hasCreationScope) {
      toast({
        title: 'Select an event or tour first',
        description: 'Admin site maps must be linked to an event or tour.',
        variant: 'destructive',
      })
      return
    }
    if (!createForm.name.trim()) {
      toast({ title: 'Site map name is required', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    setCreationError(null)
    const createScopeKey = scopeKey
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
        response = await adminFetch('/api/admin/logistics/site-maps', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      } else {
        // JSON path — no multipart overhead for the common case
        response = await adminFetch('/api/admin/logistics/site-maps', {
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
      if (scopeKeyRef.current !== createScopeKey) return
      if (!response.ok || !data.success || !data.data?.id) {
        setOpeningBuilder(false)
        const message = data.error || 'Failed to create site map'
        setCreationError(data.details ? `${message}: ${data.details}` : message)
        toast({
          title: message,
          description: data.details || undefined,
          variant: 'destructive',
        })
        return
      }

      // Seed list immediately so the editor can mount without waiting on GET
      upsertSiteMap(data.data)
      toast({ title: 'Site map created — opening builder' })
      setCreationError(null)
      setCreateForm(defaultCreateForm)
      setShowCreateDialog(false)
      openSiteMap(data.data.id)
      void getSiteMapById(data.data.id)
    } catch (err) {
      setOpeningBuilder(false)
      const message = err instanceof Error ? err.message : 'Network error'
      setCreationError(`Failed to create site map: ${message}`)
      toast({
        title: 'Failed to create site map',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function copyChildResources(sourceId: string, targetId: string) {
    const [zonesRes, tentsRes, layersRes, elemsRes] = await Promise.all([
      adminFetch(`/api/admin/logistics/site-maps/${sourceId}/zones`),
      adminFetch(`/api/admin/logistics/site-maps/${sourceId}/tents`),
      adminFetch(`/api/admin/logistics/site-maps/layers?siteMapId=${sourceId}`),
      adminFetch(`/api/admin/logistics/site-maps/${sourceId}/elements`),
    ])

    const zonesData = zonesRes.ok ? await zonesRes.json() : { data: [] }
    const tentsData = tentsRes.ok ? await tentsRes.json() : { data: [] }
    const layersData = layersRes.ok ? await layersRes.json() : { data: [] }
    const elemsData = elemsRes.ok ? await elemsRes.json() : { data: [] }

    const layers = layersData?.data ?? []
    for (const layer of layers) {
      await adminFetch('/api/admin/logistics/site-maps/layers', {
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
      await adminFetch(`/api/admin/logistics/site-maps/${targetId}/zones`, {
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
      await adminFetch(`/api/admin/logistics/site-maps/${targetId}/tents`, {
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
      await adminFetch(`/api/admin/logistics/site-maps/${targetId}/elements`, {
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

    const response = await adminFetch(`/api/admin/logistics/site-maps/${siteMap.id}/save-template`, {
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
    const response = await adminFetch(`/api/admin/logistics/site-maps/${siteMap.id}/publish-work-mode`, {
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

  function openCreateDialog() {
    if (!hasCreationScope) {
      toast({
        title: 'Select an event or tour first',
        description: 'Use the logistics scope controls before creating a site map.',
        variant: 'destructive',
      })
      return
    }
    setCreationError(null)
    setShowCreateDialog(true)
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
            <label
              aria-disabled={!hasCreationScope || !isAdminReady}
              className={cn(
                'cursor-pointer',
                (!hasCreationScope || !isAdminReady) && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="file"
                accept=".json,.sitemapjson"
                className="hidden"
                disabled={!hasCreationScope || !isAdminReady}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    const importData = JSON.parse(text)
                    if (!hasCreationScope) {
                      toast({ title: 'Select an event or tour before importing.', variant: 'destructive' })
                      e.target.value = ''
                      return
                    }
                    const res = await adminFetch('/api/admin/logistics/site-maps/import', {
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
              <Button
                variant="outline"
                className="border-slate-600 text-slate-200"
                asChild
              >
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </span>
              </Button>
            </label>
            <Button
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              onClick={openCreateDialog}
              disabled={!hasCreationScope || !isAdminReady}
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
            onClick={openCreateDialog}
            disabled={!hasCreationScope || !isAdminReady}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      )}

      <SiteMapCreateSheet
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) setCreationError(null)
        }}
        form={createForm}
        onFormChange={setCreateForm}
        templates={templates}
        eventId={eventId}
        tourId={tourId}
        eventLabel={eventLabel}
        isCreating={isCreating}
        errorMessage={creationError}
        onSubmit={handleCreateSiteMap}
      />

      {!isAdminReady ? (
        <AdminSurfaceCard className="border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex items-center gap-3 text-sm text-amber-100">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-300" />
            Select an organization account before loading or creating site maps.
          </div>
        </AdminSurfaceCard>
      ) : null}

      {!compact && siteMaps.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <Input
            aria-label="Search site maps"
            onChange={(event) => setLibrarySearch(event.target.value)}
            placeholder="Search maps, events, tours, or venues"
            value={librarySearch}
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger aria-label="Filter site maps by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
            <SelectTrigger aria-label="Sort site maps"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="event-date">Event date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

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
          description={hasCreationScope
            ? 'Create a layout to assign zones, pin load-in tasks, and publish to Work Mode.'
            : 'Select an event or tour in the logistics scope controls before creating a site map.'}
          action={hasCreationScope && isAdminReady
            ? { label: 'Create site map', onClick: openCreateDialog }
            : undefined}
        />
      ) : visibleSiteMaps.length === 0 ? (
        <AdminEmptyState
          icon={Map}
          title="No maps match these filters"
          description="Clear the search or choose another status to see more maps."
          action={{ label: 'Clear filters', onClick: () => { setLibrarySearch(''); setStatusFilter('all') } }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleSiteMaps.map((siteMap) => (
            <AdminSurfaceCard
              key={siteMap.id}
              className="group cursor-pointer border-slate-700/50 bg-slate-950/60 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/30"
              onClick={() => openSiteMap(siteMap.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 break-words font-semibold text-white" title={siteMap.name}>{siteMap.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {siteMap.description || 'No description'}
                  </p>
                  <p className="mt-2 text-[11px] text-cyan-200/80">
                    {(siteMap as any).event_context?.title
                      || (siteMap as any).tour_context?.name
                      || ((siteMap as any).event_v2_id ? `Event ${String((siteMap as any).event_v2_id).slice(0, 8)}` : `Tour ${String((siteMap as any).tour_id || '').slice(0, 8)}`)}
                  </p>
                  {(siteMap as any).event_context?.venue_name ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {(siteMap as any).event_context.venue_name}
                      {(siteMap as any).event_context.start_at ? ` · ${formatSafeDate((siteMap as any).event_context.start_at)}` : ''}
                    </p>
                  ) : null}
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
                        const res = await adminFetch(`/api/admin/logistics/site-maps/${siteMap.id}/export`)
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
