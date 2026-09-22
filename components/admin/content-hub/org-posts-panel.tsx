"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { OrgPostItem } from "./content-hub-types"

interface OrgPostsPanelProps {
  posts: OrgPostItem[]
  isLoading: boolean
}

export function OrgPostsPanel({ posts, isLoading }: OrgPostsPanelProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          Loading organization posts…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">
          Organization posts ({posts.length})
        </CardTitle>
        <p className="text-xs text-slate-500">
          Tourify feed posts published as this organization, with in-app engagement.
        </p>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">
            No posts for this organization yet.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`rounded-sm border p-3 ${
                  !post.is_visible
                    ? "opacity-50 border-red-700/30 bg-red-950/10"
                    : "border-slate-700/50 bg-slate-800/40"
                }`}
              >
                <p className="text-sm text-slate-200 line-clamp-3">
                  {post.content || "(no content)"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="text-[10px] bg-slate-700/60 text-slate-300 border-slate-600">
                      {post.moderation_status}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {post.author_name || "Org"} ·{" "}
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comments_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {post.shares_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
