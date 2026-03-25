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
import { 
  Plus, 
  Map, 
  Home, 
  Users, 
  Settings, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  Copy,
  Share,
  Calendar,
  MapPin,
  Save,
  ArrowLeft,
  ArrowRight,
  Image,
  Building,
  TreePine,
  CheckCircle
} from "lucide-react"
import { SiteMapCanvas } from "./site-map-canvas"
import { EnhancedSiteMapCanvas } from "./enhanced-site-map-canvas"
import { EnhancedSiteMapBuilder } from "./site-map-builder/enhanced-site-map-builder"
import { LayerManager } from "./layer-manager"
import { MeasurementTools } from "./measurement-tools"
import { EquipmentCatalog } from "./equipment-catalog"
import { VendorDashboard } from "./vendor-dashboard"
import { EquipmentInventoryManager } from "./equipment-inventory-manager"
import { AutomatedSetupWorkflows } from "./automated-setup-workflows"
import { VendorCollaborationHub } from "./vendor-collaboration-hub"
import { RealTimeEquipmentTracker } from "./real-time-equipment-tracker"
import { 
  SiteMap, 
  SiteMapZone, 
  GlampingTent, 
  SiteMapElement, 
  EquipmentCatalog as EquipmentCatalogType,
  MapLayer,
  MapMeasurement,
  MapIssue,
  CanvasElement,
  CanvasMeasurement
} from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface SiteMapManagerProps {
  eventId?: string
  tourId?: string
  initialSiteMaps?: SiteMap[]
  vendorId?: string
  isVendorView?: boolean
}

