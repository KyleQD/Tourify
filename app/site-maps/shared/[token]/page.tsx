'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, Map } from 'lucide-react'
import { SiteMapEditor } from '@/components/admin/logistics/site-map/site-map-editor'

export default function SharedSiteMapPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [siteMap, setSiteMap] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/site-maps/public/${token}`)
        const data = await response.json()
        if (!data.success) {
          setError(data.error || 'Unable to load site map')
          return
        }
        setSiteMap(data.data)
      } catch {
        setError('Unable to load site map')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [token])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !siteMap) {
    return (
      <div className="p-6">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="py-14 text-center">
            <Map className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-white font-medium">{error || 'Shared map unavailable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="p-3">
        <Button variant="ghost" className="text-slate-300" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      <SiteMapEditor siteMap={siteMap} onClose={() => router.back()} isReadOnly={true} />
    </div>
  )
}
