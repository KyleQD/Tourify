"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface Props {
  eventId: string
  ticketTypes: Array<{ id: string; name: string; price: number }>
  initialTab?: "grants" | "allocations" | "box_office" | "settlements"
}

const PERMISSIONS = [
  "scan_tickets",
  "operate_box_office",
  "issue_comps",
  "manage_guestlist",
  "process_refunds",
  "view_attendees",
  "view_full_financials",
  "manage_grants",
  "reverse_checkin",
]

export function EventTicketingOpsPanels({ eventId, ticketTypes, initialTab = "grants" }: Props) {
  const [tab, setTab] = useState(initialTab)
  const [grants, setGrants] = useState<any[]>([])
  const [allocations, setAllocations] = useState<any[]>([])
  const [settlement, setSettlement] = useState<any>(null)
  const [grantUserId, setGrantUserId] = useState("")
  const [grantPermission, setGrantPermission] = useState("scan_tickets")
  const [allocLabel, setAllocLabel] = useState("")
  const [allocQty, setAllocQty] = useState(10)
  const [allocType, setAllocType] = useState("general")
  const [issueAllocId, setIssueAllocId] = useState("")
  const [issueEmail, setIssueEmail] = useState("")
  const [issueName, setIssueName] = useState("")
  const [issueTypeId, setIssueTypeId] = useState("")
  const [boxQuery, setBoxQuery] = useState("")
  const [boxResults, setBoxResults] = useState<{ orders: any[]; tickets: any[] }>({ orders: [], tickets: [] })
  const [sellName, setSellName] = useState("")
  const [sellEmail, setSellEmail] = useState("")
  const [sellTypeId, setSellTypeId] = useState("")
  const [sellMethod, setSellMethod] = useState<"cash" | "card" | "comp">("cash")
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [refundOrderId, setRefundOrderId] = useState("")

  const load = useCallback(async () => {
    const [configRes, allocRes, settleRes] = await Promise.allSettled([
      fetch(`/api/ticketing/config?event_id=${eventId}`, { credentials: "include" }),
      fetch(`/api/ticketing/allocations?event_id=${eventId}`, { credentials: "include" }),
      fetch(`/api/ticketing/settlements?event_id=${eventId}`, { credentials: "include" }),
    ])
    if (configRes.status === "fulfilled" && configRes.value.ok) {
      const d = await configRes.value.json()
      setGrants(d.grants || [])
    }
    if (allocRes.status === "fulfilled" && allocRes.value.ok) {
      const d = await allocRes.value.json()
      setAllocations(d.allocations || [])
    }
    if (settleRes.status === "fulfilled" && settleRes.value.ok) {
      setSettlement(await settleRes.value.json())
    }
  }, [eventId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("box_office") === "1") setTab("box_office")
  }, [])

  async function addGrant() {
    if (!grantUserId.trim()) { toast.error("User ID required"); return }
    const res = await fetch("/api/ticketing/config", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "grant",
        event_id: eventId,
        user_id: grantUserId.trim(),
        permission: grantPermission,
      }),
    })
    if (!res.ok) { toast.error(await res.text()); return }
    toast.success("Grant added")
    setGrantUserId("")
    void load()
  }

  async function revokeGrant(userId: string, permission: string) {
    const res = await fetch("/api/ticketing/config", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "revoke_grant",
        event_id: eventId,
        user_id: userId,
        permission,
      }),
    })
    if (!res.ok) { toast.error(await res.text()); return }
    toast.success("Grant revoked")
    void load()
  }

  async function createAllocation() {
    if (!allocLabel.trim()) { toast.error("Label required"); return }
    const res = await fetch("/api/ticketing/allocations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        event_id: eventId,
        allocation_type: allocType,
        label: allocLabel,
        quantity_total: allocQty,
        ticket_type_id: ticketTypes[0]?.id || null,
      }),
    })
    if (!res.ok) { toast.error(await res.text()); return }
    toast.success("Allocation created")
    setAllocLabel("")
    void load()
  }

  async function issueComp() {
    if (!issueAllocId || !issueTypeId || !issueEmail) {
      toast.error("Allocation, ticket type, and email required")
      return
    }
    const res = await fetch("/api/ticketing/allocations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "issue",
        allocation_id: issueAllocId,
        ticket_type_id: issueTypeId,
        quantity: 1,
        recipient_email: issueEmail,
        recipient_name: issueName || "Guest",
      }),
    })
    if (!res.ok) { toast.error(await res.text()); return }
    toast.success("Complimentary ticket issued")
    setIssueEmail("")
    void load()
  }

  async function searchBoxOffice() {
    const res = await fetch(
      `/api/ticketing/box-office?event_id=${eventId}&q=${encodeURIComponent(boxQuery)}`,
      { credentials: "include" }
    )
    if (!res.ok) { toast.error(await res.text()); return }
    setBoxResults(await res.json())
  }

  async function sellBoxOffice() {
    if (!sellName || !sellEmail || !sellTypeId) {
      toast.error("Buyer name, email, and ticket type required")
      return
    }
    const res = await fetch("/api/ticketing/box-office", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sell",
        event_id: eventId,
        ticket_type_id: sellTypeId,
        quantity: 1,
        buyer_name: sellName,
        buyer_email: sellEmail,
        payment_method: sellMethod,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Sale failed"); return }
    if (data.checkout_url) {
      window.location.href = data.checkout_url
      return
    }
    toast.success(`Sold — order ${data.order_number}`)
    void searchBoxOffice()
  }

  async function refundBoxOffice() {
    if (!refundOrderId) {
      toast.error("Select an order to refund")
      return
    }
    const res = await fetch("/api/ticketing/box-office", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "refund",
        event_id: eventId,
        order_id: refundOrderId,
        ticket_ids: selectedTicketIds.length ? selectedTicketIds : undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Refund failed")
      return
    }
    toast.success(
      selectedTicketIds.length
        ? `Partial refund $${Number(data.refund_amount || 0).toFixed(2)}`
        : `Refunded $${Number(data.refund_amount || 0).toFixed(2)}`,
    )
    setSelectedTicketIds([])
    setRefundOrderId("")
    void searchBoxOffice()
  }

  function toggleTicket(id: string, orderId: string) {
    setRefundOrderId(orderId)
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white">Ticketing operations</CardTitle>
        <div className="flex flex-wrap gap-1 pt-2">
          {(["grants", "allocations", "box_office", "settlements"] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {key === "box_office" ? "Box office" : key[0].toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {tab === "grants" && (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs">
              Scanner bootstrap: grant <code className="text-cyan-300">scan_tickets</code> (and optionally{" "}
              <code className="text-cyan-300">reverse_checkin</code> / <code className="text-cyan-300">door_check_in</code>){" "}
              by Tourify user ID before door staff can use the check-in page. Org admins already have full access.
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>User ID</Label>
                <Input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="uuid" />
              </div>
              <div>
                <Label>Permission</Label>
                <Select value={grantPermission} onValueChange={setGrantPermission}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMISSIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void addGrant()}>Add grant</Button>
              </div>
            </div>
            <div className="space-y-2">
              {grants.length === 0 && <p className="text-slate-500">No event grants yet.</p>}
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded border border-slate-700 px-3 py-2">
                  <span className="font-mono text-xs text-slate-300">{g.user_id} · {g.permission}</span>
                  <Button size="sm" variant="ghost" onClick={() => void revokeGrant(g.user_id, g.permission)}>Revoke</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "allocations" && (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <Label>Label</Label>
                <Input value={allocLabel} onChange={(e) => setAllocLabel(e.target.value)} placeholder="Artist guests" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={allocType} onValueChange={setAllocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["artist", "venue", "organization", "staff", "media", "sponsor", "general"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={allocQty} onChange={(e) => setAllocQty(Number(e.target.value))} />
              </div>
              <div className="flex items-end">
                <Button onClick={() => void createAllocation()}>Create pool</Button>
              </div>
            </div>
            <div className="space-y-2">
              {allocations.map((a) => (
                <div key={a.id} className="rounded border border-slate-700 px-3 py-2 text-slate-300">
                  {a.label} ({a.allocation_type}) — {a.quantity_issued}/{a.quantity_total} issued
                </div>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-4 border-t border-slate-700 pt-4">
              <div>
                <Label>Allocation</Label>
                <Select value={issueAllocId} onValueChange={setIssueAllocId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {allocations.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ticket type</Label>
                <Select value={issueTypeId} onValueChange={setIssueTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ticketTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guest email</Label>
                <Input value={issueEmail} onChange={(e) => setIssueEmail(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder="Name" />
                <Button onClick={() => void issueComp()}>Issue</Button>
              </div>
            </div>
          </div>
        )}

        {tab === "box_office" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={boxQuery} onChange={(e) => setBoxQuery(e.target.value)} placeholder="Search name, email, order #" />
              <Button onClick={() => void searchBoxOffice()}>Search</Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Orders</p>
                {(boxResults.orders || []).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`block w-full border-b border-slate-800 py-1 text-left text-slate-300 ${refundOrderId === o.id ? "bg-slate-800/80" : ""}`}
                    onClick={() => {
                      setRefundOrderId(o.id)
                      setSelectedTicketIds([])
                    }}
                  >
                    {o.order_number || o.id.slice(0, 8)} · {o.buyer_name} · {o.payment_status} · ${Number(o.total_amount || 0).toFixed(2)}
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Tickets (select for partial refund)</p>
                {(boxResults.tickets || []).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 border-b border-slate-800 py-1 text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.includes(t.id)}
                      onChange={() => toggleTicket(t.id, t.order_id)}
                      disabled={t.status === "refunded"}
                    />
                    <span>
                      {t.owner_name || t.owner_email} · {t.ticket_types?.name} · {t.status}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!refundOrderId}
                onClick={() => void refundBoxOffice()}
              >
                {selectedTicketIds.length ? `Refund ${selectedTicketIds.length} ticket(s)` : "Refund full order"}
              </Button>
              {refundOrderId ? (
                <span className="text-xs text-slate-500">Order {refundOrderId.slice(0, 8)}…</span>
              ) : null}
            </div>
            <div className="grid gap-2 md:grid-cols-5 border-t border-slate-700 pt-4">
              <Input value={sellName} onChange={(e) => setSellName(e.target.value)} placeholder="Buyer name" />
              <Input value={sellEmail} onChange={(e) => setSellEmail(e.target.value)} placeholder="Buyer email" />
              <Select value={sellTypeId} onValueChange={setSellTypeId}>
                <SelectTrigger><SelectValue placeholder="Ticket type" /></SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} (${t.price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sellMethod} onValueChange={(v) => setSellMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="comp">Comp</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => void sellBoxOffice()}>Sell</Button>
            </div>
          </div>
        )}

        {tab === "settlements" && (
          <div className="space-y-2 text-slate-300">
            {!settlement && <p className="text-slate-500">No settlement data yet.</p>}
            {settlement && (
              <>
                <p>Gross: ${Number(settlement.gross || 0).toFixed(2)}</p>
                <p>Refunds: ${Number(settlement.refunds || 0).toFixed(2)}</p>
                <p>Fees: ${Number(settlement.fees || 0).toFixed(2)}</p>
                <p className="font-medium text-white">Net: ${Number(settlement.net || 0).toFixed(2)}</p>
                <div className="pt-2">
                  <p className="text-xs uppercase text-slate-500 mb-1">Shares</p>
                  {(settlement.shares || []).map((s: any, i: number) => (
                    <div key={i}>{s.beneficiary_type}: ${Number(s.amount || 0).toFixed(2)}</div>
                  ))}
                  {(settlement.shares || []).length === 0 && (
                    <p className="text-slate-500">No explicit revenue allocations configured.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
