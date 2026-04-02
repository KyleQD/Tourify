"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  MapPin, 
  Home, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Filter,
  List,
  Grid3X3,
  Phone,
  Mail,
  Clock,
  Users,
  Wifi,
  Zap,
  Droplets
} from "lucide-react"
import { SiteMap, SiteMapZone, GlampingTent } from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface MobileSiteMapViewerProps {
  siteMapId: string
  isReadOnly?: boolean
}

export function MobileSiteMapViewer({ 
  siteMapId, 
  isReadOnly = true 
}: MobileSiteMapViewerProps) {
  const { toast } = useToast()
  const [siteMap, setSiteMap] = useState<SiteMap | null>(null)
  const [selectedItem, setSelectedItem] = useState<SiteMapZone | GlampingTent | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "zones" | "tents">("all")
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [isLoading, setIsLoading] = useState(true)
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0
  })
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSiteMap()
  }, [siteMapId])

  const loadSiteMap = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}`)
      const data = await response.json()

      if (data.success) {
        setSiteMap(data.data)
        // Auto-fit to view on mobile
        setTimeout(() => fitToView(), 100)
      } else {
        throw new Error(data.error || 'Failed to load site map')
      }
    } catch (error) {
      console.error('Error loading site map:', error)
      toast({
        title: "Error",
        description: "Failed to load site map",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fitToView = () => {
    if (!canvasRef.current || !siteMap) return

    const container = canvasRef.current.parentElement
    if (!container) return

    const containerWidth = container.clientWidth - 20
    const containerHeight = container.clientHeight - 20
    
    const scaleX = containerWidth / siteMap.width
    const scaleY = containerHeight / siteMap.height
    const newScale = Math.min(scaleX, scaleY, 1)
    
    const centerX = (containerWidth - siteMap.width * newScale) / 2
    const centerY = (containerHeight - siteMap.height * newScale) / 2
    
    setTransform({
      scale: newScale,
      translateX: centerX,
      translateY: centerY
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setLastTouch({ x: touch.clientX, y: touch.clientY })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - lastTouch.x
      const deltaY = touch.clientY - lastTouch.y
      
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }))
      
      setLastTouch({ x: touch.clientX, y: touch.clientY })
    } else if (e.touches.length === 2) {
      // Handle pinch to zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // Simple zoom implementation
      const newScale = Math.max(0.5, Math.min(3, transform.scale * (distance / 200)))
      setTransform(prev => ({ ...prev, scale: newScale }))
    }
  }

  const zoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }))
  }

  const zoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale * 0.8)
    }))
  }

  const filteredItems = () => {
    if (!siteMap) return { zones: [], tents: [] }

    let zones = siteMap.zones || []
    let tents = siteMap.tents || []

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      zones = zones.filter(zone => 
        zone.name.toLowerCase().includes(query) ||
        zone.zoneType.toLowerCase().includes(query)
      )
      tents = tents.filter(tent => 
        tent.tentNumber.toLowerCase().includes(query) ||
        tent.tentType.toLowerCase().includes(query) ||
        tent.guestName?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType === "zones") tents = []
    if (filterType === "tents") zones = []

    return { zones, tents }
  }

  const getTentColor = (status: string): string => {
    switch (status) {
      case 'available': return '#10b981'
      case 'occupied': return '#ef4444'
      case 'reserved': return '#f59e0b'
      case 'maintenance': return '#6b7280'
      default: return '#e5e7eb'
    }
  }

  const getZoneColor = (zoneType: string): string => {
    switch (zoneType) {
      case 'glamping': return '#3b82f6'
      case 'parking': return '#6b7280'
      case 'vendor': return '#f59e0b'
      case 'food': return '#ef4444'
      case 'restroom': return '#8b5cf6'
      case 'utility': return '#10b981'
      case 'entrance': return '#06b6d4'
      case 'exit': return '#f97316'
      case 'stage': return '#ec4899'
      case 'medical': return '#ef4444'
      case 'security': return '#374151'
      case 'storage': return '#6b7280'
      default: return '#3b82f6'
    }
  }

  const renderMapView = () => {
    if (!siteMap) return null

    const { zones, tents } = filteredItems()

    return (
      <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="w-full h-full relative"
          style={{
            background: siteMap.backgroundColor,
            backgroundImage: siteMap.backgroundImageUrl ? `url(${siteMap.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Grid */}
          {siteMap.gridEnabled && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: `${siteMap.gridSize * transform.scale}px ${siteMap.gridSize * transform.scale}px`
              }}
            />
          )}

          {/* Zones */}
          {zones.map(zone => (
            <div
              key={zone.id}
              className="absolute cursor-pointer touch-none"
              style={{
                left: zone.x * transform.scale + transform.translateX,
                top: zone.y * transform.scale + transform.translateY,
                width: zone.width * transform.scale,
                height: zone.height * transform.scale,
                backgroundColor: getZoneColor(zone.zoneType),
                opacity: zone.opacity,
                border: `${zone.borderWidth}px solid ${zone.borderColor}`
              }}
              onClick={() => setSelectedItem(zone)}
            >
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-white text-center p-1">
                <div>
                  <div className="font-bold text-xs">{zone.name}</div>
                  <div className="text-xs opacity-75">{zone.zoneType}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Tents */}
          {tents.map(tent => (
            <div
              key={tent.id}
              className="absolute cursor-pointer touch-none"
              style={{
                left: tent.x * transform.scale + transform.translateX,
                top: tent.y * transform.scale + transform.translateY,
                width: tent.width * transform.scale,
                height: tent.height * transform.scale
              }}
              onClick={() => setSelectedItem(tent)}
            >
              <div
                className="w-full h-full border-2 rounded-lg flex items-center justify-center text-xs font-medium text-white text-center p-1"
                style={{
                  backgroundColor: getTentColor(tent.status),
                  borderColor: getTentColor(tent.status)
                }}
              >
                <div>
                  <div className="font-bold text-xs">{tent.tentNumber}</div>
                  <div className="text-xs opacity-75">{tent.capacity}P</div>
                </div>
              </div>
            </div>
          ))}

          {/* Canvas Boundary */}
          <div
            className="absolute border-2 border-dashed border-gray-400 pointer-events-none"
            style={{
              left: transform.translateX,
              top: transform.translateY,
              width: siteMap.width * transform.scale,
              height: siteMap.height * transform.scale
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-10 w-10 p-0"
            onClick={zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-10 w-10 p-0"
            onClick={zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-10 w-10 p-0"
            onClick={fitToView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const { zones, tents } = filteredItems()
    const allItems = [...zones, ...tents]

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allItems.map((item, index) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedItem(item)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: 'zoneType' in item 
                        ? getZoneColor(item.zoneType)
                        : getTentColor(item.status)
                    }}
                  />
                  <div>
                    <div className="font-medium text-sm">
                      {'zoneType' in item ? item.name : `Tent ${item.tentNumber}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {'zoneType' in item ? item.zoneType : `${item.tentType} - ${item.capacity}P`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    {'zoneType' in item ? item.status : item.status}
                  </Badge>
                  {!('zoneType' in item) && item.guestName && (
                    <div className="text-xs text-gray-600 mt-1">
                      {item.guestName}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {allItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No items found</p>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading site map...</p>
        </div>
      </div>
    )
  }

  if (!siteMap) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Site map not found</h3>
          <p className="text-gray-600 text-center">
            The requested site map could not be loaded
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{siteMap.name}</h3>
          <p className="text-sm text-gray-600">
            {siteMap.zones?.length || 0} zones • {siteMap.tents?.length || 0} tents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search zones, tents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All</option>
          <option value="zones">Zones</option>
          <option value="tents">Tents</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="h-96">
        {viewMode === "map" ? renderMapView() : renderListView()}
      </div>

      {/* Selected Item Details */}
      {selectedItem && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {'zoneType' in selectedItem ? selectedItem.name : `Tent ${selectedItem.tentNumber}`}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {('zoneType' in selectedItem) ? (
              // Zone details
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedItem.zoneType}</Badge>
                  <Badge variant="outline">{selectedItem.status}</Badge>
                </div>
                
                {selectedItem.capacity && (
                  <div className="text-sm">
                    <span className="font-medium">Capacity:</span> {selectedItem.currentOccupancy}/{selectedItem.capacity}
                  </div>
                )}
                
                {selectedItem.description && (
                  <div className="text-sm">
                    <span className="font-medium">Description:</span> {selectedItem.description}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  {selectedItem.powerAvailable && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Zap className="h-4 w-4" />
                      Power
                    </div>
                  )}
                  {selectedItem.waterAvailable && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Droplets className="h-4 w-4" />
                      Water
                    </div>
                  )}
                  {selectedItem.internetAvailable && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Wifi className="h-4 w-4" />
                      Internet
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Tent details
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedItem.tentType}</Badge>
                  <Badge variant="outline">{selectedItem.status}</Badge>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Capacity:</span> {selectedItem.capacity} people
                </div>
                
                {selectedItem.guestName && (
                  <div className="text-sm">
                    <span className="font-medium">Guest:</span> {selectedItem.guestName}
                  </div>
                )}
                
                {selectedItem.guestPhone && (
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-4 w-4" />
                    {selectedItem.guestPhone}
                  </div>
                )}
                
                {selectedItem.guestEmail && (
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-4 w-4" />
                    {selectedItem.guestEmail}
                  </div>
                )}
                
                {(selectedItem.checkInDate || selectedItem.checkOutDate) && (
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4" />
                    {selectedItem.checkInDate && formatSafeDate(selectedItem.checkInDate)}
                    {selectedItem.checkOutDate && ` - ${formatSafeDate(selectedItem.checkOutDate)}`}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  {selectedItem.hasPower && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Zap className="h-4 w-4" />
                      Power
                    </div>
                  )}
                  {selectedItem.hasWifi && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Wifi className="h-4 w-4" />
                      WiFi
                    </div>
                  )}
                  {selectedItem.hasPrivateBathroom && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Droplets className="h-4 w-4" />
                      Private Bathroom
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
