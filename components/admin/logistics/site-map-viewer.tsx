'use client'

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
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
  Hand
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EnhancedElementToolbox } from "./site-map-builder/enhanced-element-toolbox"
import { EnhancedToolbar } from "./site-map-builder/enhanced-toolbar"
import { DuplicationSystem } from "./site-map-builder/duplication-system"
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

interface SiteMapViewerProps {
  siteMap: SiteMap
  onClose: () => void
  onSave?: (siteMap: SiteMap) => void
  onDelete?: (siteMapId: string) => void
}

function SiteMapViewerContent({ siteMap, onClose, onSave, onDelete }: SiteMapViewerProps) {
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
      // Visual feedback for hover
      console.log('Hovering over canvas with:', item.data.name)
    },
    onLeave: () => {
      // Clear hover feedback
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

    // Draw background
    ctx.fillStyle = siteMap.backgroundColor || '#1e293b'
    ctx.fillRect(0, 0, siteMap.width, siteMap.height)

    // Draw grid
    if (showGrid && siteMap.gridEnabled) {
      const gridSize = siteMap.gridSize || 20
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
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

    // Draw element based on type
    switch (element.type) {
      case 'stage':
        drawStage(ctx, element)
        break
      case 'tent':
        drawTent(ctx, element)
        break
      case 'generator':
        drawGenerator(ctx, element)
        break
      default:
        drawRectangle(ctx, element)
    }

    // Draw selection highlight
    if (selectedElement === element.id) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(0, 0, element.width, element.height)
      ctx.setLineDash([])
    }

    ctx.restore()
  }

  const drawStage = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    // Stage base
    ctx.fillStyle = element.fill
    ctx.fillRect(0, 0, element.width, element.height)
    
    // Stage border
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = element.strokeWidth
    ctx.strokeRect(0, 0, element.width, element.height)
    
    // Stage details
    ctx.fillStyle = element.stroke
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height / 2 + 4)
    
    // Stage legs
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = 2
    const legWidth = 8
    const legHeight = 20
    
    ctx.strokeRect(element.width / 4 - legWidth / 2, element.height - legHeight, legWidth, legHeight)
    ctx.strokeRect((element.width * 3) / 4 - legWidth / 2, element.height - legHeight, legWidth, legHeight)
  }

  const drawTent = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    // Tent base
    ctx.fillStyle = element.fill
    ctx.fillRect(0, 0, element.width, element.height)
    
    // Tent border
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = element.strokeWidth
    ctx.strokeRect(0, 0, element.width, element.height)
    
    // Tent peak
    ctx.fillStyle = element.stroke
    ctx.beginPath()
    ctx.moveTo(element.width / 2, 0)
    ctx.lineTo(0, element.height / 3)
    ctx.lineTo(element.width, element.height / 3)
    ctx.closePath()
    ctx.fill()
    
    // Label
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height / 2 + 4)
  }

  const drawGenerator = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    // Generator base
    ctx.fillStyle = element.fill
    ctx.fillRect(0, 0, element.width, element.height)
    
    // Generator border
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = element.strokeWidth
    ctx.strokeRect(0, 0, element.width, element.height)
    
    // Generator details
    ctx.fillStyle = element.stroke
    ctx.font = '8px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height / 2 + 3)
    
    // Ventilation slots
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(5 + i * 15, 5, 8, 30)
    }
  }

  const drawRectangle = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.fillStyle = element.fill
    ctx.fillRect(0, 0, element.width, element.height)
    
    ctx.strokeStyle = element.stroke
    ctx.lineWidth = element.strokeWidth
    ctx.strokeRect(0, 0, element.width, element.height)
    
    ctx.fillStyle = element.stroke
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height / 2 + 4)
  }

  // Event handlers
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - pan.x) / zoom
    const y = (event.clientY - rect.top - pan.y) / zoom

    // Check if clicking on an element
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

  // Handle duplication
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

  // Handle toolbar actions
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

  // Tool configurations
  const tools = [
    { id: 'select', icon: Move, label: 'Select', cursor: 'default' },
    { id: 'pan', icon: Hand, label: 'Pan', cursor: 'grab' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom', cursor: 'zoom-in' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', cursor: 'crosshair' },
    { id: 'circle', icon: Circle, label: 'Circle', cursor: 'crosshair' },
    { id: 'text', icon: Type, label: 'Text', cursor: 'text' },
    { id: 'image', icon: Image, label: 'Image', cursor: 'crosshair' }
  ]

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
      isFullscreen && "p-0"
    )}>
      <div className={cn(
        "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-slate-900/50 w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden",
        isFullscreen && "max-w-none max-h-none h-full w-full rounded-none"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{siteMap.name}</h1>
                <p className="text-slate-400 text-sm">{siteMap.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={siteMap.status === 'published' ? 'default' : 'secondary'}>
                {siteMap.status}
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                {siteMap.width} × {siteMap.height}px
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "text-slate-400 hover:text-white hover:bg-slate-700/50",
                isEditing && "text-purple-400 bg-purple-500/20"
              )}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Enhanced Element Toolbox */}
          <div className="w-80 bg-slate-800/30 border-r border-slate-700/50 flex flex-col">
            <EnhancedElementToolbox
              onElementSelect={(element) => {
                console.log('Element selected:', element.name)
              }}
              className="h-full"
            />
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-slate-900/20">
            {/* Enhanced Toolbar */}
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
            />

            {/* Duplication System */}
            <div className="px-4 py-2 border-b border-slate-700/50">
              <DuplicationSystem
                selectedElements={selectedElements}
                onDuplicate={handleDuplication}
              />
            </div>

            <div className="flex-1 p-4">
              <div className="relative w-full h-full bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={siteMap.width}
                  height={siteMap.height}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onClick={handleCanvasClick}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    cursor: selectedTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          {selectedElement && (
            <div className="w-80 bg-slate-800/30 border-l border-slate-700/50 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-300">Properties</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedElement(null)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>

                {(() => {
                  const element = elements.find(e => e.id === selectedElement)
                  if (!element) return null

                  return (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-slate-400">Label</Label>
                        <Input
                          value={element.label}
                          onChange={(e) => {
                            setElements(prev => prev.map(el => 
                              el.id === selectedElement 
                                ? { ...el, label: e.target.value }
                                : el
                            ))
                          }}
                          className="bg-slate-700/50 border-slate-600 text-white text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-400">X Position</Label>
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
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Y Position</Label>
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
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-400">Width</Label>
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
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Height</Label>
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
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-400">Fill Color</Label>
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
                            className="w-8 h-8 rounded border border-slate-600 bg-slate-700"
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
                            className="bg-slate-700/50 border-slate-600 text-white text-sm flex-1"
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
                        className="w-full"
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

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>•</span>
            <span>Elements: {elements.length}</span>
            <span>•</span>
            <span>Tool: {tools.find(t => t.id === selectedTool)?.label}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <Share className="h-3 w-3 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <Download className="h-3 w-3 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => onSave?.(siteMap)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
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
export function SiteMapViewer(props: SiteMapViewerProps) {
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
      <SiteMapViewerContent {...props} />
    </DragDropProvider>
  )
}
