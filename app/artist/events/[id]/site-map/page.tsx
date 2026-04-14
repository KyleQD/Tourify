'use client'

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Map, Loader2, ZoomIn, ZoomOut, Layers, MapPin } from "lucide-react"
import { SimCitySiteMapViewer } from "@/components/admin/logistics/site-map-builder/simcity-site-map-viewer"

interface SiteMapData {
  id: string
  name: string
  description: string
  width: number
  height: number
  created_at: string
  status: string
}

export default function ArtistEventSiteMapPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [siteMap, setSiteMap] = useState<SiteMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        // Try shared maps first (for collaborator access)
        const sharedResp = await fetch(`/api/site-maps/shared?eventId=${eventId}`, { credentials: 'include' })
        const sharedData = await sharedResp.json()

        if (sharedData.success && sharedData.data?.length > 0) {
          const map = sharedData.data[0]
          setSiteMap({
            id: map.id,
            name: map.name,
            description: map.description || '',
            width: map.width || 1200,
            height: map.height || 900,
            created_at: map.created_at,
            status: map.status || 'published'
          })
          return
        }

        // Fallback: try admin API (for maps the user owns)
        const adminResp = await fetch(`/api/admin/logistics/site-maps?eventId=${eventId}&includeData=false`, { credentials: 'include' })
        const adminData = await adminResp.json()

        if (adminData.success && adminData.data?.length > 0) {
          const map = adminData.data[0]
          setSiteMap({
            id: map.id,
            name: map.name,
            description: map.description || '',
            width: map.width || 1200,
            height: map.height || 900,
            created_at: map.created_at,
            status: map.status || 'published'
          })
          return
        }

        setError('No site map found for this event')
      } catch {
        setError('Failed to load site map')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [eventId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-slate-400">Loading site map...</p>
        </div>
      </div>
    )
  }

  if (error || !siteMap) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-6 bg-slate-800/50 rounded-2xl">
              <Map className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">No Site Map Available</h3>
            <p className="text-slate-400 max-w-sm text-center text-sm">
              {error || 'The event organizer has not shared a site map for this event yet.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SimCitySiteMapViewer
      siteMap={siteMap}
      onClose={() => router.back()}
      isReadOnly={true}
    />
  )
}
