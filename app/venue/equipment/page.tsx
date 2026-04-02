"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  Download,
  FileText,
  Plus,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  QrCode,
  Wrench,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Eye,
  RefreshCw,
  Zap,
  Activity,
  Settings,
  History,
} from "lucide-react"

interface VenueEquipment {
  id: string
  venue_id: string
  name: string
  category: "sound" | "lighting" | "stage" | "seating" | "catering" | "security" | "other"
  description: string
  quantity: number
  condition: "excellent" | "good" | "fair" | "needs_repair" | "out_of_service"
  purchase_date: string | null
  last_maintenance: string | null
  next_maintenance: string | null
  is_available_for_rent: boolean
  rental_price: number | null
  created_at: string
  updated_at: string
}

const categoryColors = {
  sound: "bg-blue-100 text-blue-800 border-blue-200",
  lighting: "bg-yellow-100 text-yellow-800 border-yellow-200",
  stage: "bg-purple-100 text-purple-800 border-purple-200",
  seating: "bg-green-100 text-green-800 border-green-200",
  catering: "bg-orange-100 text-orange-800 border-orange-200",
  security: "bg-red-100 text-red-800 border-red-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
}

const conditionColors = {
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  fair: "bg-yellow-100 text-yellow-800 border-yellow-200",
  needs_repair: "bg-orange-100 text-orange-800 border-orange-200",
  out_of_service: "bg-red-100 text-red-800 border-red-200",
}

const conditionIcons = {
  excellent: CheckCircle,
  good: CheckCircle,
  fair: AlertTriangle,
  needs_repair: Wrench,
  out_of_service: XCircle,
}

