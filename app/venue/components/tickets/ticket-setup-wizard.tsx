"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { AlertCircle, Check, Plus, Trash2 } from "lucide-react"

// VEN-151 — real per-event ticketing setup wizard (enable/config/types/publish).

type SetupType = {
  id?: string
  name: string
  description?: string | null
  price: number
  quantity_available: number
  max_per_customer?: number | null
  category?: string
  is_complimentary?: boolean
}

export interface TicketSetupPayload {
  event: { id: string; title: string }
  config: Record<string, any> | null
  ticket_types: Array<SetupType & { id: string; quantity_sold: number; is_active: boolean }>
  inventory: { total_inventory: number; total_sold: number; available: number }
  sale_state: string
  sale_state_label: string
  sale_state_reason: string
  checkpoints: string[]
  capabilities: Record<string, boolean>
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const STEPS = ["Basics", "Sale window", "Ticket types", "Review & publish"] as const

export function TicketSetupWizard({
  eventId,
  open,
  onOpenChange,
  onSaved,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [data, setData] = useState<TicketSetupPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  // Form state
  const [capacity, setCapacity] = useState("")
  const [maxPerOrder, setMaxPerOrder] = useState("8")
  const [saleStart, setSaleStart] = useState("")
  const [saleEnd, setSaleEnd] = useState("")
  const [refundPolicy, setRefundPolicy] = useState("")
  const [termsText, setTermsText] = useState("")
  const [checkpointsInput, setCheckpointsInput] = useState("")
  const [types, setTypes] = useState<SetupType[]>([])
  const [newType, setNewType] = useState<SetupType>({ name: "", price: 0, quantity_available: 0 })

  // Mutation state
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successNote, setSuccessNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch(`/api/venue/events/${eventId}/ticketing-setup`, { credentials: "include", cache: "no-store" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Load failed (${response.status})`)
      }
      const payload: TicketSetupPayload = await response.json()
      setData(payload)
      const config = payload.config || {}
      setCapacity(config.capacity != null ? String(config.capacity) : "")
      setMaxPerOrder(config.max_per_order != null ? String(config.max_per_order) : "8")
      setSaleStart(toDatetimeLocal(config.sale_start))
      setSaleEnd(toDatetimeLocal(config.sale_end))
      setRefundPolicy(config.refund_policy || "")
      setTermsText(config.terms_text || "")
      setCheckpointsInput((payload.checkpoints || []).join(", "))
      setTypes(payload.ticket_types.filter((t) => t.is_active).map((t) => ({ ...t })))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load ticketing setup")
    }
  }, [eventId])

  useEffect(() => {
    if (open) void load()
    else {
      setStep(0)
      setData(null)
      setFormError(null)
      setSuccessNote(null)
    }
  }, [open, load])

  const canManage = data?.capabilities?.manage_ticket_types !== false
  const canPublish = Boolean(data?.capabilities?.publish_sales)

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch(`/api/venue/events/${eventId}/ticketing-setup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Save failed (${response.status})`)
      return payload
    },
    [eventId],
  )

  const runAction = useCallback(
    async (body: Record<string, unknown>, note: string) => {
      setBusy(true)
      setFormError(null)
      setSuccessNote(null)
      try {
        await post(body)
        setSuccessNote(note)
        await load()
        onSaved?.()
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setBusy(false)
      }
    },
    [post, load, onSaved],
  )

  const saveBasics = async () => {
    await runAction(
      {
        action: "configure",
        patch: {
          capacity: capacity === "" ? null : Math.max(0, parseInt(capacity, 10) || 0),
          max_per_order: Math.max(1, parseInt(maxPerOrder, 10) || 8),
        },
      },
      "Basics saved.",
    )
    // VEN-159 — persist door checkpoints alongside basics.
    if (checkpointsInput.trim() || (data?.checkpoints?.length ?? 0) > 0) {
      const names = checkpointsInput
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 20)
      await post({ action: "set_checkpoints", checkpoints: names })
      setSuccessNote("Basics and door checkpoints saved.")
      await load()
      onSaved?.()
    }
  }

  const saveWindow = () =>
    runAction(
      {
        action: "configure",
        patch: {
          sale_start: fromDatetimeLocal(saleStart),
          sale_end: fromDatetimeLocal(saleEnd),
          ...(refundPolicy ? { refund_policy: refundPolicy } : {}),
          ...(termsText ? { terms_text: termsText } : {}),
        },
      },
      "Sale window saved.",
    )

  const addType = async () => {
    if (!newType.name.trim()) {
      setFormError("Ticket type needs a name.")
      return
    }
    if (newType.price < 0 || newType.quantity_available < 0) {
      setFormError("Price and quantity must be zero or more.")
      return
    }
    await runAction({ action: "upsert_type", type: newType }, `Ticket type “${newType.name}” saved.`)
    setNewType({ name: "", price: 0, quantity_available: 0 })
  }

  const archiveType = (id: string) =>
    runAction({ action: "archive_type", type_id: id }, "Ticket type archived.")

  const publish = () => runAction({ action: "publish_sales" }, "Sales are live.")

  const pause = () => runAction({ action: "pause_sales" }, "Sales paused.")

  const reviewSummary = useMemo(() => {
    if (!data) return null
    const totalInventory = types.reduce((sum, t) => sum + Number(t.quantity_available || 0), 0)
    return {
      typeCount: types.length,
      totalInventory,
      window: saleStart || saleEnd ? `${saleStart || "now"} → ${saleEnd || "event end"}` : "Always on once published",
    }
  }, [data, types, saleStart, saleEnd])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-gray-900 text-zinc-100 sm:max-w-xl" aria-describedby="setup-wizard-desc">
        <DialogHeader>
          <DialogTitle>Ticketing setup</DialogTitle>
          <DialogDescription id="setup-wizard-desc" className="text-zinc-400">
            {data?.event.title || "Loading event…"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <ol className="flex flex-wrap gap-2 text-xs" aria-label="Setup steps">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => canManage && setStep(index)}
                aria-current={step === index ? "step" : undefined}
                className={`rounded-full border px-3 py-1 ${
                  step === index ? "border-purple-500 bg-purple-600/20 text-purple-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                } ${canManage ? "" : "cursor-not-allowed opacity-60"}`}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        {loadError ? (
          <div className="space-y-3 rounded-md border border-red-800 bg-red-950/40 p-4 text-sm">
            <p className="flex items-center gap-2 text-red-300"><AlertCircle className="h-4 w-4" /> {loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>
          </div>
        ) : !data ? (
          <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
        ) : !canManage ? (
          <div className="rounded-md border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-200">
            You have view-only access to this event’s ticketing. Ask a grants manager for “Manage ticket types”.
          </div>
        ) : (
          <>
            {formError && (
              <p role="alert" className="rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{formError}</p>
            )}
            {successNote && (
              <p role="status" className="flex items-center gap-2 rounded-md border border-green-700 bg-green-950/30 p-3 text-sm text-green-300">
                <Check className="h-4 w-4" /> {successNote}
              </p>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ts-capacity">Event capacity</Label>
                    <Input id="ts-capacity" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 250" className="bg-gray-800" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ts-max-order">Max per order</Label>
                    <Input id="ts-max-order" inputMode="numeric" value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value.replace(/[^0-9]/g, ""))} className="bg-gray-800" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ts-checkpoints">Door checkpoints</Label>
                  <Textarea id="ts-checkpoints" rows={2} value={checkpointsInput} onChange={(e) => setCheckpointsInput(e.target.value)} placeholder="Main entrance, Balcony, VIP door" className="bg-gray-800" />
                  <p className="text-xs text-zinc-500">Comma-separated entrances. Scans record which door admitted each guest.</p>
                </div>
                <p className="text-xs text-zinc-500">Current state: {data.sale_state_label} — {data.sale_state_reason}</p>
                <DialogFooter><Button onClick={() => void saveBasics()} disabled={busy}>{busy ? "Saving…" : "Save basics"}</Button></DialogFooter>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ts-sale-start">Sales open</Label>
                    <Input id="ts-sale-start" type="datetime-local" value={saleStart} onChange={(e) => setSaleStart(e.target.value)} className="bg-gray-800" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ts-sale-end">Sales close</Label>
                    <Input id="ts-sale-end" type="datetime-local" value={saleEnd} onChange={(e) => setSaleEnd(e.target.value)} className="bg-gray-800" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ts-refund">Refund policy</Label>
                  <Textarea id="ts-refund" rows={2} value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} placeholder="No refunds within 7 days of the event" className="bg-gray-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ts-terms">Purchase terms shown at checkout</Label>
                  <Textarea id="ts-terms" rows={3} value={termsText} onChange={(e) => setTermsText(e.target.value)} className="bg-gray-800" />
                </div>
                <DialogFooter><Button onClick={saveWindow} disabled={busy}>{busy ? "Saving…" : "Save sale window"}</Button></DialogFooter>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {types.length > 0 ? (
                  <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
                    {types.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">{t.name}</p>
                          <p className="text-xs text-zinc-400">
                            ${(Number(t.price) || 0).toFixed(2)} · {t.quantity_sold}/{t.quantity_available} sold
                            {t.is_complimentary ? " · comp pool" : ""}
                          </p>
                        </div>
                        {canPublish !== undefined && (
                          <Button variant="ghost" size="sm" onClick={() => t.id && archiveType(t.id)} disabled={busy} aria-label={`Archive ${t.name}`}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
                    No ticket types yet — add the first one below.
                  </p>
                )}

                <fieldset className="space-y-3 rounded-md border border-zinc-800 p-3">
                  <legend className="px-1 text-xs uppercase tracking-wide text-zinc-500">Add ticket type</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <Label htmlFor="nt-name">Name</Label>
                      <Input id="nt-name" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} placeholder="General admission" className="bg-gray-800" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nt-price">Price (USD)</Label>
                      <Input id="nt-price" inputMode="decimal" value={String(newType.price)} onChange={(e) => setNewType({ ...newType, price: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} className="bg-gray-800" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nt-qty">Quantity</Label>
                      <Input id="nt-qty" inputMode="numeric" value={String(newType.quantity_available)} onChange={(e) => setNewType({ ...newType, quantity_available: parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0 })} className="bg-gray-800" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <Switch checked={Boolean(newType.is_complimentary)} onCheckedChange={(checked) => setNewType({ ...newType, is_complimentary: checked })} aria-label="Complimentary pool" />
                      Complimentary / guest-list pool
                    </label>
                    <Button size="sm" onClick={addType} disabled={busy || !newType.name.trim()}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                </fieldset>
              </div>
            )}

            {step === 3 && reviewSummary && (
              <div className="space-y-4">
                <dl className="grid grid-cols-1 gap-2 rounded-md border border-zinc-800 p-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-zinc-500">Ticket types</dt><dd>{reviewSummary.typeCount}</dd></div>
                  <div><dt className="text-zinc-500">Total inventory</dt><dd>{reviewSummary.totalInventory}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-zinc-500">Sale window</dt><dd className="break-words">{reviewSummary.window}</dd></div>
                  <div className="sm:col-span-2">
                    <dt className="text-zinc-500">Current state</dt>
                    <dd className="flex items-center gap-2">
                      <Badge variant="outline" className="border-zinc-600">{data.sale_state_label}</Badge>
                      <span className="text-xs text-zinc-400">{data.sale_state_reason}</span>
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-zinc-500">
                  Publishing makes sales live according to this window. You can pause anytime without losing inventory.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={publish} disabled={busy || !canPublish || types.length === 0}>
                    {busy ? "Working…" : data.sale_state === "paused" ? "Resume sales" : "Publish sales"}
                  </Button>
                  {(data.sale_state === "on_sale") && (
                    <Button variant="outline" className="border-orange-700 text-orange-300" onClick={pause} disabled={busy || !canPublish}>
                      Pause sales
                    </Button>
                  )}
                </div>
                {!canPublish && (
                  <p className="text-xs text-yellow-400">You need the “Publish sales” permission to change public sale state.</p>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
