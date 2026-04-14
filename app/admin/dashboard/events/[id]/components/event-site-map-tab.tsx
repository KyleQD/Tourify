'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Map, Plus, ExternalLink, Loader2 } from "lucide-react"
import { SiteMapManagerEnhanced } from "@/components/admin/logistics/site-map-manager-enhanced"
import { useToast } from "@/hooks/use-toast"

interface EventSiteMapTabProps {
  eventId: string
  eventName?: string
}

interface SiteMapSummary {
  id: string
  name: string
  status: string
  width: number
  height: number
  created_at: string
}

export function EventSiteMapTab({ eventId, eventName }: EventSiteMapTabProps) {
  const { toast } = useToast()
  const [hasMaps, setHasMaps] = useState<boolean | null>(null)
  const [maps, setMaps] = useState<SiteMapSummary[]>([])
  const [showBuilder, setShowBuilder] = useState(false)

  useEffect(() => {
    async function checkMaps() {
      try {
        const params = new URLSearchParams({ eventId, includeData: 'false' })
        const resp = await fetch(`/api/admin/logistics/site-maps?${params}`, { credentials: 'include' })
        const data = await resp.json()
        if (data.success) {
          setMaps(data.data || [])
          setHasMaps((data.data || []).length > 0)
        } else {
          setHasMaps(false)
        }
      } catch {
        setHasMaps(false)
      }
    }
    checkMaps()
  }, [eventId])

  if (hasMaps === null) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (showBuilder || hasMaps) {
    return (
      <div className="space-y-4">
        {maps.length > 0 && !showBuilder && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">{maps.length} Site Map{maps.length !== 1 ? 's' : ''}</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBuilder(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Builder
            </Button>
          </div>
        )}
        <SiteMapManagerEnhanced eventId={eventId} compact={showBuilder || hasMaps === true} />
      </div>
    )
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30">
          <Map className="h-12 w-12 text-purple-300" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">No Site Map Yet</h3>
          <p className="text-slate-400 max-w-md">
            Create a site map for this event to plan layouts, zone assignments, and equipment placement.
          </p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Site Map for {eventName || 'This Event'}
        </Button>
      </CardContent>
    </Card>
  )
}
