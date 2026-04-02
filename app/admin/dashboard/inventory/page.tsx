"use client"

import { useState, useEffect } from "react"
import { Box, Download, FileText, Package, Plus, Search, Truck } from "lucide-react"
import { Header } from "@/components/header"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch('/api/admin/logistics/items', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || data.data || [])
        }
      } catch { /* graceful fallback */ }
    }
    fetchItems()
  }, [])

  const total = items.length
  const available = items.filter((i: any) => i.status === 'available' || i.status === 'completed').length
  const inUse = items.filter((i: any) => i.status === 'in_progress' || i.status === 'in_use').length
  const maintenance = items.filter((i: any) => i.status === 'maintenance').length

  return (
    <div className="container mx-auto p-4">
      <Header />
      <PageHeader
        title="Inventory Management"
        icon={Package}
        description="Track and manage all equipment and supplies for your events"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-64"
          />
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InventorySummaryCard title="Total Items" value={String(total)} category="All Categories" icon={Box} />
        <InventorySummaryCard title="Available" value={String(available)} category={total > 0 ? `${((available / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={Package} />
        <InventorySummaryCard title="In Use" value={String(inUse)} category={total > 0 ? `${((inUse / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={Truck} />
        <InventorySummaryCard title="Maintenance" value={String(maintenance)} category={total > 0 ? `${((maintenance / total) * 100).toFixed(1)}% of inventory` : '0%'} icon={FileText} />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 mb-6 rounded-sm border border-slate-700/30">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            All Items
          </TabsTrigger>
          <TabsTrigger value="sound" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            Sound
          </TabsTrigger>
          <TabsTrigger
            value="lighting"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200"
          >
            Lighting
          </TabsTrigger>
          <TabsTrigger value="stage" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            Stage
          </TabsTrigger>
          <TabsTrigger value="other" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Package className="mr-2 h-5 w-5 text-purple-500" />
                Inventory Items
              </CardTitle>
              <Button variant="outline" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                      <InventoryRow
                        id="INV-001"
                        name="Main PA System"
                        category="Sound"
                        quantity={1}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-002"
                        name="Wireless Microphones"
                        category="Sound"
                        quantity={12}
                        status="in-use"
                        location="Summer Festival"
                      />
                      <InventoryRow
                        id="INV-003"
                        name="Stage Lighting Kit"
                        category="Lighting"
                        quantity={1}
                        status="in-use"
                        location="Summer Festival"
                      />
                      <InventoryRow
                        id="INV-004"
                        name="LED Screens"
                        category="Visual"
                        quantity={2}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-005"
                        name="Drum Kit"
                        category="Instruments"
                        quantity={1}
                        status="maintenance"
                        location="Repair Shop"
                      />
                      <InventoryRow
                        id="INV-006"
                        name="Guitar Amplifiers"
                        category="Sound"
                        quantity={4}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-007"
                        name="Stage Risers"
                        category="Stage"
                        quantity={8}
                        status="in-use"
                        location="Concert Series"
                      />
                      <InventoryRow
                        id="INV-008"
                        name="Barricades"
                        category="Security"
                        quantity={20}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-009"
                        name="Fog Machines"
                        category="Effects"
                        quantity={2}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-010"
                        name="Mixing Console"
                        category="Sound"
                        quantity={2}
                        status="in-use"
                        location="Summer Festival"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sound" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Package className="mr-2 h-5 w-5 text-purple-500" />
                Sound Equipment
              </CardTitle>
              <Button variant="outline" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                      <InventoryRow
                        id="INV-001"
                        name="Main PA System"
                        category="Sound"
                        quantity={1}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-002"
                        name="Wireless Microphones"
                        category="Sound"
                        quantity={12}
                        status="in-use"
                        location="Summer Festival"
                      />
                      <InventoryRow
                        id="INV-006"
                        name="Guitar Amplifiers"
                        category="Sound"
                        quantity={4}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-010"
                        name="Mixing Console"
                        category="Sound"
                        quantity={2}
                        status="in-use"
                        location="Summer Festival"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lighting" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Package className="mr-2 h-5 w-5 text-purple-500" />
                Lighting Equipment
              </CardTitle>
              <Button variant="outline" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                      <InventoryRow
                        id="INV-003"
                        name="Stage Lighting Kit"
                        category="Lighting"
                        quantity={1}
                        status="in-use"
                        location="Summer Festival"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stage" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Package className="mr-2 h-5 w-5 text-purple-500" />
                Stage Equipment
              </CardTitle>
              <Button variant="outline" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                      <InventoryRow
                        id="INV-007"
                        name="Stage Risers"
                        category="Stage"
                        quantity={8}
                        status="in-use"
                        location="Concert Series"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Package className="mr-2 h-5 w-5 text-purple-500" />
                Other Equipment
              </CardTitle>
              <Button variant="outline" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                      <InventoryRow
                        id="INV-004"
                        name="LED Screens"
                        category="Visual"
                        quantity={2}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-008"
                        name="Barricades"
                        category="Security"
                        quantity={20}
                        status="available"
                        location="Main Warehouse"
                      />
                      <InventoryRow
                        id="INV-009"
                        name="Fog Machines"
                        category="Effects"
                        quantity={2}
                        status="available"
                        location="Main Warehouse"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

interface InventoryRowProps {
  id: string
  name: string
  category: string
  quantity: number
  status: "available" | "in-use" | "maintenance"
  location: string
}

function InventoryRow({ id, name, category, quantity, status, location }: InventoryRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
      case "in-use":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Use</Badge>
      case "maintenance":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{id}</td>
      <td className="px-4 py-3 text-slate-300">{name}</td>
      <td className="px-4 py-3 text-slate-300">{category}</td>
      <td className="px-4 py-3 text-slate-300">{quantity}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3 text-slate-300">{location}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <FileText className="h-4 w-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Download className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
