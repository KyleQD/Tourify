"use client"

import { useState } from "react"
import { ImageOff, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidFeedMediaUrl } from "@/lib/feed/media-url-utils"

export type FeedMediaType = "image" | "video"

export interface MediaItem {
  id?: string
  type?: FeedMediaType | string | null
  url: string
  alt_text?: string | null
  alt?: string | null
  altText?: string | null
  thumbnail_url?: string | null
  thumbnailUrl?: string | null
}

interface FeedMediaGridProps {
  mediaItems?: MediaItem[] | null
  postId?: string
  className?: string
  frameClassName?: string
}

function inferMediaType(item: MediaItem): FeedMediaType {
  if (item.type === "video") return "video"
  if (item.type === "image") return "image"

  const url = item.url.toLowerCase().split("?")[0]
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(url)) return "video"
  return "image"
}

function normalizeMediaEntry(input: unknown, index: number, postId?: string): MediaItem | null {
  if (typeof input === "string") {
    if (!isValidFeedMediaUrl(input)) return null
    return {
      id: postId ? `${postId}-media-${index}` : `media-${index}`,
      type: inferMediaType({ url: input }),
      url: input.trim(),
      alt_text: `Post media ${index + 1}`,
    }
  }

  if (!input || typeof input !== "object") return null
  const item = input as Record<string, any>
  const url = String(item.url || "").trim()
  if (!isValidFeedMediaUrl(url)) return null

  return {
    id: item.id || (postId ? `${postId}-media-${index}` : `media-${index}`),
    type: inferMediaType({ type: item.type, url }),
    url,
    thumbnail_url: item.thumbnail_url || item.thumbnailUrl || null,
    alt_text: item.alt_text || item.altText || item.alt || `Post media ${index + 1}`,
  }
}

/**
 * Normalizes media data from the feed's legacy and current API shapes.
 */
export function normalizeMediaData(post: any): MediaItem[] {
  const candidates = [
    post?.media_items,
    post?.media,
    post?.post_media,
    post?.media_urls,
  ]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue
    const normalized = candidate
      .map((item, index) => normalizeMediaEntry(item, index, post?.id))
      .filter(Boolean) as MediaItem[]
    if (normalized.length > 0) return normalized
  }

  return []
}

function BrokenMediaTile({ type }: { type: FeedMediaType }) {
  const Icon = type === "video" ? VideoOff : ImageOff
  return (
    <div className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 bg-slate-900/80 px-4 text-center text-slate-400">
      <Icon className="h-7 w-7 text-slate-500" />
      <span className="text-xs font-medium">Media unavailable</span>
    </div>
  )
}

function FeedMediaTile({
  item,
  className,
}: {
  item: MediaItem
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const type = inferMediaType(item)

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-slate-900/70", className)}>
      {failed ? (
        <BrokenMediaTile type={type} />
      ) : type === "video" ? (
        <video
          src={item.url}
          poster={item.thumbnail_url || item.thumbnailUrl || undefined}
          controls
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={item.url}
          alt={item.alt_text || item.altText || item.alt || "Post media"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

export function FeedMediaGrid({
  mediaItems,
  postId,
  className,
  frameClassName,
}: FeedMediaGridProps) {
  const normalized = (mediaItems || [])
    .map((item, index) => normalizeMediaEntry(item, index, postId))
    .filter(Boolean) as MediaItem[]

  if (normalized.length === 0) return null

  if (normalized.length === 1) {
    return (
      <div className={cn("mt-4", className)}>
        <FeedMediaTile
          item={normalized[0]}
          className={cn("aspect-[4/3] max-h-[28rem] w-full", frameClassName)}
        />
      </div>
    )
  }

  if (normalized.length === 2) {
    return (
      <div className={cn("mt-4 grid grid-cols-2 gap-2", className)}>
        {normalized.slice(0, 2).map((item, index) => (
          <FeedMediaTile
            key={item.id || index}
            item={item}
            className={cn("aspect-square w-full", frameClassName)}
          />
        ))}
      </div>
    )
  }

  if (normalized.length === 3) {
    return (
      <div className={cn("mt-4 grid grid-cols-2 gap-2", className)}>
        <FeedMediaTile
          item={normalized[0]}
          className={cn("row-span-2 aspect-square h-full w-full", frameClassName)}
        />
        {normalized.slice(1, 3).map((item, index) => (
          <FeedMediaTile
            key={item.id || index}
            item={item}
            className={cn("aspect-[2/1] w-full", frameClassName)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("mt-4 grid grid-cols-2 gap-2", className)}>
      {normalized.slice(0, 4).map((item, index) => (
        <div key={item.id || index} className="relative">
          <FeedMediaTile
            item={item}
            className={cn("aspect-square w-full", frameClassName)}
          />
          {index === 3 && normalized.length > 4 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
              <span className="text-xl font-bold text-white">+{normalized.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function renderMediaContent(mediaItems: MediaItem[]) {
  return <FeedMediaGrid mediaItems={mediaItems} />
}
