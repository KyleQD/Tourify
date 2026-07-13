"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { toast } from "sonner"
import {
  FollowRequestsPanel,
  type FollowRequestItem,
} from "@/components/notifications/follow-requests-panel"

interface FollowRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onRequestsChanged?: () => void
}

export function FollowRequestsModal({ isOpen, onClose, onRequestsChanged }: FollowRequestsModalProps) {
  const [requests, setRequests] = useState<FollowRequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchFollowRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/social/follow-request?action=pending", {
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || "Failed to fetch follow requests")
        setRequests([])
        return
      }

      const data = await response.json()
      setRequests(data.requests || [])
      setHasLoaded(true)
    } catch (err) {
      console.error("Error fetching follow requests:", err)
      setError("Failed to fetch follow requests")
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen)
      void fetchFollowRequests()
  }, [isOpen, fetchFollowRequests])

  async function handleFollowRequest(requesterId: string, action: "accept" | "reject") {
    const response = await fetch("/api/social/follow-request", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: requesterId,
        action,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data.error || `Failed to ${action} follow request`)
      throw new Error(data.error || "action_failed")
    }

    toast.success(action === "accept" ? "Follow request accepted!" : "Follow request declined")
    setRequests((prev) => prev.filter((req) => req.requester_id !== requesterId))
    onRequestsChanged?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-700/60 bg-gradient-to-b from-slate-900/98 to-slate-800/98 text-white shadow-2xl backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
              <Users className="h-4 w-4 text-purple-300" />
            </div>
            Friend Requests
            {hasLoaded && requests.length > 0 && (
              <Badge className="ml-1 border-0 bg-purple-500/20 text-purple-200">
                {requests.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <FollowRequestsPanel
          requests={requests}
          isLoading={loading}
          error={error}
          onRetry={fetchFollowRequests}
          onAccept={(id) => handleFollowRequest(id, "accept")}
          onReject={(id) => handleFollowRequest(id, "reject")}
        />
      </DialogContent>
    </Dialog>
  )
}
