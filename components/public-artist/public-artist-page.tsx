"use client"

import { useState } from "react"
import type { PublicArtistPageDTO } from "@/lib/public-artist/public-artist-types"
import { PublicProfileLayout } from "@/components/layouts/public-profile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Image as ImageIcon } from "lucide-react"
import { PublicArtistMusicSection } from "@/components/public-artist/music/public-artist-music-section"
import { PublicArtistPostsSection } from "@/components/public-artist/posts/public-artist-posts-section"
import { PublicArtistEventsSection } from "@/components/public-artist/events/public-artist-events-section"
import { PublicArtistEPKSection } from "@/components/public-artist/epk/public-artist-epk-section"
import { PublicArtistHero } from "@/components/public-artist/hero/public-artist-hero"
import { BookThisArtistModal } from "@/components/public-artist/events/book-this-artist-modal"
import { paCard, paInset, paShell } from "@/components/public-artist/public-artist-ui"

export function PublicArtistPage({ dto }: { dto: PublicArtistPageDTO }) {
  const { hero, tracks, events, about, media, posts, stats, epk } = dto
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  const openBooking = () => setIsBookingOpen(true)
  const scrollToMusic = () =>
    document.getElementById("public-artist-music")?.scrollIntoView({ behavior: "smooth", block: "start" })
  const scrollToEvents = () =>
    document.getElementById("public-artist-events")?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <PublicProfileLayout profileName={hero.artistName} profileType="artist">
      <div className="relative">
        {/* Hero */}
        <PublicArtistHero
          hero={hero}
          viewer={dto.viewer}
          onBookNow={() => {
            openBooking()
            scrollToEvents()
          }}
          onPlayMusic={scrollToMusic}
        />

        <main className={`${paShell} space-y-8 pb-28 pt-2 sm:pt-4`}>
          {/* Music */}
          <section id="public-artist-music" className="scroll-mt-28">
            <PublicArtistMusicSection
              viewer={dto.viewer}
              featuredTrack={tracks.featuredTrack}
              tracks={tracks.tracks}
              defaultTrackId={tracks.defaultTrackId}
            />
          </section>

          {/* Events */}
          <section id="public-artist-events" className="scroll-mt-28">
            <PublicArtistEventsSection
              artistUserId={hero.userId}
              artistName={hero.artistName}
              upcomingEvents={events.upcomingEvents}
              onBookThisArtist={openBooking}
            />
          </section>

          {/* About */}
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold tracking-tight text-white">About</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {about.bio ? (
                  <div className={`${paInset} p-5 text-sm leading-relaxed text-white/80`}>{about.bio}</div>
                ) : (
                  <div className={`${paInset} p-5 text-sm text-white/60`}>No bio yet.</div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Media */}
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                  <ImageIcon className="h-4 w-4 opacity-90" />
                  Media Gallery
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {media.items.length === 0 ? (
                  <div className={`${paInset} p-5 text-sm text-white/65`}>
                    No media yet. When the artist uploads photos/videos, they will appear here.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {media.items.slice(0, 6).map(item => (
                      <div
                        key={item.id}
                        className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30 ring-1 ring-white/5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnailUrl || item.url} alt={item.caption || 'Media item'} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Posts */}
          <section>
            <PublicArtistPostsSection
              viewer={dto.viewer}
              pinnedPosts={posts.pinnedPosts}
              posts={posts.posts}
            />
          </section>

          {/* Stats */}
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold tracking-tight text-white">Stats</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className={`${paInset} p-4`}>
                    <div className="text-xs text-white/55">Followers</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-white">{stats.followersCount.toLocaleString()}</div>
                  </div>
                  <div className={`${paInset} p-4`}>
                    <div className="text-xs text-white/55">Monthly Listeners</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-white">{stats.futureMonthlyListeners.toLocaleString()}</div>
                  </div>
                  <div className={`${paInset} col-span-2 p-4 sm:col-span-1`}>
                    <div className="text-xs text-white/55">Total Streams</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-white">{stats.totalStreams.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* EPK Preview */}
          <section>
            <PublicArtistEPKSection hero={hero} stats={stats} epk={epk} />
          </section>
        </main>
      </div>

      <BookThisArtistModal
        isOpen={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        artistUserId={hero.userId}
        artistName={hero.artistName}
      />
    </PublicProfileLayout>
  )
}

