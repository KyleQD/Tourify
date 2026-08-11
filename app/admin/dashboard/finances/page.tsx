"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DollarSign,
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Handshake,
  Edit,
  Trash2,
} from "lucide-react"
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminStatCard } from "../components/admin-stat-card"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useActingContext } from "@/hooks/use-acting-context"
import { mapAdminScopeError, readAdminErrorMessage } from "@/lib/admin/admin-request"
import {
  FinanceParentScopePicker,
  FinanceScopePicker,
  type FinanceScopeSelection,
} from "@/components/admin/finance-scope-picker"
import { BudgetRollupCard } from "@/components/admin/finance/budget-rollup-card"
import { FinanceReconciliationTable } from "@/components/admin/finance/finance-reconciliation-table"
import { BudgetWorkspacePanel } from "@/components/admin/finance/budget-workspace-panel"
import { CommitmentsProcurementPanel } from "@/components/admin/finance/commitments-procurement-panel"
import { ExpenseOperationsPanel } from "@/components/admin/finance/expense-operations-panel"

interface FinancialOverview {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  totalAllocated: number
  totalSpent: number
  budgetRemaining: number
  pendingPayments: number
  overduePayments: number
  transactionCount: number
}

interface Transaction {
  id: string
  type: string
  category: string
  amount: number
  description: string
  vendor_name: string | null
  payment_status: string
  payment_method: string | null
  due_date: string | null
  paid_at: string | null
  event_id: string | null
  tour_id: string | null
  created_at: string
}

interface Budget {
  id: string
  category: string
  allocated_amount: number
  spent_amount: number
  notes: string | null
  event_id: string | null
  tour_id: string | null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function statusColor(status: string): string {
  switch (status) {
    case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'cancelled': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    case 'refunded': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

function buildNoStoreInit(
  actingHeaders: Record<string, string>,
  input?: RequestInit,
): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

export default function FinancesPage() {
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const adminRequest = useCallback(
    (input?: RequestInit) => buildNoStoreInit(actingHeaders, input),
    [actingHeaders],
  )
  const [loading, setLoading] = useState(true)
  const [loadedContextKey, setLoadedContextKey] = useState('')
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [addingTx, setAddingTx] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettlementDialog, setShowSettlementDialog] = useState(false)
  const [settlementForm, setSettlementForm] = useState({
    event_id: '',
    tour_id: '',
    total_gross_revenue: '',
    total_expenses: '',
    artist_payout: '',
    venue_payout: '',
    deal_type: 'guarantee',
    notes: '',
  })
  const [addingSettlement, setAddingSettlement] = useState(false)

  // Edit/delete transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ type: 'expense' as 'income'|'expense', category: '', amount: '', description: '', vendor_name: '', payment_status: 'pending' })
  const [editVendorSelection, setEditVendorSelection] = useState<FinanceScopeSelection | null>(null)

  const [newTx, setNewTx] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'other_expense',
    amount: '',
    description: '',
    vendor_name: '',
    payment_status: 'pending',
    event_id: '',
    tour_id: '',
  })
  const [newTxVendorSelection, setNewTxVendorSelection] = useState<FinanceScopeSelection | null>(null)

