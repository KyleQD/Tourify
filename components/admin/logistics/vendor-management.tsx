"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { formatSafeCurrency } from "@/lib/format/number-format"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Home, 
  Users, 
  Settings, 
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  Wifi,
  Droplets
} from "lucide-react"
import { GlampingTent, SiteMapZone } from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"

interface VendorManagementProps {
  siteMapId: string
  eventId?: string
  tourId?: string
}

interface TentTemplate {
  id: string
  name: string
  tentType: GlampingTent['tentType']
  capacity: number
  sizeCategory: GlampingTent['sizeCategory']
  basePrice: number
  amenities: {
    hasPower: boolean
    hasHeating: boolean
    hasCooling: boolean
    hasPrivateBathroom: boolean
    hasWifi: boolean
  }
  description: string
  imageUrl?: string
}

interface Vendor {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  company: string
  rating: number
  specializations: string[]
  tentTemplates: TentTemplate[]
  isActive: boolean
}

export function VendorManagement({ 
  siteMapId, 
  eventId, 
  tourId 
}: VendorManagementProps) {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [tents, setTents] = useState<GlampingTent[]>([])
  const [zones, setZones] = useState<SiteMapZone[]>([])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [selectedTent, setSelectedTent] = useState<GlampingTent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateVendor, setShowCreateVendor] = useState(false)
  const [showCreateTent, setShowCreateTent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied" | "maintenance">("all")
  const [filterVendor, setFilterVendor] = useState<string>("all")

  // Form states
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    company: '',
    rating: 5,
    specializations: [] as string[],
    isActive: true
  })

  const [tentForm, setTentForm] = useState({
    tentNumber: '',
    tentType: 'bell_tent' as GlampingTent['tentType'],
    capacity: 4,
    sizeCategory: '4T' as GlampingTent['sizeCategory'],
    zoneId: '',
    hasPower: false,
    hasHeating: false,
    hasCooling: false,
    hasPrivateBathroom: false,
    hasWifi: false,
    basePrice: 0,
    currentPrice: 0,
    specialRequirements: ''
  })

  useEffect(() => {
    loadData()
  }, [siteMapId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load site map data
      const [siteMapResponse, vendorsResponse] = await Promise.all([
        fetch(`/api/admin/logistics/site-maps/${siteMapId}`),
        fetch('/api/admin/logistics/vendors') // This would need to be implemented
      ])

      const siteMapData = await siteMapResponse.json()
      if (siteMapData.success) {
        setTents(siteMapData.data.tents || [])
        setZones(siteMapData.data.zones || [])
      }

      // Mock vendors data for now
      const mockVendors: Vendor[] = [
        {
          id: '1',
          name: 'Luxury Glamping Co.',
          contactName: 'John Smith',
          email: 'john@luxuryglamping.com',
          phone: '+1 (555) 123-4567',
          company: 'Luxury Glamping Co.',
          rating: 4.8,
          specializations: ['bell_tent', 'safari_tent', 'yurt'],
          tentTemplates: [
            {
              id: '1',
              name: 'Deluxe Bell Tent',
              tentType: 'bell_tent',
              capacity: 4,
              sizeCategory: '4T',
              basePrice: 150,
              amenities: {
                hasPower: true,
                hasHeating: true,
                hasCooling: false,
                hasPrivateBathroom: false,
                hasWifi: true
              },
              description: 'Spacious bell tent with power and heating'
            }
          ],
          isActive: true
        },
        {
          id: '2',
          name: 'Festival Tents Pro',
          contactName: 'Sarah Johnson',
          email: 'sarah@festivaltents.com',
          phone: '+1 (555) 987-6543',
          company: 'Festival Tents Pro',
          rating: 4.5,
          specializations: ['tipi', 'dome', 'custom'],
          tentTemplates: [
            {
              id: '2',
              name: 'Premium Tipi',
              tentType: 'tipi',
              capacity: 6,
              sizeCategory: '6P',
              basePrice: 200,
              amenities: {
                hasPower: true,
                hasHeating: true,
                hasCooling: true,
                hasPrivateBathroom: true,
                hasWifi: true
              },
              description: 'Luxury tipi with all amenities'
            }
          ],
          isActive: true
        }
      ]
      setVendors(mockVendors)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load vendor data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createVendor = async () => {
    try {
      const newVendor: Vendor = {
        id: Date.now().toString(),
        ...vendorForm,
        tentTemplates: []
      }
      
      setVendors(prev => [...prev, newVendor])
      setShowCreateVendor(false)
      setVendorForm({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        company: '',
        rating: 5,
        specializations: [],
        isActive: true
      })
      
      toast({
        title: "Success",
        description: "Vendor created successfully"
      })
    } catch (error) {
      console.error('Error creating vendor:', error)
      toast({
        title: "Error",
        description: "Failed to create vendor",
        variant: "destructive"
      })
    }
  }

  const createTent = async () => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tentForm)
      })

      const data = await response.json()
      if (data.success) {
        setTents(prev => [...prev, data.data])
        setShowCreateTent(false)
        setTentForm({
          tentNumber: '',
          tentType: 'bell_tent',
          capacity: 4,
          sizeCategory: '4T',
          zoneId: '',
          hasPower: false,
          hasHeating: false,
          hasCooling: false,
          hasPrivateBathroom: false,
          hasWifi: false,
          basePrice: 0,
          currentPrice: 0,
          specialRequirements: ''
        })
        
        toast({
          title: "Success",
          description: "Tent created successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to create tent')
      }
    } catch (error) {
      console.error('Error creating tent:', error)
      toast({
        title: "Error",
        description: "Failed to create tent",
        variant: "destructive"
      })
    }
  }

  const updateTentStatus = async (tentId: string, status: GlampingTent['status']) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tents/${tentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      const data = await response.json()
      if (data.success) {
        setTents(prev => prev.map(tent => tent.id === tentId ? data.data : tent))
        toast({
          title: "Success",
          description: "Tent status updated successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to update tent')
      }
    } catch (error) {
      console.error('Error updating tent:', error)
      toast({
        title: "Error",
        description: "Failed to update tent status",
        variant: "destructive"
      })
    }
  }

  const filteredTents = tents.filter(tent => {
    const matchesSearch = searchQuery === '' || 
      tent.tentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tent.tentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tent.guestName?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || tent.status === filterStatus
    const matchesVendor = filterVendor === 'all' || true // Would need vendor association
    
    return matchesSearch && matchesStatus && matchesVendor
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'occupied': return 'bg-red-100 text-red-800'
      case 'reserved': return 'bg-yellow-100 text-yellow-800'
      case 'maintenance': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />
      case 'occupied': return <XCircle className="h-4 w-4" />
      case 'reserved': return <Clock className="h-4 w-4" />
      case 'maintenance': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Management</h2>
          <p className="text-gray-600">Manage glamping vendors and tent assignments</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showCreateVendor} onOpenChange={setShowCreateVendor}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendorName">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter vendor name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={vendorForm.contactName}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Enter contact name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={vendorForm.company}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateVendor(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createVendor}>
                    Add Vendor
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateTent} onOpenChange={setShowCreateTent}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Tent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tentNumber">Tent Number</Label>
                  <Input
                    id="tentNumber"
                    value={tentForm.tentNumber}
                    onChange={(e) => setTentForm(prev => ({ ...prev, tentNumber: e.target.value }))}
                    placeholder="Enter tent number"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tentType">Tent Type</Label>
                    <Select value={tentForm.tentType} onValueChange={(value: any) => setTentForm(prev => ({ ...prev, tentType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bell_tent">Bell Tent</SelectItem>
                        <SelectItem value="safari_tent">Safari Tent</SelectItem>
                        <SelectItem value="yurt">Yurt</SelectItem>
                        <SelectItem value="tipi">Tipi</SelectItem>
                        <SelectItem value="dome">Dome</SelectItem>
                        <SelectItem value="cabin">Cabin</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={tentForm.capacity}
                      onChange={(e) => setTentForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
                      placeholder="4"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="zone">Zone</Label>
                  <Select value={tentForm.zoneId} onValueChange={(value) => setTentForm(prev => ({ ...prev, zoneId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name} ({zone.zoneType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Amenities</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPower"
                        checked={tentForm.hasPower}
                        onCheckedChange={(checked) => setTentForm(prev => ({ ...prev, hasPower: !!checked }))}
                      />
                      <Label htmlFor="hasPower" className="text-sm">Power</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasWifi"
                        checked={tentForm.hasWifi}
                        onCheckedChange={(checked) => setTentForm(prev => ({ ...prev, hasWifi: !!checked }))}
                      />
                      <Label htmlFor="hasWifi" className="text-sm">WiFi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasHeating"
                        checked={tentForm.hasHeating}
                        onCheckedChange={(checked) => setTentForm(prev => ({ ...prev, hasHeating: !!checked }))}
                      />
                      <Label htmlFor="hasHeating" className="text-sm">Heating</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPrivateBathroom"
                        checked={tentForm.hasPrivateBathroom}
                        onCheckedChange={(checked) => setTentForm(prev => ({ ...prev, hasPrivateBathroom: !!checked }))}
                      />
                      <Label htmlFor="hasPrivateBathroom" className="text-sm">Private Bathroom</Label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      value={tentForm.basePrice}
                      onChange={(e) => setTentForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currentPrice">Current Price</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      value={tentForm.currentPrice}
                      onChange={(e) => setTentForm(prev => ({ ...prev, currentPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateTent(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTent}>
                    Add Tent
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tents">Tents ({tents.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tents" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTents.map(tent => (
              <Card key={tent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Tent {tent.tentNumber}</CardTitle>
                    <Badge className={getStatusColor(tent.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(tent.status)}
                        {tent.status}
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{tent.tentType.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{tent.capacity} people</span>
                  </div>
                  
                  {tent.guestName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Guest:</span>
                      <span className="font-medium">{tent.guestName}</span>
                    </div>
                  )}
                  
                  {tent.currentPrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-green-600">${tent.currentPrice}/night</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Amenities:</span>
                    <div className="flex gap-1">
                      {tent.hasPower && <Zap className="h-4 w-4 text-yellow-500" />}
                      {tent.hasWifi && <Wifi className="h-4 w-4 text-green-500" />}
                      {tent.hasPrivateBathroom && <Droplets className="h-4 w-4 text-blue-500" />}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTent(tent)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {tent.status === 'available' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTentStatus(tent.id, 'occupied')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Check In
                      </Button>
                    )}
                    
                    {tent.status === 'occupied' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTentStatus(tent.id, 'available')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map(vendor => (
              <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{vendor.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{vendor.contactName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{vendor.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{vendor.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{vendor.company}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Specializations:</span>
                    <div className="flex flex-wrap gap-1">
                      {vendor.specializations.map(spec => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Tents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tents.length}</div>
                <p className="text-xs text-gray-600">All tents in site map</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Occupancy Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tents.length > 0 ? Math.round((tents.filter(t => t.status === 'occupied').length / tents.length) * 100) : 0}%
                </div>
                <p className="text-xs text-gray-600">
                  {tents.filter(t => t.status === 'occupied').length} of {tents.length} occupied
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatSafeCurrency(tents.reduce((sum, tent) => sum + (tent.currentPrice || 0), 0))}
                </div>
                <p className="text-xs text-gray-600">From occupied tents</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
