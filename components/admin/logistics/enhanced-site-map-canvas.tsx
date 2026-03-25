"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Settings,
  Ruler,
  Square,
  Circle,
  Triangle,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Save,
  Undo,
  Redo,
  Grid,
  Grid3X3,
  MousePointer,
  Hand,
  Edit3,
  Type,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  MapPin,
  Navigation,
  Zap,
  Droplets,
  Wifi,
  Shield,
  Star,
  Users,
  UserCheck,
  Building
} from "lucide-react"
import { 
  MapLayer, 
  CanvasLayer, 
  CanvasElement, 
  CanvasToolConfig, 
  CanvasMeasurement,
  MapMeasurement,
  MapIssue,
  DEFAULT_LAYERS 
} from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"

interface EnhancedSiteMapCanvasProps {
  siteMapId: string
  onLayerUpdate: (layers: MapLayer[]) => void
  onMeasurementCreate: (measurement: MapMeasurement) => void
  onIssueCreate: (issue: MapIssue) => void
  onElementSelect: (element: CanvasElement | null) => void
  selectedElement: CanvasElement | null
}

interface CanvasState {
  layers: CanvasLayer[]
  selectedLayer: string | null
  activeTool: CanvasToolConfig | null
  measurements: CanvasMeasurement[]
  issues: MapIssue[]
  zoom: number
  panX: number
  panY: number
  gridVisible: boolean
  snapToGrid: boolean
  gridSize: number
}

const CANVAS_TOOLS: CanvasToolConfig[] = [
  { id: 'select', name: 'Select', icon: MousePointer, type: 'select', cursor: 'default', enabled: true },
  { id: 'pan', name: 'Pan', icon: Hand, type: 'pan', cursor: 'grab', enabled: true },
  { id: 'measure', name: 'Measure', icon: Ruler, type: 'measure', cursor: 'crosshair', enabled: true },
  { id: 'rectangle', name: 'Rectangle', icon: Square, type: 'shape', cursor: 'crosshair', enabled: true },
  { id: 'circle', name: 'Circle', icon: Circle, type: 'shape', cursor: 'crosshair', enabled: true },
  { id: 'text', name: 'Text', icon: Type, type: 'text', cursor: 'text', enabled: true },
  { id: 'issue', name: 'Report Issue', icon: AlertTriangle, type: 'draw', cursor: 'crosshair', enabled: true },
]

const LAYER_ICONS = {
  infrastructure: Building,
  power: Zap,
  water: Droplets,
  wifi: Wifi,
  crew_zones: Users,
  guest_areas: UserCheck,
  safety_zones: Shield,
  vip_areas: Star,
  backstage: Building,
  restricted: Shield,
  custom: Layers
}

