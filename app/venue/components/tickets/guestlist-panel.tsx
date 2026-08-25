"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { VenueEmptyState } from "@/components/dashboard/venue-empty-state"
import { AlertCircle, Plus, RotateCcw, Users } from "lucide-react"

// VEN-153 — guest-list allocation pools and comp issuance.
// Contract mirrors /api/ticketing/allocations (label / quantity_total /
// allocation_type enum; issue requires allocation_id + ticket_type_id).

interface Allocation {
  id: string
  label: string | null
  allocation_type: string
  quantity_total: number | null
  quantity_issued: number | null
}

export interface GuestListTicketType {
  id: string
  name: string
}

const ALLOCATION_TYPES = ["general", "artist", "venue", "organization", "promoter", "sponsor", "staff", "media"] as const

export function GuestListPanel({
  eventId,
  canManageGuestlist,
  canIssueComps,
  ticketTypes,
}: {
  eventId: string
  canManageGuestlist: boolean
  canIssueComps: boolean
  ticketTypes: GuestListTicketType[]
}) {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState("")
  const [type, setType] = useState<(typeof ALLOCATION_TYPES)[number]>("general")
  const [quantityTotal, setQuantityTotal] = useState("10")
  const [issueTarget, setIssueTarget] = useState<Allocation | null>(null)
  const [issueTypeId, setIssueTypeId] = useState("")
  const [issueName, setIssueName] = useState("")
  const [issueEmail, setIssueEmail] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/ticketing/allocations?event_id=${eventId}`, { credentials: "include", cache: "no-store" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Load failed (${response.status})`)
      }
      const payload = await response.json()
      setAllocations(Array.isArray(payload.allocations) ? payload.allocations : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load allocations")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const createPool = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/ticketing/allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          event_id: eventId,
          label: label.trim() || "Guest list",
          allocation_type: type,
          quantity_total: Math.max(0, parseInt(quantityTotal, 10) || 0),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not create pool")
      setLabel("")
      setNotice("Pool created.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pool")
    } finally {
      setBusy(false)
    }
  }

  const openIssue = (allocation: Allocation) => {
    setIssueTarget(allocation)
    setIssueTypeId(ticketTypes[0]?.id || "")
    setIssueName("")
    setIssueEmail("")
  }

  const issueComp = async () => {
    if (!issueTarget || !issueTypeId || !/.+@.+\..+/.test(issueEmail)) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/ticketing/allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          allocation_id: issueTarget.id,
          ticket_type_id: issueTypeId,
          quantity: 1,
          recipient_email: issueEmail.trim(),
          recipient_name: issueName.trim() || undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not issue comp")
      setIssueTarget(null)
      setNotice("Comp ticket issued.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue comp")
    } finally {
      setBusy(false)
    }
  }

  if (!canManageGuestlist && !canIssueComps) {
    return (
      <VenueEmptyState
        icon={Users}
        title="Guest list is read-only for you"
        description="You need “Manage guest list” or “Issue comps” permissions to make changes here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-md border border-green-700 bg-green-950/30 p-2 text-sm text-green-300">{notice}</p>}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}><RotateCcw className="mr-1 h-3.5 w-3.5" />Retry</Button>
        </div>
      )}

      {canManageGuestlist && (
        <fieldset className="grid grid-cols-1 gap-3 rounded-md border border-zinc-800 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <legend className="px-1 text-xs uppercase tracking-wide text-zinc-500">New allocation pool</legend>
          <div className="space-y-1.5">
            <Label htmlFor="gl-label">Pool label</Label>
            <Input id="gl-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Press +1s" className="bg-gray-800" />
          </div>
          <div className="w-full space-y-1.5 sm:w-36">
            <Label htmlFor="gl-type">Type</Label>
            <select id="gl-type" value={type} onChange={(e) => setType(e.target.value as (typeof ALLOCATION_TYPES)[number])} className="h-10 w-full rounded-md border border-zinc-700 bg-gray-800 px-2 text-sm">
              {ALLOCATION_TYPES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="w-full space-y-1.5 sm:w-24">
            <Label htmlFor="gl-qty">Qty</Label>
            <Input id="gl-qty" inputMode="numeric" value={quantityTotal} onChange={(e) => setQuantityTotal(e.target.value.replace(/[^0-9]/g, ""))} className="bg-gray-800" />
          </div>
          <Button onClick={createPool} disabled={busy}><Plus className="mr-1 h-4 w-4" />Create</Button>
        </fieldset>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
      ) : allocations.length === 0 ? (
        <VenueEmptyState icon={Users} title="No allocation pools" description="Create a pool to start issuing comps." />
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-x-auto rounded-md border border-zinc-800" aria-label="Allocation pools">
          {allocations.map((allocation) => (
            <li key={allocation.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-zinc-100">{allocation.label || "Untitled pool"}</p>
                <p className="text-xs text-zinc-400">
                  {allocation.allocation_type} · {allocation.quantity_issued ?? 0}/{allocation.quantity_total ?? "∞"} issued
                </p>
              </div>
              {canIssueComps && (
                <Button size="sm" variant="outline" className="shrink-0 border-zinc-700" onClick={() => openIssue(allocation)}>
                  Issue comp
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {issueTarget && (
        <div role="alertdialog" aria-label={`Issue comp from ${issueTarget.label || "pool"}`} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-zinc-700 bg-gray-900 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Issue complimentary ticket</h2>
            <p className="text-sm text-zinc-400">From pool “{issueTarget.label || issueTarget.id.slice(0, 8)}”.</p>
            {ticketTypes.length === 0 ? (
              <p className="rounded-md border border-yellow-700 bg-yellow-950/30 p-3 text-sm text-yellow-200">
                Add a ticket type first (Setup → Ticket types), then issue comps against it.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-type">Ticket type</Label>
                  <select id="comp-type" value={issueTypeId} onChange={(e) => setIssueTypeId(e.target.value)} className="h-10 w-full rounded-md border border-zinc-700 bg-gray-800 px-2 text-sm">
                    {ticketTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-email">Recipient email</Label>
                  <Input id="comp-email" type="email" value={issueEmail} onChange={(e) => setIssueEmail(e.target.value)} placeholder="guest@example.com" className="bg-gray-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-name">Recipient name</Label>
                  <Input id="comp-name" value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder="Optional" className="bg-gray-800" />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-700" onClick={() => setIssueTarget(null)} disabled={busy}>Cancel</Button>
              <Button onClick={issueComp} disabled={busy || ticketTypes.length === 0 || !/.+@.+\..+/.test(issueEmail)}>
                {busy ? "Issuing…" : "Issue comp"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
