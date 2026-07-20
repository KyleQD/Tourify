"use client"

import * as React from "react"
import { Building2, Plus, Ticket, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { artistEventUI } from "@/components/events/artist-event-ui"
import { cn } from "@/lib/utils"

interface ArtistEventOpsPanelProps {
  eventId: string
  promotedEventV2Id?: string | null
  onPromoted?: (eventsV2Id: string) => void
}

export function ArtistEventOpsPanel({
  eventId,
  promotedEventV2Id,
  onPromoted,
}: ArtistEventOpsPanelProps) {
  const [isPromoting, setIsPromoting] = React.useState(false)
  const [ticketTypes, setTicketTypes] = React.useState<any[]>([])
  const [tierName, setTierName] = React.useState("General Admission")
  const [tierPrice, setTierPrice] = React.useState("25")
  const [tierQty, setTierQty] = React.useState("100")
  const [inviteeUserId, setInviteeUserId] = React.useState("")
  const [isSavingTicket, setIsSavingTicket] = React.useState(false)
  const [isInviting, setIsInviting] = React.useState(false)
  const [linkedId, setLinkedId] = React.useState(promotedEventV2Id || "")
  const [allocations, setAllocations] = React.useState<any[]>([])
  const [selectedAllocationId, setSelectedAllocationId] = React.useState("")
  const [compEmail, setCompEmail] = React.useState("")
  const [compName, setCompName] = React.useState("")
  const [compQty, setCompQty] = React.useState("1")
  const [isIssuingComp, setIsIssuingComp] = React.useState(false)

  React.useEffect(() => {
    setLinkedId(promotedEventV2Id || "")
  }, [promotedEventV2Id])

  React.useEffect(() => {
    if (!eventId) return
    void loadTickets()
  }, [eventId, linkedId])

  async function loadTickets() {
    try {
      const response = await fetch(`/api/artist/events/${eventId}/tickets`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) setTicketTypes(data.ticketTypes || [])
    } catch {
      setTicketTypes([])
    }
  }

  async function promote(reason: "native_ticketing" | "org_collab" | "venue_collab" = "native_ticketing") {
    setIsPromoting(true)
    try {
      const response = await fetch(`/api/artist/events/${eventId}/promote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to enable production tools")
      const id = String(data.events_v2_id || "")
      setLinkedId(id)
      onPromoted?.(id)
      toast.success(data.alreadyPromoted ? "Already linked to production event" : "Event promoted for ticketing & collab")
      return id
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promote failed")
      return null
    } finally {
      setIsPromoting(false)
    }
  }

  async function saveTicketTier() {
    setIsSavingTicket(true)
    try {
      const response = await fetch(`/api/artist/events/${eventId}/tickets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tierName,
          price: Number(tierPrice) || 0,
          quantity_available: Number(tierQty) || 0,
          category: "general",
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to save ticket tier")
      if (data.events_v2_id) {
        setLinkedId(String(data.events_v2_id))
        onPromoted?.(String(data.events_v2_id))
      }
      toast.success("Ticket tier saved")
      setTierName("General Admission")
      setTierPrice("25")
      setTierQty("100")
      await loadTickets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save ticket tier")
    } finally {
      setIsSavingTicket(false)
    }
  }

  async function inviteCollaborator() {
    if (!inviteeUserId.trim()) {
      toast.error("Enter a user id to invite")
      return
    }
    setIsInviting(true)
    try {
      const response = await fetch(`/api/artist/events/${eventId}/collaborate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeUserId: inviteeUserId.trim(), role: "collaborator" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to invite collaborator")
      if (data.events_v2_id) {
        setLinkedId(String(data.events_v2_id))
        onPromoted?.(String(data.events_v2_id))
      }
      toast.success("Collaborator invited to event org")
      setInviteeUserId("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invite failed")
    } finally {
      setIsInviting(false)
    }
  }

  React.useEffect(() => {
    if (!linkedId) {
      setAllocations([])
      return
    }
    void (async () => {
      try {
        const res = await fetch(`/api/ticketing/allocations?event_id=${linkedId}`, {
          credentials: "include",
          cache: "no-store",
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          const mine = (data.allocations || []).filter(
            (a: any) => a.allocation_type === "artist" || a.account_id,
          )
          setAllocations(mine.length ? mine : data.allocations || [])
          if ((data.allocations || [])[0]?.id) setSelectedAllocationId(String((data.allocations || [])[0].id))
        }
      } catch {
        setAllocations([])
      }
    })()
  }, [linkedId])

  async function issueFromAllocation() {
    if (!selectedAllocationId || !ticketTypes[0]?.id) {
      toast.error("Select an allocation and ensure a ticket tier exists")
      return
    }
    setIsIssuingComp(true)
    try {
      const res = await fetch("/api/ticketing/allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          allocation_id: selectedAllocationId,
          ticket_type_id: ticketTypes[0].id,
          quantity: Math.max(1, Number(compQty) || 1),
          recipient_email: compEmail || undefined,
          recipient_name: compName || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to issue comps")
      toast.success("Comp tickets issued from your allocation")
      setCompEmail("")
      setCompName("")
      setCompQty("1")
      const refresh = await fetch(`/api/ticketing/allocations?event_id=${linkedId}`, {
        credentials: "include",
        cache: "no-store",
      })
      const refreshed = await refresh.json().catch(() => ({}))
      if (refresh.ok) setAllocations(refreshed.allocations || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Issue failed")
    } finally {
      setIsIssuingComp(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className={artistEventUI.panel}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Ticket className="h-5 w-5 text-cyan-300" />
            Native ticketing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {linkedId ? "Linked to events_v2" : "Public event only"}
            </Badge>
            {!linkedId ? (
              <Button size="sm" variant="outline" className={artistEventUI.buttonOutline} disabled={isPromoting} onClick={() => void promote("native_ticketing")}>
                Enable Tourify tickets
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-slate-400">Tier name</Label>
              <Input value={tierName} onChange={(e) => setTierName(e.target.value)} className={cn(artistEventUI.input, "mt-1")} />
            </div>
            <div>
              <Label className="text-slate-400">Price</Label>
              <Input value={tierPrice} onChange={(e) => setTierPrice(e.target.value)} className={cn(artistEventUI.input, "mt-1")} />
            </div>
            <div>
              <Label className="text-slate-400">Quantity</Label>
              <Input value={tierQty} onChange={(e) => setTierQty(e.target.value)} className={cn(artistEventUI.input, "mt-1")} />
            </div>
          </div>

          <Button disabled={isSavingTicket} onClick={() => void saveTicketTier()} className={artistEventUI.buttonPrimary}>
            <Plus className="mr-2 h-4 w-4" />
            Save ticket tier
          </Button>

          {ticketTypes.length > 0 ? (
            <div className="space-y-2">
              {ticketTypes.map((tier) => (
                <div key={tier.id} className={cn(artistEventUI.inset, "flex items-center justify-between px-3 py-2 text-sm text-slate-200")}>
                  <span>{tier.name}</span>
                  <span>
                    ${Number(tier.price || 0).toFixed(2)} · {tier.quantity_sold || 0}/{tier.quantity_available || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No native tiers yet. Saving a tier promotes this show for checkout.</p>
          )}

          {linkedId ? (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <p className="text-sm font-medium text-slate-200">Your allocation / guestlist</p>
              <p className="text-xs text-slate-500">
                Issue comps only from allocations assigned to you. Paid inventory edits stay with the event operator.
              </p>
              {allocations.length === 0 ? (
                <p className="text-xs text-amber-300/90">
                  No allocations yet. Ask the event operator to create an artist allocation pool.
                </p>
              ) : (
                <>
                  <div>
                    <Label className="text-slate-400">Allocation</Label>
                    <select
                      className={cn(artistEventUI.select, "mt-1 w-full px-3 py-2 text-sm")}
                      value={selectedAllocationId}
                      onChange={(e) => setSelectedAllocationId(e.target.value)}
                    >
                      {allocations.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} ({a.quantity_issued}/{a.quantity_total})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      placeholder="Guest name"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      className={artistEventUI.input}
                    />
                    <Input
                      placeholder="Guest email"
                      value={compEmail}
                      onChange={(e) => setCompEmail(e.target.value)}
                      className={artistEventUI.input}
                    />
                    <Input
                      placeholder="Qty"
                      value={compQty}
                      onChange={(e) => setCompQty(e.target.value)}
                      className={artistEventUI.input}
                    />
                  </div>
                  <Button disabled={isIssuingComp} variant="outline" className={artistEventUI.buttonOutline} onClick={() => void issueFromAllocation()}>
                    Issue from allocation
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={artistEventUI.panel}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-violet-300" />
            Org & venue collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            Promote this public show into production (`events_v2`) to invite org members and unlock shared ops.
            Venue booking requests can be sent from the Venues tab.
          </p>
          <div>
            <Label className="text-slate-400">Invite collaborator user ID</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={inviteeUserId}
                onChange={(e) => setInviteeUserId(e.target.value)}
                className={artistEventUI.input}
                placeholder="uuid"
              />
              <Button disabled={isInviting} onClick={() => void inviteCollaborator()} className={artistEventUI.buttonPrimary}>
                <Users className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
          {!linkedId ? (
            <Button variant="outline" className={artistEventUI.buttonOutline} disabled={isPromoting} onClick={() => void promote("org_collab")}>
              Promote for collaboration
            </Button>
          ) : (
            <p className="text-xs text-emerald-300">Production link: {linkedId}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