  const fetchData = useCallback(async () => {
    if (!isActingReady) return
    try {
      setLoading(true)
      setOverview(null)
      setTransactions([])
      setBudgets([])
      setSettlements([])
      const [res, settlementsRes] = await Promise.all([
        fetch('/api/admin/finances?type=overview', adminRequest()),
        fetch('/api/admin/finances/settlements', adminRequest()),
      ])
      if (!res.ok) {
        const message = await readAdminErrorMessage(res)
        const mapped = mapAdminScopeError(res.status, null, message)
        throw new Error(mapped.message)
      }
      const [data, settlementsData] = await Promise.all([
        res.json(),
        settlementsRes.ok ? settlementsRes.json() : Promise.resolve({ settlements: [] }),
      ])
      setOverview(data.overview)
      setTransactions(data.recentTransactions || [])
      setBudgets(data.budgets || [])
      setSettlements(settlementsData.settlements || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load financial data')
    } finally {
      setLoadedContextKey(actingContextKey)
      setLoading(false)
    }
  }, [actingContextKey, adminRequest, isActingReady])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAddTransaction() {
    if (!newTx.amount || Number(newTx.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setAddingTx(true)
    try {
      const res = await fetch('/api/admin/finances', adminRequest({
        method: 'POST',
        body: JSON.stringify({
          action: 'create_transaction',
          type: newTx.type,
          category: newTx.category,
          amount: Number(newTx.amount),
          description: newTx.description || undefined,
          vendor_name: newTx.vendor_name || undefined,
          payment_status: newTx.payment_status,
          event_id: newTx.event_id || undefined,
          tour_id: newTx.tour_id || undefined,
        }),
      }))

      if (!res.ok) throw new Error('Failed to create')
      toast.success('Transaction created')
      setShowAddDialog(false)
      setNewTx({ type: 'expense', category: 'other_expense', amount: '', description: '', vendor_name: '', payment_status: 'pending', event_id: '', tour_id: '' })
      setNewTxVendorSelection(null)
      fetchData()
    } catch {
      toast.error('Failed to create transaction')
    } finally {
      setAddingTx(false)
    }
  }

  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [addingBudget, setAddingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState({ category: 'production', allocated_amount: '', notes: '', event_id: '', tour_id: '' })

  async function handleAddBudget() {
    if (!newBudget.allocated_amount || Number(newBudget.allocated_amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!newBudget.event_id && !newBudget.tour_id) {
      toast.error('Budget must be linked to an event or tour')
      return
    }
    setAddingBudget(true)
    try {
      const res = await fetch('/api/admin/finances', adminRequest({
        method: 'POST',
        body: JSON.stringify({
          action: 'create_budget',
          category: newBudget.category,
          allocated_amount: Number(newBudget.allocated_amount),
          notes: newBudget.notes || undefined,
          event_id: newBudget.event_id || undefined,
          tour_id: newBudget.tour_id || undefined,
        }),
      }))
      if (!res.ok) throw new Error('Failed')
      toast.success('Budget created')
      setShowBudgetDialog(false)
      setNewBudget({ category: 'production', allocated_amount: '', notes: '', event_id: '', tour_id: '' })
      fetchData()
    } catch {
      toast.error('Failed to create budget')
    } finally {
      setAddingBudget(false)
    }
  }

  function openEditTx(tx: Transaction) {
    setEditingTx(tx)
    setEditForm({ type: tx.type as 'income' | 'expense', category: tx.category, amount: String(tx.amount), description: tx.description || '', vendor_name: tx.vendor_name || '', payment_status: tx.payment_status })
    setEditVendorSelection(
      tx.vendor_name
        ? { kind: 'vendor', id: tx.vendor_name, label: tx.vendor_name, value: tx.vendor_name }
        : null,
    )
    setShowEditDialog(true)
  }

  async function handleEditTx() {
    if (!editingTx) return
    try {
      const res = await fetch('/api/admin/finances', adminRequest({ method: 'PATCH', body: JSON.stringify({ id: editingTx.id, table: 'transaction', ...editForm, amount: Number(editForm.amount) }) }))
      if (!res.ok) throw new Error(await res.text())
      toast.success('Transaction updated')
      setShowEditDialog(false)
      fetchData()
    } catch (err: any) { toast.error(err.message || 'Failed to update') }
  }

  async function handleDeleteTx() {
    if (!deleteTxId) return
    try {
      const res = await fetch(`/api/admin/finances?id=${deleteTxId}`, adminRequest({ method: 'DELETE' }))
      if (!res.ok) throw new Error(await res.text())
      toast.success('Transaction deleted')
      setDeleteTxId(null)
      fetchData()
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); setDeleteTxId(null) }
  }

  function handleExportCSV() {
    const header = 'Date,Type,Category,Amount,Description,Vendor,Status\n'
    const rows = transactions.map(tx =>
      [tx.created_at, tx.type, tx.category, tx.amount, tx.description, tx.vendor_name || '', tx.payment_status].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'finances.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const monthlyChartData = useMemo(() => {
    const grouped: Record<string, { month: string; income: number; expenses: number }> = {}
    transactions.forEach(tx => {
      const m = tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 7) : null
      if (!m) return
      if (!grouped[m]) grouped[m] = { month: m, income: 0, expenses: 0 }
      if (tx.type === 'income') grouped[m].income += tx.amount
      else grouped[m].expenses += tx.amount
    })
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
  }, [transactions])

  if (loading || !isActingReady || loadedContextKey !== actingContextKey) {
    return <AdminPageSkeleton />
  }

  const incomeCategories = ['ticket_revenue', 'merchandise', 'sponsorship', 'appearance_fee', 'other_income']
  const expenseCategories = ['venue_rental', 'equipment', 'catering', 'staff_pay', 'marketing', 'travel', 'insurance', 'permits', 'production', 'other_expense']

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Finances"
        subtitle="Financial tracking and reporting"
        icon={DollarSign}
        actions={
          <>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300">Type</Label>
                      <Select value={newTx.type} onValueChange={(v) => setNewTx(p => ({ ...p, type: v as 'income' | 'expense', category: v === 'income' ? 'other_income' : 'other_expense' }))}>
                        <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-800">
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Category</Label>
                      <Select value={newTx.category} onValueChange={(v) => setNewTx(p => ({ ...p, category: v }))}>
                        <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-800">
                          {(newTx.type === 'income' ? incomeCategories : expenseCategories).map(c => (
                            <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTx.amount}
                      onChange={(e) => setNewTx(p => ({ ...p, amount: e.target.value }))}
                      className="border-slate-700 bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      placeholder="What is this for?"
                      value={newTx.description}
                      onChange={(e) => setNewTx(p => ({ ...p, description: e.target.value }))}
                      className="border-slate-700 bg-slate-800"
                    />
                  </div>
                  <FinanceParentScopePicker
                    eventId={newTx.event_id}
                    tourId={newTx.tour_id}
                    requestHeaders={actingHeaders}
                    onChange={({ event_id, tour_id }) => setNewTx((p) => ({ ...p, event_id, tour_id }))}
                  />
                  <FinanceScopePicker
                    label="Vendor"
                    kinds={["vendor"]}
                    selected={newTxVendorSelection}
                    requestHeaders={actingHeaders}
                    placeholder="Search vendors used in this organization"
                    onSelect={(next) => {
                      setNewTxVendorSelection(next)
                      setNewTx((p) => ({ ...p, vendor_name: next?.value || "" }))
                    }}
                  />
                  <div>
                    <Label className="text-slate-300">Payment Status</Label>
                    <Select value={newTx.payment_status} onValueChange={(v) => setNewTx(p => ({ ...p, payment_status: v }))}>
                      <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-800">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddTransaction}
                    disabled={addingTx}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300"
                  >
                    {addingTx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create Transaction
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-slate-700 text-slate-300 backdrop-blur-sm transition-all duration-200" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild variant="outline" className="border-slate-700 text-slate-300">
              <Link href="/admin/dashboard/marketplace/orders">Marketplace orders</Link>
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Total Income" value={formatCurrency(overview?.totalIncome ?? 0)} icon={TrendingUp} color="green" size="lg" />
        <AdminStatCard title="Total Expenses" value={formatCurrency(overview?.totalExpenses ?? 0)} icon={TrendingDown} color="orange" size="lg" />
        <AdminStatCard title="Net Profit" value={formatCurrency(overview?.netProfit ?? 0)} icon={DollarSign} color={(overview?.netProfit ?? 0) >= 0 ? 'green' : 'red'} size="lg" />
        <AdminStatCard title="Pending Payments" value={String(overview?.pendingPayments ?? 0)} icon={Clock} color={overview?.overduePayments ? 'red' : 'blue'} subtitle={overview?.overduePayments ? `${overview.overduePayments} overdue` : undefined} size="lg" />
      </div>

      {/* FIN-504 — Budget rollup card */}
      <BudgetRollupCard />

      {/* FIN-601 — Finance reconciliation mismatch table */}
      <FinanceReconciliationTable />

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="flex w-full overflow-x-auto bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="budgets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Budgets</TabsTrigger>
          <TabsTrigger value="settlements" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Settlements</TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 pt-4">
          {transactions.length === 0 ? (
            <AdminEmptyState
              icon={DollarSign}
              title="No transactions yet"
              description="Add your first financial transaction to start tracking"
            />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <Card key={tx.id} className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${tx.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {tx.type === 'income'
                          ? <ArrowUpRight className="h-4 w-4 text-green-400" />
                          : <ArrowDownRight className="h-4 w-4 text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{tx.description || tx.category.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-400">
                          {tx.vendor_name ? `${tx.vendor_name} · ` : ''}{formatSafeDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor(tx.payment_status)}>{tx.payment_status}</Badge>
                      <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button onClick={() => openEditTx(tx)} className="text-slate-500 hover:text-white p-1" aria-label="Edit"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTxId(tx.id)} className="text-slate-500 hover:text-red-400 p-1" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4 pt-4">
          {/* FIN-501 / FIN-504 — Versioned budget workspace */}
          <BudgetWorkspacePanel />
          {/* FIN-505 / FIN-506 — Commitments and POs */}
          <CommitmentsProcurementPanel />
          {/* FIN-508 / FIN-509 / FIN-510 — Expense reports */}
          <ExpenseOperationsPanel />
          <div className="flex justify-end">
            <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" /> Create Budget
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
                <DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-slate-300">Category</Label>
                    <Select value={newBudget.category} onValueChange={(v) => setNewBudget(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-800">
                        {['production', 'marketing', 'catering', 'staff_pay', 'venue_rental', 'equipment', 'travel', 'other_expense'].map(c => (
                          <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Allocated Amount</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={newBudget.allocated_amount} onChange={(e) => setNewBudget(p => ({ ...p, allocated_amount: e.target.value }))} className="border-slate-700 bg-slate-800" />
                  </div>
                  <FinanceParentScopePicker
                    eventId={newBudget.event_id}
                    tourId={newBudget.tour_id}
                    required
                    requestHeaders={actingHeaders}
                    onChange={({ event_id, tour_id }) => setNewBudget((p) => ({ ...p, event_id, tour_id }))}
                  />
                  <div>
                    <Label className="text-slate-300">Notes</Label>
                    <Input placeholder="Optional notes" value={newBudget.notes} onChange={(e) => setNewBudget(p => ({ ...p, notes: e.target.value }))} className="border-slate-700 bg-slate-800" />
                  </div>
                  {!newBudget.event_id && !newBudget.tour_id && (
                    <p className="text-xs text-red-400">Budget must be linked to an event or tour</p>
                  )}
                  <Button onClick={handleAddBudget} disabled={addingBudget} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300">
                    {addingBudget ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create Budget
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {budgets.length === 0 ? (
            <AdminEmptyState
              icon={DollarSign}
              title="No budgets yet"
              description="Create event or tour budgets to track spending against allocations"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {budgets.map((b) => {
                const pct = b.allocated_amount > 0 ? Math.round((b.spent_amount / b.allocated_amount) * 100) : 0
                return (
                  <Card key={b.id} className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white capitalize">{b.category.replace(/_/g, ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Spent: {formatCurrency(b.spent_amount)}</span>
                        <span>Allocated: {formatCurrency(b.allocated_amount)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div
                          className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-right text-xs text-slate-500">{pct}% used</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4 pt-4">
          {monthlyChartData.length > 0 && (
            <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="income" fill="#4ade80" name="Income" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#f87171" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Budget Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Total Allocated</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(overview?.totalAllocated ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Total Spent</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(overview?.totalSpent ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-sm text-slate-400">Remaining</span>
                  <span className={`text-sm font-semibold ${(overview?.budgetRemaining ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(overview?.budgetRemaining ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Total Transactions</span>
                  <span className="text-sm font-medium text-white">{overview?.transactionCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Pending</span>
                  <span className="text-sm font-medium text-yellow-400">{overview?.pendingPayments ?? 0}</span>
                </div>
                {(overview?.overduePayments ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-slate-400">
                      <AlertTriangle className="h-3 w-3 text-red-400" /> Overdue
                    </span>
                    <span className="text-sm font-medium text-red-400">{overview?.overduePayments}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{settlements.length} settlement{settlements.length !== 1 ? 's' : ''}</p>
            <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Settlement
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Settlement</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <FinanceParentScopePicker
                    eventId={settlementForm.event_id}
                    tourId={settlementForm.tour_id}
                    required
                    requestHeaders={actingHeaders}
                    onChange={({ event_id, tour_id }) => setSettlementForm((p) => ({ ...p, event_id, tour_id }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Gross Revenue ($)</Label>
                      <Input type="number" value={settlementForm.total_gross_revenue} onChange={e => setSettlementForm(p => ({ ...p, total_gross_revenue: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Total Expenses ($)</Label>
                      <Input type="number" value={settlementForm.total_expenses} onChange={e => setSettlementForm(p => ({ ...p, total_expenses: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Artist Payout ($)</Label>
                      <Input type="number" value={settlementForm.artist_payout} onChange={e => setSettlementForm(p => ({ ...p, artist_payout: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Venue Payout ($)</Label>
                      <Input type="number" value={settlementForm.venue_payout} onChange={e => setSettlementForm(p => ({ ...p, venue_payout: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Deal Type</Label>
                    <Select value={settlementForm.deal_type} onValueChange={v => setSettlementForm(p => ({ ...p, deal_type: v }))}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="guarantee">Guarantee</SelectItem>
                        <SelectItem value="vs_door">VS Door</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowSettlementDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
                    <Button
                      onClick={async () => {
                        setAddingSettlement(true)
                        try {
                          if (!settlementForm.event_id && !settlementForm.tour_id) {
                            toast.error('Select an authorized event or tour')
                            return
                          }
                          const res = await fetch('/api/admin/finances/settlements', adminRequest({
                            method: 'POST',
                            body: JSON.stringify({
                              event_id: settlementForm.event_id || null,
                              tour_id: settlementForm.tour_id || null,
                              total_gross_revenue: Number(settlementForm.total_gross_revenue) || 0,
                              total_expenses: Number(settlementForm.total_expenses) || 0,
                              artist_payout: Number(settlementForm.artist_payout) || 0,
                              venue_payout: Number(settlementForm.venue_payout) || 0,
                              deal_type: settlementForm.deal_type as any,
                              notes: settlementForm.notes,
                            }),
                          }))
                          if (!res.ok) throw new Error(await res.text())
                          toast.success('Settlement created')
                          setShowSettlementDialog(false)
                          setSettlementForm({
                            event_id: '',
                            tour_id: '',
                            total_gross_revenue: '',
                            total_expenses: '',
                            artist_payout: '',
                            venue_payout: '',
                            deal_type: 'guarantee',
                            notes: '',
                          })
                          fetchData()
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to create settlement')
                        } finally {
                          setAddingSettlement(false)
                        }
                      }}
                      disabled={addingSettlement}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
                    >
                      {addingSettlement ? 'Creating...' : 'Create Settlement'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {settlements.length === 0 ? (
            <AdminEmptyState
              icon={DollarSign}
              title="No settlements yet"
              description="Settlements reconcile event revenue and payouts. Create one after an event completes."
            />
          ) : (
            <div className="space-y-2">
              {settlements.map((s: any) => (
                <Card key={s.id} className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {s.event_id ? `Event ${s.event_id.slice(0, 8)}…` : s.tour_id ? `Tour ${s.tour_id.slice(0, 8)}…` : 'Settlement'}
                      </p>
                      <p className="text-slate-400 text-xs">{formatCurrency(s.total_gross_revenue)} gross · {formatCurrency(s.total_expenses)} expenses</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold text-sm">{formatCurrency(s.net_profit || 0)} net</span>
                      <Badge className={s.status === 'paid' ? 'bg-green-500/20 text-green-400' : s.status === 'finalized' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {s.status}
                      </Badge>
                      {s.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-700 text-slate-300"
                          onClick={async () => {
                            try {
                              const newStatus = s.status === 'draft' ? 'finalized' : 'paid'
                              const res = await fetch('/api/admin/finances/settlements', adminRequest({ method: 'PATCH', body: JSON.stringify({ id: s.id, status: newStatus }) }))
                              if (!res.ok) throw new Error(await res.text())
                              toast.success(newStatus === 'paid' ? 'Settlement marked paid' : 'Settlement finalized')
                              void fetchData()
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : 'Failed to update settlement')
                            }
                          }}
                        >
                          {s.status === 'draft' ? 'Finalize' : 'Mark Paid'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Transaction Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Edit Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm(p => ({ ...p, type: v as 'income'|'expense' }))}>
                  <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800"><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Amount</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} className="border-slate-700 bg-slate-800 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <FinanceScopePicker
              label="Vendor"
              kinds={["vendor"]}
              selected={editVendorSelection}
              requestHeaders={actingHeaders}
              placeholder="Search vendors used in this organization"
              onSelect={(next) => {
                setEditVendorSelection(next)
                setEditForm((p) => ({ ...p, vendor_name: next?.value || "" }))
              }}
            />
            <div>
              <Label className="text-slate-300">Status</Label>
              <Select value={editForm.payment_status} onValueChange={(v) => setEditForm(p => ({ ...p, payment_status: v }))}>
                <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800"><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={handleEditTx} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTxId} onOpenChange={() => setDeleteTxId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTx} className="bg-red-600 hover:bg-red-700 text-white border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
