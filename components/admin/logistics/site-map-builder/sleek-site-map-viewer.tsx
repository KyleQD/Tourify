'use client'

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Save, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  Layers,
  Grid,
  Move,
  Square,
  Circle,
  Triangle,
  MapPin,
  Zap,
  Truck,
  Building,
  Users,
  Settings,
  Download,
  Share,
  Lock,
  Unlock,
  Plus,
  Minus,
  Maximize,
  Minimize,
  Palette,
  Type,
  Image,
  Upload,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Hand,
  Search,
  Filter,
  Star,
  Copy,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Ruler,
  AlertTriangle,
  MousePointer
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SleekElementToolbox } from "./sleek-element-toolbox"
import { EnhancedToolbar } from "./enhanced-toolbar"
import { DuplicationSystem } from "./duplication-system"
import { DragDropProvider, useDragDrop, useDropZone } from "@/contexts/site-map/drag-drop-context"
import { CANNED_ELEMENTS, getElementById, type CannedElement } from "@/lib/data/canned-elements"

interface SiteMap {
  id: string
  name: string
  description: string
  width: number
  height: number
  created_at: string
  status: string
  backgroundColor?: string
  gridEnabled?: boolean
  gridSize?: number
}

interface SiteMapElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  label: string
  data?: any
}

interface SleekSiteMapViewerProps {
  siteMap: SiteMap
  onClose: () => void
  onSave?: (siteMap: SiteMap) => void
  onDelete?: (siteMapId: string) => void
}