export function EnhancedSiteMapCanvas({
  siteMapId,
  onLayerUpdate,
  onMeasurementCreate,
  onIssueCreate,
  onElementSelect,
  selectedElement
}: EnhancedSiteMapCanvasProps) {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [canvasState, setCanvasState] = useState<CanvasState>({
    layers: [],
    selectedLayer: null,
    activeTool: CANVAS_TOOLS[0],
    measurements: [],
    issues: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    gridVisible: true,
    snapToGrid: true,
    gridSize: 20
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [showLayerPanel, setShowLayerPanel] = useState(true)
  const [showToolbar, setShowToolbar] = useState(true)
  const [measurementStart, setMeasurementStart] = useState<{ x: number; y: number } | null>(null)

  // Initialize canvas with default layers
  useEffect(() => {
    initializeCanvas()
  }, [siteMapId])

  const initializeCanvas = async () => {
    setIsLoading(true)
    try {
      // Create default layers if none exist
      const defaultLayers: CanvasLayer[] = DEFAULT_LAYERS.map((layer, index) => ({
        id: `layer-${index + 1}`,
        name: layer.name,
        type: layer.layerType,
        color: layer.color,
        opacity: layer.opacity,
        visible: layer.isVisible,
        locked: layer.isLocked,
        zIndex: layer.zIndex,
        elements: []
      }))

      setCanvasState(prev => ({
        ...prev,
        layers: defaultLayers,
        selectedLayer: defaultLayers[0]?.id || null
      }))

      // Load existing data from API
      await loadCanvasData()
    } catch (error) {
      console.error('Error initializing canvas:', error)
      toast({
        title: "Error",
        description: "Failed to initialize canvas",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadCanvasData = async () => {
    try {
      // Load layers, measurements, and issues from API
      // This would make API calls to fetch existing data
      // For now, we'll use the initialized default layers
    } catch (error) {
      console.error('Error loading canvas data:', error)
    }
  }

  const handleToolSelect = (tool: CanvasToolConfig) => {
    setCanvasState(prev => ({
      ...prev,
      activeTool: tool
    }))
  }

  const handleLayerToggle = (layerId: string) => {
    setCanvasState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    }))
  }

  const handleLayerLock = (layerId: string) => {
    setCanvasState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, locked: !layer.locked }
          : layer
      )
    }))
  }

  const handleLayerOpacityChange = (layerId: string, opacity: number[]) => {
    setCanvasState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, opacity: opacity[0] / 100 }
          : layer
      )
    }))
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left - canvasState.panX) / canvasState.zoom
    const y = (event.clientY - rect.top - canvasState.panY) / canvasState.zoom

    // Snap to grid if enabled
    const snappedX = canvasState.snapToGrid 
      ? Math.round(x / canvasState.gridSize) * canvasState.gridSize
      : x
    const snappedY = canvasState.snapToGrid 
      ? Math.round(y / canvasState.gridSize) * canvasState.gridSize
      : y

    if (canvasState.activeTool?.type === 'measure') {
      if (!measurementStart) {
        setMeasurementStart({ x: snappedX, y: snappedY })
      } else {
        // Create measurement
        const distance = Math.sqrt(
          Math.pow(snappedX - measurementStart.x, 2) + 
          Math.pow(snappedY - measurementStart.y, 2)
        )
        
        const measurement: CanvasMeasurement = {
          id: `measurement-${Date.now()}`,
          type: 'distance',
          startX: measurementStart.x,
          startY: measurementStart.y,
          endX: snappedX,
          endY: snappedY,
          value: distance,
          unit: 'meters',
          color: '#ff6b6b'
        }

        setCanvasState(prev => ({
          ...prev,
          measurements: [...prev.measurements, measurement]
        }))

        // Create measurement in database
        onMeasurementCreate({
          id: measurement.id,
          siteMapId,
          measurementType: 'distance',
          startX: measurementStart.x,
          startY: measurementStart.y,
          endX: snappedX,
          endY: snappedY,
          value: distance,
          unit: 'meters',
          color: '#ff6b6b',
          isCompliant: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        setMeasurementStart(null)
      }
    } else if (canvasState.activeTool?.type === 'draw' && canvasState.activeTool.id === 'issue') {
      // Create issue
      const issue: MapIssue = {
        id: `issue-${Date.now()}`,
        siteMapId,
        issueType: 'other',
        severity: 'medium',
        title: 'New Issue',
        description: 'Click to edit issue details',
        x: snappedX,
        y: snappedY,
        status: 'open',
        reportedBy: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setCanvasState(prev => ({
        ...prev,
        issues: [...prev.issues, issue]
      }))

      onIssueCreate(issue)
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom + (direction === 'in' ? 0.1 : -0.1)))
    }))
  }

  const handleGridToggle = () => {
    setCanvasState(prev => ({
      ...prev,
      gridVisible: !prev.gridVisible
    }))
  }

  const handleSnapToggle = () => {
    setCanvasState(prev => ({
      ...prev,
      snapToGrid: !prev.snapToGrid
    }))
  }

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply zoom and pan
    ctx.save()
    ctx.translate(canvasState.panX, canvasState.panY)
    ctx.scale(canvasState.zoom, canvasState.zoom)

    // Draw grid
    if (canvasState.gridVisible) {
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1 / canvasState.zoom
      
      for (let x = 0; x < canvas.width / canvasState.zoom; x += canvasState.gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height / canvasState.zoom)
        ctx.stroke()
      }
      
      for (let y = 0; y < canvas.height / canvasState.zoom; y += canvasState.gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width / canvasState.zoom, y)
        ctx.stroke()
      }
    }

    // Draw layers (in z-index order)
    const sortedLayers = [...canvasState.layers].sort((a, b) => a.zIndex - b.zIndex)
    
    sortedLayers.forEach(layer => {
      if (!layer.visible) return

      ctx.save()
      ctx.globalAlpha = layer.opacity

      // Draw layer elements
      layer.elements.forEach(element => {
        if (element.selected) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2 / canvasState.zoom
          ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4)
        }

        ctx.fillStyle = layer.color
        ctx.fillRect(element.x, element.y, element.width, element.height)
      })

      ctx.restore()
    })

    // Draw measurements
    canvasState.measurements.forEach(measurement => {
      ctx.strokeStyle = measurement.color
      ctx.lineWidth = 2 / canvasState.zoom
      ctx.setLineDash([5 / canvasState.zoom, 5 / canvasState.zoom])
      
      ctx.beginPath()
      ctx.moveTo(measurement.startX, measurement.startY)
      ctx.lineTo(measurement.endX, measurement.endY)
      ctx.stroke()
      
      ctx.setLineDash([])

      // Draw measurement label
      const midX = (measurement.startX + measurement.endX) / 2
      const midY = (measurement.startY + measurement.endY) / 2
      
      ctx.fillStyle = measurement.color
      ctx.font = `${12 / canvasState.zoom}px Arial`
      ctx.fillText(`${measurement.value.toFixed(1)} ${measurement.unit}`, midX, midY)
    })

    // Draw issues
    canvasState.issues.forEach(issue => {
      ctx.fillStyle = issue.severity === 'critical' ? '#ef4444' : 
                     issue.severity === 'high' ? '#f59e0b' : 
                     issue.severity === 'medium' ? '#3b82f6' : '#10b981'
      
      ctx.beginPath()
      ctx.arc(issue.x, issue.y, 8 / canvasState.zoom, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.fillStyle = '#ffffff'
      ctx.font = `${10 / canvasState.zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText('!', issue.x, issue.y + 3 / canvasState.zoom)
    })

    // Draw measurement preview
    if (measurementStart && canvasState.activeTool?.type === 'measure') {
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 1 / canvasState.zoom
      ctx.setLineDash([5 / canvasState.zoom, 5 / canvasState.zoom])
      
      ctx.beginPath()
      ctx.moveTo(measurementStart.x, measurementStart.y)
      ctx.lineTo(measurementStart.x, measurementStart.y) // Will be updated with mouse position
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [canvasState, measurementStart])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] bg-gray-50 rounded-lg overflow-hidden">
      {/* Layer Panel */}
      {showLayerPanel && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Layers</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowLayerPanel(false)}>
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {canvasState.layers.map((layer) => {
              const IconComponent = LAYER_ICONS[layer.type] || Layers
              return (
                <div key={layer.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" style={{ color: layer.color }} />
                      <span className="text-sm font-medium">{layer.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLayerToggle(layer.id)}
                      >
                        {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLayerLock(layer.id)}
                      >
                        {layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Opacity</span>
                      <Slider
                        value={[layer.opacity * 100]}
                        onValueChange={(value) => handleLayerOpacityChange(layer.id, value)}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 w-8">{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {layer.elements.length} elements
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ backgroundColor: layer.color, color: 'white' }}
                      >
                        {layer.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Layer
            </Button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        {showToolbar && (
          <div className="bg-white border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border border-gray-300 rounded-md">
                  {CANVAS_TOOLS.map((tool) => {
                    const IconComponent = tool.icon
                    return (
                      <Button
                        key={tool.id}
                        variant={canvasState.activeTool?.id === tool.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleToolSelect(tool)}
                        className="rounded-none first:rounded-l-md last:rounded-r-md"
                      >
                        <IconComponent className="h-4 w-4" />
                      </Button>
                    )
                  })}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant={canvasState.gridVisible ? "default" : "outline"}
                    size="sm"
                    onClick={handleGridToggle}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant={canvasState.snapToGrid ? "default" : "outline"}
                    size="sm"
                    onClick={handleSnapToggle}
                  >
                    <Target className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(canvasState.zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <Button variant="outline" size="sm">
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Redo className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative" ref={containerRef}>
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
            style={{ cursor: canvasState.activeTool?.cursor || 'default' }}
          />
          
          {/* Layer Panel Toggle */}
          {!showLayerPanel && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 left-4"
              onClick={() => setShowLayerPanel(true)}
            >
              <Layers className="h-4 w-4 mr-2" />
              Layers
            </Button>
          )}
          
          {/* Status Bar */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Tool: {canvasState.activeTool?.name}</span>
              <span>Zoom: {Math.round(canvasState.zoom * 100)}%</span>
              <span>Grid: {canvasState.gridSize}m</span>
              {measurementStart && (
                <span className="text-blue-600">Measuring...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
