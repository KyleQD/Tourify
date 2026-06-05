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
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Volume2, 
  Zap, 
  Sun, 
  Square, 
  Battery, 
  Home, 
  Truck, 
  Shield, 
  Sparkles,
  Sliders,
  Mic,
  Lightbulb,
  Layers,
  Cloud,
  Plug,
  Umbrella,
  User,
  Users,
  Flame,
  Snowflake,
  Flag,
  Package,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Settings
} from "lucide-react"
import type { EquipmentCatalog, EquipmentSymbol } from "@/types/site-map"
import { EQUIPMENT_SYMBOLS } from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"

interface EquipmentCatalogProps {
  siteMapId: string
  onEquipmentSelect?: (equipment: EquipmentCatalog) => void
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  isDragMode?: boolean
  onDragStart?: (equipment: EquipmentCatalog, event: React.DragEvent) => void
}

export function EquipmentCatalog({
  siteMapId,
  onEquipmentSelect,
  selectedCategory,
  onCategoryChange,
  isDragMode = false,
  onDragStart
}: EquipmentCatalogProps) {
  const { toast } = useToast()
  const [equipmentCatalog, setEquipmentCatalog] = useState<EquipmentCatalog[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCatalog | null>(null)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    category: 'sound' as EquipmentCatalog['category'],
    subcategory: '',
    model: '',
    manufacturer: '',
    weight: 0,
    powerConsumption: 0,
    voltageRequirements: '',
    symbolType: 'rectangle' as EquipmentCatalog['symbolType'],
    symbolColor: '#3b82f6',
    symbolSize: 40,
    iconName: '',
    isPortable: true,
    requiresSetup: false,
    setupTimeMinutes: 0,
    requiresPower: false,
    requiresWater: false,
    requiresInternet: false,
    weatherResistant: false,
    dailyRate: 0,
    weeklyRate: 0,
    securityDeposit: 0,
    description: '',
    setupInstructions: '',
    imageUrl: ''
  })

  // Load equipment catalog on mount
  useEffect(() => {
    loadEquipmentCatalog()
  }, [])

  const loadEquipmentCatalog = async () => {
    setIsLoading(true)
    try {
      // Try real API first
      const res = await fetch('/api/admin/logistics/equipment/catalog', { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        const items = d.catalog || d.data || d.items || []
        if (items.length > 0) {
          setEquipmentCatalog(items)
          setIsLoading(false)
          return
        }
      }

      // Fallback to EQUIPMENT_SYMBOLS for display until catalog is seeded
      const mockCatalog: EquipmentCatalog[] = EQUIPMENT_SYMBOLS.map(symbol => ({
        id: symbol.id,
        name: symbol.name,
        category: symbol.category as EquipmentCatalog['category'],
        symbolType: symbol.symbolType,
        symbolColor: symbol.defaultColor,
        symbolSize: symbol.defaultSize,
        iconName: symbol.iconName,
        isPortable: true,
        requiresSetup: symbol.category === 'stage' || symbol.category === 'power',
        setupTimeMinutes: symbol.category === 'stage' ? 30 : symbol.category === 'power' ? 15 : 5,
        requiresPower: ['sound', 'lighting', 'stage', 'power'].includes(symbol.category),
        requiresWater: symbol.category === 'catering',
        requiresInternet: symbol.category === 'sound' || symbol.category === 'lighting',
        weatherResistant: ['tent', 'security', 'transportation'].includes(symbol.category),
        availabilityStatus: 'available',
        dailyRate: symbol.category === 'stage' ? 150 : symbol.category === 'power' ? 100 : 50,
        weeklyRate: symbol.category === 'stage' ? 800 : symbol.category === 'power' ? 500 : 250,
        description: `${symbol.name} for festival and event use`,
        setupInstructions: `Setup instructions for ${symbol.name}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      setEquipmentCatalog(mockCatalog)
    } catch (error) {
      console.error('Error loading equipment catalog:', error)
      toast({
        title: "Error",
        description: "Failed to load equipment catalog",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createEquipment = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Equipment name is required",
        variant: "destructive"
      })
      return
    }

    try {
      const newEquipment: EquipmentCatalog = {
        id: Date.now().toString(),
        ...createForm,
        availabilityStatus: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setEquipmentCatalog(prev => [newEquipment, ...prev])
      setShowCreateDialog(false)
      setCreateForm({
        name: '',
        category: 'sound',
        subcategory: '',
        model: '',
        manufacturer: '',
        weight: 0,
        powerConsumption: 0,
        voltageRequirements: '',
        symbolType: 'rectangle',
        symbolColor: '#3b82f6',
        symbolSize: 40,
        iconName: '',
        isPortable: true,
        requiresSetup: false,
        setupTimeMinutes: 0,
        requiresPower: false,
        requiresWater: false,
        requiresInternet: false,
        weatherResistant: false,
        dailyRate: 0,
        weeklyRate: 0,
        securityDeposit: 0,
        description: '',
        setupInstructions: '',
        imageUrl: ''
      })

      toast({
        title: "Success",
        description: "Equipment added to catalog"
      })
    } catch (error) {
      console.error('Error creating equipment:', error)
      toast({
        title: "Error",
        description: "Failed to create equipment",
        variant: "destructive"
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sound': return <Volume2 className="h-4 w-4" />
      case 'lighting': return <Sun className="h-4 w-4" />
      case 'stage': return <Square className="h-4 w-4" />
      case 'power': return <Battery className="h-4 w-4" />
      case 'tent': return <Home className="h-4 w-4" />
      case 'furniture': return <Users className="h-4 w-4" />
      case 'catering': return <Flame className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'transportation': return <Truck className="h-4 w-4" />
      case 'decor': return <Sparkles className="h-4 w-4" />
      default: return <Square className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sound': return 'bg-blue-100 text-blue-800'
      case 'lighting': return 'bg-yellow-100 text-yellow-800'
      case 'stage': return 'bg-gray-100 text-gray-800'
      case 'power': return 'bg-green-100 text-green-800'
      case 'tent': return 'bg-indigo-100 text-indigo-800'
      case 'furniture': return 'bg-orange-100 text-orange-800'
      case 'catering': return 'bg-red-100 text-red-800'
      case 'security': return 'bg-slate-100 text-slate-800'
      case 'transportation': return 'bg-purple-100 text-purple-800'
      case 'decor': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEquipmentIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'volume-2': Volume2,
      'zap': Zap,
      'sliders': Sliders,
      'mic': Mic,
      'sun': Sun,
      'lightbulb': Lightbulb,
      'layers': Layers,
      'cloud': Cloud,
      'square': Square,
      'battery': Battery,
      'plug': Plug,
      'home': Home,
      'umbrella': Umbrella,
      'user': User,
      'users': Users,
      'truck': Truck,
      'flame': Flame,
      'snowflake': Snowflake,
      'shield': Shield,
      'minus': Square,
      'package': Package,
      'flag': Flag,
      'sparkles': Sparkles
    }
    
    const IconComponent = iconMap[iconName] || Square
    return <IconComponent className="h-4 w-4" />
  }

  const filteredEquipment = equipmentCatalog.filter(equipment => {
    const matchesSearch = searchQuery === '' || 
      equipment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      equipment.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      equipment.model?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || equipment.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(equipmentCatalog.map(eq => eq.category)))

  const handleEquipmentClick = (equipment: EquipmentCatalog) => {
    setSelectedEquipment(equipment)
    onEquipmentSelect?.(equipment)
  }

  const handleDragStart = (equipment: EquipmentCatalog, event: React.DragEvent) => {
    if (!isDragMode) return
    
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'equipment',
      equipment: equipment
    }))
    
    event.dataTransfer.effectAllowed = 'copy'
    onDragStart?.(equipment, event)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading equipment catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment Catalog</h3>
          <p className="text-sm text-gray-600">
            {filteredEquipment.length} equipment items
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Equipment to Catalog</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Equipment Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter equipment name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={createForm.category} onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sound">Sound</SelectItem>
                        <SelectItem value="lighting">Lighting</SelectItem>
                        <SelectItem value="stage">Stage</SelectItem>
                        <SelectItem value="power">Power</SelectItem>
                        <SelectItem value="tent">Tent</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="decor">Decor</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={createForm.model}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Model number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={createForm.manufacturer}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="Manufacturer"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={createForm.weight}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="powerConsumption">Power Consumption (W)</Label>
                    <Input
                      id="powerConsumption"
                      type="number"
                      value={createForm.powerConsumption}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, powerConsumption: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="voltageRequirements">Voltage Requirements</Label>
                    <Input
                      id="voltageRequirements"
                      value={createForm.voltageRequirements}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, voltageRequirements: e.target.value }))}
                      placeholder="110V, 220V, etc."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="symbolType">Symbol Type</Label>
                    <Select value={createForm.symbolType} onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, symbolType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="triangle">Triangle</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="symbolColor">Symbol Color</Label>
                    <Input
                      id="symbolColor"
                      type="color"
                      value={createForm.symbolColor}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, symbolColor: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="symbolSize">Symbol Size</Label>
                    <Input
                      id="symbolSize"
                      type="number"
                      value={createForm.symbolSize}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, symbolSize: parseInt(e.target.value) || 40 }))}
                      placeholder="40"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Properties</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPortable"
                        checked={createForm.isPortable}
                        onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, isPortable: !!checked }))}
                      />
                      <Label htmlFor="isPortable" className="text-sm">Portable</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresSetup"
                        checked={createForm.requiresSetup}
                        onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, requiresSetup: !!checked }))}
                      />
                      <Label htmlFor="requiresSetup" className="text-sm">Requires Setup</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresPower"
                        checked={createForm.requiresPower}
                        onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, requiresPower: !!checked }))}
                      />
                      <Label htmlFor="requiresPower" className="text-sm">Requires Power</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="weatherResistant"
                        checked={createForm.weatherResistant}
                        onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, weatherResistant: !!checked }))}
                      />
                      <Label htmlFor="weatherResistant" className="text-sm">Weather Resistant</Label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Equipment description"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createEquipment}>
                    Add Equipment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedCategory || "all"} onValueChange={(value) => onCategoryChange?.(value === "all" ? "" : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Equipment Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredEquipment.map(equipment => (
            <Card
              key={equipment.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow ${
                isDragMode ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              onClick={() => handleEquipmentClick(equipment)}
              draggable={isDragMode}
              onDragStart={(e) => handleDragStart(equipment, e)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-2">
                  {/* Equipment Symbol */}
                  <div
                    className="flex items-center justify-center rounded-lg border-2"
                    style={{
                      width: equipment.symbolSize,
                      height: equipment.symbolSize,
                      backgroundColor: equipment.symbolColor,
                      borderColor: equipment.symbolColor
                    }}
                  >
                    {equipment.iconName && getEquipmentIcon(equipment.iconName)}
                  </div>
                  
                  {/* Equipment Info */}
                  <div className="text-center">
                    <h4 className="font-medium text-sm">{equipment.name}</h4>
                    <Badge className={`text-xs ${getCategoryColor(equipment.category)}`}>
                      {equipment.category}
                    </Badge>
                  </div>
                  
                  {/* Equipment Properties */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {equipment.requiresPower && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Requires Power" />
                    )}
                    {equipment.requiresSetup && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Requires Setup" />
                    )}
                    {equipment.weatherResistant && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Weather Resistant" />
                    )}
                  </div>
                  
                  {/* Pricing */}
                  {equipment.dailyRate && (
                    <div className="text-xs text-gray-600">
                      ${equipment.dailyRate}/day
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEquipment.map(equipment => (
            <Card
              key={equipment.id}
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                isDragMode ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              onClick={() => handleEquipmentClick(equipment)}
              draggable={isDragMode}
              onDragStart={(e) => handleDragStart(equipment, e)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="flex items-center justify-center rounded border"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: equipment.symbolColor
                      }}
                    >
                      {equipment.iconName && getEquipmentIcon(equipment.iconName)}
                    </div>
                    
                    <div>
                      <h4 className="font-medium">{equipment.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getCategoryColor(equipment.category)}`}>
                          {equipment.category}
                        </Badge>
                        {equipment.model && (
                          <span className="text-sm text-gray-600">{equipment.model}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {equipment.dailyRate && (
                      <div className="font-medium">${equipment.dailyRate}/day</div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {equipment.requiresPower && <Zap className="h-3 w-3" />}
                      {equipment.requiresSetup && <Settings className="h-3 w-3" />}
                      {equipment.weatherResistant && <Shield className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Equipment Details */}
      {selectedEquipment && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {selectedEquipment.iconName && getEquipmentIcon(selectedEquipment.iconName)}
                {selectedEquipment.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEquipment(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getCategoryColor(selectedEquipment.category)}>
                {selectedEquipment.category}
              </Badge>
              <Badge variant="outline">
                {selectedEquipment.availabilityStatus}
              </Badge>
            </div>
            
            {selectedEquipment.model && (
              <div className="text-sm">
                <span className="font-medium">Model:</span> {selectedEquipment.model}
              </div>
            )}
            
            {selectedEquipment.manufacturer && (
              <div className="text-sm">
                <span className="font-medium">Manufacturer:</span> {selectedEquipment.manufacturer}
              </div>
            )}
            
            {selectedEquipment.description && (
              <div className="text-sm">
                <span className="font-medium">Description:</span> {selectedEquipment.description}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Properties:</span>
                <ul className="mt-1 space-y-1">
                  {selectedEquipment.requiresPower && <li>• Requires Power</li>}
                  {selectedEquipment.requiresSetup && <li>• Requires Setup</li>}
                  {selectedEquipment.weatherResistant && <li>• Weather Resistant</li>}
                  {selectedEquipment.isPortable && <li>• Portable</li>}
                </ul>
              </div>
              
              <div>
                <span className="font-medium">Pricing:</span>
                <ul className="mt-1 space-y-1">
                  {selectedEquipment.dailyRate && <li>• Daily: ${selectedEquipment.dailyRate}</li>}
                  {selectedEquipment.weeklyRate && <li>• Weekly: ${selectedEquipment.weeklyRate}</li>}
                  {selectedEquipment.securityDeposit && <li>• Deposit: ${selectedEquipment.securityDeposit}</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
