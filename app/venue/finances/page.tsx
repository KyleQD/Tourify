"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Download,
  Upload,
  Plus,
  Eye,
  Edit,
  Trash,
  RefreshCw,
  CreditCard,
  Receipt,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Calculator,
  Banknote,
  Wallet,
  Building,
  Users,
  Zap,
  Coffee,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Package,
} from "lucide-react"

interface Transaction {
  id: string
  type: "income" | "expense"
  category: string
  description: string
  amount: number
  date: string
  status: "completed" | "pending" | "cancelled"
  reference?: string
  event_id?: string
  created_at: string
}

interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  monthlyRevenue: number
  monthlyExpenses: number
  monthlyProfit: number
  averageEventRevenue: number
  unpaidInvoices: number
  overdueInvoices: number
}

const transactionCategories = {
  income: [
    "Event Bookings",
    "Equipment Rental",
    "Catering Services",
    "Bar Sales",
    "Merchandise",
    "Parking",
    "Other Income"
  ],
  expense: [
    "Staff Wages",
    "Utilities",
    "Equipment Maintenance",
    "Insurance",
    "Marketing",
    "Supplies",
    "Professional Services",
    "Rent/Mortgage",
    "Other Expenses"
  ]
}

const categoryIcons = {
  "Event Bookings": CalendarIcon,
  "Equipment Rental": Zap,
  "Catering Services": Coffee,
  "Bar Sales": Wallet,
  "Staff Wages": Users,
  "Utilities": Building,
  "Insurance": Shield,
  "Marketing": TrendingUp,
  "Supplies": Package,
  "Equipment Maintenance": Zap,
}

