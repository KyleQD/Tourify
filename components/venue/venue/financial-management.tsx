"use client"

import { Checkbox } from "@/components/ui/checkbox"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowUpDown,
  Check,
  Download,
  Edit,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock invoices data
const mockInvoices = [
  {
    id: "INV-001",
    client: {
      name: "Blue Note Productions",
      email: "billing@bluenoteprod.com",
      address: "123 Music Ave, Nashville, TN 37203",
    },
    date: "2024-05-15",
    dueDate: "2024-06-15",
    status: "paid",
    amount: 2500.0,
    items: [
      {
        description: "Venue Rental - Main Hall",
        quantity: 1,
        unitPrice: 1500.0,
        total: 1500.0,
      },
      {
        description: "Sound System Package",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
      {
        description: "Lighting Package",
        quantity: 1,
        unitPrice: 350.0,
        total: 350.0,
      },
      {
        description: "Staff - Sound Engineer",
        quantity: 5,
        unitPrice: 30.0,
        total: 150.0,
      },
    ],
    notes: "Event: Summer Jam Festival - June 15, 2025",
    paymentMethod: "Credit Card",
    paymentDate: "2024-05-20",
  },
  {
    id: "INV-002",
    client: {
      name: "Sarah Williams",
      email: "sarah@midnightecho.com",
      address: "456 Melody Lane, Los Angeles, CA 90028",
    },
    date: "2024-05-20",
    dueDate: "2024-06-20",
    status: "pending",
    amount: 1800.0,
    items: [
      {
        description: "Venue Rental - Side Stage",
        quantity: 1,
        unitPrice: 1000.0,
        total: 1000.0,
      },
      {
        description: "Sound System Package",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
      {
        description: "Staff - Sound Engineer",
        quantity: 5,
        unitPrice: 30.0,
        total: 150.0,
      },
      {
        description: "Green Room Access",
        quantity: 1,
        unitPrice: 150.0,
        total: 150.0,
      },
    ],
    notes: "Event: Midnight Echo Album Release - June 22, 2025",
    paymentMethod: null,
    paymentDate: null,
  },
  {
    id: "INV-003",
    client: {
      name: "Local Theater Group",
      email: "director@localtheater.org",
      address: "789 Stage Road, Seattle, WA 98101",
    },
    date: "2024-04-10",
    dueDate: "2024-05-10",
    status: "overdue",
    amount: 1200.0,
    items: [
      {
        description: "Venue Rental - Main Hall",
        quantity: 2,
        unitPrice: 500.0,
        total: 1000.0,
      },
      {
        description: "Basic Lighting Package",
        quantity: 1,
        unitPrice: 200.0,
        total: 200.0,
      },
    ],
    notes: "Event: Community Theater Production - May 10-12, 2025",
    paymentMethod: null,
    paymentDate: null,
  },
  {
    id: "INV-004",
    client: {
      name: "Corporate Events Inc.",
      email: "events@corporateevents.com",
      address: "101 Business Plaza, Chicago, IL 60601",
    },
    date: "2024-05-05",
    dueDate: "2024-06-05",
    status: "draft",
    amount: 3500.0,
    items: [
      {
        description: "Venue Rental - Full Venue",
        quantity: 1,
        unitPrice: 2500.0,
        total: 2500.0,
      },
      {
        description: "Premium AV Package",
        quantity: 1,
        unitPrice: 750.0,
        total: 750.0,
      },
      {
        description: "Staff - Event Coordinator",
        quantity: 8,
        unitPrice: 25.0,
        total: 200.0,
      },
      {
        description: "Catering Service",
        quantity: 1,
        unitPrice: 50.0,
        total: 50.0,
      },
    ],
    notes: "Corporate Team Building Event - July 5, 2025",
    paymentMethod: null,
    paymentDate: null,
  },
]

// Mock expenses data
const mockExpenses = [
  {
    id: "EXP-001",
    date: "2024-05-10",
    category: "utilities",
    vendor: "City Power & Light",
    description: "Monthly electricity bill",
    amount: 850.0,
    paymentMethod: "Bank Transfer",
    receipt: true,
    recurring: true,
  },
  {
    id: "EXP-002",
    date: "2024-05-12",
    category: "maintenance",
    vendor: "Sound Systems Pro",
    description: "Repair of main mixer and speakers",
    amount: 450.0,
    paymentMethod: "Credit Card",
    receipt: true,
    recurring: false,
  },
  {
    id: "EXP-003",
    date: "2024-05-15",
    category: "supplies",
    vendor: "Stage Supply Co.",
    description: "Microphone cables and adapters",
    amount: 120.0,
    paymentMethod: "Credit Card",
    receipt: true,
    recurring: false,
  },
  {
    id: "EXP-004",
    date: "2024-05-01",
    category: "rent",
    vendor: "Venue Property Management",
    description: "Monthly rent payment",
    amount: 3500.0,
    paymentMethod: "Bank Transfer",
    receipt: true,
    recurring: true,
  },
  {
    id: "EXP-005",
    date: "2024-05-05",
    category: "insurance",
    vendor: "Venue Shield Insurance",
    description: "Monthly liability insurance premium",
    amount: 450.0,
    paymentMethod: "Bank Transfer",
    receipt: true,
    recurring: true,
  },
  {
    id: "EXP-006",
    date: "2024-05-20",
    category: "staff",
    vendor: "Payroll Services Inc.",
    description: "Staff payroll - first half of May",
    amount: 4200.0,
    paymentMethod: "Bank Transfer",
    receipt: true,
    recurring: true,
  },
]

// Mock transactions data
const mockTransactions = [
  {
    id: "TRX-001",
    date: "2024-05-20",
    description: "Payment received - INV-001",
    type: "income",
    amount: 2500.0,
    category: "invoice",
    reference: "INV-001",
  },
  {
    id: "TRX-002",
    date: "2024-05-20",
    description: "Staff payroll - first half of May",
    type: "expense",
    amount: 4200.0,
    category: "staff",
    reference: "EXP-006",
  },
  {
    id: "TRX-003",
    date: "2024-05-15",
    description: "Microphone cables and adapters",
    type: "expense",
    amount: 120.0,
    category: "supplies",
    reference: "EXP-003",
  },
  {
    id: "TRX-004",
    date: "2024-05-12",
    description: "Repair of main mixer and speakers",
    type: "expense",
    amount: 450.0,
    category: "maintenance",
    reference: "EXP-002",
  },
  {
    id: "TRX-005",
    date: "2024-05-10",
    description: "Monthly electricity bill",
    type: "expense",
    amount: 850.0,
    category: "utilities",
    reference: "EXP-001",
  },
  {
    id: "TRX-006",
    date: "2024-05-05",
    description: "Monthly liability insurance premium",
    type: "expense",
    amount: 450.0,
    category: "insurance",
    reference: "EXP-005",
  },
  {
    id: "TRX-007",
    date: "2024-05-01",
    description: "Monthly rent payment",
    type: "expense",
    amount: 3500.0,
    category: "rent",
    reference: "EXP-004",
  },
]

export function FinancialManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("may")
  const [selectedYear, setSelectedYear] = useState("2024")

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  // Get invoice status badge color
  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900/20 text-green-400 border-green-800"
      case "pending":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-800"
      case "overdue":
        return "bg-red-900/20 text-red-400 border-red-800"
      case "draft":
        return "bg-gray-700 text-gray-300 border-gray-600"
      default:
        return "bg-gray-700 text-gray-300 border-gray-600"
    }
  }

  // Get transaction type color
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-400"
      case "expense":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  // Calculate total income
  const totalIncome = mockTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0)

  // Calculate total expenses
  const totalExpenses = mockTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0)

  // Calculate net income
  const netIncome = totalIncome - totalExpenses

  // Calculate expense by category
  const expensesByCategory = mockExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0
    }
    acc[expense.category] += expense.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Financial Management</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold">INVOICE</h3>
                      <div className="text-sm text-gray-400"># INV-005</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-sm font-medium">The Echo Lounge</div>
                      <div className="text-sm text-gray-400">1234 Sunset Blvd</div>
                      <div className="text-sm text-gray-400">Los Angeles, CA 90026</div>
                      <div className="text-sm text-gray-400">billing@echolounge.com</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bill To</label>
                      <Input className="bg-gray-800 border-gray-700" placeholder="Client name" />
                      <Input className="bg-gray-800 border-gray-700" placeholder="Client email" />
                      <Textarea className="bg-gray-800 border-gray-700" placeholder="Client address" rows={3} />
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Invoice Date</label>
                          <Input type="date" className="bg-gray-800 border-gray-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Due Date</label>
                          <Input type="date" className="bg-gray-800 border-gray-700" />
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium">Invoice Status</label>
                        <Select defaultValue="draft">
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Invoice Items</label>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    <div className="border border-gray-700 rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left">Description</th>
                            <th className="px-4 py-2 text-right">Quantity</th>
                            <th className="px-4 py-2 text-right">Unit Price</th>
                            <th className="px-4 py-2 text-right">Total</th>
                            <th className="px-4 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-gray-700">
                            <td className="px-4 py-2">
                              <Input className="bg-gray-700 border-gray-600" placeholder="Item description" />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                className="bg-gray-700 border-gray-600 text-right"
                                placeholder="1"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                className="bg-gray-700 border-gray-600 text-right"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">$0.00</td>
                            <td className="px-4 py-2 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-800">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">
                              Subtotal:
                            </td>
                            <td className="px-4 py-2 text-right">$0.00</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">
                              Tax (0%):
                            </td>
                            <td className="px-4 py-2 text-right">$0.00</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">
                              Total:
                            </td>
                            <td className="px-4 py-2 text-right font-bold">$0.00</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      className="bg-gray-800 border-gray-700"
                      placeholder="Additional notes or payment instructions"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCreatingInvoice(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline">Save as Draft</Button>
                  <Button>Create & Send</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Total Income</h3>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalIncome)}</div>
                  <p className="text-sm text-gray-400">Current month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Total Expenses</h3>
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalExpenses)}</div>
                  <p className="text-sm text-gray-400">Current month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Net Income</h3>
                    {netIncome >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div
                    className={`text-3xl font-bold mb-1 ${
                      netIncome >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatCurrency(netIncome)}
                  </div>
                  <p className="text-sm text-gray-400">Current month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Recent Invoices</CardTitle>
                    <Button variant="link" size="sm" className="text-purple-400 p-0" onClick={() => setActiveTab("invoices")}>
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {mockInvoices.slice(0, 3).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-2 bg-gray-750 rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium">{invoice.client.name}</div>
                            <div className="text-xs text-gray-400">
                              {invoice.id} • {formatDate(invoice.date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(invoice.amount)}</div>
                            <Badge variant="outline" className={getInvoiceStatusColor(invoice.status)}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Expenses by Category</CardTitle>
                    <Select defaultValue={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="may">May 2024</SelectItem>
                        <SelectItem value="april">April 2024</SelectItem>
                        <SelectItem value="march">March 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    category === "utilities"
                                      ? "#8b5cf6"
                                      : category === "maintenance"
                                      ? "#3b82f6"
                                      : category === "supplies"
                                      ? "#10b981"
                                      : category === "rent"
                                      ? "#f59e0b"
                                      : category === "insurance"
                                      ? "#ec4899"
                                      : "#6366f1",
                                }}
                              ></div>
                              <span className="capitalize">{category}</span>
                            </div>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(amount / totalExpenses) * 100}%`,
                                backgroundColor:
                                  category === "utilities"
                                    ? "#8b5cf6"
                                    : category === "maintenance"
                                    ? "#3b82f6"
                                    : category === "supplies"
                                    ? "#10b981"
                                    : category === "rent"
                                    ? "#f59e0b"
                                    : category === "insurance"
                                    ? "#ec4899"
                                    : "#6366f1",
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <Button variant="link" size="sm" className="text-purple-400 p-0" onClick={() => setActiveTab("transactions")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative overflow-x-auto rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Description
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Category
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTransactions.slice(0, 5).map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-700 bg-gray-800 hover:bg-gray-750">
                          <td className="px-4 py-3">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-3">{transaction.description}</td>
                          <td className="px-4 py-3 capitalize">{transaction.category}</td>
                          <td className={`px-4 py-3 text-right ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            Invoice
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Client
                        </th>
                        <th scope="col" className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            Date
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            Due Date
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            Amount
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className={`border-b border-gray-700 hover:bg-gray-750 ${
                            selectedInvoice === invoice.id ? "bg-gray-750" : "bg-gray-800"
                          }`}
                          onClick={() => setSelectedInvoice(invoice.id === selectedInvoice ? null : invoice.id)}
                        >
                          <td className="px-4 py-3 font-medium">{invoice.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{invoice.client.name}</div>
                            <div className="text-xs text-gray-400">{invoice.client.email}</div>
                          </td>
                          <td className="px-4 py-3">{formatDate(invoice.date)}</td>
                          <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={getInvoiceStatusColor(invoice.status)}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {selectedInvoice && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Invoice Details</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                      <Button size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {(() => {
                    const invoice = mockInvoices.find((inv) => inv.id === selectedInvoice)
                    if (!invoice) return null

                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold">INVOICE</h3>
                            <div className="text-sm text-gray-400">#{invoice.id}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={getInvoiceStatusColor(invoice.status)}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">From</h4>
                            <div className="text-sm">
                              <div className="font-medium">The Echo Lounge</div>
                              <div className="text-gray-400">1234 Sunset Blvd</div>
                              <div className="text-gray-400">Los Angeles, CA 90026</div>
                              <div className="text-gray-400">billing@echolounge.com</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Bill To</h4>
                            <div className="text-sm">
                              <div className="font-medium">{invoice.client.name}</div>
                              <div className="text-gray-400">{invoice.client.email}</div>
                              <div className="text-gray-400">{invoice.client.address}</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Invoice Date</h4>
                            <div className="text-sm">{formatDate(invoice.date)}</div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Due Date</h4>
                            <div className="text-sm">{formatDate(invoice.dueDate)}</div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Amount Due</h4>
                            <div className="text-lg font-bold">{formatCurrency(invoice.amount)}</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Invoice Items</h4>
                          <div className="border border-gray-700 rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-750">
                                <tr>
                                  <th className="px-4 py-2 text-left">Description</th>
                                  <th className="px-4 py-2 text-right">Quantity</th>
                                  <th className="px-4 py-2 text-right">Unit Price</th>
                                  <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoice.items.map((item, index) => (
                                  <tr key={index} className="border-t border-gray-700">
                                    <td className="px-4 py-2">{item.description}</td>
                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-750">
                                <tr>
                                  <td colSpan={3} className="px-4 py-2 text-right font-medium">
                                    Total:
                                  </td>
                                  <td className="px-4 py-2 text-right font-bold">
                                    {formatCurrency(invoice.amount)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {invoice.notes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Notes</h4>
                            <div className="text-sm p-3 bg-gray-750 rounded-md">{invoice.notes}</div>
                          </div>
                        )}

                        {invoice.status === "paid" && (
                          <div className="flex items-center gap-2 p-3 bg-green-900/20 text-green-400 rounded-md">
                            <Check className="h-5 w-5" />
                            <div>
                              <span className="font-medium">Payment Received</span> on{" "}
                              {formatDate(invoice.paymentDate || "")} via {invoice.paymentMethod}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Expense Management</h3>
              <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800">
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input type="date" className="bg-gray-800 border-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="supplies">Supplies</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vendor</label>
                      <Input className="bg-gray-800 border-gray-700" placeholder="Vendor name" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        className="bg-gray-800 border-gray-700"
                        placeholder="Expense description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input type="number" className="bg-gray-800 border-gray-700" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <Select>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="credit-card">Credit Card</SelectItem>
                            <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="recurring" />
                      <label
                        htmlFor="recurring"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        This is a recurring expense
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Receipt</label>
                      <div className="border border-dashed border-gray-700 rounded-md p-4 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                        <p className="text-gray-500 mb-2">Drag and drop a receipt or click to browse</p>
                        <Button variant="outline" size="sm">
                          Upload Receipt
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsAddingExpense(false)}>
                      Cancel
                    </Button>
                    <Button>Save Expense</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            Date
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Vendor
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Category
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Description
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            Amount
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-gray-700 bg-gray-800 hover:bg-gray-750">
                          <td className="px-4 py-3">{formatDate(expense.date)}</td>
                          <td className="px-4 py-3">{expense.vendor}</td>
                          <td className="px-4 py-3 capitalize">{expense.category}</td>
                          <td className="px-4 py-3">{expense.description}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">Date</th>
                        <th scope="col" className="px-4 py-3">Description</th>
                        <th scope="col" className="px-4 py-3">Category</th>
                        <th scope="col" className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-700 bg-gray-800 hover:bg-gray-750">
                          <td className="px-4 py-3">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-3">{transaction.description}</td>
                          <td className="px-4 py-3 capitalize">{transaction.category}</td>
                          <td className={`px-4 py-3 text-right ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-sm text-gray-400">
                Generate and download financial reports here.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
