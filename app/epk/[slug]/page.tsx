"use client"

import React from "react"
import { generateEPKPDF } from "@/utils/pdf"
import { epkService } from "@/lib/services/epk.service"
import type { EPKData } from "@/lib/services/epk.service"
import EPKPreview from "@/components/epk/epk-preview"

function toPdfEpkData(epk: EPKData) {
  return {
    artistName: epk.artistName,
    bio: epk.bio,
    genre: epk.genre,
    location: epk.location,
    stats: epk.stats,
    music: epk.music.map((m) => ({
      title: m.title,
      url: m.url,
      releaseDate: m.releaseDate,
      streams: m.streams,
    })),
    photos: epk.photos.map((p) => p.url),
    press: epk.press.map((p) => ({
      title: p.title,
      url: p.url,
      date: p.date,
      outlet: p.outlet,
    })),
    contact: epk.contact,
    social: epk.social.map((s) => ({ platform: s.platform, url: s.url })),
    upcomingShows: epk.upcomingShows.map((s) => ({
      date: s.date,
      venue: s.venue,
      location: s.location,
      ticketUrl: s.ticketUrl,
    })),
  }
}

export default function PublicEPKPage({ params }: { params: Promise<{ slug: string }> }) {
  const [epkData, setEpkData] = React.useState<EPKData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    params.then(async ({ slug }) => {
      const data = await epkService.getPublicEPKData(slug)
      if (!data) {
        setLoading(false)
        return
      }
      fetch("/api/epk/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epkSlug: data.epkSlug || slug, eventType: "public_view" }),
      }).catch(() => null)

      setEpkData(data)
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4"></div>
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!epkData) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-white">EPK Not Found</h1>
        <p className="text-gray-400 mt-2">The requested EPK could not be found.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed right-4 top-4 z-50 flex gap-2 rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        {generateEPKPDF(toPdfEpkData(epkData))}
      </div>
      <EPKPreview data={epkData} template={epkData.template} />
    </div>
  )
}
