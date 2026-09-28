"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Edit, Trash2, RefreshCw, DollarSign, TrendingUp, TrendingDown, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { formatSafeCurrency } from "@/lib/events/admin-event-normalization"
import { useActingContext } from "@/hooks/use-acting-context"

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  vendor_name?: string
  payment_status: string
  event_id?: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  overdue: 'bg-red-500/20 text-red-400',
}

const INCOME_CATS = ['ticket_revenue','merchandise','sponsorship','appearance_fee','other_income']
const EXPENSE_CATS = ['venue_rental','equipment','catering','staff_pay','marketing','travel','insurance','permits','production','other_expense']
const STATUSES = ['pending','paid','overdue','cancelled']

interface Props {
  tourId: string
  /** TOUR-204 — seed from command-center summary; skip duplicate GET on first mount. */
  initialTransactions?: Transaction[]
}

function normalizeSeedTransactions(rows: Transaction[] | undefined): Transaction[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    id: String(row.id),
    type: row.type === "income" ? "income" : "expense",
    category: String(row.category || "other_expense"),
    amount: Number(row.amount || 0),
    description: row.description ? String(row.description) : undefined,
    vendor_name: row.vendor_name ? String(row.vendor_name) : undefined,
    payment_status: String(row.payment_status || "pending"),
    event_id: row.event_id ? String(row.event_id) : undefined,
    created_at: String(row.created_at || ""),
  }))
}

