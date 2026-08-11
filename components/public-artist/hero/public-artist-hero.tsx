"use client"

import { useMemo } from "react"
import type { PublicArtistHeroDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Play, Share2, CalendarDays, MessageCircle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { paBtnRound, paHeroAspect, paHeroFrame, paShell, paStickyInner } from "@/components/public-artist/public-artist-ui"
import { FollowFriendButton } from "@/components/social/follow-friend-button"
import type { PublicArtistThemedUi } from "@/lib/public-artist/public-artist-themed-ui"
import { cn } from "@/lib/utils"
import type { ArtistProfileAppearance } from "@/lib/public-artist/artist-profile-appearance"

export function PublicArtistHero({
  hero,
  viewer,
  creatorType,
  isAvailableForHire,
  hasMusic = true,
  allowBooking = true,
  themedUi,
  profileAppearance,
  onBookNow,
  onPlayMusic,
  onMessage,
  sectionLinks = [],
}: {
  hero: PublicArtistHeroDTO
  viewer: PublicArtistViewerDTO
  creatorType: string | null
  isAvailableForHire: boolean
  hasMusic?: boolean
  allowBooking?: boolean
  themedUi?: PublicArtistThemedUi
  profileAppearance?: ArtistProfileAppearance | null
  onBookNow: () => void
  onPlayMusic: () => void
  onMessage?: () => void
  sectionLinks?: Array<{ id: string; label: string }>
}) {
  const shell = themedUi?.shell ?? paShell
  const heroFrame = themedUi?.heroFrame ?? paHeroFrame
  const stickyInner = themedUi?.stickyInner ?? paStickyInner
  const btnRound = themedUi?.btnPrimary ? cn(themedUi.btnPrimary, "px-5") : `${paBtnRound} px-5`
  const btnGhost = themedUi?.btnGhost
    ? cn(themedUi.btnGhost, "px-5")
    : `${paBtnRound} border-white/25 bg-white/5 px-5 text-white hover:bg-white/10`
  const isBand = hero.profileKind === "band"
  const subtitle = useMemo(() => {
    const bits = []
    if (creatorType) bits.push(creatorType)
    if (hero.genres.length) bits.push(hero.genres.join(" • "))
    if (hero.location) bits.push(hero.location)
    return bits.length ? bits.join(" • ") : isBand ? "Band" : "Creator • Entrepreneur"
  }, [hero.genres, hero.location, creatorType, isBand])

  const handleMessage = () => {
    if (viewer.isOwner) return
    if (!viewer.isAuthenticated) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/login?tab=signin&redirect=${encodeURIComponent(returnUrl)}`)
      return
    }
    onMessage?.()
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${hero.artistName} on Tourify`,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success("Profile link copied")
    } catch {}
  }

  return (
    <>
      <section className="w-full" data-artist-profile-hero>
        <div className={`${shell} pt-4 pb-2 sm:pb-4`}>
          <div className={heroFrame} style={themedUi?.heroStyle} data-artist-hero-frame>
            <div
              className={`${paHeroAspect} bg-gradient-to-br from-purple-950 via-black to-slate-950`}
              data-artist-hero-canvas
            >
              {hero.banner?.url && profileAppearance?.showCoverImage !== false ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.banner.url}
                  alt={`${hero.artistName} banner`}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    objectPosition: profileAppearance
                      ? `${profileAppearance.heroFocalPoint.x}% ${profileAppearance.heroFocalPoint.y}%`
                      : undefined,
                  }}
                  loading="lazy"
                />
              ) : null}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/15"
                style={{ opacity: profileAppearance?.heroOverlayOpacity ?? 0.9 }}
              />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6" data-artist-hero-stage>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-end gap-4">
                    {profileAppearance?.showAvatar !== false ? <Avatar className="h-24 w-24 shrink-0 border-2 border-white/15 bg-black/50 shadow-xl ring-4 ring-black/40 sm:h-28 sm:w-28">
                      <AvatarImage src={hero.avatarUrl || undefined} alt={`${hero.artistName} avatar`} />
                      <AvatarFallback className="rounded-full text-lg font-semibold">
                        {hero.artistName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar> : null}
                    <div className="min-w-0 pb-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                          {hero.artistName}
                        </h1>
                        {hero.verified && profileAppearance?.showVerifiedBadge !== false ? (
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                            Verified
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm text-white/75 sm:text-base">{subtitle}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
                        <span>{hero.followersCount.toLocaleString()} followers</span>
                        <span className="hidden text-white/35 sm:inline">•</span>
                        <span>{hero.futureMonthlyListeners.toLocaleString()} monthly reach</span>
                        {isAvailableForHire ? (
                          <>
                            <span className="hidden text-white/35 sm:inline">•</span>
                            <span className="text-emerald-300/90">Available for hire</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    {viewer.isOwner ? (
                      <Button asChild variant="secondary" className={btnRound} style={themedUi?.btnGhostStyle}>
                        <Link href={isBand ? "/admin/dashboard/settings" : "/artist/profile"}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {isBand ? "Edit band" : "Edit profile"}
                        </Link>
                      </Button>
                    ) : null}
                    {!viewer.isOwner ? (
                      <>
                        {viewer.isAuthenticated ? (
                          <FollowFriendButton
                            kind="follow"
                            accountType={isBand ? "organization" : "artist"}
                            targetAccountId={isBand ? hero.publicAccountId : undefined}
                            targetUserId={hero.userId}
                            className={btnRound}
                            size="default"
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            className={btnRound}
                            onClick={() => {
                              const returnUrl = `${window.location.pathname}${window.location.search}`
                              window.location.assign(`/login?tab=signin&redirect=${encodeURIComponent(returnUrl)}`)
                            }}
                          >
                            Follow
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={handleMessage}
                          className={btnRound}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                      </>
                    ) : null}
                    <Button variant="secondary" onClick={share} className={btnRound}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    {!viewer.isOwner && allowBooking ? (
                      <Button onClick={onBookNow} className={btnRound} style={themedUi?.btnPrimaryStyle}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Hire / Book
                      </Button>
                    ) : null}
                    {hasMusic ? (
                      <Button variant="outline" onClick={onPlayMusic} className={btnGhost} style={themedUi?.btnGhostStyle}>
                        <Play className="mr-2 h-4 w-4" />
                        Explore Work
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={`sticky top-[70px] z-40 ${shell} py-2`} data-artist-sticky-bar>
        <div className={`${stickyInner} flex items-center justify-between gap-3 overflow-hidden px-3 py-2`} style={themedUi?.cardStyle}>
          <nav aria-label="Artist profile sections" className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
            <div className="flex min-w-max items-center gap-1">
              {sectionLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5">
            {viewer.isOwner ? (
              <Button asChild size="sm" variant="secondary" className={`${paBtnRound} px-3`}>
                <Link href={isBand ? "/admin/dashboard/settings" : "/artist/profile"}>Edit</Link>
              </Button>
            ) : allowBooking ? (
              <Button size="sm" onClick={onBookNow} className={`${paBtnRound} px-3`}>
                Hire
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={share} className={`${paBtnRound} px-3`} aria-label="Share profile">
              <Share2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
