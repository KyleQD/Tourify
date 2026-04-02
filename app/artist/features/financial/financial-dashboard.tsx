"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, FileText, Receipt, Download } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface Transaction {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  amount: number
  description: string
}

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  amount: number
  status: "draft" | "sent" | "paid"
  client: string
}

const revenueData = [
  { month: "Jan", streaming: 1200, live: 3000, merchandise: 800 },
  { month: "Feb", streaming: 1500, live: 2500, merchandise: 1000 },
  { month: "Mar", streaming: 1800, live: 4000, merchandise: 1200 },
  { month: "Apr", streaming: 2000, live: 3500, merchandise: 1500 },
  { month: "May", streaming: 2200, live: 5000, merchandise: 1800 },
  { month: "Jun", streaming: 2500, live: 4500, merchandise: 2000 }
]

export function FinancialDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...transaction
    }
    setTransactions([...transactions, newTransaction])
  }

  const createInvoice = (invoice: Omit<Invoice, "id">) => {
    const newInvoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      ...invoice
    }
    setInvoices([...invoices, newInvoice])
  }

  const totalRevenue = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 gap-4">
              <TabsTrigger value="overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <Receipt className="w-4 h-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="invoices">
                <FileText className="w-4 h-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="reports">
                <Download className="w-4 h-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <h3 className="text-2xl font-bold">{formatSafeCurrency(totalRevenue)}</h3>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Expenses</p>
                        <h3 className="text-2xl font-bold">{formatSafeCurrency(totalExpenses)}</h3>
                      </div>
                      <DollarSign className="w-8 h-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Net Income</p>
                        <h3 className="text-2xl font-bold">
                          {formatSafeCurrency(totalRevenue - totalExpenses)}
                        </h3>
                      </div>
                      <TrendingUp className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="streaming" fill="#8884d8" />
                        <Bar dataKey="live" fill="#82ca9d" />
                        <Bar dataKey="merchandise" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Transaction History</h3>
                <Button variant="outline" size="sm">
                  Add Transaction
                </Button>
              </div>
              <div className="space-y-4">
                {transactions.map(transaction => (
                  <Card key={transaction.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{transaction.description}</h4>
                          <p className="text-sm text-gray-500">
                            {formatSafeDate(transaction.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === "income" ? "text-green-500" : "text-red-500"
                          }`}>
                            {transaction.type === "income" ? "+" : "-"}${transaction.amount}
                          </p>
                          <p className="text-sm text-gray-500">{transaction.category}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Invoices</h3>
                <Button variant="outline" size="sm">
                  Create Invoice
                </Button>
              </div>
              <div className="space-y-4">
                {invoices.map(invoice => (
                  <Card key={invoice.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Invoice #{invoice.number}</h4>
                          <p className="text-sm text-gray-500">
                            Due: {formatSafeDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${invoice.amount}</p>
                          <Badge variant={
                            invoice.status === "paid" ? "default" :
                            invoice.status === "sent" ? "secondary" : "outline"
                          }>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 