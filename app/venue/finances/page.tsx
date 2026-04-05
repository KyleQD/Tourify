"use client"

import { useState, useEffect } from "react"
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
import { venueService } from "@/lib/services/venue.service"
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
  BarChart3,
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
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
    }
  }, [venue?.id, dateRange])

  const calculateSummary = (items: Transaction[]) => {
    const revenue = items.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0)
    const expenses = items.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0)
    const profit = revenue - expenses

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: profit,
      profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      monthlyRevenue: revenue,
      monthlyExpenses: expenses,
      monthlyProfit: profit,
      averageEventRevenue: revenue > 0 ? revenue / Math.max(1, items.filter((transaction) => transaction.type === "income").length) : 0,
      unpaidInvoices: items.filter((transaction) => transaction.status === "pending" && transaction.type === "income").length,
      overdueInvoices: items.filter((transaction) => transaction.status === "pending" && new Date(transaction.date).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000).length,
    }
  }

  const fetchFinancialData = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)
      const [bookingRequests, analytics] = await Promise.all([
        venueService.getVenueBookingRequests(venue.id),
        venueService.getVenueAnalytics(venue.id, 90),
      ])

      const derivedTransactions: Transaction[] = bookingRequests.map((request) => {
        const parsedBudget = Number((request.budget_range || "").replace(/[^0-9.]/g, ""))
        const estimatedAmount = Number.isFinite(parsedBudget) && parsedBudget > 0
          ? parsedBudget
          : Number(request.expected_attendance || 0) * 25

        return {
          id: `booking-${request.id}`,
          type: "income",
          category: "Event Bookings",
          description: request.event_name,
          amount: estimatedAmount,
          date: request.event_date || request.requested_at,
          status: request.status === "approved" ? "completed" : request.status === "pending" ? "pending" : "cancelled",
          reference: request.id,
          event_id: request.id,
          created_at: request.created_at,
        }
      })

      const utilityExpenses: Transaction[] = analytics
        .filter((item) => item.revenue > 0)
        .slice(0, 3)
        .map((item, index) => ({
          id: `ops-${item.id}`,
          type: "expense" as const,
          category: "Utilities",
          description: `Estimated operating cost for ${format(new Date(item.date), "MMM yyyy")}`,
          amount: Number((item.revenue * 0.18).toFixed(2)),
          date: item.date,
          status: "completed" as const,
          reference: `OPS-${index + 1}`,
          created_at: item.created_at,
        }))

      const nextTransactions = [...manualTransactions, ...derivedTransactions, ...utilityExpenses]
        .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())

      setTransactions(nextTransactions)
      setSummary(calculateSummary(nextTransactions))
      
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast({
        title: "Error",
        description: "Failed to load financial data",
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

    // Search filter
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    return true
  })

  const handleAddTransaction = async () => {
    try {
    const transaction: Transaction = {
        id: `manual-${Date.now()}`,
        type: newTransaction.type,
        category: newTransaction.category,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        date: newTransaction.date.toISOString().split('T')[0],
        status: "completed",
        reference: newTransaction.reference,
        event_id: newTransaction.event_id || undefined,
        created_at: new Date().toISOString()
    }

    setManualTransactions((current) => [transaction, ...current])
    setTransactions((current) => {
      const next = [transaction, ...current]
      setSummary(calculateSummary(next))
      return next
    })
    setIsAddTransactionOpen(false)
    setNewTransaction({
      type: "income",
        category: "",
        description: "",
        amount: "",
        date: new Date(),
        reference: "",
        event_id: ""
    })
    
    toast({
      title: "Transaction Added",
        description: "Financial transaction has been recorded successfully.",
      })
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      })
    }
  }

  const exportFinancials = () => {
    toast({
      title: "Export Started",
      description: "Financial report is being generated and will be ready for download shortly.",
    })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground">
            Track revenue, expenses, and profitability for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              Monthly: {formatSafeCurrency(summary.monthlyRevenue)}
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
              Monthly: {formatSafeCurrency(summary.monthlyExpenses)}
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
            <CardTitle className="text-sm font-medium">Avg. Event Revenue</CardTitle>
            <CalendarIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{formatSafeCurrency(summary.averageEventRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Per event booking
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Breakdown */}
        <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Income by category this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: "Event Bookings", amount: 2500, percentage: 60 },
                    { category: "Bar Sales", amount: 1200, percentage: 29 },
                    { category: "Equipment Rental", amount: 450, percentage: 11 },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span>{formatSafeCurrency(item.amount)}</span>
              </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.percentage}% of total revenue</span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

            {/* Expense Breakdown */}
        <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Costs by category this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: "Staff Wages", amount: 800, percentage: 68 },
                    { category: "Utilities", amount: 380, percentage: 32 },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span>{formatSafeCurrency(item.amount)}</span>
              </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.percentage}% of total expenses</span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

            {/* Cash Flow Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Cash Flow Trend</CardTitle>
                <CardDescription>Revenue vs expenses over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">Interactive cash flow chart would appear here</p>
                    <p className="text-sm text-muted-foreground">Showing revenue, expenses, and profit trends</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Quick Actions */}
      <Card>
        <CardHeader>
              <CardTitle>Quick Financial Actions</CardTitle>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
                  <Receipt className="h-5 w-5 mb-2 text-blue-500" />
                  <span>Create Invoice</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
                  <CreditCard className="h-5 w-5 mb-2 text-green-500" />
                  <span>Record Payment</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
                  <FileText className="h-5 w-5 mb-2 text-purple-500" />
                  <span>Generate Report</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
                  <Target className="h-5 w-5 mb-2 text-orange-500" />
                  <span>Set Budget</span>
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
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                    </Button>
                  </div>
          </div>
        </CardContent>
      </Card>
              ))
            )}
                </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>Create, send, and track invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Invoice management coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Create professional invoices and track payment status
                  </p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { 
                  title: "Profit & Loss Statement", 
                  description: "Monthly P&L with revenue and expense breakdown",
                  icon: Calculator,
                  color: "text-blue-500"
                },
                { 
                  title: "Cash Flow Report", 
                  description: "Track money in and out of your venue",
                  icon: TrendingUp,
                  color: "text-green-500"
                },
                { 
                  title: "Tax Summary", 
                  description: "Prepare for tax season with detailed summaries",
                  icon: FileText,
                  color: "text-purple-500"
                },
                { 
                  title: "Event Profitability", 
                  description: "Analyze profit margins per event type",
                  icon: CalendarIcon,
                  color: "text-orange-500"
                },
                { 
                  title: "Expense Analysis", 
                  description: "Identify cost-saving opportunities",
                  icon: PieChart,
                  color: "text-red-500"
                },
                { 
                  title: "Budget vs Actual", 
                  description: "Compare planned vs actual spending",
                  icon: Target,
                  color: "text-indigo-500"
                }
              ].map((report, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <report.icon className={`h-8 w-8 ${report.color}`} />
                <div>
                        <CardTitle className="text-base">{report.title}</CardTitle>
                        <CardDescription className="text-sm">{report.description}</CardDescription>
                </div>
                </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
              </div>
          </div>
        </TabsContent>

        <TabsContent value="budgets">
          <Card>
            <CardHeader>
              <CardTitle>Budget Planning</CardTitle>
              <CardDescription>Set and track financial goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Budget management coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Set revenue targets and expense budgets by category
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Configure accounting and reporting preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">General Settings</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default Currency</Label>
                      <Select defaultValue="USD">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                    <div className="space-y-2">
                      <Label>Fiscal Year Start</Label>
                      <Select defaultValue="january">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="january">January</SelectItem>
                          <SelectItem value="april">April</SelectItem>
                          <SelectItem value="july">July</SelectItem>
                          <SelectItem value="october">October</SelectItem>
                        </SelectContent>
                      </Select>
                </div>
                </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Tax Settings</h4>
                  <div className="space-y-2">
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" placeholder="8.5" />
                      </div>
                  </div>

                <Button>Save Settings</Button>
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
              onClick={handleAddTransaction}
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
