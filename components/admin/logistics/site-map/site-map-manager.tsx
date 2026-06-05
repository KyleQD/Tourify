'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Map, Loader2, Copy, Trash2, Upload, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSiteMaps } from '@/hooks/use-site-maps'
import { SiteMapEditor } from './site-map-editor'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface SiteMapManagerProps {
  eventId?: string
  tourId?: string
  compact?: boolean
}

interface CreateForm {
  name: string
  description: string
  environment: string
  approximateSize: string
  templateId: string
  backgroundImage: File | null
  pixelsPerUnit: string
  scaleUnit: 'feet' | 'meters'
}

interface MapTemplateOption {
  id: string
  name: string
  category: string
  description?: string
}

const defaultForm: CreateForm = {
  name: '',
  description: '',
  environment: 'outdoor',
  approximateSize: 'medium',
  templateId: 'blank',
  backgroundImage: null,
  pixelsPerUnit: '1',
  scaleUnit: 'meters',
}

const sizePresets = {
  small: { width: 800, height: 600 },
  medium: { width: 1200, height: 900 },
  large: { width: 1600, height: 1200 },
  xlarge: { width: 2000, height: 1500 },
}

export function SiteMapManager({ eventId, tourId }: SiteMapManagerProps) {
  const { toast } = useToast()
  const [createForm, setCreateForm] = useState<CreateForm>(defaultForm)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<MapTemplateOption[]>([])

  const { siteMaps, loading, createSiteMap, deleteSiteMap, refreshSiteMaps } = useSiteMaps({
    eventId,
    tourId,
  })

  const selectedSiteMap = useMemo(
    () => siteMaps.find((siteMap) => siteMap.id === selectedMapId) ?? null,
    [siteMaps, selectedMapId]
  )

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

  async function handleCreateSiteMap() {
    if (!createForm.name.trim()) {
      toast({ title: 'Site map name is required', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      const preset = sizePresets[createForm.approximateSize as keyof typeof sizePresets] ?? sizePresets.medium
      const formData = new FormData()
      formData.append('name', createForm.name.trim())
      formData.append('description', createForm.description.trim() || createForm.environment)
      formData.append('width', String(preset.width))
      formData.append('height', String(preset.height))
      formData.append('scale', createForm.pixelsPerUnit || '1')
      formData.append('scaleUnit', createForm.scaleUnit)
      formData.append('templateId', createForm.templateId)
      formData.append('backgroundColor', '#f8f9fa')
      formData.append('gridEnabled', 'true')
      formData.append('gridSize', '20')
      formData.append('isPublic', 'false')
      if (eventId) formData.append('eventId', eventId)
      if (tourId) formData.append('tourId', tourId)
      if (createForm.backgroundImage) formData.append('backgroundImage', createForm.backgroundImage)

      const response = await fetch('/api/admin/logistics/site-maps', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await response.json()
      if (!data.success) {
        toast({ title: data.error || 'Failed to create site map', variant: 'destructive' })
        return
      }

      toast({ title: 'Site map created' })
      setCreateForm(defaultForm)
      setShowCreateDialog(false)
      await refreshSiteMaps()
    } finally {
      setIsCreating(false)
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

    // Copy all elements from source map to the new map
    try {
      const elemsResp = await fetch(
        `/api/admin/logistics/site-maps/${siteMap.id}/elements`,
        { credentials: 'include' },
      )
      if (elemsResp.ok) {
        const elemsData = await elemsResp.json()
        const elements: any[] = elemsData?.data ?? []
        if (elements.length > 0) {
          await Promise.all(
            elements.map((el: any) =>
              fetch(`/api/admin/logistics/site-maps/${created.id}/elements`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  element_type: el.element_type,
                  name: el.name,
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  height: el.height,
                  rotation: el.rotation,
                  color: el.color,
                  stroke_color: el.stroke_color,
                  stroke_width: el.stroke_width,
                  properties: el.properties,
                }),
              }),
            ),
          )
        }
      }
    } catch (err) {
      console.warn('[SiteMapManager] Could not copy elements during duplicate:', err)
    }

    toast({ title: 'Site map duplicated' })
    await refreshSiteMaps()
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

  async function handleDeleteSiteMap(siteMapId: string) {
    const didDelete = await deleteSiteMap(siteMapId)
    if (!didDelete) {
      toast({ title: 'Failed to delete site map', variant: 'destructive' })
      return
    }

    if (selectedMapId === siteMapId) setSelectedMapId(null)
    toast({ title: 'Site map deleted' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Site Maps</h2>
          <p className="text-sm text-slate-400">Create, edit, and collaborate on event layouts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import button */}
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
            <Button variant="outline" className="border-slate-700 text-slate-300" asChild>
              <span><Upload className="h-4 w-4 mr-2" />Import</span>
            </Button>
          </label>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Site Map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Site Map</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Environment</Label>
                  <Select value={createForm.environment} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, environment: value }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Size</Label>
                  <Select value={createForm.approximateSize} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, approximateSize: value }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">X-Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Template</Label>
                <Select value={createForm.templateId} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, templateId: value }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Floor Plan / Aerial (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="bg-slate-800 border-slate-700 text-white"
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, backgroundImage: event.target.files?.[0] || null }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Pixels Per Unit</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={createForm.pixelsPerUnit}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, pixelsPerUnit: event.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Unit</Label>
                  <Select value={createForm.scaleUnit} onValueChange={(value: 'feet' | 'meters') => setCreateForm((prev) => ({ ...prev, scaleUnit: value }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meters">Meters</SelectItem>
                      <SelectItem value="feet">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCreateSiteMap} disabled={isCreating || !createForm.name.trim()}>
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Site Map
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>{/* end button group */}
      </div>

      {loading ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      ) : siteMaps.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto text-slate-500 mb-3" />
            <p className="text-white font-medium">No site maps yet</p>
            <p className="text-sm text-slate-400">Create one to start planning your event layout.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {siteMaps.map((siteMap) => (
            <Card key={siteMap.id} className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/40 cursor-pointer" onClick={() => setSelectedMapId(siteMap.id)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>{siteMap.name}</span>
                  <Badge>{siteMap.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">{siteMap.description || 'No description provided'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500">{siteMap.width} x {siteMap.height} • {formatSafeDate(siteMap.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void handleDuplicateSiteMap(siteMap) }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={async (event) => {
                        event.stopPropagation()
                        try {
                          const res = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/export`, { credentials: 'include' })
                          if (res.ok) {
                            const data = await res.json()
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = `${siteMap.name.replace(/\s+/g, '-')}.sitemapjson`; a.click()
                            URL.revokeObjectURL(url)
                          }
                        } catch { toast({ title: 'Export failed', variant: 'destructive' }) }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void handleSaveTemplate(siteMap) }}>
                      Template
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void handleDeleteSiteMap(siteMap.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSiteMap ? (
        <SiteMapEditor
          siteMap={selectedSiteMap as any}
          onClose={() => setSelectedMapId(null)}
          onSave={() => void refreshSiteMaps()}
          onDelete={(siteMapId: string) => void handleDeleteSiteMap(siteMapId)}
          eventId={eventId}
        />
      ) : null}
    </div>
  )
}
