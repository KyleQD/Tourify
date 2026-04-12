"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface AdminThread {
  id: string
  groupName: string
  lastMessage: string
  unreadCount: number
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<AdminThread[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipientGroup, setRecipientGroup] = useState("all-staff")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    async function loadThreads() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/messages/threads", {
          credentials: "include",
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load message threads")
        }
        setThreads(payload.threads || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load message threads")
      } finally {
        setIsLoading(false)
      }
    }

    void loadThreads()
  }, [])

  const hasMessage = useMemo(() => message.trim().length >= 8, [message])

  async function handleBroadcast() {
    if (!hasMessage) return
    setIsSending(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/messages/broadcast", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientGroup,
          message: message.trim(),
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success)
        throw new Error(payload.error || "Failed to send broadcast")

      setMessage("")
      alert(`Broadcast queued: ${payload.broadcastId}`)
    } catch (broadcastError) {
      setError(broadcastError instanceof Error ? broadcastError.message : "Failed to send broadcast")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Messaging"
        subtitle="Manage channel threads and queue broadcast announcements."
      />

      {error ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-6 text-sm text-amber-100">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Broadcast composer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={recipientGroup}
              onChange={(event) => setRecipientGroup(event.target.value)}
              placeholder="Recipient group (all-staff, tour-managers, vendors...)"
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Write your announcement..."
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Minimum 8 characters for broadcast message.</p>
              <Button onClick={() => void handleBroadcast()} disabled={!hasMessage || isSending}>
                {isSending ? "Queueing..." : "Queue broadcast"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Message threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading threads...</p>
            ) : threads.length ? (
              threads.map((thread) => (
                <div key={thread.id} className="rounded-md border border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-200">{thread.groupName}</p>
                    <Badge variant={thread.unreadCount > 0 ? "destructive" : "secondary"}>
                      {thread.unreadCount} unread
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{thread.lastMessage}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No threads available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
