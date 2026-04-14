"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Box, Download, FileText, Package, Plus, Search, Truck } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const CATEGORY_TABS = ["all", "sound", "lighting", "stage", "other"] as const
type CategoryTab = (typeof CATEGORY_TABS)[number]

const KNOWN_CATEGORIES = new Set(["sound", "lighting", "stage"])

function normalizeCategory(type: string | undefined): CategoryTab {
  if (!type) return "other"
  const lower = type.toLowerCase()
  if (KNOWN_CATEGORIES.has(lower)) return lower as CategoryTab
  return "other"
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "available":
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
    case "in_progress":
    case "in_use":
    case "in-use":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Use</Badge>
    case "maintenance":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
    default:
      return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status ?? "Unknown"}</Badge>
  }
}

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<CategoryTab>("all")

  function buildNoStoreInit(): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  }

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch('/api/admin/logistics/items', buildNoStoreInit())
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || data.data || [])
        }
      } catch { /* graceful fallback */ }
    }
    fetchItems()
  }, [])

  const filteredItems = useMemo(() => {
    let result = items

    if (activeTab !== "all") {
      result = result.filter((item) => normalizeCategory(item.type) === activeTab)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((item) =>
        (item.title ?? "").toLowerCase().includes(term) ||
        (item.type ?? "").toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term) ||
        (item.id ?? "").toLowerCase().includes(term)
      )
    }

    return result
  }, [items, activeTab, searchTerm])

  const total = items.length
  const available = items.filter((i: any) => i.status === 'available' || i.status === 'completed').length
  const inUse = items.filter((i: any) => i.status === 'in_progress' || i.status === 'in_use').length
  const maintenance = items.filter((i: any) => i.status === 'maintenance').length

  const handleExport = useCallback(() => {
    const headers = ["Item ID", "Name", "Category", "Status", "Location"]
    const rows = filteredItems.map((item) => [
      item.id ?? "",
      item.title ?? "",
      item.type ?? "",
      item.status ?? "",
      item.notes ?? item.description ?? "",
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [filteredItems])

  return (
    <div className="container mx-auto p-4">
      <AdminPageHeader
        title="Inventory Management"
        icon={Package}
        subtitle="Track and manage all equipment and supplies for your events"
        actions={
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => router.push("/admin/dashboard/logistics")}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        }
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InventorySummaryCard title="Total Items" value={String(total)} category="All Categories" icon={Box} />
        <InventorySummaryCard title="Available" value={String(available)} category={total > 0 ? `${((available / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={Package} />
        <InventorySummaryCard title="In Use" value={String(inUse)} category={total > 0 ? `${((inUse / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={Truck} />
        <InventorySummaryCard title="Maintenance" value={String(maintenance)} category={total > 0 ? `${((maintenance / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={FileText} />
      </div>

      <div className="mb-6">
        <div className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30 inline-flex">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-sm text-sm transition-all duration-200 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white shadow-lg shadow-purple-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "all" ? "All Items" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-slate-100 flex items-center text-base">
            <Package className="mr-2 h-5 w-5 text-purple-500" />
            {activeTab === "all" ? "Inventory Items" : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Equipment`}
          </CardTitle>
          <Button variant="outline" className="border-slate-700" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Item ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No items found
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{item.id?.slice(0, 8) ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-300">{item.title ?? "Untitled"}</td>
                        <td className="px-4 py-3 text-slate-300 capitalize">{item.type ?? "—"}</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-slate-300">{item.notes || item.description || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface InventorySummaryCardProps {
  title: string
  value: string
  category: string
  icon: any
}

function InventorySummaryCard({ title, value, category, icon: Icon }: InventorySummaryCardProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
            <p className="text-xs mt-1 text-slate-500">{category}</p>
          </div>
          <div className="bg-purple-500/20 p-2 rounded-md">
            <Icon className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