export function SiteMapManager({ 
  eventId, 
  tourId, 
  initialSiteMaps = [],
  vendorId,
  isVendorView = false
}: SiteMapManagerProps) {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [siteMaps, setSiteMaps] = useState<SiteMap[]>(initialSiteMaps)
  const [selectedSiteMap, setSelectedSiteMap] = useState<SiteMap | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCatalogType | null>(null)
  const [isDragMode, setIsDragMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  
  // Enhanced features state
  const [layers, setLayers] = useState<MapLayer[]>([])
  const [measurements, setMeasurements] = useState<MapMeasurement[]>([])
  const [issues, setIssues] = useState<MapIssue[]>([])
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null)
  const [activeTab, setActiveTab] = useState("design")
  const [useEnhancedBuilder, setUseEnhancedBuilder] = useState(true)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    environment: 'outdoor' as 'indoor' | 'outdoor',
    approximateSize: 'medium' as 'small' | 'medium' | 'large' | 'xlarge',
    customSize: {
      width: 1000,
      height: 1000,
      scale: 1.0
    },
    backgroundColor: '#f8f9fa',
    gridEnabled: true,
    gridSize: 20,
    isPublic: false,
    eventId: 'none',
    backgroundImage: null as File | null,
    backgroundImageUrl: ''
  })
  const [createStep, setCreateStep] = useState(1)
  const [availableEvents, setAvailableEvents] = useState<Array<{id: string, name: string}>>([])

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600">Please log in to access site maps</p>
        </div>
      </div>
    )
  }

  // Load site maps on mount (only when authenticated)
  useEffect(() => {
    if (!authLoading && user) {
      loadSiteMaps()
      loadAvailableEvents()
    }
  }, [eventId, tourId, authLoading, user])

  // Load available events for assignment
  const loadAvailableEvents = async () => {
    try {
      const response = await fetch('/api/admin/events')
      if (response.ok) {
        const data = await response.json()
        setAvailableEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  // Size presets based on approximate square footage
  const getSizePreset = (size: string) => {
    const presets = {
      small: { width: 800, height: 600, scale: 0.5, sqft: 'Under 2,000 sq ft' },
      medium: { width: 1200, height: 800, scale: 0.75, sqft: '2,000 - 10,000 sq ft' },
      large: { width: 1600, height: 1200, scale: 1.0, sqft: '10,000 - 50,000 sq ft' },
      xlarge: { width: 2000, height: 1500, scale: 1.5, sqft: '50,000+ sq ft' }
    }
    return presets[size as keyof typeof presets] || presets.medium
  }

  const loadSiteMaps = async () => {
    setIsLoading(true)
    try {
      console.log('Loading site maps...', { user: !!user, eventId, tourId })
      
      const params = new URLSearchParams()
      if (eventId) params.append('eventId', eventId)
      if (tourId) params.append('tourId', tourId)
      params.append('includeData', 'true')

      const response = await fetch(`/api/admin/logistics/site-maps?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed - trying debug endpoint')
          
          // Try the debug endpoint to see what's happening
          try {
            const debugResponse = await fetch('/api/debug-auth', { credentials: 'include' })
            const debugData = await debugResponse.json()
            console.log('Debug auth result:', debugData)
          } catch (debugError) {
            console.error('Debug auth failed:', debugError)
          }
          
          toast({
            title: "Authentication Error",
            description: "Authentication failed. Check console for details.",
            variant: "destructive"
          })
          return
        }
        throw new Error(data.error || `HTTP ${response.status}: Failed to load site maps`)
      }

      if (data.success) {
        setSiteMaps(data.data)
        if (data.data.length > 0 && !selectedSiteMap) {
          setSelectedSiteMap(data.data[0])
        }
      } else {
        throw new Error(data.error || 'Failed to load site maps')
      }
    } catch (error) {
      console.error('Error loading site maps:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load site maps",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createSiteMap = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create site maps",
        variant: "destructive"
      })
      return
    }

    if (!createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Site map name is required",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      // Get size preset based on selected size
      const preset = getSizePreset(createForm.approximateSize)
      
      const formData = new FormData()
      formData.append('name', createForm.name)
      formData.append('description', createForm.description)
      formData.append('environment', createForm.environment)
      formData.append('width', preset.width.toString())
      formData.append('height', preset.height.toString())
      formData.append('scale', preset.scale.toString())
      formData.append('backgroundColor', createForm.backgroundColor)
      formData.append('gridEnabled', createForm.gridEnabled.toString())
      formData.append('gridSize', createForm.gridSize.toString())
      formData.append('isPublic', createForm.isPublic.toString())
      formData.append('eventId', createForm.eventId === 'none' ? '' : createForm.eventId || eventId || '')
      formData.append('tourId', tourId || '')
      formData.append('approximateSize', createForm.approximateSize)
      
      if (createForm.backgroundImage) {
        formData.append('backgroundImage', createForm.backgroundImage)
      }

      const response = await fetch('/api/admin/logistics/site-maps', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to create site maps",
            variant: "destructive"
          })
          return
        }
        throw new Error(data.error || `HTTP ${response.status}: Failed to create site map`)
      }

      if (data.success) {
        setSiteMaps(prev => [data.data, ...prev])
        setSelectedSiteMap(data.data)
        setShowCreateDialog(false)
        setCreateStep(1)
        setCreateForm({
          name: '',
          description: '',
          environment: 'outdoor',
          approximateSize: 'medium',
          customSize: { width: 1000, height: 1000, scale: 1.0 },
          backgroundColor: '#f8f9fa',
          gridEnabled: true,
          gridSize: 20,
          isPublic: false,
          eventId: 'none',
          backgroundImage: null,
          backgroundImageUrl: ''
        })
        toast({
          title: "Success",
          description: "Site map created successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to create site map')
      }
    } catch (error) {
      console.error('Error creating site map:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create site map",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const updateSiteMap = async (updates: Partial<SiteMap>) => {
    if (!selectedSiteMap) return

    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${selectedSiteMap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (data.success) {
        setSelectedSiteMap(data.data)
        setSiteMaps(prev => prev.map(sm => sm.id === selectedSiteMap.id ? data.data : sm))
        toast({
          title: "Success",
          description: "Site map updated successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to update site map')
      }
    } catch (error) {
      console.error('Error updating site map:', error)
      toast({
        title: "Error",
        description: "Failed to update site map",
        variant: "destructive"
      })
    }
  }

  // Alias for enhanced site map builder compatibility
  const handleSiteMapUpdate = updateSiteMap

  // Element handlers for enhanced site map builder
  const handleElementCreate = async (elementData: Partial<SiteMapElement>) => {
    if (!selectedSiteMap) return

    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${selectedSiteMap.id}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...elementData,
          siteMapId: selectedSiteMap.id
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Element created successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to create element')
      }
    } catch (error) {
      console.error('Error creating element:', error)
      toast({
        title: "Error",
        description: "Failed to create element",
        variant: "destructive"
      })
    }
  }

  const handleElementUpdate = async (elementId: string, updates: Partial<SiteMapElement>) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${selectedSiteMap?.id}/elements/${elementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Element updated successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to update element')
      }
    } catch (error) {
      console.error('Error updating element:', error)
      toast({
        title: "Error",
        description: "Failed to update element",
        variant: "destructive"
      })
    }
  }

  const handleElementDelete = async (elementId: string) => {
    if (!confirm('Are you sure you want to delete this element?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${selectedSiteMap?.id}/elements/${elementId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Element deleted successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to delete element')
      }
    } catch (error) {
      console.error('Error deleting element:', error)
      toast({
        title: "Error",
        description: "Failed to delete element",
        variant: "destructive"
      })
    }
  }

  const deleteSiteMap = async (siteMapId: string) => {
    if (!confirm('Are you sure you want to delete this site map? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSiteMaps(prev => prev.filter(sm => sm.id !== siteMapId))
        if (selectedSiteMap?.id === siteMapId) {
          setSelectedSiteMap(siteMaps.find(sm => sm.id !== siteMapId) || null)
        }
        toast({
          title: "Success",
          description: "Site map deleted successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to delete site map')
      }
    } catch (error) {
      console.error('Error deleting site map:', error)
      toast({
        title: "Error",
        description: "Failed to delete site map",
        variant: "destructive"
      })
    }
  }

  const duplicateSiteMap = async (siteMap: SiteMap) => {
    try {
      const response = await fetch('/api/admin/logistics/site-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${siteMap.name} (Copy)`,
          description: siteMap.description,
          width: siteMap.width,
          height: siteMap.height,
          scale: siteMap.scale,
          backgroundColor: siteMap.backgroundColor,
          gridEnabled: siteMap.gridEnabled,
          gridSize: siteMap.gridSize,
          isPublic: false,
          eventId,
          tourId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSiteMaps(prev => [data.data, ...prev])
        toast({
          title: "Success",
          description: "Site map duplicated successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to duplicate site map')
      }
    } catch (error) {
      console.error('Error duplicating site map:', error)
      toast({
        title: "Error",
        description: "Failed to duplicate site map",
        variant: "destructive"
      })
    }
  }

  const handleEquipmentSelect = (equipment: EquipmentCatalogType) => {
    setSelectedEquipment(equipment)
    setIsDragMode(true)
    toast({
      title: "Equipment Selected",
      description: `Drag and drop "${equipment.name}" onto the site map`
    })
  }

  const handleEquipmentDragStart = (equipment: EquipmentCatalogType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'equipment',
      equipment: equipment
    }))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  // Enhanced feature handlers
  const handleLayerCreate = async (layerData: Omit<MapLayer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedSiteMap) return

    try {
      const response = await fetch('/api/admin/logistics/site-maps/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...layerData,
          siteMapId: selectedSiteMap.id
        })
      })

      if (response.ok) {
        const newLayer = await response.json()
        setLayers(prev => [...prev, newLayer])
        toast({
          title: "Success",
          description: "Layer created successfully"
        })
      }
    } catch (error) {
      console.error('Error creating layer:', error)
      toast({
        title: "Error",
        description: "Failed to create layer",
        variant: "destructive"
      })
    }
  }

  const handleLayerUpdate = async (id: string, updates: Partial<MapLayer>) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/layers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedLayer = await response.json()
        setLayers(prev => prev.map(layer => layer.id === id ? updatedLayer : layer))
        toast({
          title: "Success",
          description: "Layer updated successfully"
        })
      }
    } catch (error) {
      console.error('Error updating layer:', error)
      toast({
        title: "Error",
        description: "Failed to update layer",
        variant: "destructive"
      })
    }
  }

  const handleLayerDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/layers/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLayers(prev => prev.filter(layer => layer.id !== id))
        toast({
          title: "Success",
          description: "Layer deleted successfully"
        })
      }
    } catch (error) {
      console.error('Error deleting layer:', error)
      toast({
        title: "Error",
        description: "Failed to delete layer",
        variant: "destructive"
      })
    }
  }

  const handleLayerReorder = async (reorderedLayers: MapLayer[]) => {
    try {
      // Update z-index for all layers
      const updates = reorderedLayers.map((layer, index) => ({
        id: layer.id,
        zIndex: index + 1
      }))

      await Promise.all(
        updates.map(update => 
          fetch(`/api/admin/logistics/site-maps/layers/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zIndex: update.zIndex })
          })
        )
      )

      setLayers(reorderedLayers)
    } catch (error) {
      console.error('Error reordering layers:', error)
      toast({
        title: "Error",
        description: "Failed to reorder layers",
        variant: "destructive"
      })
    }
  }

  const handleMeasurementCreate = async (measurementData: Omit<MapMeasurement, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedSiteMap) return

    try {
      const response = await fetch('/api/admin/logistics/site-maps/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...measurementData,
          siteMapId: selectedSiteMap.id
        })
      })

      if (response.ok) {
        const newMeasurement = await response.json()
        setMeasurements(prev => [...prev, newMeasurement])
        toast({
          title: "Success",
          description: "Measurement created successfully"
        })
      }
    } catch (error) {
      console.error('Error creating measurement:', error)
      toast({
        title: "Error",
        description: "Failed to create measurement",
        variant: "destructive"
      })
    }
  }

  const handleCanvasMeasurementCreate = (measurement: Partial<CanvasMeasurement>) => {
    // Convert CanvasMeasurement to MapMeasurement format
    // Map canvas measurement types to MapMeasurement types
    const typeMapping: Record<string, 'distance' | 'area' | 'clearance' | 'fire_lane' | 'ada_access' | 'emergency_route'> = {
      'distance': 'distance',
      'area': 'area',
      'angle': 'distance' // Map angle to distance as fallback
    }
    const measurementData: Omit<MapMeasurement, 'id' | 'createdAt' | 'updatedAt'> = {
      siteMapId: selectedSiteMap?.id || '',
      measurementType: typeMapping[measurement.type || 'distance'] || 'distance',
      startX: measurement.startX || 0,
      startY: measurement.startY || 0,
      endX: measurement.endX,
      endY: measurement.endY,
      width: measurement.endX && measurement.startX ? Math.abs(measurement.endX - measurement.startX) : undefined,
      height: measurement.endY && measurement.startY ? Math.abs(measurement.endY - measurement.startY) : undefined,
      value: measurement.value,
      unit: measurement.unit || 'meters',
      label: measurement.label || '',
      color: measurement.color || '#3b82f6',
      isCompliant: true,
      complianceNotes: ''
    }
    
    handleMeasurementCreate(measurementData)
  }

  const handleMeasurementUpdate = async (id: string, updates: Partial<MapMeasurement>) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/measurements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedMeasurement = await response.json()
        setMeasurements(prev => prev.map(measurement => measurement.id === id ? updatedMeasurement : measurement))
        toast({
          title: "Success",
          description: "Measurement updated successfully"
        })
      }
    } catch (error) {
      console.error('Error updating measurement:', error)
      toast({
        title: "Error",
        description: "Failed to update measurement",
        variant: "destructive"
      })
    }
  }

  const handleMeasurementDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/measurements/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMeasurements(prev => prev.filter(measurement => measurement.id !== id))
        toast({
          title: "Success",
          description: "Measurement deleted successfully"
        })
      }
    } catch (error) {
      console.error('Error deleting measurement:', error)
      toast({
        title: "Error",
        description: "Failed to delete measurement",
        variant: "destructive"
      })
    }
  }

  const handleIssueCreate = async (issueData: Omit<MapIssue, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedSiteMap) return

    try {
      const response = await fetch('/api/admin/logistics/site-maps/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...issueData,
          siteMapId: selectedSiteMap.id
        })
      })

      if (response.ok) {
        const newIssue = await response.json()
        setIssues(prev => [...prev, newIssue])
        toast({
          title: "Success",
          description: "Issue reported successfully"
        })
      }
    } catch (error) {
      console.error('Error creating issue:', error)
      toast({
        title: "Error",
        description: "Failed to report issue",
        variant: "destructive"
      })
    }
  }

  const handleCanvasIssueCreate = (issue: Partial<MapIssue>) => {
    // Create issue with all required fields
    if (!issue.status || !issue.severity || !issue.title || !issue.issueType) {
      toast({
        title: "Error",
        description: "Missing required issue fields",
        variant: "destructive"
      })
      return
    }

    const issueData: Omit<MapIssue, 'id' | 'createdAt' | 'updatedAt'> = {
      siteMapId: selectedSiteMap?.id || '',
      issueType: issue.issueType,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      x: issue.x || 0,
      y: issue.y || 0,
      status: issue.status,
      assignedTo: issue.assignedTo,
      reportedBy: user?.id || '',
      photos: issue.photos,
      notes: issue.notes,
      resolvedAt: issue.resolvedAt
    }
    
    handleIssueCreate(issueData)
  }

  const handleElementSelect = (element: CanvasElement | null) => {
    setSelectedElement(element)
  }

  const handleExportSiteMap = async (siteMap: SiteMap) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/export`)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${siteMap.name.replace(/\s+/g, '_')}_export.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Success",
        description: "Site map exported successfully"
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Error",
        description: "Failed to export site map",
        variant: "destructive"
      })
    }
  }

  const exportSiteMap = (siteMap: SiteMap) => {
    const exportData = {
      siteMap,
      zones: siteMap.zones || [],
      tents: siteMap.tents || [],
      elements: siteMap.elements || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Tourify Platform',
        version: '1.0'
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${siteMap.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sitemap.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Site map exported successfully"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading site maps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Site Maps</h2>
          <p className="text-gray-600">Create and manage interactive site maps for your events</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Site Map
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="site-map-description">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Create New Site Map
                </DialogTitle>
                <p id="site-map-description" className="text-sm text-muted-foreground">
                  Create a new site map for your event or tour. Fill out the basic information, configure the layout, and assign it to an event if needed.
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      createStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {createStep > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
                    </div>
                    <span className={`text-sm ${createStep >= 1 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                      Basic Info
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      createStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {createStep > 2 ? <CheckCircle className="h-4 w-4" /> : '2'}
                    </div>
                    <span className={`text-sm ${createStep >= 2 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                      Layout
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      createStep >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      3
                    </div>
                    <span className={`text-sm ${createStep >= 3 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                      Assignment
                    </span>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {createStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Site Map Name *</Label>
                      <Input
                        id="name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Main Stage Festival Layout"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the site map purpose..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Environment Type</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, environment: 'outdoor' }))}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            createForm.environment === 'outdoor' 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <TreePine className="h-6 w-6 mb-2 text-green-600" />
                          <div className="font-medium">Outdoor</div>
                          <div className="text-sm text-gray-600">Festivals, concerts, outdoor events</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, environment: 'indoor' }))}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            createForm.environment === 'indoor' 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Building className="h-6 w-6 mb-2 text-blue-600" />
                          <div className="font-medium">Indoor</div>
                          <div className="text-sm text-gray-600">Venues, clubs, conference halls</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {createStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Approximate Size</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                          { key: 'small', label: 'Small', desc: 'Under 2,000 sq ft', icon: '🏢' },
                          { key: 'medium', label: 'Medium', desc: '2,000 - 10,000 sq ft', icon: '🏛️' },
                          { key: 'large', label: 'Large', desc: '10,000 - 50,000 sq ft', icon: '🏟️' },
                          { key: 'xlarge', label: 'X-Large', desc: '50,000+ sq ft', icon: '🌍' }
                        ].map((size) => (
                          <button
                            key={size.key}
                            type="button"
                            onClick={() => setCreateForm(prev => ({ ...prev, approximateSize: size.key as any }))}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              createForm.approximateSize === size.key 
                                ? 'border-purple-500 bg-purple-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-2xl mb-2">{size.icon}</div>
                            <div className="font-medium">{size.label}</div>
                            <div className="text-sm text-gray-600">{size.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Background Layout (Optional)</Label>
                      <div className="mt-2">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <div className="text-sm font-medium mb-1">Upload Site Layout Image</div>
                          <div className="text-xs text-gray-500 mb-3">
                            Upload a photo of your site layout for reference
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setCreateForm(prev => ({ ...prev, backgroundImage: file }))
                                const url = URL.createObjectURL(file)
                                setCreateForm(prev => ({ ...prev, backgroundImageUrl: url }))
                              }
                            }}
                            className="hidden"
                            id="background-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('background-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                        {createForm.backgroundImageUrl && (
                          <div className="mt-3">
                            <img 
                              src={createForm.backgroundImageUrl} 
                              alt="Background preview" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={createForm.isPublic}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="isPublic" className="text-sm">Make this site map public</Label>
                    </div>
                  </div>
                )}

                {createStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="eventId" className="text-sm font-medium">Assign to Event (Optional)</Label>
                      <Select 
                        value={createForm.eventId} 
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, eventId: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an event to assign this site map" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No event assignment</SelectItem>
                          {availableEvents.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Site Map Preview</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Name:</strong> {createForm.name || 'Untitled'}</div>
                        <div><strong>Environment:</strong> {createForm.environment === 'outdoor' ? 'Outdoor' : 'Indoor'}</div>
                        <div><strong>Size:</strong> {getSizePreset(createForm.approximateSize).sqft}</div>
                        <div><strong>Canvas:</strong> {getSizePreset(createForm.approximateSize).width} × {getSizePreset(createForm.approximateSize).height}px</div>
                        {createForm.eventId && createForm.eventId !== 'none' && (
                          <div><strong>Event:</strong> {availableEvents.find(e => e.id === createForm.eventId)?.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {createStep > 1 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateStep(createStep - 1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowCreateDialog(false)
                    setCreateStep(1)
                  }}>
                    Cancel
                  </Button>
                  
                  {createStep < 3 ? (
                    <Button 
                      onClick={() => setCreateStep(createStep + 1)}
                      disabled={createStep === 1 && !createForm.name.trim()}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={createSiteMap} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Site Map'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {siteMaps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Map className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No site maps yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first interactive site map to start managing your event layout
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Site Map
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Site Maps List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Site Maps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {siteMaps.map((siteMap) => (
                  <div
                    key={siteMap.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSiteMap?.id === siteMap.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSiteMap(siteMap)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{siteMap.name}</h4>
                      <Badge className={getStatusColor(siteMap.status)}>
                        {siteMap.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {siteMap.width} × {siteMap.height}px
                      </div>
                      <div className="flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        {siteMap.zones?.length || 0} zones, {siteMap.tents?.length || 0} tents
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(siteMap.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateSiteMap(siteMap)
                        }}
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          exportSiteMap(siteMap)
                        }}
                        title="Export"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSiteMap(siteMap.id)
                        }}
                        title="Delete"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
        {selectedSiteMap ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className={`grid w-full mb-4 ${isVendorView ? 'grid-cols-7' : 'grid-cols-6'}`}>
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="collaborate">Collaborate</TabsTrigger>
                    <TabsTrigger value="field">Field</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="design" className="mt-0">
                  <div className="space-y-4">
                    {/* Builder Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Site Map Builder</h3>
                        <Badge variant={useEnhancedBuilder ? "default" : "secondary"}>
                          {useEnhancedBuilder ? "Enhanced" : "Legacy"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUseEnhancedBuilder(!useEnhancedBuilder)}
                      >
                        {useEnhancedBuilder ? "Use Legacy Builder" : "Use Enhanced Builder"}
                      </Button>
                    </div>
                    
                    {useEnhancedBuilder ? (
                      <div className="h-[800px]">
                        <EnhancedSiteMapBuilder
                          siteMap={selectedSiteMap}
                          onUpdate={handleSiteMapUpdate}
                          onElementCreate={handleElementCreate}
                          onElementUpdate={handleElementUpdate}
                          onElementDelete={handleElementDelete}
                          onMeasurementCreate={handleCanvasMeasurementCreate}
                          onIssueCreate={handleCanvasIssueCreate}
                          collaborators={[]}
                          isReadOnly={isVendorView}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                          <Card className="h-[600px]">
                            <EnhancedSiteMapCanvas
                              siteMapId={selectedSiteMap.id}
                              onLayerUpdate={setLayers}
                              onMeasurementCreate={handleCanvasMeasurementCreate}
                              onIssueCreate={handleCanvasIssueCreate}
                              onElementSelect={handleElementSelect}
                              selectedElement={selectedElement}
                            />
                          </Card>
                        </div>
                        <div className="space-y-4">
                          <LayerManager
                            siteMapId={selectedSiteMap?.id || ''}
                            layers={layers}
                            onLayerCreate={handleLayerCreate}
                            onLayerUpdate={handleLayerUpdate}
                            onLayerDelete={handleLayerDelete}
                            onLayerReorder={handleLayerReorder}
                          />
                        </div>
                      </div>
                    )}
                    
                    {!useEnhancedBuilder && (
                      <MeasurementTools
                        siteMapId={selectedSiteMap?.id || ''}
                        measurements={measurements}
                        onMeasurementCreate={handleMeasurementCreate}
                        onMeasurementUpdate={handleMeasurementUpdate}
                        onMeasurementDelete={handleMeasurementDelete}
                      />
                    )}
                  </div>
                </TabsContent>
                
                
                <TabsContent value="assets" className="mt-0">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Equipment Catalog</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={isDragMode ? "default" : "outline"}>
                              {isDragMode ? "Drag Mode Active" : "Click to Select"}
                            </Badge>
                            {isDragMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsDragMode(false)
                                  setSelectedEquipment(null)
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <EquipmentCatalog
                          siteMapId={selectedSiteMap.id}
                          onEquipmentSelect={handleEquipmentSelect}
                          selectedCategory={selectedCategory}
                          onCategoryChange={handleCategoryChange}
                          isDragMode={isDragMode}
                          onDragStart={handleEquipmentDragStart}
                        />
                      </CardContent>
                    </Card>
                    
                    <EquipmentInventoryManager 
                      vendorId={vendorId || ''}
                      onEquipmentSelect={(equipment) => {
                        console.log('Equipment selected for inventory:', equipment)
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks" className="mt-0">
                  <div className="space-y-4">
                    <AutomatedSetupWorkflows 
                      vendorId={vendorId || ''}
                      siteMapId={selectedSiteMap.id}
                    />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Task Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Crew Assignment & Tasks</h3>
                          <p className="text-gray-600">
                            Assign crew members to map elements and track setup progress
                          </p>
                          <Button className="mt-4" disabled>
                            Coming Soon
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="collaborate" className="mt-0">
                  <VendorCollaborationHub 
                    vendorId={vendorId || ''}
                    siteMapId={selectedSiteMap.id}
                  />
                </TabsContent>
                
                <TabsContent value="field" className="mt-0">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Mobile Field Tools</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-center p-6 border border-gray-200 rounded-lg">
                            <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                            <h4 className="font-semibold mb-2">GPS Location</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Overlay GPS coordinates on site map
                            </p>
                            <Button size="sm" disabled>
                              Coming Soon
                            </Button>
                          </div>
                          
                          <div className="text-center p-6 border border-gray-200 rounded-lg">
                            <Settings className="h-8 w-8 text-green-600 mx-auto mb-3" />
                            <h4 className="font-semibold mb-2">QR Code Scanner</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Scan equipment QR codes for verification
                            </p>
                            <Button size="sm" disabled>
                              Coming Soon
                            </Button>
                          </div>
                          
                          <div className="text-center p-6 border border-gray-200 rounded-lg">
                            <Download className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                            <h4 className="font-semibold mb-2">Offline Mode</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Work without internet connection
                            </p>
                            <Button size="sm" disabled>
                              Coming Soon
                            </Button>
                          </div>
                          
                          <div className="text-center p-6 border border-gray-200 rounded-lg">
                            <Eye className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                            <h4 className="font-semibold mb-2">Issue Reporting</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Report issues with photos and notes
                            </p>
                            <Button size="sm" disabled>
                              Coming Soon
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <RealTimeEquipmentTracker 
                      vendorId={vendorId || ''}
                      siteMapId={selectedSiteMap.id}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="templates" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Version Control & Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Copy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Save & Reuse Layouts</h3>
                        <p className="text-gray-600 mb-4">
                          Create versions of your site maps and save templates for recurring events
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button disabled>
                            <Save className="h-4 w-4 mr-2" />
                            Save Version
                          </Button>
                          <Button variant="outline" disabled>
                            <Copy className="h-4 w-4 mr-2" />
                            Create Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Map className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a site map</h3>
                  <p className="text-gray-600 text-center">
                    Choose a site map from the list to view and edit it
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
