"use client"

import type { PublicArtistEPKDTO, PublicArtistHeroDTO, PublicArtistStatsDTO } from "@/lib/public-artist/public-artist-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, ExternalLink } from "lucide-react"
import { generateEPKPDF } from "@/utils/pdf"
import { paBtnRound, paCard, paInset } from "@/components/public-artist/public-artist-ui"

export function PublicArtistEPKSection({
  hero,
  stats,
  epk
}: {
  hero: PublicArtistHeroDTO
  stats: PublicArtistStatsDTO
  epk: PublicArtistEPKDTO
}) {
  if (!epk.epk) {
    return (
      <Card className={paCard}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-white">EPK</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`${paInset} p-5 text-sm text-white/65`}>No public EPK yet.</div>
        </CardContent>
      </Card>
    )
  }

  const data = epk.epk

  const pdfData = {
    artistName: data.artistName || hero.artistName,
    bio: data.bio || "",
    genre: data.genre || hero.genres[0] || "",
    location: data.location || hero.location || "",
    stats: {
      followers: stats.followersCount,
      monthlyListeners: stats.futureMonthlyListeners,
      totalStreams: stats.totalStreams,
      eventsPlayed: stats.totalEvents
    },
    music: (data.music || []).map(m => ({
      title: m.title,
      url: m.url,
      releaseDate: m.releaseDate,
      streams: m.streams
    })),
    photos: (data.photos || []).map(p => p.url),
    press: (data.press || []).map(p => ({
      title: p.title,
      url: p.url,
      date: p.date,
      outlet: p.outlet
    })),
    contact: {
      email: data.contact.email,
      phone: data.contact.phone,
      website: data.contact.website,
      bookingEmail: data.contact.bookingEmail,
      managementEmail: data.contact.managementEmail
    },
    social: (data.social || []).map(s => ({ platform: s.platform, url: s.url })),
    upcomingShows: (data.upcomingShows || []).map(s => ({
      date: s.date,
      venue: s.venue,
      location: s.location,
      ticketUrl: s.ticketUrl
    }))
  }

  return (
    <Card className={paCard}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight text-white">EPK</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4">
          <div className={`${paInset} p-5`}>
            <div className="font-medium text-white/90">Press Kit Preview</div>
            <div className="mt-1 text-sm text-white/60">Bio, photos, music samples, stats, and upcoming shows.</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 sm:flex-1">
              <div className="inline-flex items-center gap-2 text-sm text-white/80">
                <FileDown className="h-4 w-4 shrink-0" />
                <span>Download All (PDF)</span>
              </div>
              <div className="mt-3 [&_a]:inline-flex [&_a]:rounded-full [&_a]:border [&_a]:border-white/15 [&_a]:bg-white/10 [&_a]:px-5 [&_a]:py-2.5 [&_a]:text-sm [&_a]:font-medium [&_a]:text-white [&_a]:transition hover:[&_a]:bg-white/15">
                {generateEPKPDF(pdfData)}
              </div>
            </div>

            {data.customDomain ? (
              <Button asChild variant="secondary" className={`${paBtnRound} shrink-0 px-5`}>
                <a href={data.customDomain} target="_blank" rel="noreferrer">
                  View online
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

