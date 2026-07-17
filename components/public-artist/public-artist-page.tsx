"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { PublicArtistPageDTO } from "@/lib/public-artist/public-artist-types"
import { PublicProfileLayout } from "@/components/layouts/public-profile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Briefcase, ExternalLink, Handshake, Image as ImageIcon, Pencil, ShoppingBag, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PublicArtistMusicSection } from "@/components/public-artist/music/public-artist-music-section"
import { PublicArtistPostsSection } from "@/components/public-artist/posts/public-artist-posts-section"
import { PublicArtistEventsSection } from "@/components/public-artist/events/public-artist-events-section"
import { PublicArtistEPKSection } from "@/components/public-artist/epk/public-artist-epk-section"
import { PublicArtistHero } from "@/components/public-artist/hero/public-artist-hero"
import { BookThisArtistModal } from "@/components/public-artist/events/book-this-artist-modal"
import { ProfileShareCard } from "@/components/profile/profile-share-card"
import { MessageModal } from "@/components/messaging/message-modal"
import { extractApiError } from "@/lib/api/extract-error"
import { paCard, paInset, paShell } from "@/components/public-artist/public-artist-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AnimatedProductCard } from "@/components/marketplace/animated-product-card"
import { StorefrontBanner } from "@/components/marketplace/storefront-banner"
import { getStorefrontTheme, DEFAULT_STOREFRONT_THEME, getLayoutClasses, type StorefrontThemeConfig } from "@/lib/marketplace/storefront-themes"
import {
  DEFAULT_STOREFRONT_SECTIONS,
  STOREFRONT_SECTION_LABELS,
  isFeaturedListing,
  normalizeStorefrontSections,
} from "@/lib/marketplace/storefront-curation"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"

interface MarketplaceListing {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  currency: string
  base_price: number | null
  cover_image_url: string | null
  featured_rank?: number | null
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")
}

