"use client"

import { useState } from "react"
import { Plus, DollarSign, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface BudgetItem {
  id: string
  category: string
  description: string
  amount: number
  date: Date
  type: 'expense' | 'allocation'
}

interface BudgetProps {
  totalBudget: number
  items: BudgetItem[]
  onAddItem?: (item: Omit<BudgetItem, 'id'>) => void
}

export function Budget({ totalBudget, items, onAddItem }: BudgetProps) {
  const [showAddItem, setShowAddItem] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newItem, setNewItem] = useState<{
    category: string
    description: string
    amount: string
    type: 'expense' | 'allocation'
  }>({
    category: '',
    description: '',
    amount: '',
    type: 'expense'
  })

  const totalExpenses = items
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalAllocations = items
    .filter(item => item.type === 'allocation')
    .reduce((sum, item) => sum + item.amount, 0)

  const remainingBudget = totalBudget - totalExpenses
  const budgetProgress = (totalExpenses / totalBudget) * 100

  const handleAddItem = async () => {
    if (!newItem.category || !newItem.amount) return

    setIsSubmitting(true)
    try {
      if (onAddItem) {
        await onAddItem({
          category: newItem.category,
          description: newItem.description,
          amount: parseFloat(newItem.amount),
          date: new Date(),
          type: newItem.type
        })
      }
      setShowAddItem(false)
      setNewItem({
        category: '',
        description: '',
        amount: '',
        type: 'expense'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/70 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/70 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/70 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Remaining Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(remainingBudget)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/70 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Overview</CardTitle>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
                <DialogDescription>
                  Add a new expense or budget allocation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Category</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                    placeholder="Enter category"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'expense' | 'allocation' })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                  >
                    <option value="expense">Expense</option>
                    <option value="allocation">Allocation</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Amount</label>
                  <input
                    type="number"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200 min-h-[100px]"
                    placeholder="Enter description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddItem(false)}
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddItem}
                  disabled={isSubmitting || !newItem.category || !newItem.amount}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Item'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-400">Budget Usage</span>
                <span className="text-slate-400">{budgetProgress.toFixed(1)}%</span>
              </div>
              <Progress value={budgetProgress} className="h-2" />
            </div>

            <div className="space-y-4">
              {items
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div>
                      <h4 className="font-medium text-slate-200">{item.category}</h4>
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {formatSafeDate(item.date.toISOString())}
                      </p>
                    </div>
                    <div className={`text-lg font-semibold ${
                      item.type === 'expense' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 