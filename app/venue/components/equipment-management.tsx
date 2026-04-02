"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Download,
  Edit,
  Filter,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Printer,
  Trash,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock data for equipment
const equipmentData = [
  {
    id: "EQ-001",
    name: "Shure SM58 Microphone",
    category: "Audio",
    status: "Available",
    condition: "Good",
    location: "Storage Room A",
    lastMaintenance: "2025-03-15",
    nextMaintenance: "2025-06-15",
    purchaseDate: "2024-01-10",
    purchasePrice: 99.99,
    notes: "Standard vocal microphone",
  },
  {
    id: "EQ-002",
    name: "QSC K12.2 Speaker",
    category: "Audio",
    status: "In Use",
    condition: "Excellent",
    location: "Main Stage",
    lastMaintenance: "2025-02-20",
    nextMaintenance: "2025-05-20",
    purchaseDate: "2023-11-05",
    purchasePrice: 799.99,
    notes: "12-inch powered speaker",
  },
  {
    id: "EQ-003",
    name: "Chauvet Intimidator Spot 375Z",
    category: "Lighting",
    status: "Maintenance",
    condition: "Fair",
    location: "Repair Shop",
    lastMaintenance: "2025-04-01",
    nextMaintenance: "2025-04-15",
    purchaseDate: "2023-08-15",
    purchasePrice: 599.99,
    notes: "Moving head light, needs new bulb",
  },
  {
    id: "EQ-004",
    name: "Allen & Heath SQ-5 Mixer",
    category: "Audio",
    status: "Available",
    condition: "Excellent",
    location: "Sound Booth",
    lastMaintenance: "2025-03-10",
    nextMaintenance: "2025-06-10",
    purchaseDate: "2023-12-20",
    purchasePrice: 2999.99,
    notes: "Digital mixer with 48 channels",
  },
  {
    id: "EQ-005",
    name: "ADJ Mega Bar RGBA",
    category: "Lighting",
    status: "In Use",
    condition: "Good",
    location: "Side Stage",
    lastMaintenance: "2025-02-15",
    nextMaintenance: "2025-05-15",
    purchaseDate: "2024-01-05",
    purchasePrice: 129.99,
    notes: "LED wash light",
  },
]