export function PublicArtistPage({ dto, username }: { dto: PublicArtistPageDTO; username: string }) {
  const { hero, tracks, events, about, media, posts, stats, epk, creator, organizations, socialLinks = [], bandMembers = [] } = dto
  const isBand = dto.pageKind === "band"
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([])
  const [isCheckoutLoadingId, setIsCheckoutLoadingId] = useState<string | null>(null)
  const [marketplaceMessage, setMarketplaceMessage] = useState<string | null>(null)
  const [selectedVariantByListing, setSelectedVariantByListing] = useState<Record<string, string>>({})
  const [storefrontExternalLinks, setStorefrontExternalLinks] = useState<Array<{ label: string; url: string }>>([])
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontThemeConfig>(DEFAULT_STOREFRONT_THEME)
  const [storefrontDisplayName, setStorefrontDisplayName] = useState<string | null>(null)
  const [storefrontTagline, setStorefrontTagline] = useState<string | null>(null)
  const [storefrontSections, setStorefrontSections] = useState<string[]>([...DEFAULT_STOREFRONT_SECTIONS])
  const [hasLoadedStorefront, setHasLoadedStorefront] = useState(false)

  const openBooking = () => setIsBookingOpen(true)
  const scrollToMusic = () =>
    document.getElementById("public-artist-music")?.scrollIntoView({ behavior: "smooth", block: "start" })
  const scrollToEvents = () =>
    document.getElementById("public-artist-events")?.scrollIntoView({ behavior: "smooth", block: "start" })

  useEffect(() => {
    if (isBand) {
      setHasLoadedStorefront(true)
      return
    }
    void loadMarketplaceListings()
    void loadStorefrontLinks()
  }, [hero.userId, isBand])

  async function loadMarketplaceListings() {
    try {
      const response = await fetch(`/api/marketplace/discover?sellerUserId=${encodeURIComponent(hero.userId)}&limit=18`)
      if (!response.ok) return
      const body = await response.json()
      const listings = Array.isArray(body.data) ? body.data : []
      setMarketplaceListings(listings)
      setSelectedVariantByListing(prev => {
        const next = { ...prev }
        for (const listing of listings as MarketplaceListing[]) {
          if (next[listing.id]) continue
          const firstVariant = listing.marketplace_listing_variants?.[0]
          if (firstVariant?.id) next[listing.id] = firstVariant.id
        }
        return next
      })
    } catch (error) {
      console.error("Failed to load marketplace listings", error)
    } finally {
      setHasLoadedStorefront(true)
    }
  }

  async function loadStorefrontLinks() {
    try {
      const response = await fetch(`/api/marketplace/storefront?sellerUserId=${encodeURIComponent(hero.userId)}`)
      if (!response.ok) return
      const body = await response.json()
      if (Array.isArray(body.data?.external_links)) {
        setStorefrontExternalLinks(body.data.external_links)
      }
      const rawTheme = body.data?.theme_config || body.data?.themeConfig || {}
      setStorefrontTheme(getStorefrontTheme(rawTheme))
      setStorefrontDisplayName(body.data?.display_name || body.data?.displayName || null)
      setStorefrontTagline(body.data?.tagline || null)
      setStorefrontSections(normalizeStorefrontSections(body.data?.sections))
    } catch {}
  }

  async function checkoutListing(listing: MarketplaceListing) {
    try {
      setMarketplaceMessage(null)
      setIsCheckoutLoadingId(listing.id)
      const variants = listing.marketplace_listing_variants || []
      const selectedVariantId =
        selectedVariantByListing[listing.id] ||
        variants[0]?.id
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [
            {
              listingId: listing.id,
              variantId: selectedVariantId,
              quantity: 1,
            },
          ],
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          const redirectTo = `${window.location.pathname}${window.location.search}#public-artist-storefront`
          window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(redirectTo)}`
          return
        }
        if (body?.error?.code === "seller_payouts_not_ready") {
          setMarketplaceMessage("This seller is finishing payout setup and cannot accept purchases yet.")
          return
        }
        if (body?.error?.code === "insufficient_inventory") {
          setMarketplaceMessage("This item is sold out or low on inventory.")
          return
        }
        setMarketplaceMessage(extractApiError(body, "Checkout failed"))
        return
      }
      if (body.data?.checkoutUrl) window.location.href = body.data.checkoutUrl
    } catch (error) {
      console.error("Checkout failed", error)
      setMarketplaceMessage("Unable to start checkout right now")
    } finally {
      setIsCheckoutLoadingId(null)
    }
  }

  const featuredListings = marketplaceListings.filter(isFeaturedListing)
  const hasMusic = tracks.tracks.length > 0
  const showStorefront = !isBand && (!hasLoadedStorefront || marketplaceListings.length > 0)
  const storefrontCategories = storefrontSections.map(section => {
    if (section === "featured") {
      return {
        value: "featured",
        label: STOREFRONT_SECTION_LABELS.featured,
        listings: featuredListings,
      }
    }
    return {
      value: section,
      label: STOREFRONT_SECTION_LABELS[section] || section,
      listings: marketplaceListings.filter(l => l.category === section),
    }
  })
  const visibleCategories = marketplaceListings.length
    ? storefrontCategories.filter(cat => cat.value === "featured" || cat.listings.length > 0)
    : storefrontCategories.filter(cat => cat.value === "featured").slice(0, 1)

  return (
    <PublicProfileLayout profileName={hero.artistName} profileType="artist">
      <div className="relative">
        {dto.viewer.isOwner ? (
          <div className="border-b border-white/10 bg-black/60 backdrop-blur-md">
            <div className={`${paShell} flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0 text-sm text-white/75">
                <span>You’re viewing your public profile</span>
                {!dto.viewer.isPublicProfile ? (
                  <span className="mt-1 block text-xs text-amber-200/90 sm:mt-0 sm:ml-2 sm:inline">
                    This profile is private — visitors cannot see it
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
                  <Link href={isBand ? "/admin/dashboard/settings" : "/artist/profile"}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Profile
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant={isBand ? "secondary" : "outline"}
                  className={isBand ? "rounded-full bg-cyan-300/15 px-4 text-cyan-100 hover:bg-cyan-300/25" : "rounded-full border-white/20 px-4 text-white hover:bg-white/10"}
                >
                  <Link href={isBand ? "/admin/dashboard/organization" : "/artist"}>
                    {isBand ? <Users className="mr-1.5 h-3.5 w-3.5" /> : null}
                    {isBand ? "Band Hub" : "Manage"}
                    {isBand ? <ArrowRight className="ml-1.5 h-3.5 w-3.5" /> : null}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero */}
        <PublicArtistHero
          hero={hero}
          viewer={dto.viewer}
          creatorType={creator.primaryCreatorType}
          isAvailableForHire={creator.availableForHire}
          hasMusic={hasMusic}
          allowBooking={!isBand}
          onBookNow={() => {
            openBooking()
            scrollToEvents()
          }}
          onPlayMusic={scrollToMusic}
          onMessage={() => setShowMessageModal(true)}
        />

        {socialLinks.length > 0 ? (
          <section className={`${paShell} pt-2`}>
            <div className={`${paCard} p-4`}>
              <p className="text-xs uppercase tracking-[0.16em] text-white/50 mb-3">Connect</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(link => (
                  <a
                    key={`${link.platform}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <main className={`${paShell} space-y-8 pb-28 pt-2 sm:pt-4`}>
          <section>
            <ProfileShareCard
              username={username}
              displayName={hero.artistName}
              sharePath="/artist"
            />
          </section>

          {isBand ? (
            <section>
              <Card className={paCard}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                    <Users className="h-4 w-4 opacity-90" />
                    Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {bandMembers.length === 0 ? (
                    <div className={`${paInset} p-5 text-sm text-white/55`}>
                      {dto.viewer.isOwner ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                              <Users className="h-4 w-4" />
                            </span>
                            <span>Invite artists to list your band members.</span>
                          </div>
                          <Button asChild size="sm" variant="secondary" className="bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25">
                            <Link href="/admin/dashboard/organization">
                              Open Band Hub
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        "No members listed yet."
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bandMembers.map(member => {
                        const href = getArtistPublicProfilePath(member.artistSlug || member.artistProfileId)
                        return (
                          <Link
                            key={member.membershipId}
                            href={href || "#"}
                            className={`${paInset} flex items-center gap-3 p-3 transition hover:bg-white/[0.07]`}
                          >
                            <Avatar className="h-12 w-12 border border-white/10">
                              <AvatarImage src={member.avatarUrl || undefined} alt={member.artistName} />
                              <AvatarFallback>{initials(member.artistName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-white/95">{member.artistName}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge variant="secondary" className="rounded-full bg-white/10 text-xs capitalize text-white/80">
                                  {member.role}
                                </Badge>
                                {member.genres.slice(0, 2).map(genre => (
                                  <span key={genre} className="text-xs text-white/45">{genre}</span>
                                ))}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {/* Music */}
          {(!isBand || hasMusic) ? (
          <section id="public-artist-music" className="scroll-mt-28">
            <PublicArtistMusicSection
              viewer={dto.viewer}
              creatorType={creator.primaryCreatorType}
              featuredTrack={tracks.featuredTrack}
              tracks={tracks.tracks}
              defaultTrackId={tracks.defaultTrackId}
              artistName={hero.artistName}
            />
          </section>
          ) : null}

          {/* Storefront — hide when empty for everyone */}
          {showStorefront && (
          <section id="public-artist-storefront" className="scroll-mt-28">
            <Card className={paCard}>
              <CardContent className="p-0">
                <StorefrontBanner
                  displayName={storefrontDisplayName || hero.artistName + "'s Store"}
                  tagline={storefrontTagline}
                  theme={storefrontTheme}
                />

                <div className="p-5 pt-4">
                  {!hasLoadedStorefront ? (
                    <div className={`${paInset} p-5 text-sm text-white/55`}>Loading storefront…</div>
                  ) : (
                    <Tabs defaultValue="featured" className="w-full">
                      <TabsList className="mb-4">
                        {visibleCategories.map(cat => (
                          <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
                        ))}
                      </TabsList>

                      {visibleCategories.map(cat => (
                        <TabsContent key={cat.value} value={cat.value}>
                          <ThemedProductGrid
                            listings={cat.listings}
                            theme={storefrontTheme}
                            onCheckout={checkoutListing}
                            isCheckoutLoadingId={isCheckoutLoadingId}
                            selectedVariantByListing={selectedVariantByListing}
                            onSelectVariant={(listingId, variantId) =>
                              setSelectedVariantByListing(prev => ({ ...prev, [listingId]: variantId }))
                            }
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                  {marketplaceMessage ? <div className="mt-3 text-xs text-rose-200">{marketplaceMessage}</div> : null}
                </div>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Events */}
          <section id="public-artist-events" className="scroll-mt-28">
            <PublicArtistEventsSection
              viewer={dto.viewer}
              artistName={hero.artistName}
              creatorType={creator.primaryCreatorType}
              isAvailableForHire={creator.availableForHire}
              upcomingEvents={events.upcomingEvents}
              onBookThisArtist={openBooking}
            />
          </section>

          {/* Services */}
          {!isBand ? (
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
                  {creator.serviceOfferings.length > 0 && (
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Service offerings</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {creator.serviceOfferings.slice(0, 12).map(service => (
                        <Badge key={service} variant="secondary" className="rounded-full bg-white/10 text-white/85">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  )}
                  {creator.productsForSale.length > 0 && (
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="flex items-center gap-2 text-xs text-white/55">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Products for sale
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {creator.productsForSale.slice(0, 12).map(product => (
                        <Badge key={product} variant="secondary" className="rounded-full bg-purple-500/15 text-purple-100">
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  )}
                  {creator.credentials.length > 0 && (
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Credentials</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {creator.credentials.slice(0, 12).map(credential => (
                        <Badge key={credential} variant="secondary" className="rounded-full bg-emerald-500/15 text-emerald-100">
                          {credential}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  )}
                  {creator.workHighlights.length > 0 && (
                  <div className={`${paInset} p-4 sm:col-span-2`}>
                    <div className="text-xs text-white/55">Past work highlights</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
                      {creator.workHighlights.slice(0, 8).map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {/* External Links */}
          {storefrontExternalLinks.length > 0 && (
            <section>
              <Card className={paCard}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                    <ExternalLink className="h-4 w-4 opacity-90" />
                    Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {storefrontExternalLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/85 transition hover:bg-white/10"
                      >
                        <ExternalLink className="h-3 w-3 opacity-60" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* About — hide empty bio for everyone */}
          {about.bio ? (
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold tracking-tight text-white">About</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`${paInset} p-5 text-sm leading-relaxed text-white/80`}>{about.bio}</div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {(organizations?.length ?? 0) > 0 ? (
            <section>
              <Card className={paCard}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold tracking-tight text-white">Member of</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {organizations.map((org) => {
                      const href = org.slug
                        ? org.subtype === "band"
                          ? `/artist/${org.slug}`
                          : `/organization/${org.slug}`
                        : null
                      const label = org.subtype
                        ? `${org.name} · ${org.subtype.replace(/_/g, ' ')}`
                        : org.name
                      if (!href) {
                        return (
                          <Badge key={org.organizationId} variant="secondary" className="bg-white/10 text-white/90">
                            {label}
                          </Badge>
                        )
                      }
                      return (
                        <Link key={org.organizationId} href={href}>
                          <Badge variant="secondary" className="bg-white/10 text-white/90 hover:bg-white/20">
                            {label}
                          </Badge>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {/* Media — hide empty gallery for everyone */}
          {media.items.length > 0 ? (
          <section>
            <Card className={paCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                  <ImageIcon className="h-4 w-4 opacity-90" />
                  Media Gallery
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
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
              </CardContent>
            </Card>
          </section>
          ) : null}

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
                    <div className="text-xs text-white/55">{isBand ? "Members" : "Monthly Listeners"}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-white">{stats.futureMonthlyListeners.toLocaleString()}</div>
                  </div>
                  <div className={`${paInset} col-span-2 p-4 sm:col-span-1`}>
                    <div className="text-xs text-white/55">{isBand ? "Upcoming Events" : "Total Streams"}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-white">
                      {(isBand ? stats.totalEvents : stats.totalStreams).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* EPK Preview */}
          {!isBand ? (
          <section>
            <PublicArtistEPKSection hero={hero} stats={stats} epk={epk} viewer={dto.viewer} />
          </section>
          ) : null}
        </main>
      </div>

      {!isBand ? (
      <BookThisArtistModal
        isOpen={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        artistUserId={hero.userId}
        artistName={hero.artistName}
        creatorType={creator.primaryCreatorType}
        serviceOfferings={creator.serviceOfferings}
      />
      ) : null}

      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        recipient={{
          id: hero.userId,
          username,
          full_name: hero.artistName,
          avatar_url: hero.avatarUrl || undefined,
        }}
      />
    </PublicProfileLayout>
  )
}

function ThemedProductGrid({
  listings,
  theme,
  onCheckout,
  isCheckoutLoadingId,
  selectedVariantByListing,
  onSelectVariant,
}: {
  listings: MarketplaceListing[]
  theme: StorefrontThemeConfig
  onCheckout: (listing: MarketplaceListing) => Promise<void>
  isCheckoutLoadingId: string | null
  selectedVariantByListing: Record<string, string>
  onSelectVariant: (listingId: string, variantId: string) => void
}) {
  if (!listings.length) return null

  const layoutClasses = getLayoutClasses(theme.layout)

  return (
    <div className={layoutClasses}>
      {listings.map((listing, index) => {
        const variants = listing.marketplace_listing_variants || []
        const hasMultipleVariants = variants.length > 1
        return (
          <div key={listing.id} className="space-y-2">
            {hasMultipleVariants ? (
              <select
                className="h-9 w-full rounded-md border border-white/15 bg-black/30 px-3 text-xs text-white"
                value={selectedVariantByListing[listing.id] || variants[0]?.id || ""}
                onChange={event => onSelectVariant(listing.id, event.target.value)}
              >
                {variants.map(variant => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title} — {listing.currency || "USD"} {Number(variant.price).toFixed(2)}
                  </option>
                ))}
              </select>
            ) : null}
            <AnimatedProductCard
              id={listing.id}
              title={listing.title}
              description={listing.description}
              imageUrl={listing.cover_image_url}
              productType={listing.product_type}
              category={listing.category}
              price={
                hasMultipleVariants
                  ? Number(variants.find(v => v.id === selectedVariantByListing[listing.id])?.price ?? listing.base_price)
                  : listing.base_price
              }
              currency={listing.currency}
              index={index}
              theme={theme}
              layout={theme.layout}
              isCheckoutLoading={isCheckoutLoadingId === listing.id}
              onCheckout={() => void onCheckout(listing)}
            />
          </div>
        )
      })}
    </div>
  )
}
