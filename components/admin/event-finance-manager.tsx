"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Edit, Trash2, RefreshCw, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatSafeCurrency } from "@/lib/events/admin-event-normalization"

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  vendor_name?: string
  payment_status: string
  payment_method?: string
  due_date?: string
  paid_at?: string
  event_id?: string
  created_at: string
}

interface Budget {
  id: string
  category: string
  allocated_amount: number
  spent_amount: number
  event_id?: string
}

const INCOME_CATEGORIES = ['ticket_revenue','sponsorship','merchandise','bar_revenue','catering','parking','streaming','other']
const EXPENSE_CATEGORIES = ['venue','production','staff','marketing','travel','catering','equipment','legal','insurance','other']
const PAYMENT_STATUSES = ['pending','paid','overdue','cancelled','refunded']

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  overdue: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-slate-500/20 text-slate-400',
  refunded: 'bg-blue-500/20 text-blue-400',
}

interface Props { eventId: string }

export function EventFinanceManager({ eventId }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'transactions' | 'budget'>('transactions')

  const [showTxDialog, setShowTxDialog] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)

  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'other',
    amount: 0,
    description: '',
    vendor_name: '',
    payment_status: 'pending',
    due_date: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [txRes, bdRes] = await Promise.allSettled([
        fetch(`/api/admin/finances?type=transactions&event_id=${eventId}&limit=100`, { credentials: 'include' }),
        fetch(`/api/admin/finances?type=budgets&event_id=${eventId}`, { credentials: 'include' }),
      ])
      if (txRes.status === 'fulfilled' && txRes.value.ok) {
        const d = await txRes.value.json()
        setTransactions(d.transactions || [])
      }
      if (bdRes.status === 'fulfilled' && bdRes.value.ok) {
        const d = await bdRes.value.json()
        setBudgets(d.budgets || [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchData() }, [fetchData])

  function openCreateTx() {
    setEditingTx(null)
    setTxForm({ type: 'expense', category: 'other', amount: 0, description: '', vendor_name: '', payment_status: 'pending', due_date: '' })
    setShowTxDialog(true)
  }

  function openEditTx(tx: Transaction) {
    setEditingTx(tx)
    setTxForm({
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description || '',
      vendor_name: tx.vendor_name || '',
      payment_status: tx.payment_status,
      due_date: tx.due_date ? tx.due_date.slice(0, 10) : '',
    })
    setShowTxDialog(true)
  }

  async function saveTx() {
    if (!txForm.category || txForm.amount <= 0) { toast.error('Amount and category required'); return }
    setSaving(true)
    try {
      if (editingTx) {
        const res = await fetch('/api/admin/finances', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTx.id, table: 'transaction', ...txForm, amount: Number(txForm.amount) }),
        })
        if (!res.ok) throw new Error(await res.text())
        toast.success('Transaction updated')
      } else {
        const res = await fetch('/api/admin/finances', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_transaction', event_id: eventId, ...txForm, amount: Number(txForm.amount) }),
        })
        if (!res.ok) throw new Error(await res.text())
        toast.success('Transaction added')
      }
      setShowTxDialog(false)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDeleteTx() {
    if (!deleteTx) return
    try {
      const res = await fetch(`/api/admin/finances?id=${deleteTx.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Transaction deleted')
      setDeleteTx(null)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
      setDeleteTx(null)
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit = totalIncome - totalExpenses

  const categories = Array.from(new Set(transactions.map(t => t.category)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-green-400 shrink-0" />
            <div><p className="text-xl font-bold text-white">{formatSafeCurrency(totalIncome)}</p><p className="text-xs text-slate-400">Income</p></div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-7 w-7 text-red-400 shrink-0" />
            <div><p className="text-xl font-bold text-white">{formatSafeCurrency(totalExpenses)}</p><p className="text-xs text-slate-400">Expenses</p></div>
          </CardContent>
        </Card>
        <Card className={`rounded-sm border ${netProfit >= 0 ? 'bg-green-950/20 border-green-700/30' : 'bg-red-950/20 border-red-700/30'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className={`h-7 w-7 shrink-0 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            <div><p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatSafeCurrency(netProfit)}</p><p className="text-xs text-slate-400">Net</p></div>
          </CardContent>
        </Card>
      </div>

      {/* View toggle + Add */}
      <div className="flex items-center justify-between">
        <div className="flex border border-slate-700/50 rounded-sm overflow-hidden">
          <button className={`px-4 py-1.5 text-sm transition-all ${activeView === 'transactions' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveView('transactions')}>
            Transactions ({transactions.length})
          </button>
          <button className={`px-4 py-1.5 text-sm transition-all ${activeView === 'budget' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveView('budget')}>
            Budget ({budgets.length})
          </button>
        </div>
        {activeView === 'transactions' && (
          <Button size="sm" onClick={openCreateTx} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Transaction
          </Button>
        )}
      </div>

      {/* Transactions */}
      {activeView === 'transactions' && (
        <div className="space-y-1.5">
          {transactions.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="text-center py-10">
                <DollarSign className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No transactions yet.</p>
                <Button size="sm" onClick={openCreateTx} className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Add Transaction
                </Button>
              </CardContent>
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card key={tx.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tx.type}
                      </span>
                      <span className="text-white text-sm truncate">{tx.description || tx.category}</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{tx.vendor_name || tx.category} • {new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-base font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatSafeCurrency(tx.amount)}
                    </span>
                    <Badge className={STATUS_COLORS[tx.payment_status] || 'bg-slate-700 text-slate-300'}>{tx.payment_status}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => openEditTx(tx)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400" onClick={() => setDeleteTx(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Budget */}
      {activeView === 'budget' && (
        <div className="space-y-2">
          {budgets.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="text-center py-10">
                <p className="text-slate-400">No budgets set. Budgets can be created from the Finances page.</p>
              </CardContent>
            </Card>
          ) : (
            budgets.map((b) => {
              const pct = b.allocated_amount > 0 ? Math.min((b.spent_amount / b.allocated_amount) * 100, 100) : 0
              const color = pct > 90 ? 'text-red-400' : pct > 70 ? 'text-yellow-400' : 'text-green-400'
              return (
                <Card key={b.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium capitalize">{b.category}</span>
                      <span className={`text-sm font-medium ${color}`}>{formatSafeCurrency(b.spent_amount)} / {formatSafeCurrency(b.allocated_amount)}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% used</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Type *</Label>
                <Select value={txForm.type} onValueChange={(v: 'income'|'expense') => setTxForm(p => ({ ...p, type: v, category: 'other' }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Category *</Label>
                <Select value={txForm.category} onValueChange={(v) => setTxForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {(txForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Amount ($) *</Label>
                <Input type="number" min="0" step="0.01" value={txForm.amount} onChange={(e) => setTxForm(p => ({ ...p, amount: Number(e.target.value) }))} className="bg-slate-800/50 border-slate-700/50 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Status</Label>
                <Select value={txForm.payment_status} onValueChange={(v) => setTxForm(p => ({ ...p, payment_status: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Description</Label>
              <Textarea value={txForm.description} onChange={(e) => setTxForm(p => ({ ...p, description: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white min-h-[60px] text-sm" placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Vendor</Label>
                <Input value={txForm.vendor_name} onChange={(e) => setTxForm(p => ({ ...p, vendor_name: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" placeholder="Vendor name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Due Date</Label>
                <Input type="date" value={txForm.due_date} onChange={(e) => setTxForm(p => ({ ...p, due_date: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={saveTx} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              {saving ? 'Saving...' : editingTx ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTx} onOpenChange={() => setDeleteTx(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Delete {formatSafeCurrency(deleteTx?.amount || 0)} {deleteTx?.type} — &ldquo;{deleteTx?.description || deleteTx?.category}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTx} className="bg-red-600 hover:bg-red-700 text-white border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