// Mock data for equipment items
const equipmentItems = [
  {
    id: "EQ-1001",
    name: "Shure SM58 Microphone",
    category: "Audio",
    status: "Available",
    condition: "Good",
    lastMaintenance: "2023-10-15",
    nextMaintenance: "2024-04-15",
    location: "Storage Room A",
    purchaseDate: "2022-05-10",
    purchasePrice: 99.99,
    currentValue: 75.0,
    checkedOutTo: null,
    notes: "Standard vocal microphone",
  },
  {
    id: "EQ-1002",
    name: "QSC K12.2 Speaker",
    category: "Audio",
    status: "In Use",
    condition: "Excellent",
    lastMaintenance: "2023-11-20",
    nextMaintenance: "2024-05-20",
    location: "Main Stage",
    purchaseDate: "2022-01-15",
    purchasePrice: 799.99,
    currentValue: 650.0,
    checkedOutTo: "John Smith",
    notes: "12-inch powered speaker",
  },
  {
    id: "EQ-1003",
    name: "Behringer X32 Mixer",
    category: "Audio",
    status: "Maintenance",
    condition: "Fair",
    lastMaintenance: "2023-12-05",
    nextMaintenance: "2024-03-05",
    location: "Repair Shop",
    purchaseDate: "2021-08-22",
    purchasePrice: 1499.99,
    currentValue: 1100.0,
    checkedOutTo: null,
    notes: "Channel 5 and 6 need repair",
  },
  {
    id: "EQ-1004",
    name: "Chauvet Intimidator Spot 375Z",
    category: "Lighting",
    status: "Available",
    condition: "Good",
    lastMaintenance: "2023-09-10",
    nextMaintenance: "2024-03-10",
    location: "Storage Room B",
    purchaseDate: "2022-03-15",
    purchasePrice: 599.99,
    currentValue: 450.0,
    checkedOutTo: null,
    notes: "Moving head light",
  },
  {
    id: "EQ-1005",
    name: "Yamaha DXR12 Speaker",
    category: "Audio",
    status: "In Use",
    condition: "Good",
    lastMaintenance: "2023-10-25",
    nextMaintenance: "2024-04-25",
    location: "Side Stage",
    purchaseDate: "2022-02-18",
    purchasePrice: 699.99,
    currentValue: 550.0,
    checkedOutTo: "Sarah Johnson",
    notes: "12-inch powered speaker",
  },
  {
    id: "EQ-1006",
    name: "ADJ Mega Par Profile",
    category: "Lighting",
    status: "Available",
    condition: "Excellent",
    lastMaintenance: "2023-11-05",
    nextMaintenance: "2024-05-05",
    location: "Storage Room B",
    purchaseDate: "2022-07-20",
    purchasePrice: 89.99,
    currentValue: 70.0,
    checkedOutTo: null,
    notes: "LED par can",
  },
  {
    id: "EQ-1007",
    name: "Sennheiser EW 100 G4 Wireless System",
    category: "Audio",
    status: "In Use",
    condition: "Good",
    lastMaintenance: "2023-12-15",
    nextMaintenance: "2024-06-15",
    location: "Main Stage",
    purchaseDate: "2022-04-10",
    purchasePrice: 599.99,
    currentValue: 500.0,
    checkedOutTo: "Mike Wilson",
    notes: "Wireless microphone system",
  },
  {
    id: "EQ-1008",
    name: "Mackie ProFX12v3 Mixer",
    category: "Audio",
    status: "Available",
    condition: "Good",
    lastMaintenance: "2023-08-20",
    nextMaintenance: "2024-02-20",
    location: "Storage Room A",
    purchaseDate: "2022-06-15",
    purchasePrice: 299.99,
    currentValue: 250.0,
    checkedOutTo: null,
    notes: "12-channel mixer",
  },
]

// Mock data for maintenance records
const maintenanceRecords = [
  {
    id: "M-1001",
    equipmentId: "EQ-1001",
    equipmentName: "Shure SM58 Microphone",
    date: "2023-10-15",
    type: "Routine",
    technician: "David Miller",
    cost: 25.0,
    notes: "Cleaned and tested, working properly",
  },
  {
    id: "M-1002",
    equipmentId: "EQ-1002",
    equipmentName: "QSC K12.2 Speaker",
    date: "2023-11-20",
    type: "Routine",
    technician: "David Miller",
    cost: 50.0,
    notes: "Firmware updated, all functions tested",
  },
  {
    id: "M-1003",
    equipmentId: "EQ-1003",
    equipmentName: "Behringer X32 Mixer",
    date: "2023-12-05",
    type: "Repair",
    technician: "Sarah Johnson",
    cost: 150.0,
    notes: "Replaced faders on channels 5 and 6, still needs additional work",
  },
]

// Mock data for rental/checkout history
const checkoutHistory = [
  {
    id: "C-1001",
    equipmentId: "EQ-1002",
    equipmentName: "QSC K12.2 Speaker",
    checkedOutBy: "John Smith",
    checkedOutDate: "2023-12-10",
    expectedReturnDate: "2023-12-15",
    actualReturnDate: null,
    status: "Checked Out",
    notes: "For use at the Holiday Concert",
  },
  {
    id: "C-1002",
    equipmentId: "EQ-1005",
    equipmentName: "Yamaha DXR12 Speaker",
    checkedOutBy: "Sarah Johnson",
    checkedOutDate: "2023-12-08",
    expectedReturnDate: "2023-12-12",
    actualReturnDate: null,
    status: "Checked Out",
    notes: "For use at the Corporate Event",
  },
  {
    id: "C-1003",
    equipmentId: "EQ-1007",
    equipmentName: "Sennheiser EW 100 G4 Wireless System",
    checkedOutBy: "Mike Wilson",
    checkedOutDate: "2023-12-09",
    expectedReturnDate: "2023-12-11",
    actualReturnDate: null,
    status: "Checked Out",
    notes: "For use at the Theater Production",
  },
  {
    id: "C-1004",
    equipmentId: "EQ-1001",
    equipmentName: "Shure SM58 Microphone",
    checkedOutBy: "Lisa Brown",
    checkedOutDate: "2023-11-20",
    expectedReturnDate: "2023-11-25",
    actualReturnDate: "2023-11-24",
    status: "Returned",
    notes: "Returned in good condition",
  },
]