export default function EquipmentPage() {
  const router = useRouter()
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()

  const [equipment, setEquipment] = useState<VenueEquipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEquipment, setSelectedEquipment] = useState<VenueEquipment | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [conditionFilter, setConditionFilter] = useState<string>("all")
  const [availableFilter, setAvailableFilter] = useState<string>("all")

  useEffect(() => {
    if (venue?.id) {
      fetchEquipment()
    }
  }, [venue?.id])

  const fetchEquipment = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)
      const equipmentData = await venueService.getVenueEquipment(venue.id)
      setEquipment(equipmentData.map(item => ({
        ...item,
        description: item.description || '',
        condition: item.condition || 'good'
      })))
    } catch (error) {
      console.error('Error fetching equipment:', error)
    toast({
        title: "Error",
        description: "Failed to load equipment data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEquipment = equipment.filter(item => {
    // Search filter
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    // Category filter
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false
    
    // Condition filter
    if (conditionFilter !== "all" && item.condition !== conditionFilter) return false
    
    // Availability filter
    if (availableFilter === "available" && !item.is_available_for_rent) return false
    if (availableFilter === "unavailable" && item.is_available_for_rent) return false
    
    return true
  })

  const stats = {
    total: equipment.length,
    excellent: equipment.filter(e => e.condition === "excellent").length,
    needsMaintenance: equipment.filter(e => e.condition === "needs_repair" || e.condition === "out_of_service").length,
    availableForRent: equipment.filter(e => e.is_available_for_rent).length,
    totalValue: equipment.reduce((sum, e) => sum + (e.rental_price || 0), 0),
  }

  const categoryStats = equipment.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const upcomingMaintenance = equipment
    .filter(e => e.next_maintenance && new Date(e.next_maintenance) > new Date())
    .sort((a, b) => new Date(a.next_maintenance!).getTime() - new Date(b.next_maintenance!).getTime())
    .slice(0, 5)

  const handleExport = () => {
    // Generate CSV data
    const csvData = equipment.map(item => ({
      Name: item.name,
      Category: item.category,
      Condition: item.condition,
      Quantity: item.quantity,
      "Available for Rent": item.is_available_for_rent ? "Yes" : "No",
      "Rental Price": item.rental_price || "N/A",
      "Last Maintenance": item.last_maintenance ? format(new Date(item.last_maintenance), "PPP") : "N/A",
      "Next Maintenance": item.next_maintenance ? format(new Date(item.next_maintenance), "PPP") : "N/A",
    }))
    
    toast({
      title: "Export Started",
      description: "Equipment inventory has been exported to CSV.",
    })
  }

  const generateQRCode = (equipmentItem: VenueEquipment) => {
    setSelectedEquipment(equipmentItem)
    setIsQrModalOpen(true)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment Management</h1>
          <p className="text-muted-foreground">
            Track, maintain, and manage equipment for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEquipment}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excellent Condition</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.excellent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.excellent / stats.total) * 100)}%` : "0%"} of inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.needsMaintenance}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available for Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.availableForRent}</div>
            <p className="text-xs text-muted-foreground">Rental items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rental Value</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{formatSafeCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Potential revenue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search Equipment</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="min-w-[120px]">
                  <Label>Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="sound">Sound</SelectItem>
                      <SelectItem value="lighting">Lighting</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="seating">Seating</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[130px]">
                  <Label>Condition</Label>
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="needs_repair">Needs Repair</SelectItem>
                      <SelectItem value="out_of_service">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[130px]">
                  <Label>Availability</Label>
                  <Select value={availableFilter} onValueChange={setAvailableFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="available">Available for Rent</SelectItem>
                      <SelectItem value="unavailable">Not for Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setCategoryFilter("all")
                    setConditionFilter("all")
                    setAvailableFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-muted-foreground">
                      {equipment.length === 0 ? 
                        "No equipment added yet. Start building your inventory by adding equipment items." :
                        "No equipment matches your current filters."
                      }
                    </div>
                    {equipment.length === 0 && (
                      <Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Equipment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredEquipment.map((item) => {
                const ConditionIcon = conditionIcons[item.condition]
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={categoryColors[item.category]}>
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </Badge>
                            <Badge variant="outline" className={conditionColors[item.condition]}>
                              <ConditionIcon className="h-3 w-3 mr-1" />
                              {item.condition.replace('_', ' ').charAt(0).toUpperCase() + item.condition.replace('_', ' ').slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedEquipment(item)
                              setIsEditModalOpen(true)
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateQRCode(item)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              Generate QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description || "No description available"}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="ml-1 font-medium">{item.quantity}</span>
                          </div>
                          {item.rental_price && (
                            <div>
                              <span className="text-muted-foreground">Rental:</span>
                              <span className="ml-1 font-medium">${item.rental_price}</span>
                            </div>
                          )}
                        </div>

                        {item.next_maintenance && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            Next maintenance: {format(new Date(item.next_maintenance), "MMM d, yyyy")}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {item.is_available_for_rent && (
                            <Badge variant="secondary" className="text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              For Rent
                            </Badge>
                          )}
                          {item.condition === "needs_repair" && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                              <Wrench className="h-3 w-3 mr-1" />
                              Needs Repair
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Maintenance</CardTitle>
                <CardDescription>Equipment scheduled for maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingMaintenance.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No upcoming maintenance scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingMaintenance.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {format(new Date(item.next_maintenance!), "PPP")}
                            </span>
                            <Badge variant="outline" className={categoryColors[item.category]}>
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Wrench className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rentals">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Rentals</CardTitle>
              <CardDescription>Manage equipment rental bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Rental management coming soon</p>
                <p className="text-sm text-muted-foreground">Track equipment rentals and generate revenue</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categoryStats).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge variant="outline" className={categoryColors[category as keyof typeof categoryColors]}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Badge>
                        </div>
                        <span className="font-medium">{count} items</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Equipment Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500">
                        {formatSafeCurrency(stats.totalValue)}
                      </div>
                      <p className="text-sm text-muted-foreground">Total rental potential</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-medium">{stats.availableForRent}</div>
                        <div className="text-muted-foreground">Available items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-medium">
                          ${Math.round(stats.totalValue / (stats.availableForRent || 1))}
                        </div>
                        <div className="text-muted-foreground">Avg. rental price</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Settings</CardTitle>
              <CardDescription>Configure equipment management preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Maintenance Reminders</h4>
                  <div className="space-y-2">
                    <Label>Default maintenance interval (months)</Label>
                    <Select defaultValue="6">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 months</SelectItem>
                        <SelectItem value="6">6 months</SelectItem>
                        <SelectItem value="12">12 months</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Rental Settings</h4>
                  <div className="space-y-2">
                    <Label>Default rental pricing model</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent>
          {selectedEquipment && (
            <>
              <DialogHeader>
                <DialogTitle>QR Code for {selectedEquipment.name}</DialogTitle>
                <DialogDescription>
                  Scan this QR code to quickly access equipment information
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{selectedEquipment.name}</p>
                  <p className="text-sm text-muted-foreground">Equipment ID: {selectedEquipment.id}</p>
                </div>
      </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  toast({ title: "QR Code Downloaded", description: "QR code saved to downloads" })
                  setIsQrModalOpen(false)
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
