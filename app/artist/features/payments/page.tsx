"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  DollarSign,
  TrendingUp,
  Clock,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  RefreshCw,
  Receipt,
  Wallet,
  AlertCircle,
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface Transaction {
  id: string
  type: string
  description: string | null
  amount: number
  currency: string
  occurred_at: string
  status: string
  source_table: string | null
  metadata: Record<string, any>
}

interface PayoutSummary {
  totalEarnings: number
  pendingPayouts: number
  completedPayouts: number
  lastPayout: string | null
}

const TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  royalty: "Royalty",
  merchandise: "Merch",
  event: "Event",
  other: "Other",
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-600/20 text-green-400 border-green-600/30",
  pending: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  failed: "bg-red-600/20 text-red-400 border-red-600/30",
}

export default function PaymentsPage() {
  const { artistProfile } = useArtist()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [summary, setSummary] = useState<PayoutSummary>({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    lastPayout: null,
  })

  useEffect(() => {
    loadTransactions()
  }, [artistProfile])

  async function loadTransactions() {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("artist_financial_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(100)

      if (error) throw error

      const mapped: Transaction[] = (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        amount: Number(row.amount),
        currency: row.currency ?? "USD",
        occurred_at: row.occurred_at,
        status: row.status,
        source_table: row.source_table,
        metadata: row.metadata ?? {},
      }))

      setTransactions(mapped)

      const incomeTypes = ["income", "royalty", "merchandise", "event"]
      const income = mapped
        .filter((t) => incomeTypes.includes(t.type) && t.status === "completed")
        .reduce((s, t) => s + t.amount, 0)
      const pending = mapped
        .filter((t) => t.status === "pending")
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      const completed = mapped
        .filter((t) => incomeTypes.includes(t.type) && t.status === "completed")
        .reduce((s, t) => s + t.amount, 0)
      const lastCompleted = mapped.find(
        (t) => incomeTypes.includes(t.type) && t.status === "completed"
      )

      setSummary({
        totalEarnings: income,
        pendingPayouts: pending,
        completedPayouts: completed,
        lastPayout: lastCompleted?.occurred_at ?? null,
      })
    } catch {
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((t) => t.type === activeTab)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Payments
              </h1>
              <p className="text-sm text-slate-400">
                Track your earnings, payouts, and transaction history
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-slate-700 text-white rounded-xl"
                onClick={loadTransactions}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={() => {
                  window.open("https://connect.stripe.com/setup", "_blank")
                  toast.info("Opening Stripe Connect setup...")
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Stripe Connect Setup
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-sm text-gray-400">Total Earnings</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatSafeCurrency(summary.totalEarnings)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-600/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="text-sm text-gray-400">Pending Payouts</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatSafeCurrency(summary.pendingPayouts)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Wallet className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Completed Payouts</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatSafeCurrency(summary.completedPayouts)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-sm text-gray-400">Last Payout</span>
              </div>
              <div className="text-lg font-bold text-white">
                {summary.lastPayout
                  ? format(new Date(summary.lastPayout), "MMM d, yyyy")
                  : "No payouts yet"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-purple-400" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-800/50 border-slate-700/50 rounded-xl p-1 mb-6">
                <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
                <TabsTrigger value="income" className="rounded-lg">Income</TabsTrigger>
                <TabsTrigger value="royalty" className="rounded-lg">Royalties</TabsTrigger>
                <TabsTrigger value="merchandise" className="rounded-lg">Merch</TabsTrigger>
                <TabsTrigger value="event" className="rounded-lg">Events</TabsTrigger>
                <TabsTrigger value="expense" className="rounded-lg">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-slate-800/50 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-16">
                    <AlertCircle className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx) => {
                      const isIncome = tx.type !== "expense" && tx.amount > 0
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                isIncome
                                  ? "bg-green-600/20 text-green-400"
                                  : "bg-red-600/20 text-red-400"
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {tx.description || TYPE_LABELS[tx.type] || tx.type}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(tx.occurred_at), "MMM d, yyyy · h:mm a")}
                                {tx.source_table && (
                                  <span className="ml-2 text-gray-500">
                                    via {tx.source_table}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={STATUS_COLORS[tx.status] ?? STATUS_COLORS.pending}>
                              {tx.status}
                            </Badge>
                            <span
                              className={`font-semibold ${
                                isIncome ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isIncome ? "+" : "-"}
                              {formatSafeCurrency(Math.abs(tx.amount))}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