export function TourFinanceManager({ tourId, initialTransactions }: Props) {
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const requestScopeKey = `${actingContextKey}:${tourId}`
  const hasSummarySeed = initialTransactions !== undefined
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    hasSummarySeed ? normalizeSeedTransactions(initialTransactions) : [],
  )
  const [loading, setLoading] = useState(!hasSummarySeed)
  const [loadedScopeKey, setLoadedScopeKey] = useState(hasSummarySeed ? requestScopeKey : "")
  const [showDialog, setShowDialog] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'expense' as 'income'|'expense', category: 'other_expense', amount: 0, description: '', vendor_name: '', payment_status: 'pending', due_date: '' })

  const fetchData = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setTransactions([])
    try {
      const res = await fetch(`/api/admin/finances?type=transactions&tour_id=${tourId}&limit=200`, {
        credentials: 'include',
        headers: actingHeaders,
      })
      if (res.ok) { const d = await res.json(); setTransactions(d.transactions || []) }
    } finally {
      setLoadedScopeKey(requestScopeKey)
      setLoading(false)
    }
  }, [actingHeaders, isActingReady, requestScopeKey, tourId])

  useEffect(() => {
    if (!isActingReady) return
    if (loadedScopeKey === requestScopeKey) return
    // TOUR-204 — prefer summary hydration; avoid duplicate finances GET on tab open.
    if (hasSummarySeed) {
      setTransactions(normalizeSeedTransactions(initialTransactions))
      setLoadedScopeKey(requestScopeKey)
      setLoading(false)
      return
    }
    void fetchData()
  }, [
    fetchData,
    hasSummarySeed,
    initialTransactions,
    isActingReady,
    loadedScopeKey,
    requestScopeKey,
  ])

  function openCreate() {
    setEditingTx(null)
    setForm({ type: 'expense', category: 'other_expense', amount: 0, description: '', vendor_name: '', payment_status: 'pending', due_date: '' })
    setShowDialog(true)
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx)
    setForm({ type: tx.type, category: tx.category, amount: tx.amount, description: tx.description || '', vendor_name: tx.vendor_name || '', payment_status: tx.payment_status, due_date: '' })
    setShowDialog(true)
  }

  async function save() {
    if (!isActingReady) { toast.error('Organization account is still loading'); return }
    if (form.amount <= 0) { toast.error('Amount must be greater than 0'); return }
    setSaving(true)
    try {
      if (editingTx) {
        const res = await fetch('/api/admin/finances', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', ...actingHeaders }, body: JSON.stringify({ id: editingTx.id, table: 'transaction', ...form, amount: Number(form.amount) }) })
        if (!res.ok) throw new Error(await res.text())
        toast.success('Transaction updated')
      } else {
        const res = await fetch('/api/admin/finances', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...actingHeaders }, body: JSON.stringify({ action: 'create_transaction', tour_id: tourId, ...form, amount: Number(form.amount) }) })
        if (!res.ok) throw new Error(await res.text())
        toast.success('Transaction added')
      }
      setShowDialog(false)
      void fetchData()
    } catch (err: any) { toast.error(err.message || 'Failed to save') } finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTx) return
    if (!isActingReady) { toast.error('Organization account is still loading'); return }
    try {
      const res = await fetch(`/api/admin/finances?id=${deleteTx.id}`, { method: 'DELETE', credentials: 'include', headers: actingHeaders })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Transaction deleted')
      setDeleteTx(null)
      void fetchData()
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); setDeleteTx(null) }
  }

  function exportCsv() {
    const rows = transactions.map(tx => [
      `"${tx.type}"`,`"${tx.category}"`,`"${tx.description || ''}"`,`"${tx.vendor_name || ''}"`,
      tx.amount,`"${tx.payment_status}"`,`"${tx.event_id || ''}"`,`"${tx.created_at}"`
    ].join(','))
    const csv = ['Type,Category,Description,Vendor,Amount,Status,Event ID,Date', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `tour-${tourId}-finances.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpenses

  if (loading || !isActingReady || loadedScopeKey !== requestScopeKey) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-purple-400" /></div>

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm"><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-green-400 shrink-0" /><div><p className="text-xl font-bold text-white">{formatSafeCurrency(totalIncome)}</p><p className="text-xs text-slate-400">Income</p></div></CardContent></Card>
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm"><CardContent className="p-4 flex items-center gap-3"><TrendingDown className="h-7 w-7 text-red-400 shrink-0" /><div><p className="text-xl font-bold text-white">{formatSafeCurrency(totalExpenses)}</p><p className="text-xs text-slate-400">Expenses</p></div></CardContent></Card>
        <Card className={`rounded-sm border ${net >= 0 ? 'bg-green-950/20 border-green-700/30' : 'bg-red-950/20 border-red-700/30'}`}><CardContent className="p-4 flex items-center gap-3"><DollarSign className={`h-7 w-7 shrink-0 ${net >= 0 ? 'text-green-400' : 'text-red-400'}`} /><div><p className={`text-xl font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatSafeCurrency(net)}</p><p className="text-xs text-slate-400">Net</p></div></CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">{transactions.length} transactions across all shows</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="border-slate-700 text-slate-300 h-8"><Download className="h-3.5 w-3.5 mr-1.5" />Export CSV</Button>
          <Button size="sm" onClick={openCreate} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Transaction</Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm"><CardContent className="text-center py-10"><DollarSign className="h-8 w-8 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No transactions yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-1.5">
          {transactions.map(tx => (
            <Card key={tx.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{tx.type}</span>
                    <span className="text-white text-sm truncate">{tx.description || tx.category}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{tx.vendor_name || tx.category} · {new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-base font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'income' ? '+' : '-'}{formatSafeCurrency(tx.amount)}</span>
                  <Badge className={STATUS_COLORS[tx.payment_status] || 'bg-slate-700 text-slate-300'}>{tx.payment_status}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => openEdit(tx)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400" onClick={() => setDeleteTx(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle className="text-white">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-slate-300">Type</Label>
                <Select value={form.type} onValueChange={(v: 'income'|'expense') => setForm(p => ({
                  ...p,
                  type: v,
                  category: v === 'income' ? 'other_income' : 'other_expense',
                }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white"><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-slate-300">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <SelectItem key={c} value={c}>{c.replace(/_/g,' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-slate-300">Amount ($)</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} className="bg-slate-800/50 border-slate-700/50 text-white" /></div>
              <div className="space-y-1.5"><Label className="text-slate-300">Status</Label>
                <Select value={form.payment_status} onValueChange={v => setForm(p => ({ ...p, payment_status: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-slate-300">Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white min-h-[60px] text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-slate-300">Vendor</Label><Input value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">{saving ? 'Saving...' : editingTx ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTx} onOpenChange={() => setDeleteTx(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Delete Transaction?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Delete {formatSafeCurrency(deleteTx?.amount || 0)} {deleteTx?.type}? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
