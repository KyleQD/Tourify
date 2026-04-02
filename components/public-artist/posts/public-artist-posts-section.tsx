"use client"

import { useMemo, useState } from "react"
import type { PublicArtistPostDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share2, Pin } from "lucide-react"
import Link from "next/link"
import { paBtnRound, paCard, paInset } from "@/components/public-artist/public-artist-ui"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export function PublicArtistPostsSection({
  viewer,
  pinnedPosts,
  posts
}: {
  viewer: PublicArtistViewerDTO
  pinnedPosts: PublicArtistPostDTO[]
  posts: PublicArtistPostDTO[]
}) {
  const [optimisticPinnedById, setOptimisticPinnedById] = useState<Record<string, boolean>>({})

  const ordered = useMemo(() => [...pinnedPosts, ...posts], [pinnedPosts, posts])

  const togglePin = async (post: PublicArtistPostDTO) => {
    if (!viewer.isOwner) return

    const nextPinned = !(optimisticPinnedById[post.id] ?? post.isPinned)
    setOptimisticPinnedById(prev => ({ ...prev, [post.id]: nextPinned }))

    try {
      const res = await fetch("/api/posts/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, isPinned: nextPinned })
      })

      if (!res.ok) setOptimisticPinnedById(prev => ({ ...prev, [post.id]: post.isPinned }))
    } catch {
      setOptimisticPinnedById(prev => ({ ...prev, [post.id]: post.isPinned }))
    }
  }

  return (
    <Card className={paCard}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight text-white">Posts</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {ordered.length === 0 ? (
          <div className={`${paInset} flex flex-col gap-3 p-5`}>
            <div className="text-sm text-white/70">
              {viewer.isOwner
                ? "Share your first post to start your activity feed."
                : "No posts yet. Check back soon."}
            </div>
            {viewer.isOwner ? (
              <Button asChild className={`${paBtnRound} w-fit px-5`}>
                <Link href="/dashboard">Create a post</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {ordered.slice(0, 10).map(post => {
              const isPinned = optimisticPinnedById[post.id] ?? post.isPinned
              const primaryMedia = post.mediaUrls[0] ?? null

              return (
                <div key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 ring-1 ring-white/5">
                  {primaryMedia ? (
                    <div className="aspect-video bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={primaryMedia}
                        alt="Post media"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-medium text-white/90">{post.authorName}</div>
                          {isPinned ? (
                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide">
                              Pinned
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-white/60 text-xs mt-1">
                          {formatSafeDate(post.createdAt)}
                        </div>
                      </div>

                      {viewer.isOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePin(post)}
                          className="shrink-0 rounded-full"
                        >
                          <Pin className={["h-4 w-4", isPinned ? "text-purple-300" : "text-white/60"].join(" ")} />
                        </Button>
                      ) : null}
                    </div>

                    {post.content ? (
                      <div className="text-white/75 text-sm mt-3 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center gap-4 text-white/70 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        <span>{post.likesCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{post.commentsCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3.5 w-3.5" />
                        <span>{post.sharesCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