export function EquipmentManagement() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false)
  const [isQrGeneratorOpen, setIsQrGeneratorOpen] = useState(false)
  const [selectedEquipmentOld, setSelectedEquipmentOld] = useState<any>(null)

  // Filter equipment based on search query, category, and status
  const filteredEquipment = equipmentData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Handle equipment selection for batch actions
  const toggleEquipmentSelection = (equipmentId: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipmentId) ? prev.filter((id) => id !== equipmentId) : [...prev, equipmentId],
    )
  }

  // Handle select all equipment
  const toggleSelectAll = (equipment: any[]) => {
    if (selectedEquipment.length === equipment.length) {
      setSelectedEquipment([])
    } else {
      setSelectedEquipment(equipment.map((item) => item.id))
    }
  }

  // Handle batch actions
  const handleBatchAction = (action: string) => {
    toast({
      title: `${action} Equipment`,
      description: `${action} action performed on ${selectedEquipment.length} items`,
    })
    setSelectedEquipment([])
  }

  // Handle navigation
  const handleNavigation = (path: string) => {
    toast({
      title: "Navigating",
      description: `Going to ${path}`,
    })
    router.push(path)
  }

  // Handle actions
  const handleAction = (action: string, item?: any) => {
    toast({
      title: action,
      description: item ? `${action} for ${item.name}` : `${action} action would be performed here`,
    })
    if (action === "View QR Code" && item) {
      setSelectedItem(item)
      setIsQrDialogOpen(true)
    }
  }

  // Status badge color mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return <Badge className="bg-green-600">{status}</Badge>
      case "In Use":
        return <Badge className="bg-blue-600">{status}</Badge>
      case "Maintenance":
        return <Badge className="bg-yellow-600">{status}</Badge>
      case "Out of Order":
        return <Badge className="bg-red-600">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleQrScanComplete = (equipmentId: string, action: "check-in" | "check-out", notes?: string) => {
    // In a real implementation, this would update the equipment status in the database
    toast({
      title: `Equipment ${action === "check-out" ? "Checked Out" : "Checked In"}`,
      description: `Equipment ID: ${equipmentId} has been ${action === "check-out" ? "checked out" : "checked in"}${notes ? ` with notes: ${notes}` : ""}`,
    })
  }

  const handleGenerateQrCode = (equipment: any) => {
    setSelectedEquipmentOld(equipment)
    setIsQrGeneratorOpen(true)
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search equipment..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Audio">Audio</SelectItem>
                <SelectItem value="Lighting">Lighting</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Instruments">Instruments</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Out of Order">Out of Order</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="shrink-0" onClick={() => handleAction("Advanced Filters")}>
              <Filter className="mr-2 h-4 w-4" /> More Filters
            </Button>
          </div>

          {selectedEquipment.length > 0 && (
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
              <p className="text-sm font-medium">
                {selectedEquipment.length} item{selectedEquipment.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("Export")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("Print")}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("Generate QR Codes")}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Codes
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBatchAction("Delete")}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedEquipment.length === filteredEquipment.length && filteredEquipment.length > 0}
                        onChange={() => toggleSelectAll(filteredEquipment)}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No equipment found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedEquipment.includes(item.id)}
                          onChange={() => toggleEquipmentSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Last maintained: {formatSafeDate(item.lastMaintenance)}
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{item.condition}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleNavigation(`/equipment/${item.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNavigation(`/equipment/${item.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("View QR Code", item)}>
                              <QrCode className="mr-2 h-4 w-4" /> View QR Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction("Schedule Maintenance", item)}>
                              <Calendar className="mr-2 h-4 w-4" /> Schedule Maintenance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("Update Status", item)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Update Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleAction("Delete Equipment", item)}
                            >
                              <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Maintenance Schedule</h2>
            <Button onClick={() => handleNavigation("/equipment/maintenance/schedule")}>
              <Plus className="mr-2 h-4 w-4" /> Schedule Maintenance
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Maintenance</CardTitle>
              <CardDescription>Equipment scheduled for maintenance in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {i === 1
                            ? "Shure SM58 Microphone"
                            : i === 2
                              ? "QSC K12.2 Speaker"
                              : "Chauvet Intimidator Spot 375Z"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Scheduled: {formatSafeDate(new Date(2025, 3, 15 + i * 5).toISOString())}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAction("Reschedule Maintenance")}>
                        Reschedule
                      </Button>
                      <Button size="sm" onClick={() => handleAction("Complete Maintenance")}>
                        Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => handleNavigation("/equipment/maintenance")}>
                View All Maintenance Records
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="rentals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Equipment Rentals</h2>
            <Button onClick={() => handleNavigation("/equipment/rentals/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Rental
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Rentals</CardTitle>
              <CardDescription>Currently rented equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{i === 1 ? "Allen & Heath SQ-5 Mixer" : "ADJ Mega Bar RGBA (x4)"}</p>
                        <p className="text-sm text-muted-foreground">
                          Rented to: {i === 1 ? "Local Music Festival" : "Corporate Event"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Return due: {formatSafeDate(new Date(2025, 3, 20 + i * 3).toISOString())}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAction("Extend Rental")}>
                        Extend
                      </Button>
                      <Button size="sm" onClick={() => handleAction("Return Equipment")}>
                        Return
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => handleNavigation("/equipment/rentals")}>
                View All Rental Records
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Equipment Reports</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleAction("Generate Custom Report")}>
                <FileText className="mr-2 h-4 w-4" /> Custom Report
              </Button>
              <Button variant="outline" onClick={() => handleAction("Export Reports")}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border rounded-md">
                  <div className="flex flex-col items-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Status distribution chart</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNavigation("/equipment/reports/status")}
                  >
                    View Details
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => handleAction("Download Status Report")}>
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border rounded-md">
                  <div className="flex flex-col items-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Maintenance history chart</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNavigation("/equipment/reports/maintenance")}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAction("Download Maintenance Report")}
                  >
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equipment QR Code</DialogTitle>
            <DialogDescription>
              {selectedItem ? `QR Code for ${selectedItem.name} (${selectedItem.id})` : "Equipment QR Code"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="h-48 w-48 border-2 rounded-md flex items-center justify-center">
              <QrCode className="h-32 w-32 text-primary" />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Scan this QR code to quickly access equipment details and update status
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAction("Print QR Code")}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => handleAction("Download QR Code")}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button onClick={() => setIsQrDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
            <DialogDescription>Enter the details for the new equipment item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Equipment Name
                </label>
                <Input id="name" placeholder="Enter equipment name" />
              </div>
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Lighting">Lighting</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Instruments">Instruments</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select defaultValue="Available">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Out of Order">Out of Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="condition" className="text-sm font-medium">
                  Condition
                </label>
                <Select defaultValue="Good">
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <Input id="location" placeholder="Enter storage location" />
              </div>
              <div className="space-y-2">
                <label htmlFor="purchaseDate" className="text-sm font-medium">
                  Purchase Date
                </label>
                <Input id="purchaseDate" type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="purchasePrice" className="text-sm font-medium">
                  Purchase Price
                </label>
                <Input id="purchasePrice" placeholder="0.00" type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <label htmlFor="nextMaintenance" className="text-sm font-medium">
                  Next Maintenance Date
                </label>
                <Input id="nextMaintenance" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                placeholder="Enter any additional notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEquipmentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Equipment Added",
                  description: "New equipment has been added to inventory",
                })
                setIsAddEquipmentOpen(false)
              }}
            >
              Add Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