function SleekSiteMapViewerContent({ siteMap, onClose, onSave, onDelete }: SleekSiteMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [elements, setElements] = useState<SiteMapElement[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const [showLayers, setShowLayers] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [activeTab, setActiveTab] = useState('elements')

  // Drag-drop functionality
  const { config, updateConfig, dragState, startDrag, updateDrag, endDrag, snapToGrid } = useDragDrop()

  // Set up drop zone for the canvas
  const canvasDropZone = {
    id: 'canvas-drop-zone',
    bounds: { x: 0, y: 0, width: siteMap.width, height: siteMap.height },
    accepts: ['element'],
    onDrop: (item: any, position: { x: number; y: number }) => {
      const cannedElement = getElementById(item.data.name)
      if (cannedElement) {
        const newElement: SiteMapElement = {
          id: `element_${Date.now()}`,
          type: cannedElement.id,
          x: position.x,
          y: position.y,
          width: cannedElement.width,
          height: cannedElement.height,
          rotation: 0,
          fill: cannedElement.color,
          stroke: cannedElement.strokeColor,
          strokeWidth: 2,
          label: cannedElement.name,
          data: cannedElement.properties
        }
        setElements(prev => [...prev, newElement])
      }
    },
    onHover: (item: any, position: { x: number; y: number }) => {
      console.log('Hovering over canvas with:', item.data.name)
    },
    onLeave: () => {
      console.log('Left canvas drop zone')
    }
  }

  useDropZone(canvasDropZone)

  // Mock elements for demonstration
  useEffect(() => {
    setElements([
      {
        id: '1',
        type: 'stage',
        x: 200,
        y: 150,
        width: 300,
        height: 200,
        rotation: 0,
        fill: 'rgba(147, 51, 234, 0.3)',
        stroke: '#9333ea',
        strokeWidth: 2,
        label: 'Main Stage'
      },
      {
        id: '2',
        type: 'tent',
        x: 50,
        y: 100,
        width: 120,
        height: 80,
        rotation: 0,
        fill: 'rgba(59, 130, 246, 0.3)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        label: 'VIP Tent'
      },
      {
        id: '3',
        type: 'generator',
        x: 400,
        y: 300,
        width: 60,
        height: 40,
        rotation: 0,
        fill: 'rgba(245, 158, 11, 0.3)',
        stroke: '#f59e0b',
        strokeWidth: 2,
        label: 'Generator A'
      }
    ])
  }, [])

  // Canvas drawing functions
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transformations
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw background with gradient
    const gradient = ctx.createLinearGradient(0, 0, siteMap.width, siteMap.height)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(1, '#1e293b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, siteMap.width, siteMap.height)

    // Draw grid
    if (showGrid && siteMap.gridEnabled) {
      const gridSize = siteMap.gridSize || 20
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)'
      ctx.lineWidth = 1
      
      for (let x = 0; x <= siteMap.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, siteMap.height)
        ctx.stroke()
      }
      
      for (let y = 0; y <= siteMap.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(siteMap.width, y)
        ctx.stroke()
      }
    }

    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element)
    })

    ctx.restore()
  }, [siteMap, elements, zoom, pan, showGrid])

  const drawElement = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.save()
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.translate(-element.width / 2, -element.height / 2)

    // Draw element with enhanced styling
    const gradient = ctx.createLinearGradient(0, 0, element.width, element.height)
    gradient.addColorStop(0, element.fill)
    gradient.addColorStop(1, element.fill.replace('0.3', '0.1'))
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, element.width, element.height)
    
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = element.strokeWidth
    ctx.strokeRect(0, 0, element.width, element.height)

    // Draw label with background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, element.height - 25, element.width, 25)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height - 8)

    // Draw selection highlight
    if (selectedElement === element.id) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(-2, -2, element.width + 4, element.height + 4)
      ctx.setLineDash([])
    }

    ctx.restore()
  }

  // Event handlers
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - pan.x) / zoom
    const y = (event.clientY - rect.top - pan.y) / zoom

    const clickedElement = elements.find(element => 
      x >= element.x && x <= element.x + element.width &&
      y >= element.y && y <= element.y + element.height
    )

    if (clickedElement) {
      setSelectedElement(clickedElement.id)
      setSelectedElements([clickedElement.id])
    } else {
      setSelectedElement(null)
      setSelectedElements([])
    }
  }

  const handleDuplication = (type: 'single' | 'multiple' | 'array', options: any) => {
    if (selectedElements.length === 0) return

    const selectedElementsData = elements.filter(el => selectedElements.includes(el.id))
    
    if (type === 'single') {
      selectedElementsData.forEach(element => {
        const newElement = {
          ...element,
          id: `element_${Date.now()}_${Math.random()}`,
          x: element.x + (options.offsetX || 20),
          y: element.y + (options.offsetY || 0),
          label: `${element.label} (Copy)`
        }
        setElements(prev => [...prev, newElement])
      })
    }
  }

  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'duplicate':
        handleDuplication('single', { offsetX: 20, offsetY: 0 })
        break
      case 'delete':
        setElements(prev => prev.filter(el => !selectedElements.includes(el.id)))
        setSelectedElements([])
        setSelectedElement(null)
        break
      default:
        console.log('Toolbar action:', action)
    }
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)))
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'pan') {
      setIsDragging(true)
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && selectedTool === 'pan') {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center",
      isFullscreen && "p-0"
    )}>
      <div className={cn(
        "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/30 rounded-3xl shadow-2xl shadow-slate-900/50 w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col overflow-hidden",
        isFullscreen && "max-w-none max-h-none h-full w-full rounded-none"
      )}>
        {/* Sleek Header */}
        <div className="relative p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-t-3xl"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-sm opacity-50"></div>
                <div className="relative p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{siteMap.name}</h1>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 border-slate-600">
                    {siteMap.status}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {siteMap.width} × {siteMap.height}px
                  </span>
                </div>
                {siteMap.description && (
                  <p className="text-sm text-slate-400">{siteMap.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all duration-200",
                  isEditing 
                    ? "text-purple-400 bg-purple-500/20 border border-purple-500/30" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all duration-200"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sleek Left Sidebar */}
          <div className="w-80 border-r border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 backdrop-blur-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-700/30">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/30">
                  <TabsTrigger 
                    value="elements" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-200"
                  >
                    Elements
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tools" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-200"
                  >
                    Tools
                  </TabsTrigger>
                  <TabsTrigger 
                    value="layers" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-200"
                  >
                    Layers
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="elements" className="h-full mt-0">
                  <SleekElementToolbox
                    onElementSelect={(element) => {
                      console.log('Element selected:', element.name)
                    }}
                    className="h-full bg-transparent"
                  />
                </TabsContent>

                <TabsContent value="tools" className="h-full mt-0 p-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Drawing Tools</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'select', icon: MousePointer, label: 'Select' },
                          { id: 'pan', icon: Hand, label: 'Pan' },
                          { id: 'rectangle', icon: Square, label: 'Rectangle' },
                          { id: 'circle', icon: Circle, label: 'Circle' },
                          { id: 'text', icon: Type, label: 'Text' },
                          { id: 'measure', icon: Ruler, label: 'Measure' }
                        ].map(tool => (
                          <Button
                            key={tool.id}
                            variant={selectedTool === tool.id ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedTool(tool.id)}
                            className={cn(
                              "h-12 flex flex-col gap-1 text-xs transition-all duration-200",
                              selectedTool === tool.id
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            <tool.icon className="h-4 w-4" />
                            {tool.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">View Controls</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Zoom</span>
                          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-slate-300 w-12 text-center font-mono">
                              {Math.round(zoom * 100)}%
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setZoom(prev => Math.min(5, prev + 0.1))}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Grid</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowGrid(!showGrid)}
                            className={cn(
                              "h-8 w-8 p-0 rounded-lg transition-all duration-200",
                              showGrid ? "text-purple-400 bg-purple-500/20" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            <Grid className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
                          className="w-full text-slate-400 hover:text-white justify-start rounded-lg transition-all duration-200"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Reset View
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layers" className="h-full mt-0 p-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">Layers</h3>
                    <div className="space-y-2">
                      {['Background', 'Infrastructure', 'Stages', 'Utilities'].map((layer, index) => (
                        <div key={layer} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/50 transition-all duration-200 border border-slate-700/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <span className="text-sm text-slate-300 flex-1">{layer}</span>
                          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                            {index + 2}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900/50 to-slate-800/50">
            {/* Enhanced Toolbar */}
            <div className="p-4 border-b border-slate-700/30">
              <EnhancedToolbar
                activeTool={selectedTool}
                onToolChange={setSelectedTool}
                zoom={zoom}
                onZoomChange={setZoom}
                showGrid={showGrid}
                onGridToggle={() => setShowGrid(!showGrid)}
                showLayers={showLayers}
                onLayersToggle={() => setShowLayers(!showLayers)}
                selectedElements={selectedElements}
                onAction={handleToolbarAction}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={() => setCanUndo(false)}
                onRedo={() => setCanRedo(true)}
                className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/30 rounded-2xl"
              />
            </div>

            {/* Duplication System */}
            <div className="px-4 py-2 border-b border-slate-700/30">
              <DuplicationSystem
                selectedElements={selectedElements}
                onDuplicate={handleDuplication}
              />
            </div>

            <div className="flex-1 p-4">
              <div className="relative w-full h-full bg-slate-900/30 rounded-2xl border border-slate-700/30 overflow-hidden shadow-2xl">
                <canvas
                  ref={canvasRef}
                  width={siteMap.width}
                  height={siteMap.height}
                  className="absolute inset-0 w-full h-full cursor-crosshair rounded-2xl"
                  onClick={handleCanvasClick}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    cursor: selectedTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
                  }}
                />
                
                {/* Canvas overlay for visual effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-900/20 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sleek Right Sidebar - Properties */}
          {selectedElement && (
            <div className="w-80 border-l border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 backdrop-blur-xl">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-300">Properties</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedElement(null)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg"
                  >
                    ✕
                  </Button>
                </div>

                {(() => {
                  const element = elements.find(e => e.id === selectedElement)
                  if (!element) return null

                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Label</Label>
                        <Input
                          value={element.label}
                          onChange={(e) => {
                            setElements(prev => prev.map(el => 
                              el.id === selectedElement 
                                ? { ...el, label: e.target.value }
                                : el
                            ))
                          }}
                          className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">X Position</Label>
                          <Input
                            type="number"
                            value={element.x}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, x: parseInt(e.target.value) || 0 }
                                  : el
                              ))
                            }}
                            className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Y Position</Label>
                          <Input
                            type="number"
                            value={element.y}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, y: parseInt(e.target.value) || 0 }
                                  : el
                              ))
                            }}
                            className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Width</Label>
                          <Input
                            type="number"
                            value={element.width}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, width: parseInt(e.target.value) || 0 }
                                  : el
                              ))
                            }}
                            className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Height</Label>
                          <Input
                            type="number"
                            value={element.height}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, height: parseInt(e.target.value) || 0 }
                                  : el
                              ))
                            }}
                            className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Fill Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={element.fill}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, fill: e.target.value }
                                  : el
                              ))
                            }}
                            className="w-10 h-10 rounded-lg border border-slate-700/50 bg-slate-800/50 cursor-pointer"
                          />
                          <Input
                            value={element.fill}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => 
                                el.id === selectedElement 
                                  ? { ...el, fill: e.target.value }
                                  : el
                              ))
                            }}
                            className="bg-slate-800/50 border-slate-700/50 text-white text-sm rounded-lg flex-1 focus:border-purple-500/50 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setElements(prev => prev.filter(el => el.id !== selectedElement))
                          setSelectedElement(null)
                        }}
                        className="w-full rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all duration-200"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete Element
                      </Button>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Sleek Bottom Status Bar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700/30 bg-gradient-to-r from-slate-800/30 via-slate-700/20 to-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Elements: {elements.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Tool: {selectedTool}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            >
              <Share className="h-3 w-3 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            >
              <Download className="h-3 w-3 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => onSave?.(siteMap)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Save className="h-3 w-3 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main export with DragDropProvider
export function SleekSiteMapViewer(props: SleekSiteMapViewerProps) {
  return (
    <DragDropProvider
      initialConfig={{
        snapToGrid: true,
        gridSize: 20,
        rotationEnabled: true,
        scalingEnabled: true,
        collisionDetection: true,
        multiSelect: true,
        autoAlign: true
      }}
    >
      <SleekSiteMapViewerContent {...props} />
    </DragDropProvider>
  )
}
