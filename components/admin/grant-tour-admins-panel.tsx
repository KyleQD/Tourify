"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Link2, Mail, Search, Send, Smartphone, UserRoundPlus, Users, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useActingContext } from "@/hooks/use-acting-context"

interface GrantTourAdminsPanelProps {
  tourId: string
  /** Retained for call-site compatibility; invitations now use user search instead of raw IDs. */
  defaultUserIds?: string[]
}

interface UserResult {
  id: string
  full_name?: string | null
  email?: string | null
}

interface Invitation {
  id: string
  channel: string
  status: string
  deliveryStatus: string
  invitedEmail?: string | null
  invitedPhone?: string | null
  inviteUrl?: string
}

export function GrantTourAdminsPanel({ tourId }: GrantTourAdminsPanelProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [channel, setChannel] = useState<"in_app" | "email" | "sms" | "copy">("in_app")
  const [query, setQuery] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [users, setUsers] = useState<UserResult[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [lastLink, setLastLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const requestInit = useCallback((input?: RequestInit): RequestInit => ({
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: { ...actingHeaders, ...(input?.headers || {}) },
  }), [actingHeaders])

  useEffect(() => {
    if (!isActingReady) return
    let cancelled = false
    void fetch(`/api/admin/tours/${tourId}/collaboration-invites`, requestInit())
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!cancelled && response.ok) setInvitations(body.invitations || [])
      })
    return () => { cancelled = true }
  }, [isActingReady, requestInit, tourId])

  useEffect(() => {
    if (channel !== "in_app" || query.trim().length < 2 || !isActingReady) {
      setUsers([])
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(query.trim())}&limit=8`,
          requestInit({ signal: controller.signal }),
        )
        const body = await response.json().catch(() => ({}))
        if (!cancelled) setUsers(response.ok ? body.users || [] : [])
      } catch {
        if (!cancelled) setUsers([])
      }
    }, 250)
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [channel, isActingReady, query, requestInit])

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Invitation link copied")
    } catch {
      setLastLink(url)
      toast.error("Copy the link shown below.")
    }
  }

  async function createInvite(payload: Record<string, unknown>) {
    if (!isActingReady) {
      toast.error("Select an organization account before inviting collaborators")
      return
    }
    setBusy(true)
    try {
      const response = await fetch(
        `/api/admin/tours/${tourId}/collaboration-invites`,
        requestInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, role: "admin" }),
        }),
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to create invitation")
      const invitation = body.invitation as Invitation
      setInvitations((current) => [invitation, ...current])
      if (invitation.inviteUrl) setLastLink(invitation.inviteUrl)
      if (payload.channel === "copy" && invitation.inviteUrl) await copyLink(invitation.inviteUrl)
      else if (invitation.deliveryStatus === "failed") toast.warning("Invite saved. Copy its link to send it yourself.")
      else toast.success("Invitation sent")
      setQuery("")
      setEmail("")
      setPhone("")
      setUsers([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invitation")
    } finally {
      setBusy(false)
    }
  }

  async function revokeInvite(invitationId: string) {
    setBusy(true)
    try {
      const response = await fetch(
        `/api/admin/tours/${tourId}/collaboration-invites?invitationId=${encodeURIComponent(invitationId)}`,
        requestInit({ method: "DELETE" }),
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to revoke invitation")
      setInvitations((current) => current.map((invitation) => (
        invitation.id === invitationId ? { ...invitation, status: "revoked" } : invitation
      )))
      toast.success("Invitation revoked")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invitation")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Tour administrators</CardTitle>
        </div>
        <CardDescription>
          Invite collaborators to plan this tour and its events. They will not receive access to
          unrelated projects, organization billing, or settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
          <TabsList className="grid h-auto grid-cols-4">
            <TabsTrigger value="in_app"><Users className="mr-1.5 h-3.5 w-3.5" /> User</TabsTrigger>
            <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" /> Email</TabsTrigger>
            <TabsTrigger value="sms"><Smartphone className="mr-1.5 h-3.5 w-3.5" /> Text</TabsTrigger>
            <TabsTrigger value="copy"><Link2 className="mr-1.5 h-3.5 w-3.5" /> Link</TabsTrigger>
          </TabsList>

          <TabsContent value="in_app" className="space-y-2 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" className="pl-9" />
            </div>
            {users.map((user) => (
              <button key={user.id} type="button" disabled={busy} onClick={() => void createInvite({ channel: "in_app", inviteeUserId: user.id })} className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/40">
                <span><span className="block text-sm font-medium">{user.full_name || user.email || "Tourify user"}</span>{user.email ? <span className="block text-xs text-muted-foreground">{user.email}</span> : null}</span>
                <UserRoundPlus className="h-4 w-4" />
              </button>
            ))}
          </TabsContent>

          <TabsContent value="email" className="space-y-2 pt-3">
            <Label htmlFor="tour-admin-email">Email address</Label>
            <div className="flex gap-2"><Input id="tour-admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" /><Button disabled={busy || !email.trim()} onClick={() => void createInvite({ channel: "email", email })}><Send className="mr-2 h-4 w-4" /> Send</Button></div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-2 pt-3">
            <Label htmlFor="tour-admin-phone">Mobile number</Label>
            <div className="flex gap-2"><Input id="tour-admin-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 555 0123" /><Button disabled={busy || !phone.trim()} onClick={() => void createInvite({ channel: "sms", phone })}><Send className="mr-2 h-4 w-4" /> Send</Button></div>
          </TabsContent>

          <TabsContent value="copy" className="pt-3">
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => void createInvite({ channel: "copy" })}><Copy className="mr-2 h-4 w-4" /> Create and copy secure link</Button>
          </TabsContent>
        </Tabs>

        {lastLink ? (
          <div className="flex gap-2"><Input readOnly value={lastLink} className="text-xs" /><Button size="icon" variant="outline" onClick={() => void copyLink(lastLink)}><Copy className="h-4 w-4" /></Button></div>
        ) : null}

        {invitations.length > 0 ? (
          <div className="space-y-2 border-t pt-3">
            {invitations.slice(0, 8).map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{invitation.invitedEmail || invitation.invitedPhone || (invitation.channel === "in_app" ? "Tourify user" : "Secure share link")}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{invitation.deliveryStatus === "failed" && invitation.status === "pending" ? "Saved · delivery failed" : invitation.status}</Badge>
                  {invitation.status === "pending" ? (
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void revokeInvite(invitation.id)}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Revoke
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
