"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronLeft,
  Copy,
  Link2,
  Loader2,
  Mail,
  Minus,
  Plus,
  Search,
  Send,
  Smartphone,
  UserRoundPlus,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type TourQuickStartState = {
  state: "new" | "named" | "events_created" | "complete"
  step: 1 | 2 | 3
  eventCount: number
  batchId: string | null
}

interface InviteSummary {
  id: string
  channel: string
  status: string
  deliveryStatus: string
  deliveryError?: string | null
  invitedEmail?: string | null
  invitedPhone?: string | null
  invitedUserId?: string | null
  inviteUrl?: string
}

interface UserSearchResult {
  id: string
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
}

interface TourQuickStartWizardProps {
  initialTourId?: string | null
  initialTourName?: string
  initialState?: Partial<TourQuickStartState>
  requestInit: (input?: RequestInit) => RequestInit
  onTourCreated?: (tour: { id: string; name: string }) => void
}

function clampEventCount(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(50, Math.round(value)))
}

function stepTitle(step: number) {
  if (step === 1) return "Name your tour"
  if (step === 2) return "Create your events"
  return "Invite collaborators"
}

export function TourQuickStartWizard({
  initialTourId = null,
  initialTourName = "",
  initialState,
  requestInit,
  onTourCreated,
}: TourQuickStartWizardProps) {
  const router = useRouter()
  const [tourId, setTourId] = React.useState(initialTourId)
  const [tourName, setTourName] = React.useState(initialTourName)
  const [step, setStep] = React.useState<1 | 2 | 3>(initialState?.step || (initialTourId ? 2 : 1))
  const [eventCount, setEventCount] = React.useState(clampEventCount(initialState?.eventCount || 1))
  const [batchId, setBatchId] = React.useState<string | null>(initialState?.batchId || null)
  const [isWorking, setIsWorking] = React.useState(false)
  const [inviteChannel, setInviteChannel] = React.useState<"in_app" | "email" | "sms" | "copy">("in_app")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [userQuery, setUserQuery] = React.useState("")
  const [users, setUsers] = React.useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [invitations, setInvitations] = React.useState<InviteSummary[]>([])
  const [lastCopyUrl, setLastCopyUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!tourId || step !== 3) return
    let cancelled = false
    async function loadInvitations() {
      try {
        const response = await fetch(
          `/api/admin/tours/${tourId}/collaboration-invites`,
          requestInit({ cache: "no-store" }),
        )
        const body = await response.json().catch(() => ({}))
        if (!cancelled && response.ok) setInvitations(body.invitations || [])
      } catch {
        // The invitation step remains usable when the history read is unavailable.
      }
    }
    void loadInvitations()
    return () => {
      cancelled = true
    }
  }, [requestInit, step, tourId])

  React.useEffect(() => {
    if (inviteChannel !== "in_app" || userQuery.trim().length < 2) {
      setUsers([])
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(userQuery.trim())}&limit=8`,
          requestInit({ cache: "no-store", signal: controller.signal }),
        )
        const body = await response.json().catch(() => ({}))
        if (!cancelled) setUsers(response.ok ? body.users || [] : [])
      } catch {
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [inviteChannel, requestInit, userQuery])

  function updateBrowserTourId(id: string) {
    const url = new URL(window.location.href)
    url.searchParams.set("draft", id)
    window.history.replaceState({}, "", url.toString())
  }

  async function saveName() {
    const name = tourName.trim()
    if (name.length < 1 || name.length > 120) {
      toast.error("Tour name must be between 1 and 120 characters.")
      return
    }
    setIsWorking(true)
    try {
      if (tourId) {
        const response = await fetch(
          `/api/admin/tours/${tourId}`,
          requestInit({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              settings: {
                quick_start: {
                  state: "named",
                  step: 2,
                  event_count: eventCount,
                  batch_id: batchId,
                  updated_at: new Date().toISOString(),
                },
              },
            }),
          }),
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || "Failed to save tour name")
      } else {
        const response = await fetch(
          "/api/admin/tours",
          requestInit({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              status: "planning",
              settings: {
                quick_start: {
                  state: "named",
                  step: 2,
                  event_count: eventCount,
                  batch_id: null,
                  updated_at: new Date().toISOString(),
                },
              },
            }),
          }),
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || "Failed to create tour")
        const createdId = String(body.tour?.id || "")
        if (!createdId) throw new Error("Tour creation did not return an id")
        setTourId(createdId)
        updateBrowserTourId(createdId)
        onTourCreated?.({ id: createdId, name })
      }
      setTourName(name)
      setStep(2)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the tour")
    } finally {
      setIsWorking(false)
    }
  }

  async function createEvents() {
    if (!tourId) return
    const count = clampEventCount(eventCount)
    const idempotencyKey = batchId || crypto.randomUUID()
    setBatchId(idempotencyKey)
    setIsWorking(true)
    try {
      const response = await fetch(
        `/api/admin/tours/${tourId}/quick-start-events`,
        requestInit({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ count }),
        }),
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to create event drafts")
      setEventCount(count)
      setStep(3)
      toast.success(`${body.events?.length || count} event drafts created`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create event drafts")
    } finally {
      setIsWorking(false)
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Invitation link copied")
    } catch {
      setLastCopyUrl(url)
      toast.error("Copy the invitation link shown below.")
    }
  }

  async function sendInvitation(payload: Record<string, unknown>) {
    if (!tourId) return
    setIsWorking(true)
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
      const invitation = body.invitation as InviteSummary
      setInvitations((current) => [invitation, ...current.filter((item) => item.id !== invitation.id)])
      if (invitation.inviteUrl) setLastCopyUrl(invitation.inviteUrl)
      if (payload.channel === "copy" && invitation.inviteUrl) await copyInviteUrl(invitation.inviteUrl)
      else if (invitation.deliveryStatus === "failed") {
        toast.warning("Invite saved, but delivery failed. Copy the link to send it yourself.")
      } else {
        toast.success(payload.channel === "in_app" ? "Invitation message sent" : "Invitation sent")
      }
      setEmail("")
      setPhone("")
      setUserQuery("")
      setUsers([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invitation")
    } finally {
      setIsWorking(false)
    }
  }

  async function finishQuickStart() {
    if (!tourId) return
    setIsWorking(true)
    try {
      const response = await fetch(
        `/api/admin/tours/${tourId}`,
        requestInit({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: {
              quick_start: {
                state: "complete",
                step: 3,
                event_count: eventCount,
                batch_id: batchId,
                completed_at: new Date().toISOString(),
              },
            },
          }),
        }),
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to finish tour setup")
      router.push(`/admin/dashboard/tours/${tourId}?tab=events&quickStart=1`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finish tour setup")
    } finally {
      setIsWorking(false)
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!tourId) return
    setIsWorking(true)
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
      toast.error(error instanceof Error ? error.message : "Could not revoke invitation")
    } finally {
      setIsWorking(false)
    }
  }

  function exitWizard() {
    router.push(tourId ? `/admin/dashboard/tours/${tourId}` : "/admin/dashboard/tours")
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) exitWizard() }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 p-0 text-white">
        <div className="border-b border-slate-800 bg-gradient-to-r from-purple-950/80 via-slate-950 to-blue-950/60 px-6 py-5">
          <DialogHeader>
            <div className="mb-3 flex items-center justify-between gap-3 pr-8">
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">Quick start</Badge>
              <span className="text-xs text-slate-400">Step {step} of 3</span>
            </div>
            <DialogTitle className="text-2xl text-white">{stepTitle(step)}</DialogTitle>
            <DialogDescription className="text-slate-300">
              Your progress is saved as soon as the tour has a name.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Tour setup progress">
            {[1, 2, 3].map((item) => (
              <div key={item} className="space-y-1">
                <div className={`h-1.5 rounded-full ${item <= step ? "bg-cyan-400" : "bg-slate-800"}`} />
                <span className={`text-[11px] ${item <= step ? "text-cyan-100" : "text-slate-500"}`}>
                  {item === 1 ? "Name" : item === 2 ? "Events" : "People"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="quick-tour-name" className="text-base text-white">
                  What are we naming your tour?
                </Label>
                <Input
                  id="quick-tour-name"
                  autoFocus
                  maxLength={120}
                  value={tourName}
                  onChange={(event) => setTourName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void saveName() }}
                  placeholder="Summer Run 2027"
                  className="h-12 border-slate-700 bg-slate-900 text-lg text-white"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>This becomes the home for your events and project information.</span>
                  <span>{tourName.trim().length}/120</span>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                size="lg"
                disabled={isWorking || !tourName.trim() || tourName.trim().length > 120}
                onClick={() => void saveName()}
              >
                {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next: create events
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xl font-semibold text-white">How many events are we doing?</p>
                <p className="mt-2 text-sm text-slate-400">
                  We’ll create real event drafts now. You can plan, rename, add, or remove them later.
                </p>
              </div>
              <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Remove one event"
                  disabled={eventCount <= 1 || isWorking}
                  onClick={() => setEventCount((count) => clampEventCount(count - 1))}
                  className="h-12 w-12 border-slate-700"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  aria-label="Number of events"
                  type="number"
                  min={1}
                  max={50}
                  inputMode="numeric"
                  value={eventCount}
                  onChange={(event) => setEventCount(clampEventCount(Number(event.target.value)))}
                  className="h-16 w-28 border-cyan-400/40 bg-slate-900 text-center text-3xl font-bold text-white"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Add one event"
                  disabled={eventCount >= 50 || isWorking}
                  onClick={() => setEventCount((count) => clampEventCount(count + 1))}
                  className="h-12 w-12 border-slate-700"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-center text-xs text-slate-500">Choose between 1 and 50 events.</p>
              <div className="flex gap-3">
                <Button variant="outline" disabled={isWorking} onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  size="lg"
                  disabled={isWorking}
                  onClick={() => void createEvents()}
                >
                  {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create {eventCount} event{eventCount === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <p className="text-xl font-semibold text-white">Who’s joining you?</p>
                <p className="mt-2 text-sm text-slate-400">
                  Invite tour administrators now, or continue solo. Access is limited to this tour.
                </p>
              </div>

              <Tabs value={inviteChannel} onValueChange={(value) => setInviteChannel(value as typeof inviteChannel)}>
                <TabsList className="grid h-auto grid-cols-4 bg-slate-900 p-1">
                  <TabsTrigger value="in_app" className="gap-1.5"><Users className="h-3.5 w-3.5" /> User</TabsTrigger>
                  <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
                  <TabsTrigger value="sms" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Text</TabsTrigger>
                  <TabsTrigger value="copy" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Link</TabsTrigger>
                </TabsList>

                <TabsContent value="in_app" className="space-y-3 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      value={userQuery}
                      onChange={(event) => setUserQuery(event.target.value)}
                      placeholder="Search by name or email"
                      className="border-slate-700 bg-slate-900 pl-9 text-white"
                    />
                  </div>
                  {isSearching ? <p className="text-xs text-slate-400">Searching…</p> : null}
                  <div className="space-y-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        disabled={isWorking}
                        onClick={() => void sendInvitation({ channel: "in_app", inviteeUserId: user.id })}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left hover:border-cyan-400/40"
                      >
                        <span>
                          <span className="block text-sm font-medium text-white">{user.full_name || user.email || "Tourify user"}</span>
                          {user.email ? <span className="block text-xs text-slate-400">{user.email}</span> : null}
                        </span>
                        <UserRoundPlus className="h-4 w-4 text-cyan-300" />
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-3 pt-3">
                  <Label htmlFor="tour-invite-email">Email address</Label>
                  <div className="flex gap-2">
                    <Input id="tour-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" className="border-slate-700 bg-slate-900 text-white" />
                    <Button disabled={isWorking || !email.trim()} onClick={() => void sendInvitation({ channel: "email", email })}>
                      <Send className="mr-2 h-4 w-4" /> Send
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="space-y-3 pt-3">
                  <Label htmlFor="tour-invite-phone">Mobile number</Label>
                  <div className="flex gap-2">
                    <Input id="tour-invite-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 555 0123" className="border-slate-700 bg-slate-900 text-white" />
                    <Button disabled={isWorking || !phone.trim()} onClick={() => void sendInvitation({ channel: "sms", phone })}>
                      <Send className="mr-2 h-4 w-4" /> Send
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="copy" className="space-y-3 pt-3">
                  <Card className="border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                    Create a secure, single-claim link. The recipient will sign in or create an account before joining.
                  </Card>
                  <Button className="w-full" variant="outline" disabled={isWorking} onClick={() => void sendInvitation({ channel: "copy" })}>
                    <Copy className="mr-2 h-4 w-4" /> Create and copy link
                  </Button>
                </TabsContent>
              </Tabs>

              {lastCopyUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <Input readOnly value={lastCopyUrl} className="border-slate-700 bg-slate-950 text-xs text-slate-300" />
                  <Button size="icon" variant="outline" aria-label="Copy invitation link" onClick={() => void copyInviteUrl(lastCopyUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {invitations.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invitations</p>
                  {invitations.slice(0, 6).map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-300">
                        {invitation.invitedEmail || invitation.invitedPhone || (invitation.channel === "in_app" ? "Tourify user" : "Share link")}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs ${invitation.deliveryStatus === "failed" ? "text-amber-300" : invitation.status === "revoked" ? "text-slate-500" : "text-emerald-300"}`}>
                          {invitation.deliveryStatus === "failed" && invitation.status === "pending"
                            ? "Saved · copy link"
                            : invitation.channel === "in_app" && invitation.deliveryStatus === "sent"
                              ? <><Check className="h-3 w-3" /> Message sent</>
                              : <><Check className="h-3 w-3" /> {invitation.status}</>}
                        </span>
                        {invitation.status === "pending" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isWorking}
                            onClick={() => void revokeInvitation(invitation.id)}
                            className="h-7 px-2 text-xs text-slate-400 hover:text-red-300"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Revoke
                          </Button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isWorking}
                  onClick={() => void finishQuickStart()}
                  className="border-slate-600 text-slate-100"
                >
                  WE’RE DOIN’ IT SOLO
                </Button>
                <Button
                  size="lg"
                  disabled={isWorking}
                  onClick={() => void finishQuickStart()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Open tour dashboard
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
