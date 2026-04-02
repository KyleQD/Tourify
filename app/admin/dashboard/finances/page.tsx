"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminStatCard } from "../components/admin-stat-card"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

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

export default function FinancesPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [addingTx, setAddingTx] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [newTx, setNewTx] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'other_expense',
    amount: '',
    description: '',
    vendor_name: '',
    payment_status: 'pending',
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/finances?type=overview')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setOverview(data.overview)
      setTransactions(data.recentTransactions || [])
      setBudgets(data.budgets || [])
    } catch {
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAddTransaction() {
    if (!newTx.amount || Number(newTx.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setAddingTx(true)
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          type: newTx.type,
          category: newTx.category,
          amount: Number(newTx.amount),
          description: newTx.description || undefined,
          vendor_name: newTx.vendor_name || undefined,
          payment_status: newTx.payment_status,
        }),
      })

      if (!res.ok) throw new Error('Failed to create')
      toast.success('Transaction created')
      setShowAddDialog(false)
      setNewTx({ type: 'expense', category: 'other_expense', amount: '', description: '', vendor_name: '', payment_status: 'pending' })
      fetchData()
    } catch {
      toast.error('Failed to create transaction')
    } finally {
      setAddingTx(false)
    }
  }

  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [addingBudget, setAddingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState({ category: 'production', allocated_amount: '', notes: '' })

  async function handleAddBudget() {
    if (!newBudget.allocated_amount || Number(newBudget.allocated_amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setAddingBudget(true)
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_budget', category: newBudget.category, allocated_amount: Number(newBudget.allocated_amount), notes: newBudget.notes || undefined }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Budget created')
      setShowBudgetDialog(false)
      setNewBudget({ category: 'production', allocated_amount: '', notes: '' })
      fetchData()
    } catch {
      toast.error('Failed to create budget')
    } finally {
      setAddingBudget(false)
    }
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

  if (loading) return <AdminPageSkeleton />

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
                  <div>
                    <Label className="text-slate-300">Vendor</Label>
                    <Input
                      placeholder="Vendor name (optional)"
                      value={newTx.vendor_name}
                      onChange={(e) => setNewTx(p => ({ ...p, vendor_name: e.target.value }))}
                      className="border-slate-700 bg-slate-800"
                    />
                  </div>
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

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="flex w-full max-w-3xl overflow-x-auto bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="budgets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Budgets</TabsTrigger>
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
                    <div className="flex items-center gap-3">
                      <Badge className={statusColor(tx.payment_status)}>{tx.payment_status}</Badge>
                      <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4 pt-4">
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
                  <div>
                    <Label className="text-slate-300">Notes</Label>
                    <Input placeholder="Optional notes" value={newBudget.notes} onChange={(e) => setNewBudget(p => ({ ...p, notes: e.target.value }))} className="border-slate-700 bg-slate-800" />
                  </div>
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
      </Tabs>
    </div>
  )
}
