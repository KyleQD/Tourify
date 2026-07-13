"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UserPlus, UserCheck, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  isFollowableAccountType,
  resolveRelationshipKind,
  type RelationshipKind,
} from "@/lib/social/relationship-intent"

export type FollowFriendRelationship =
  | "none"
  | "pending"
  | "incoming"
  | "following"
  | "friends"

interface FollowFriendButtonProps {
  kind?: RelationshipKind | "auto"
  targetAccountId?: string | null
  targetUserId?: string | null
  accountType?: string | null
  initialRelationship?: FollowFriendRelationship
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  onChanged?: (relationship: FollowFriendRelationship, kind: RelationshipKind) => void
}

export function FollowFriendButton({
  kind = "auto",
  targetAccountId = null,
  targetUserId = null,
  accountType = null,
  initialRelationship = "none",
  className,
  size = "sm",
  onChanged,
}: FollowFriendButtonProps) {
  const resolvedKind =
    kind === "auto"
      ? resolveRelationshipKind({
          targetAccountType: accountType,
          forceKind: isFollowableAccountType(accountType) ? "follow" : "friend",
        })
      : kind

  const [relationship, setRelationship] = useState<FollowFriendRelationship>(initialRelationship)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setRelationship(initialRelationship)
  }, [initialRelationship])

  useEffect(() => {
    if (!targetAccountId && !targetUserId) return

    let cancelled = false
    async function checkStatus() {
      try {
        const params = new URLSearchParams({ intent: resolvedKind })
        if (targetAccountId) params.set("targetAccountId", targetAccountId)
        if (targetUserId) params.set("targetUserId", targetUserId)
        const response = await fetch(`/api/social/relationship?${params.toString()}`, {
          credentials: "include",
        })
        if (!response.ok || cancelled) return
        const data = await response.json()
        if (cancelled) return
        if (data.relationship) setRelationship(data.relationship)
      } catch {
        // ignore status hydrate failures
      }
    }

    void checkStatus()
    return () => {
      cancelled = true
    }
  }, [resolvedKind, targetAccountId, targetUserId])

  async function handleClick() {
    if (!targetAccountId && !targetUserId) {
      toast.error("Missing relationship target")
      return
    }

    setIsLoading(true)
    try {
      let action = "follow"
      if (resolvedKind === "follow")
        action = relationship === "following" ? "unfollow" : "follow"
      else if (relationship === "friends") action = "unfriend"
      else if (relationship === "pending") action = "cancel"
      else if (relationship === "incoming" && targetUserId) action = "accept"
      else action = "friend_request"

      const response = await fetch("/api/social/relationship", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          intent: resolvedKind,
          targetAccountId,
          targetUserId,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Could not update relationship")
        return
      }

      let next: FollowFriendRelationship = "none"
      if (resolvedKind === "follow")
        next = action === "follow" || data.action === "already_following" ? "following" : "none"
      else if (action === "friend_request" || data.action === "request_sent") next = "pending"
      else if (action === "accept" || data.action === "request_accepted" || data.action === "already_friends")
        next = "friends"
      else next = "none"

      setRelationship(next)
      onChanged?.(next, resolvedKind)

      if (resolvedKind === "follow")
        toast.success(next === "following" ? "Following" : "Unfollowed")
      else if (next === "pending") toast.success("Friend request sent")
      else if (next === "friends") toast.success("You are now friends")
      else toast.success(action === "unfriend" ? "Unfriended" : "Request cancelled")
    } catch (error) {
      console.error("FollowFriendButton error:", error)
      toast.error("Could not update relationship")
    } finally {
      setIsLoading(false)
    }
  }

  const label =
    resolvedKind === "follow"
      ? relationship === "following"
        ? "Following"
        : "Follow"
      : relationship === "friends"
        ? "Friends"
        : relationship === "pending"
          ? "Pending"
          : relationship === "incoming"
            ? "Accept"
            : "Add Friend"

  const Icon =
    resolvedKind === "follow"
      ? relationship === "following"
        ? Check
        : UserPlus
      : relationship === "friends" || relationship === "pending"
        ? UserCheck
        : UserPlus

  return (
    <Button
      size={size}
      disabled={isLoading}
      onClick={handleClick}
      className={cn(
        relationship === "following" || relationship === "friends" || relationship === "pending"
          ? "border border-slate-600 bg-slate-900/50 text-slate-100 hover:bg-slate-800"
          : "bg-violet-600 text-white hover:bg-violet-500",
        className
      )}
      variant={relationship === "none" || relationship === "incoming" ? "default" : "outline"}
    >
      {isLoading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="mr-1.5 h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  )
}
