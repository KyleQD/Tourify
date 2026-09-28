"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Flag, Eye, EyeOff } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import type { OrgPostItem } from "./content-hub-types"

type ModerationStatus = "all" | "approved" | "pending" | "flagged" | "removed"

interface ContentModerationPanelProps {
  posts: OrgPostItem[]
  isLoading: boolean
  actingHeaders: Record<string, string>
  onReload: () => Promise<void>
}

function ModerationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    flagged: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    removed: "bg-red-500/20 text-red-400 border-red-500/30",
  }
  return (
    <Badge className={`text-xs ${map[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
      {status}
    </Badge>
  )
}

export function ContentModerationPanel({
  posts,
  isLoading,
  actingHeaders,
  onReload,
}: ContentModerationPanelProps) {
  const [filter, setFilter] = useState<ModerationStatus>("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === "all") return posts
    return posts.filter((post) => post.moderation_status === filter)
  }, [posts, filter])

  async function moderate(id: string, updates: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/content-hub/moderation/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify(updates),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Moderation failed")
      toast.success("Post updated")
      await onReload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Moderation failed")
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          Loading moderation queue…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 text-sm">Filter by status:</span>
          <Select value={filter} onValueChange={(value) => setFilter(value as ModerationStatus)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({posts.length})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-500 text-xs ml-auto">
            Org-scoped only · {filtered.length} shown
          </span>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Organization feed posts</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              No organization posts match this filter.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className={`rounded-sm border p-3 ${
                    !post.is_visible
                      ? "opacity-50 border-red-700/30 bg-red-950/10"
                      : "border-slate-700/50 bg-slate-800/40"
                  }`}
                >
                  <p className="text-sm text-slate-200 line-clamp-2">
                    {post.content || "(no content)"}
                  </p>
                  <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ModerationBadge status={post.moderation_status} />
                      {!post.is_visible && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                          Hidden
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {post.author_name || "Org"} ·{" "}
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {post.moderation_status !== "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs"
                          disabled={busyId === post.id}
                          onClick={() =>
                            moderate(post.id, {
                              moderation_status: "approved",
                              is_visible: true,
                            })
                          }
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      )}
                      {post.moderation_status !== "flagged" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs"
                          disabled={busyId === post.id}
                          onClick={() => moderate(post.id, { moderation_status: "flagged" })}
                        >
                          <Flag className="h-3 w-3 mr-1" /> Flag
                        </Button>
                      )}
                      {post.moderation_status !== "removed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                          disabled={busyId === post.id}
                          onClick={() =>
                            moderate(post.id, {
                              moderation_status: "removed",
                              is_visible: false,
                            })
                          }
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-slate-400 hover:text-white text-xs"
                        disabled={busyId === post.id}
                        onClick={() => moderate(post.id, { is_visible: !post.is_visible })}
                      >
                        {post.is_visible ? (
                          <EyeOff className="h-3 w-3 mr-1" />
                        ) : (
                          <Eye className="h-3 w-3 mr-1" />
                        )}
                        {post.is_visible ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
