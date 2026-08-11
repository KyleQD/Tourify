"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Edit, Trash2, Download, RefreshCw, Users, DollarSign, Ticket } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import { EventTicketingOpsPanels } from "@/components/admin/event-ticketing-ops-panels"
import { useActingContext } from "@/hooks/use-acting-context"

interface TicketType {
  id: string
  name: string
  description?: string
  price: number
  quantity_available: number
  quantity_sold: number
  category: string
  is_active: boolean
  sale_start?: string
  sale_end?: string
}

interface TicketSale {
  id: string
  buyer_name?: string
  buyer_email?: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_status: string
  created_at: string
  ticket_types?: { name: string }
  checked_in?: boolean
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Admission' },
  { value: 'vip', label: 'VIP' },
  { value: 'premium', label: 'Premium' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'student', label: 'Student' },
  { value: 'backstage', label: 'Backstage' },
  { value: 'group', label: 'Group' },
]

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  refunded: 'bg-red-500/20 text-red-400 border-red-500/30',
  failed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

interface Props {
  eventId: string
}

export function EventTicketManager({ eventId }: Props) {
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const requestScopeKey = `${actingContextKey}:${eventId}`
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [sales, setSales] = useState<TicketSale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedScopeKey, setLoadedScopeKey] = useState('')
  const [salesSearch, setSalesSearch] = useState('')
  const [activeView, setActiveView] = useState<'types' | 'sales'>('types')
  const [ticketingEnabled, setTicketingEnabled] = useState(false)
  const [report, setReport] = useState<any>(null)

  // Type dialog
  const [showTypeDialog, setShowTypeDialog] = useState(false)
  const [editingType, setEditingType] = useState<TicketType | null>(null)
  const [typeForm, setTypeForm] = useState({
    name: '', description: '', price: 0, quantity_available: 0,
    category: 'general', sale_start: '', sale_end: '',
  })

  // Refund dialog
  const [refundSale, setRefundSale] = useState<TicketSale | null>(null)
  const [deleteType, setDeleteType] = useState<TicketType | null>(null)
  const [savingType, setSavingType] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setTicketTypes([])
    setSales([])
    try {
      const [typesRes, salesRes, configRes, reportRes] = await Promise.allSettled([
        fetch(`/api/admin/ticketing/enhanced?type=ticket_types&event_id=${eventId}`, { credentials: 'include', headers: actingHeaders }),
        fetch(`/api/admin/ticketing/enhanced?type=sales&event_id=${eventId}`, { credentials: 'include', headers: actingHeaders }),
        fetch(`/api/ticketing/config?event_id=${eventId}`, { credentials: 'include' }),
        fetch(`/api/ticketing/reports?event_id=${eventId}`, { credentials: 'include' }),
      ])

      if (typesRes.status === 'fulfilled' && typesRes.value.ok) {
        const d = await typesRes.value.json()
        setTicketTypes(d.ticket_types || d.data || [])
      }
      if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
        const d = await salesRes.value.json()
        setSales(d.sales || d.data || [])
      }
      if (configRes.status === 'fulfilled' && configRes.value.ok) {
        const d = await configRes.value.json()
        setTicketingEnabled(Boolean(d.config?.ticketing_enabled))
      }
      if (reportRes.status === 'fulfilled' && reportRes.value.ok) {
        setReport(await reportRes.value.json())
      }
    } finally {
      setLoadedScopeKey(requestScopeKey)
      setLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady, requestScopeKey])

  useEffect(() => { void fetchData() }, [fetchData])

  async function enableTicketing() {
    try {
      const res = await fetch('/api/ticketing/config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_config',
          event_id: eventId,
          ticketing_enabled: true,
          ticketing_owner_type: 'organization',
          platform_fee_type: 'flat_per_ticket',
          platform_fee_amount: 1,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setTicketingEnabled(true)
      toast.success('Ticketing enabled for this event')
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable ticketing')
    }
  }

  function openCreateType() {
    setEditingType(null)
    setTypeForm({ name: '', description: '', price: 0, quantity_available: 0, category: 'general', sale_start: '', sale_end: '' })
    setShowTypeDialog(true)
  }

  function openEditType(t: TicketType) {
    setEditingType(t)
    setTypeForm({
      name: t.name,
      description: t.description || '',
      price: t.price,
      quantity_available: t.quantity_available,
      category: t.category,
      sale_start: t.sale_start ? t.sale_start.slice(0, 16) : '',
      sale_end: t.sale_end ? t.sale_end.slice(0, 16) : '',
    })
    setShowTypeDialog(true)
  }

  async function saveType() {
    if (!isActingReady) { toast.error('Organization account is still loading'); return }
    if (!typeForm.name.trim()) { toast.error('Name is required'); return }
    if (!Number.isInteger(Number(typeForm.quantity_available)) || Number(typeForm.quantity_available) < 1) {
      toast.error('Quantity must be an explicit positive number (no default capacity)')
      return
    }
    setSavingType(true)
    try {
      const body = {
        action: editingType ? 'update_ticket_type' : 'create_ticket_type',
        ...(editingType ? { id: editingType.id } : { event_id: eventId }),
        ...typeForm,
        price: Number(typeForm.price),
        quantity_available: Number(typeForm.quantity_available),
      }
      const res = await fetch('/api/admin/ticketing/enhanced', {
        method: editingType ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(editingType ? 'Ticket type updated' : 'Ticket type created')
      setShowTypeDialog(false)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save ticket type')
    } finally {
      setSavingType(false)
    }
  }

  async function toggleTypeActive(t: TicketType) {
    if (!isActingReady) { toast.error('Organization account is still loading'); return }
    try {
      const res = await fetch('/api/admin/ticketing/enhanced', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ action: 'update_ticket_type', id: t.id, is_active: !t.is_active }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(t.is_active ? 'Ticket type paused' : 'Ticket type activated')
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ticket type')
    }
  }

  async function confirmDeleteType() {
    if (!deleteType) return
    if (deleteType.quantity_sold > 0) {
      toast.error('Cannot delete a ticket type with existing sales')
      setDeleteType(null)
      return
    }
    try {
      const res = await fetch(`/api/admin/ticketing/enhanced?id=${deleteType.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: actingHeaders,
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Ticket type deleted')
      setDeleteType(null)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete ticket type')
      setDeleteType(null)
    }
  }

  async function processRefund(sale: TicketSale) {
    if (!isActingReady) { toast.error('Organization account is still loading'); return }
    try {
      const res = await fetch('/api/admin/ticketing/refund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ sale_id: sale.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Refund processed successfully')
      setRefundSale(null)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund')
    }
  }

  function exportAttendees() {
    window.location.href = `/api/admin/events/${eventId}/export?format=csv`
  }

  const filteredSales = sales.filter((s) => {
    if (!salesSearch) return true
    const q = salesSearch.toLowerCase()
    return (
      (s.buyer_name || '').toLowerCase().includes(q) ||
      (s.buyer_email || '').toLowerCase().includes(q)
    )
  })

  const totalSold = ticketTypes.reduce((s, t) => s + t.quantity_sold, 0)
  const totalRevenue = sales
    .filter((s) => s.payment_status === 'completed')
    .reduce((s, sale) => s + (Number(sale.total_amount) || 0), 0)

  if (loading || !isActingReady || loadedScopeKey !== requestScopeKey) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">
              Ticketing {ticketingEnabled ? 'enabled' : 'not configured'}
            </p>
            <p className="text-xs text-slate-400">
              Explicit ownership + $1/ticket platform fee by default. Connect payout fields are ready for later.
            </p>
            {report && (
              <p className="mt-1 text-xs text-slate-500">
                Live: {report.tickets_sold ?? 0} sold · {report.checked_in ?? 0} checked in
                {report.finances ? ` · $${Number(report.finances.gross_revenue || 0).toFixed(0)} gross` : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!ticketingEnabled && (
              <Button size="sm" onClick={() => void enableTicketing()}>
                Enable ticketing
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <a href={`/admin/dashboard/events/${eventId}/check-in`}>Scanner</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/tickets/purchase?event_id=${eventId}`}>Public purchase</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <EventTicketingOpsPanels
        eventId={eventId}
        ticketTypes={ticketTypes.map((t) => ({ id: t.id, name: t.name, price: t.price }))}
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{formatSafeNumber(totalSold)}</p>
              <p className="text-xs text-slate-400">Tickets Sold</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{formatSafeCurrency(totalRevenue)}</p>
              <p className="text-xs text-slate-400">Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{ticketTypes.length}</p>
              <p className="text-xs text-slate-400">Ticket Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex border border-slate-700/50 rounded-sm overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm transition-all ${activeView === 'types' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveView('types')}
          >
            Ticket Types ({ticketTypes.length})
          </button>
          <button
            className={`px-4 py-1.5 text-sm transition-all ${activeView === 'sales' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveView('sales')}
          >
            Purchasers ({sales.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'sales' && (
            <Button variant="outline" size="sm" onClick={exportAttendees} className="border-slate-700 text-slate-300 h-8">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          )}
          {activeView === 'types' && (
            <Button size="sm" onClick={openCreateType} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Type
            </Button>
          )}
        </div>
      </div>

      {/* Ticket Types */}
      {activeView === 'types' && (
        <div className="space-y-2">
          {ticketTypes.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="text-center py-10">
                <Ticket className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No ticket types yet.</p>
                <Button size="sm" onClick={openCreateType} className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add First Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            ticketTypes.map((t) => {
              const pct = t.quantity_available > 0 ? (t.quantity_sold / t.quantity_available) * 100 : 0
              return (
                <Card key={t.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-white font-medium">{t.name}</p>
                          <p className="text-slate-400 text-xs">{CATEGORY_OPTIONS.find(c => c.value === t.category)?.label || t.category}</p>
                        </div>
                        <Badge className={t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                          {t.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{formatSafeCurrency(t.price)}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => openEditType(t)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400" onClick={() => toggleTypeActive(t)}>
                          {t.is_active ? '⏸' : '▶'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400" onClick={() => setDeleteType(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{t.quantity_sold} sold / {t.quantity_available} available</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Sales / Purchasers */}
      {activeView === 'sales' && (
        <div className="space-y-3">
          <Input
            placeholder="Search by name or email..."
            value={salesSearch}
            onChange={(e) => setSalesSearch(e.target.value)}
            className="bg-slate-800/50 border-slate-700/50 text-white h-9 text-sm"
          />
          {filteredSales.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="text-center py-10">
                <p className="text-slate-400">No ticket sales yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {filteredSales.map((s) => (
                <Card key={s.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.buyer_name || 'Unknown'}</p>
                      <p className="text-slate-400 text-xs truncate">{s.buyer_email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-300 text-xs">{s.ticket_types?.name || 'General'} ×{s.quantity}</span>
                      <span className="text-white text-sm font-semibold">{formatSafeCurrency(s.total_amount)}</span>
                      <Badge className={STATUS_COLORS[s.payment_status] || 'bg-slate-700 text-slate-300'}>
                        {s.payment_status}
                      </Badge>
                      {s.payment_status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 px-2"
                          onClick={() => setRefundSale(s)}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingType ? 'Edit Ticket Type' : 'Add Ticket Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Name *</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white" placeholder="e.g. General Admission" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Price ($) *</Label>
                <Input type="number" min="0" step="0.01" value={typeForm.price} onChange={(e) => setTypeForm(p => ({ ...p, price: Number(e.target.value) }))} className="bg-slate-800/50 border-slate-700/50 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Quantity *</Label>
                <Input type="number" min="1" value={typeForm.quantity_available} onChange={(e) => setTypeForm(p => ({ ...p, quantity_available: Number(e.target.value) }))} className="bg-slate-800/50 border-slate-700/50 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Category</Label>
              <Select value={typeForm.category} onValueChange={(v) => setTypeForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Sale Start</Label>
                <Input type="datetime-local" value={typeForm.sale_start} onChange={(e) => setTypeForm(p => ({ ...p, sale_start: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Sale End</Label>
                <Input type="datetime-local" value={typeForm.sale_end} onChange={(e) => setTypeForm(p => ({ ...p, sale_end: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={saveType} disabled={savingType} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              {savingType ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <AlertDialog open={!!refundSale} onOpenChange={() => setRefundSale(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Process Refund?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Refund {formatSafeCurrency(refundSale?.total_amount || 0)} to {refundSale?.buyer_name || refundSale?.buyer_email}?
              This will trigger a Stripe refund and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => refundSale && processRefund(refundSale)} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Process Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete type dialog */}
      <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Ticket Type?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Delete &ldquo;{deleteType?.name}&rdquo;? This cannot be undone.
              {deleteType && deleteType.quantity_sold > 0 && (
                <span className="block mt-2 text-red-400">This type has {deleteType.quantity_sold} sales and cannot be deleted.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteType}
              disabled={deleteType ? deleteType.quantity_sold > 0 : false}
              className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
