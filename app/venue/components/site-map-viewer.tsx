'use client'

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Map } from "lucide-react"
import { PublicSiteMapViewer } from "@/components/site-maps/public-site-map-viewer"
import { SiteMapEditor } from "@/components/admin/logistics/site-map/site-map-editor"

interface VenueSiteMapViewerProps {
  siteMapId: string
  siteMapName: string
  canEdit?: boolean
  onBack: () => void
}

export function VenueSiteMapViewer({ siteMapId, siteMapName, canEdit = false, onBack }: VenueSiteMapViewerProps) {
  const [siteMap, setSiteMap] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const resp = await fetch(`/api/venue/site-maps/${siteMapId}`, { credentials: 'include' })
        const data = await resp.json()
        if (data.success && data.data) {
          setSiteMap(data.data)
        } else {
          setError('Could not load site map')
        }
      } catch {
        setError('Failed to load site map')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [siteMapId])

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
          <p className="text-slate-400">Loading site map...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !siteMap) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Map className="h-12 w-12 text-slate-500" />
          <p className="text-slate-400">{error || 'Site map not found'}</p>
          <Button variant="outline" onClick={onBack} className="border-slate-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (canEdit) {
    return (
      <SiteMapEditor
        siteMap={{
          id: siteMap.id,
          name: siteMap.name || siteMapName,
          description: siteMap.description || '',
          width: siteMap.width || 1200,
          height: siteMap.height || 900,
          created_at: siteMap.created_at,
          status: siteMap.status || 'published',
          backgroundColor: siteMap.background_color,
          gridEnabled: siteMap.grid_enabled,
          gridSize: siteMap.grid_size,
        }}
        onClose={onBack}
        isReadOnly={false}
      />
    )
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" onClick={onBack} className="text-slate-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <PublicSiteMapViewer siteMap={siteMap} />
    </div>
  )
}