export default function FinancesPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // VEN-092: event-ops context binding.
  const searchParamsCtx = useSearchParams()
  const eventIdContext = searchParamsCtx.get("event_id")
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  // VEN-163/167 — server-owned summary + settlement share views.
  const [serverSummary, setServerSummary] = useState<any>(null)
  const [shares, setShares] = useState<any[]>([])
  const [capabilities, setCapabilities] = useState({ approve: false, manage: false, export: false })
  const [isLoading, setIsLoading] = useState(true)

  // VEN-172 — persisted accounting prefs (defaults until loaded).
  const [financePrefs, setFinancePrefs] = useState({ currency: "USD", invoice_prefix: "INV", default_tax_rate: 0 })
  const [prefsBusy, setPrefsBusy] = useState(false)
  // VEN-173 — payout destination status.
  const [payoutStatus, setPayoutStatus] = useState<any>(null)
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false)
  
  // Filter states
  const [dateRange, setDateRange] = useState<{start: Date | undefined, end: Date | undefined}>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  })
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  
  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    date: new Date(),
    reference: "",
    event_id: ""
  })

  useEffect(() => {
    if (venue?.id) {
      fetchFinancialData()
      loadFinancePrefs()
      void loadPayoutStatus()
    }
  }, [venue?.id, dateRange])

  const loadFinancePrefs = () => {
    const prefs = (venue?.settings as any)?.finance_prefs
    if (prefs && typeof prefs === "object") {
      setFinancePrefs({
        currency: String(prefs.currency || "USD").toUpperCase().slice(0, 3),
        invoice_prefix: String(prefs.invoice_prefix || "INV"),
        default_tax_rate: Number(prefs.default_tax_rate || 0),
      })
    }
  }

  const saveFinancePrefs = async () => {
    if (!venue?.id) return
    setPrefsBusy(true)
    try {
      const res = await fetch("/api/venue/finances", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_prefs", venue_id: venue.id, prefs: financePrefs }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save settings")
      }
      toast({ title: "Settings Saved", description: "Accounting preferences updated." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setPrefsBusy(false)
    }
  }

  const loadPayoutStatus = async () => {
    if (!venue?.id) return
    try {
      const res = await fetch(`/api/venue/finances/payout?venue_id=${encodeURIComponent(venue.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        setPayoutStatus(null)
        return
      }
      setPayoutStatus(await res.json())
    } catch {
      setPayoutStatus(null)
    }
  }

  const payoutAction = async (action: "onboarding_link" | "dashboard_link") => {
    if (!venue?.id) return
    try {
      const res = await fetch("/api/venue/finances/payout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venue.id, action }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Stripe request failed")
      if (payload.url) window.open(payload.url, "_blank", "noopener")
      await loadPayoutStatus()
    } catch (error: any) {
      toast({ title: "Payout setup", description: error.message, variant: "destructive" })
    }
  }

  // VEN-163 — the summary is computed server-side from canonical sources.
  const fetchFinancialData = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)

      const res = await fetch(
        `/api/venue/finances?venue_id=${encodeURIComponent(venue.id)}`,
        { credentials: "include", cache: "no-store" }
      )
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load financial data")
      }
      const payload = await res.json()

      const latestManual: Transaction[] = (payload.data || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        date: r.date,
        status: r.status,
        reference: r.reference || undefined,
        event_id: r.event_id || undefined,
        created_at: r.created_at,
      }))
      setManualTransactions(latestManual)
      setTransactions(latestManual)
      setServerSummary(payload.summary || null)
      setShares(Array.isArray(payload.shares) ? payload.shares : [])
      if (payload.capabilities) setCapabilities(payload.capabilities)

      // Map server truth into the display shape (no client-side money math).
      const s = payload.summary
      if (s) {
        const income = Number(s.totals?.recorded_income || 0)
        const expenses = Number(s.totals?.recorded_expenses || 0)
        setSummary({
          totalRevenue: income,
          totalExpenses: expenses,
          netProfit: Number(s.totals?.net_recorded ?? income - expenses),
          profitMargin: income > 0 ? ((income - expenses) / income) * 100 : 0,
          monthlyRevenue: Number(s.month?.income || 0),
          monthlyExpenses: Number(s.month?.expenses || 0),
          monthlyProfit: Number(s.month?.income || 0) - Number(s.month?.expenses || 0),
          averageEventRevenue: 0,
          unpaidInvoices: latestManual.filter((t) => t.status === "pending" && t.type === "income").length,
          overdueInvoices: latestManual.filter((t) => t.status === "pending" && new Date(t.date).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000).length,
        })
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load financial data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    // Date range filter
    const transactionDate = new Date(transaction.date)
    if (dateRange.start && transactionDate < dateRange.start) return false
    if (dateRange.end && transactionDate > dateRange.end) return false
    
    // Type filter
    if (typeFilter !== "all" && transaction.type !== typeFilter) return false
    
    // Category filter
    if (categoryFilter !== "all" && transaction.category !== categoryFilter) return false
    
    // Status filter
    if (statusFilter !== "all" && transaction.status !== statusFilter) return false

    // VEN-092: event-ops context binding — scope to the acting event.
    if (eventIdContext && transaction.event_id !== eventIdContext) return false

    // Search filter
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    return true
  })

  const handleAddTransaction = async (overrides?: { status?: "pending" | "completed"; descriptionPrefix?: string }) => {
    if (!venue?.id) return
    try {
      // VEN-164 — entries land as pending; completing them requires
      // approve_finances, so the UI can no longer bypass the approval flow.
      const res = await fetch("/api/venue/finances", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venue.id,
          type: newTransaction.type,
          category: newTransaction.category,
          description: overrides?.descriptionPrefix
            ? `${overrides.descriptionPrefix} — ${newTransaction.description}`
            : newTransaction.description,
          amount: parseFloat(newTransaction.amount),
          date: newTransaction.date.toISOString().split("T")[0],
          status: overrides?.status || "pending",
          reference: newTransaction.reference || null,
          event_id: newTransaction.event_id || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save transaction")
      }
      setIsAddTransactionOpen(false)
      setNewTransaction({ type: "income", category: "", description: "", amount: "", date: new Date(), reference: "", event_id: "" })
      await fetchFinancialData()
      toast({
        title: overrides?.status === "completed" ? "Payment Recorded" : "Entry Submitted",
        description:
          overrides?.status === "completed"
            ? "Recorded as a completed ledger entry."
            : "Saved as pending. Completing it requires finance approval.",
      })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add transaction", variant: "destructive" })
    }
  }

  const handleApproveTransaction = async (transaction: Transaction) => {
    if (!venue?.id) return
    try {
      const res = await fetch("/api/venue/finances", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transaction.id, status: "completed" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Approval failed")
      }
      await fetchFinancialData()
      toast({ title: "Approved", description: "Entry moved to the completed ledger." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Approval failed", variant: "destructive" })
    }
  }

  const handleDeleteTransaction = async (transaction: Transaction) => {
    // Only allow deleting manual transactions (derived ids are not uuids).
    if (transaction.id.startsWith("booking-") || transaction.id.startsWith("ticket-")) return
    try {
      const res = await fetch(
        `/api/venue/finances?id=${encodeURIComponent(transaction.id)}`,
        { method: "DELETE", credentials: "include" }
      )
      if (!res.ok) throw new Error("Failed to delete transaction")
      await fetchFinancialData()
      toast({ title: "Transaction Removed", description: "Transaction has been deleted." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete transaction", variant: "destructive" })
    }
  }

  // VEN-170 — real permission-safe CSV download.
  const exportFinancials = async () => {
    if (!venue?.id) return
    try {
      const res = await fetch(`/api/venue/finances/export?venue_id=${encodeURIComponent(venue.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `venue-finance-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast({ title: "Export Ready", description: "Ledger CSV downloaded." })
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" })
    }
  }

  if (venueLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Unable to Load Financial Data</h2>
        <Button onClick={fetchFinancialData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {eventIdContext && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
          Showing finances for event <span className="font-semibold">{eventIdContext}</span>.{" "}
          <Link href="/venue/finances" className="underline">Clear context</Link>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground break-words">
            Track revenue, expenses, and profitability for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFinancialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportFinancials}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setIsAddTransactionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatSafeCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              This month: {formatSafeCurrency(summary.monthlyRevenue)}
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatSafeCurrency(summary.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              This month: {formatSafeCurrency(summary.monthlyExpenses)}
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Calculator className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatSafeCurrency(summary.netProfit)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {summary.netProfit >= 0 ? 
                <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" /> : 
                <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
              }
              <span>{summary.profitMargin.toFixed(1)}% margin</span>
            </div>
          </CardContent>
          <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${summary.netProfit >= 0 ? 'from-blue-500 to-purple-500' : 'from-red-500 to-pink-500'}`} />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Pipeline (est.)</CardTitle>
            <CalendarIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {/* VEN-166 — estimates labeled as estimates, never received money */}
            <div className="text-2xl font-bold text-purple-500">
              {formatSafeCurrency(serverSummary?.bookings?.pipeline_estimate ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Contracted receivable: {formatSafeCurrency(serverSummary?.bookings?.contracted_receivable ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Operator-entered estimates from booking requests
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto p-1 [&>*]:shrink-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Breakdown — real ledger aggregation (VEN-163) */}
        <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Recorded income by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(serverSummary?.breakdowns?.income || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recorded income yet.</p>
                  ) : (
                    (serverSummary?.breakdowns?.income || []).map((item: { category: string; amount: number }) => {
                      const pct = summary.totalRevenue > 0 ? Math.round((item.amount / summary.totalRevenue) * 100) : 0
                      return (
                        <div key={item.category} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{item.category}</span>
                            <span>{formatSafeCurrency(item.amount)}</span>
                          </div>
                          <Progress value={pct} className="h-2" aria-label={`${item.category}: ${pct}% of recorded income`} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{pct}% of recorded income</span>
                          </div>
                        </div>
                      )
                    })
                  )}
            </div>
          </CardContent>
        </Card>

            {/* Expense Breakdown — real ledger aggregation */}
        <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Recorded costs by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(serverSummary?.breakdowns?.expenses || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recorded expenses yet.</p>
                  ) : (
                    (serverSummary?.breakdowns?.expenses || []).map((item: { category: string; amount: number }) => {
                      const pct = summary.totalExpenses > 0 ? Math.round((item.amount / summary.totalExpenses) * 100) : 0
                      return (
                        <div key={item.category} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{item.category}</span>
                            <span>{formatSafeCurrency(item.amount)}</span>
                          </div>
                          <Progress value={pct} className="h-2" aria-label={`${item.category}: ${pct}% of recorded expenses`} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{pct}% of recorded expenses</span>
                          </div>
                        </div>
                      )
                    })
                  )}
            </div>
          </CardContent>
        </Card>

            {/* Cash Flow Trend — placeholder retired; totals are shown above */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Settlement Shares (VEN-167)</CardTitle>
                <CardDescription>Your venue's ticket revenue allocations per event</CardDescription>
              </CardHeader>
              <CardContent>
                {shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No venue revenue allocations yet. Configure event settlement shares from the event's ticketing workspace.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-800 text-sm" aria-label="Settlement shares">
                    {shares.map((share) => (
                      <li key={`${share.event_id}-${share.share_type}`} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">Event {String(share.event_id).slice(0, 8)}…</p>
                          <p className="text-xs text-muted-foreground">
                            {share.share_type === "percentage" ? `${share.share_value}% share` : `${share.share_type}: ${share.share_value}`}
                          </p>
                        </div>
                        <div className="text-right">
                          {share.settled_amount != null ? (
                            <>
                              <p className="font-medium text-green-500">{formatSafeCurrency(Number(share.settled_amount))}</p>
                              <p className="text-xs text-muted-foreground capitalize">{share.settlement_status}</p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not settled yet</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
      </div>

          {/* Quick Actions — every action is real (VEN-171) */}
      <Card>
        <CardHeader>
              <CardTitle>Quick Financial Actions</CardTitle>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center"
                  onClick={() => {
                    setNewTransaction((current) => ({ ...current, type: "income", category: "invoice", description: "Invoice" }))
                    setIsAddTransactionOpen(true)
                  }}
                >
                  <Receipt className="h-5 w-5 mb-2 text-blue-500" />
                  <span>Create Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center"
                  onClick={() => {
                    setNewTransaction((current) => ({ ...current, type: "income", category: "payment_received", description: "Payment received" }))
                    setIsAddTransactionOpen(true)
                  }}
                >
                  <CreditCard className="h-5 w-5 mb-2 text-green-500" />
                  <span>Record Payment</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center" onClick={() => void exportFinancials()}>
                  <FileText className="h-5 w-5 mb-2 text-purple-500" />
                  <span>Export CSV</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center"
                  onClick={() => {
                    const target = document.querySelector('[value="settings"]') as HTMLElement | null
                    target?.click()
                  }}
                >
                  <Target className="h-5 w-5 mb-2 text-orange-500" />
                  <span>Payout Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search Transactions</Label>
            <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                      id="search"
                      placeholder="Search by description or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
              />
            </div>
                </div>

                <div className="min-w-[120px]">
                  <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                      <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                      <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                      {[...transactionCategories.income, ...transactionCategories.expense].map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
                </div>

                <div className="min-w-[120px]">
                  <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setTypeFilter("all")
                    setCategoryFilter("all")
                    setStatusFilter("all")
                  }}
                >
                  Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">
                    {transactions.length === 0 ? 
                      "No transactions recorded yet. Add your first transaction to start tracking finances." :
                      "No transactions match your current filters."
                    }
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                          {transaction.type === 'income' ? 
                            <TrendingUp className="h-5 w-5" /> : 
                            <TrendingDown className="h-5 w-5" />
                          }
                    </div>
                        <div>
                          <h3 className="font-medium">{transaction.description}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={
                              transaction.type === 'income' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'
                            }>
                              {transaction.category}
                        </Badge>
                            <span>•</span>
                            <span>{format(new Date(transaction.date), "PPP")}</span>
                            {transaction.reference && (
                              <>
                                <span>•</span>
                                <span>Ref: {transaction.reference}</span>
                              </>
                            )}
                      </div>
                        </div>
                        </div>
                      <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatSafeCurrency(transaction.amount).replace("$", "")}
                      </div>
                          <Badge 
                            variant={transaction.status === 'completed' ? 'default' : 
                                   transaction.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {transaction.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {transaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {transaction.status === 'cancelled' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                        </div>
                        {!transaction.id.startsWith("booking-") && !transaction.id.startsWith("ticket-") ? (
                          <div className="flex gap-2">
                            {capabilities.approve && transaction.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:border-green-300"
                                onClick={() => void handleApproveTransaction(transaction)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              onClick={() => handleDeleteTransaction(transaction)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        )}
                  </div>
          </div>
        </CardContent>
      </Card>
              ))
            )}
                </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            {/* VEN-171 — dead per-report buttons retired; one real export remains */}
            <Card>
              <CardHeader>
                <CardTitle>Ledger Export</CardTitle>
                <CardDescription>
                  Download the recorded ledger and summary as CSV. Booking pipeline figures are included, clearly labeled
                  as estimates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {capabilities.export ? (
                  <Button variant="outline" onClick={() => void exportFinancials()}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You need the “Export finances” permission to download financial data.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Accounting preferences persist separately from booking rates (VEN-172)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">General</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="fs-currency">Currency</Label>
                      <Select value={financePrefs.currency} onValueChange={(value) => setFinancePrefs((p) => ({ ...p, currency: value }))}>
                        <SelectTrigger id="fs-currency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fs-invoice-prefix">Invoice prefix</Label>
                      <Input id="fs-invoice-prefix" value={financePrefs.invoice_prefix} onChange={(e) => setFinancePrefs((p) => ({ ...p, invoice_prefix: e.target.value.toUpperCase().slice(0, 12) }))} placeholder="INV" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fs-tax-rate">Default tax rate (%)</Label>
                      <Input id="fs-tax-rate" type="number" min={0} max={40} step={0.1} value={String(financePrefs.default_tax_rate)} onChange={(e) => setFinancePrefs((p) => ({ ...p, default_tax_rate: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))} />
                    </div>
                  </div>
                </div>

                {/* VEN-173 — payout destination status/onboarding */}
                <div className="space-y-3 rounded-md border p-4">
                  <h4 className="font-medium">Payout destination</h4>
                  {!payoutStatus ? (
                    <p className="text-sm text-muted-foreground">Loading payout status…</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{payoutStatus.note}</p>
                      {payoutStatus.account_masked && (
                        <p className="text-xs text-muted-foreground">Account {payoutStatus.account_masked}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(payoutStatus.state === "not_connected" || payoutStatus.state === "pending_verification") && (
                          <Button size="sm" onClick={() => void payoutAction("onboarding_link")}>Connect / finish setup</Button>
                        )}
                        {payoutStatus.state !== "not_connected" && (
                          <Button size="sm" variant="outline" onClick={() => void payoutAction("dashboard_link")}>Open Stripe dashboard</Button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Button onClick={() => void saveFinancePrefs()} disabled={prefsBusy}>
                  {prefsBusy ? "Saving…" : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Modal */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Record a new financial transaction for your venue
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select 
                value={newTransaction.type} 
                onValueChange={(value: "income" | "expense") => setNewTransaction(prev => ({ ...prev, type: value, category: "" }))}
              >
                  <SelectTrigger>
                  <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newTransaction.category} 
                onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}
              >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                  {transactionCategories[newTransaction.type].map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Enter transaction description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newTransaction.date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTransaction.date}
                    onSelect={(date) => date && setNewTransaction(prev => ({ ...prev, date }))}
                    initialFocus
                />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Invoice #, Receipt #, etc."
                value={newTransaction.reference}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, reference: e.target.value }))}
              />
              </div>
            </div>

          <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                Cancel
              </Button>
            <Button 
              onClick={() => void handleAddTransaction()}
              disabled={!newTransaction.category || !newTransaction.description || !newTransaction.amount}
            >
                Add Transaction
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
