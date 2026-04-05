"use client"

import { useState } from "react"
import type { PublicArtistPageDTO } from "@/lib/public-artist/public-artist-types"
import { PublicProfileLayout } from "@/components/layouts/public-profile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Handshake, Image as ImageIcon, ShoppingBag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PublicArtistMusicSection } from "@/components/public-artist/music/public-artist-music-section"
import { PublicArtistPostsSection } from "@/components/public-artist/posts/public-artist-posts-section"
import { PublicArtistEventsSection } from "@/components/public-artist/events/public-artist-events-section"
import { PublicArtistEPKSection } from "@/components/public-artist/epk/public-artist-epk-section"
import { PublicArtistHero } from "@/components/public-artist/hero/public-artist-hero"
import { BookThisArtistModal } from "@/components/public-artist/events/book-this-artist-modal"
import { ProfileShareCard } from "@/components/profile/profile-share-card"
import { paCard, paInset, paShell } from "@/components/public-artist/public-artist-ui"

export function PublicArtistPage({ dto, username }: { dto: PublicArtistPageDTO; username: string }) {
  const { hero, tracks, events, about, media, products, posts, stats, epk, creator } = dto
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
          creatorType={creator.primaryCreatorType}
          isAvailableForHire={creator.availableForHire}
          onBookNow={() => {
            openBooking()
            scrollToEvents()
          }}
          onPlayMusic={scrollToMusic}
        />

        <main className={`${paShell} space-y-8 pb-28 pt-2 sm:pt-4`}>
          <section>
            <ProfileShareCard
              username={username}
              displayName={hero.artistName}
              sharePath="/artist"
            />
          </section>

          {/* Music */}
          <section id="public-artist-music" className="scroll-mt-28">
            <PublicArtistMusicSection
              viewer={dto.viewer}
              creatorType={creator.primaryCreatorType}
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
              creatorType={creator.primaryCreatorType}
              isAvailableForHire={creator.availableForHire}
              upcomingEvents={events.upcomingEvents}
              onBookThisArtist={openBooking}
            />
          </section>

          {/* Services */}
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                  <Briefcase className="h-4 w-4 opacity-90" />
                  Work & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${paInset} p-4`}>
                    <div className="text-xs text-white/55">Primary creator type</div>
                    <div className="mt-1 text-sm font-medium text-white/90">{creator.primaryCreatorType || "Creator"}</div>
                  </div>
                  <div className={`${paInset} p-4`}>
                    <div className="text-xs text-white/55">Hiring status</div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-white/90">
                      <Handshake className="h-4 w-4 text-purple-300" />
                      {creator.availableForHire ? "Available for hire" : "Not currently taking projects"}
                    </div>
                    {creator.availability ? <div className="mt-1 text-xs text-white/60">{creator.availability}</div> : null}
                  </div>
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Service offerings</div>
                    {creator.serviceOfferings.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {creator.serviceOfferings.slice(0, 12).map(service => (
                          <Badge key={service} variant="secondary" className="rounded-full bg-white/10 text-white/85">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-white/65">No services listed yet.</div>
                    )}
                  </div>
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="flex items-center gap-2 text-xs text-white/55">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Products for sale
                    </div>
                    {creator.productsForSale.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {creator.productsForSale.slice(0, 12).map(product => (
                          <Badge key={product} variant="secondary" className="rounded-full bg-purple-500/15 text-purple-100">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-white/65">No products listed yet.</div>
                    )}
                  </div>
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Credentials</div>
                    {creator.credentials.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {creator.credentials.slice(0, 12).map(credential => (
                          <Badge key={credential} variant="secondary" className="rounded-full bg-emerald-500/15 text-emerald-100">
                            {credential}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-white/65">No credentials listed yet.</div>
                    )}
                  </div>
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Past work highlights</div>
                    {creator.workHighlights.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
                        {creator.workHighlights.slice(0, 8).map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 text-sm text-white/65">No past work highlights listed yet.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Storefront */}
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                  <ShoppingBag className="h-4 w-4 opacity-90" />
                  Storefront
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {products.products.length === 0 ? (
                  <div className={`${paInset} p-5 text-sm text-white/65`}>No products listed yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {products.products.slice(0, 6).map(product => (
                      <div key={product.id} className={`${paInset} overflow-hidden`}>
                        <div className="aspect-square bg-black/20">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-white/45">No product image</div>
                          )}
                        </div>
                        <div className="p-3.5">
                          <div className="truncate text-sm font-medium text-white">{product.name}</div>
                          <div className="mt-1 text-xs text-white/60">{product.type || "Product"}</div>
                          <div className="mt-2 text-sm font-semibold text-purple-100">
                            {product.price !== null ? `${product.currency || "USD"} ${product.price.toFixed(2)}` : "Price on request"}
                          </div>
                          {product.inventoryCount !== null ? (
                            <div className="mt-1 text-xs text-white/50">
                              {product.inventoryCount > 0 ? `${product.inventoryCount} in stock` : "Out of stock"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
        creatorType={creator.primaryCreatorType}
        serviceOfferings={creator.serviceOfferings}
      />
    </PublicProfileLayout>
  )
}

