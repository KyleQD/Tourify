"use client"

import { useState } from "react"
import { Check, X, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

export interface FollowRequestItem {
  id: string
  requester_id: string
  created_at: string
  profiles: {
    id: string
    username: string
    full_name: string | null
    avatar_url?: string | null
    is_verified?: boolean | null
  } | null
}

interface FollowRequestsPanelProps {
  requests: FollowRequestItem[]
  isLoading?: boolean
  error?: string | null
  onAccept: (requesterId: string) => Promise<void> | void
  onReject: (requesterId: string) => Promise<void> | void
  onRetry?: () => void
  compact?: boolean
}

export function FollowRequestsPanel({
  requests,
  isLoading = false,
  error = null,
  onAccept,
  onReject,
  onRetry,
  compact = false,
}: FollowRequestsPanelProps) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  async function handleAction(requesterId: string, action: "accept" | "reject") {
    setPendingActionId(`${action}-${requesterId}`)
    try {
      if (action === "accept")
        await onAccept(requesterId)
      else
        await onReject(requesterId)
    } finally {
      setPendingActionId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-400">Loading requests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-10 text-center">
        <UserPlus className="mx-auto mb-3 h-10 w-10 text-red-400/70" />
        <p className="text-sm text-red-300">{error}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-3 text-purple-300 hover:bg-purple-500/10 hover:text-purple-100"
          >
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <UserPlus className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-400">No pending follow requests</p>
        <p className="mt-1 text-xs text-slate-500">
          When someone wants to connect, they&apos;ll show up here.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${compact ? "max-h-72 overflow-y-auto pr-1" : "max-h-96 overflow-y-auto"}`}>
      {requests.map((request) => {
        const profile = request.profiles
        const displayName = profile?.full_name || profile?.username || "Unknown user"
        const username = profile?.username || "unknown"
        const initial = displayName.charAt(0).toUpperCase()
        const isAccepting = pendingActionId === `accept-${request.requester_id}`
        const isRejecting = pendingActionId === `reject-${request.requester_id}`
        const isBusy = isAccepting || isRejecting

        return (
          <div
            key={request.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 backdrop-blur-sm transition-colors hover:bg-slate-800/70"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-purple-500/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-sm text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{displayName}</p>
                  {profile?.is_verified && (
                    <Badge variant="outline" className="border-purple-500/40 text-[10px] text-purple-300">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-slate-400">
                  @{username}
                  <span className="mx-1.5 text-slate-600">·</span>
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() => handleAction(request.requester_id, "accept")}
                className="h-8 bg-gradient-to-r from-emerald-600 to-green-600 px-3 text-white hover:from-emerald-500 hover:to-green-500"
              >
                {isAccepting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => handleAction(request.requester_id, "reject")}
                className="h-8 border-slate-600 bg-slate-900/40 px-3 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {isRejecting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
