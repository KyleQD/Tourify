'use client'

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Map } from "lucide-react"
import { SiteMapEditor } from "@/components/admin/logistics/site-map/site-map-editor"

interface VenueSiteMapViewerProps {
  siteMapId: string
  siteMapName: string
  canEdit?: boolean
  onBack: () => void
}

interface SiteMapData {
  id: string
  name: string
  description: string
  width: number
  height: number
  created_at: string
  status: string
  backgroundColor?: string
  gridEnabled?: boolean
  gridSize?: number
}

export function VenueSiteMapViewer({ siteMapId, siteMapName, canEdit = false, onBack }: VenueSiteMapViewerProps) {
  const [siteMap, setSiteMap] = useState<SiteMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}`, { credentials: 'include' })
        const data = await resp.json()
        if (data.success && data.data) {
          setSiteMap({
            id: data.data.id,
            name: data.data.name,
            description: data.data.description || '',
            width: data.data.width || 1200,
            height: data.data.height || 900,
            created_at: data.data.created_at,
            status: data.data.status || 'published',
            backgroundColor: data.data.background_color,
            gridEnabled: data.data.grid_enabled,
            gridSize: data.data.grid_size
          })
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

  return (
    <SiteMapEditor
      siteMap={siteMap}
      onClose={onBack}
      isReadOnly={!canEdit}
    />
  )
}
