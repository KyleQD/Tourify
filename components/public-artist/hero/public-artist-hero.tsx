"use client"

import { useEffect, useMemo, useState } from "react"
import type { PublicArtistHeroDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Play, Share2, CalendarDays, MessageCircle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { paBtnRound, paHeroAspect, paHeroFrame, paShell, paStickyInner } from "@/components/public-artist/public-artist-ui"
import { FollowFriendButton } from "@/components/social/follow-friend-button"

export function PublicArtistHero({
  hero,
  viewer,
  creatorType,
  isAvailableForHire,
  hasMusic = true,
  onBookNow,
  onPlayMusic,
  onMessage,
}: {
  hero: PublicArtistHeroDTO
  viewer: PublicArtistViewerDTO
  creatorType: string | null
  isAvailableForHire: boolean
  hasMusic?: boolean
  onBookNow: () => void
  onPlayMusic: () => void
  onMessage?: () => void
}) {
  const [isStickyVisible, setIsStickyVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsStickyVisible(window.scrollY > 200)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const subtitle = useMemo(() => {
    const bits = []
    if (creatorType) bits.push(creatorType)
    if (hero.genres.length) bits.push(hero.genres.join(" • "))
    if (hero.location) bits.push(hero.location)
    return bits.length ? bits.join(" • ") : "Creator • Entrepreneur"
  }, [hero.genres, hero.location, creatorType])

  const handleMessage = () => {
    if (viewer.isOwner) return
    if (!viewer.isAuthenticated) {
      toast.error("Please sign in to send messages")
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
      <section className="w-full">
        <div className={`${paShell} pt-4 pb-2 sm:pb-4`}>
          <div className={paHeroFrame}>
            <div className={`${paHeroAspect} bg-gradient-to-br from-purple-950 via-black to-slate-950`}>
              {hero.banner?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.banner.url}
                  alt={`${hero.artistName} banner`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-end gap-4">
                    <Avatar className="h-24 w-24 shrink-0 border-2 border-white/15 bg-black/50 shadow-xl ring-4 ring-black/40 sm:h-28 sm:w-28">
                      <AvatarImage src={hero.avatarUrl || undefined} alt={`${hero.artistName} avatar`} />
                      <AvatarFallback className="rounded-full text-lg font-semibold">
                        {hero.artistName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 pb-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                          {hero.artistName}
                        </h1>
                        {hero.verified ? (
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

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {viewer.isOwner ? (
                      <Button asChild variant="secondary" className={`${paBtnRound} px-5`}>
                        <Link href="/artist/profile">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Profile
                        </Link>
                      </Button>
                    ) : (
                      <>
                        {viewer.isAuthenticated ? (
                          <FollowFriendButton
                            kind="follow"
                            accountType="artist"
                            targetUserId={hero.userId}
                            className={`${paBtnRound} px-5`}
                            size="default"
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            className={`${paBtnRound} px-5`}
                            onClick={() => toast.error("Please sign in to follow artists")}
                          >
                            Follow
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={handleMessage}
                          className={`${paBtnRound} px-5`}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                      </>
                    )}
                    <Button variant="secondary" onClick={share} className={`${paBtnRound} px-5`}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    {!viewer.isOwner ? (
                      <Button onClick={onBookNow} className={`${paBtnRound} px-5`}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Hire / Book
                      </Button>
                    ) : null}
                    {hasMusic ? (
                      <Button variant="outline" onClick={onPlayMusic} className={`${paBtnRound} border-white/25 bg-white/5 px-5 text-white hover:bg-white/10`}>
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

      {isStickyVisible ? (
        <div className={`sticky top-0 z-40 ${paShell} pt-2`}>
          <div className={`${paStickyInner} flex items-center justify-between gap-3 px-4 py-2.5`}>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{hero.artistName}</div>
              <div className="truncate text-xs text-white/55">{subtitle}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {viewer.isOwner ? (
                <Button asChild size="sm" variant="secondary" className={`${paBtnRound} px-3`}>
                  <Link href="/artist/profile">Edit</Link>
                </Button>
              ) : (
                <>
                  {viewer.isAuthenticated ? (
                    <FollowFriendButton
                      kind="follow"
                      accountType="artist"
                      targetUserId={hero.userId}
                      className={`${paBtnRound} px-3`}
                      size="sm"
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`${paBtnRound} px-3`}
                      onClick={() => toast.error("Please sign in to follow artists")}
                    >
                      Follow
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={handleMessage} className={`${paBtnRound} px-3`}>
                    Message
                  </Button>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={share} className={`${paBtnRound} px-3`}>
                Share
              </Button>
              {!viewer.isOwner ? (
                <Button size="sm" onClick={onBookNow} className={`${paBtnRound} px-3`}>
                  Hire
                </Button>
              ) : null}
              {hasMusic ? (
                <Button size="sm" variant="outline" onClick={onPlayMusic} className={`${paBtnRound} border-white/20 px-3`}>
                  Work
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
