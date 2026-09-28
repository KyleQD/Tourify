"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, DollarSign, CreditCard, Banknote, AlertCircle } from "lucide-react"
import { cn, formatCurrency } from "@/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  status: "pending" | "paid" | "cancelled"
  payment_method: "credit_card" | "cash" | "bank_transfer"
}

interface Budget {
  id: string
  category: string
  allocated_amount: number
  spent_amount: number
  start_date: string
  end_date: string
  status: "active" | "completed" | "cancelled"
}

interface FinancialTrackingProps {
  eventId: string
  expenses: Expense[]
  budgets: Budget[]
  onAddExpense: (expense: Omit<Expense, "id">) => Promise<void>
  onAddBudget: (budget: Omit<Budget, "id">) => Promise<void>
}

export function FinancialTracking({ eventId, expenses = [], budgets = [], onAddExpense, onAddBudget }: FinancialTrackingProps) {
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false)
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: "",
    description: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    status: "pending",
    payment_method: "credit_card"
  })
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    category: "",
    allocated_amount: 0,
    spent_amount: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    status: "active"
  })

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.allocated_amount, 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const remainingBudget = totalBudget - totalExpenses

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount) {
      return
    }
    await onAddExpense(newExpense as Omit<Expense, "id">)
    setIsAddExpenseModalOpen(false)
    setNewExpense({
      category: "",
      description: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      payment_method: "credit_card"
    })
  }

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.allocated_amount) {
      return
    }
    await onAddBudget(newBudget as Omit<Budget, "id">)
    setIsAddBudgetModalOpen(false)
    setNewBudget({
      category: "",
      allocated_amount: 0,
      spent_amount: 0,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(), "yyyy-MM-dd"),
      status: "active"
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalBudget)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Expenses
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Remaining Budget
            </CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(remainingBudget)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-300">Expenses</CardTitle>
              <Button
                onClick={() => setIsAddExpenseModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No expenses recorded yet
                  </div>
                ) : (
                  expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-white">{expense.category}</div>
                        <div className="text-sm text-slate-400">{expense.description}</div>
                        <div className="text-xs text-slate-400">
                          {format(new Date(expense.date), "PPP")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatCurrency(expense.amount)}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {expense.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-300">Budgets</CardTitle>
              <Button
                onClick={() => setIsAddBudgetModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Budget
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No budgets created yet
                  </div>
                ) : (
                  budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-white">{budget.category}</div>
                        <div className="text-sm text-slate-400">
                          {format(new Date(budget.start_date), "PPP")} -{" "}
                          {format(new Date(budget.end_date), "PPP")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatCurrency(budget.spent_amount)} /{" "}
                          {formatCurrency(budget.allocated_amount)}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {budget.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={isAddExpenseModalOpen} onOpenChange={setIsAddExpenseModalOpen}>
        <DialogContent className={detailSurfacePattern.dialogContent}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category" className={detailSurfacePattern.label}>Category</Label>
              <Input
                id="category"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className={detailSurfacePattern.input}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
              <Textarea
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className={detailSurfacePattern.textarea}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className={detailSurfacePattern.label}>Amount</Label>
              <Input
                id="amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                className={detailSurfacePattern.input}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date" className={detailSurfacePattern.label}>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      detailSurfacePattern.btnOutline,
                      !newExpense.date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newExpense.date ? format(new Date(newExpense.date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10">
                  <Calendar
                    mode="single"
                    selected={new Date(newExpense.date || new Date())}
                    onSelect={(date) => setNewExpense({ ...newExpense, date: format(date || new Date(), "yyyy-MM-dd") })}
                    initialFocus
                    className="bg-slate-900"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method" className={detailSurfacePattern.label}>Payment Method</Label>
              <Select
                value={newExpense.payment_method}
                onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value as any })}
              >
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="credit_card" className="text-white">Credit Card</SelectItem>
                  <SelectItem value="cash" className="text-white">Cash</SelectItem>
                  <SelectItem value="bank_transfer" className="text-white">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddExpense} className={cn("w-full", detailSurfacePattern.btnPrimary)}>
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Budget Modal */}
      <Dialog open={isAddBudgetModalOpen} onOpenChange={setIsAddBudgetModalOpen}>
        <DialogContent className={detailSurfacePattern.dialogContent}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Add New Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget_category" className={detailSurfacePattern.label}>Category</Label>
              <Input
                id="budget_category"
                value={newBudget.category}
                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                className={detailSurfacePattern.input}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocated_amount" className={detailSurfacePattern.label}>Allocated Amount</Label>
              <Input
                id="allocated_amount"
                type="number"
                value={newBudget.allocated_amount}
                onChange={(e) => setNewBudget({ ...newBudget, allocated_amount: parseFloat(e.target.value) })}
                className={detailSurfacePattern.input}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date" className={detailSurfacePattern.label}>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      detailSurfacePattern.btnOutline,
                      !newBudget.start_date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newBudget.start_date ? format(new Date(newBudget.start_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10">
                  <Calendar
                    mode="single"
                    selected={new Date(newBudget.start_date || new Date())}
                    onSelect={(date) => setNewBudget({ ...newBudget, start_date: format(date || new Date(), "yyyy-MM-dd") })}
                    initialFocus
                    className="bg-slate-900"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className={detailSurfacePattern.label}>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      detailSurfacePattern.btnOutline,
                      !newBudget.end_date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newBudget.end_date ? format(new Date(newBudget.end_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10">
                  <Calendar
                    mode="single"
                    selected={new Date(newBudget.end_date || new Date())}
                    onSelect={(date) => setNewBudget({ ...newBudget, end_date: format(date || new Date(), "yyyy-MM-dd") })}
                    initialFocus
                    className="bg-slate-900"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleAddBudget} className={cn("w-full", detailSurfacePattern.btnPrimary)}>
              Add Budget
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 