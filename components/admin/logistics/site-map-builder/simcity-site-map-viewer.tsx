'use client'

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ZoomIn, ZoomOut, RotateCcw, Save, Edit3, Trash2, Eye, EyeOff,
  Layers, Grid, Move, Square, Circle, Triangle, MapPin, Zap, Truck,
  Building, Users, Settings, Download, Share, Lock, Unlock, Plus,
  Minus, Maximize, Minimize, Palette, Type, Image, Upload,
  MoreHorizontal, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Hand, Search, Filter, Star, Copy, RotateCw, FlipHorizontal,
  FlipVertical, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter, Ruler, AlertTriangle, MousePointer, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
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

interface SimCitySiteMapViewerProps {
  siteMap: SiteMap
  onClose: () => void
  onSave?: (siteMap: SiteMap) => void
  onDelete?: (siteMapId: string) => void
}

export function SimCitySiteMapViewer({ siteMap, onClose, onSave, onDelete }: SimCitySiteMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [elements, setElements] = useState<SiteMapElement[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const [gridSize, setGridSize] = useState(20)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('elements')
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedElementForPlacement, setSelectedElementForPlacement] = useState<CannedElement | null>(null)
  const [highlightedGridCells, setHighlightedGridCells] = useState<Array<{x: number, y: number}>>([])
  const [isValidPlacement, setIsValidPlacement] = useState(true)

  // Grid utility functions
  const snapToGridPosition = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y }
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    }
  }, [snapToGrid, gridSize])

  const getGridAlignedDimensions = useCallback((width: number, height: number) => {
    if (!snapToGrid) return { width, height }
    return {
      width: Math.max(gridSize, Math.round(width / gridSize) * gridSize),
      height: Math.max(gridSize, Math.round(height / gridSize) * gridSize)
    }
  }, [snapToGrid, gridSize])

  const getOccupiedGridCells = useCallback((x: number, y: number, width: number, height: number) => {
    const cells: Array<{x: number, y: number}> = []
    const gridX = Math.floor(x / gridSize)
    const gridY = Math.floor(y / gridSize)
    const gridWidth = Math.ceil(width / gridSize)
    const gridHeight = Math.ceil(height / gridSize)
    
    for (let gy = gridY; gy < gridY + gridHeight; gy++) {
      for (let gx = gridX; gx < gridX + gridWidth; gx++) {
        cells.push({ x: gx * gridSize, y: gy * gridSize })
      }
    }
    return cells
  }, [gridSize])

  const checkPlacementValidity = useCallback((x: number, y: number, width: number, height: number) => {
    // Check if placement is within canvas bounds
    if (x < 0 || y < 0 || x + width > siteMap.width || y + height > siteMap.height) {
      return false
    }
    
    // Check for collisions with existing elements
    return !elements.some(element => 
      x < element.x + element.width &&
      x + width > element.x &&
      y < element.y + element.height &&
      y + height > element.y
    )
  }, [elements, siteMap.width, siteMap.height])

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
    if (showGrid) {
      // Draw highlighted grid cells first (SimCity-style)
      if (highlightedGridCells.length > 0) {
        highlightedGridCells.forEach(cell => {
          ctx.fillStyle = isValidPlacement 
            ? 'rgba(34, 197, 94, 0.3)' // Green for valid placement
            : 'rgba(239, 68, 68, 0.3)' // Red for invalid placement
          ctx.fillRect(cell.x, cell.y, gridSize, gridSize)
          
          // Draw border for highlighted cells
          ctx.strokeStyle = isValidPlacement 
            ? 'rgba(34, 197, 94, 0.8)' 
            : 'rgba(239, 68, 68, 0.8)'
          ctx.lineWidth = 2
          ctx.strokeRect(cell.x, cell.y, gridSize, gridSize)
        })
      }
      
      // Draw major grid lines (every 5th line)
      const majorGridSize = gridSize * 5
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'
      ctx.lineWidth = 1.5
      
      for (let x = 0; x <= siteMap.width; x += majorGridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, siteMap.height)
        ctx.stroke()
      }
      
      for (let y = 0; y <= siteMap.height; y += majorGridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(siteMap.width, y)
        ctx.stroke()
      }
      
      // Draw minor grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
      ctx.lineWidth = 0.5
      
      for (let x = 0; x <= siteMap.width; x += gridSize) {
        if (x % majorGridSize !== 0) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, siteMap.height)
          ctx.stroke()
        }
      }
      
      for (let y = 0; y <= siteMap.height; y += gridSize) {
        if (y % majorGridSize !== 0) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(siteMap.width, y)
          ctx.stroke()
        }
      }
      
      // Draw grid cell borders for better visibility
      if (selectedElementForPlacement && snapToGrid) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)'
        ctx.lineWidth = 0.5
        
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
    }

    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element)
    })

    // Draw placement preview
    if (selectedElementForPlacement && hoverPosition) {
      drawPlacementPreview(ctx, selectedElementForPlacement, hoverPosition)
    }

    ctx.restore()
  }, [siteMap, elements, zoom, pan, showGrid, selectedElementForPlacement, hoverPosition])

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

  const drawPlacementPreview = (ctx: CanvasRenderingContext2D, element: CannedElement, position: { x: number; y: number }) => {
    ctx.save()
    
    // Snap position to grid and align dimensions
    const snappedPosition = snapToGridPosition(position.x, position.y)
    const alignedDimensions = getGridAlignedDimensions(element.width, element.height)
    
    // Center the element on the snapped position
    const centeredX = snappedPosition.x - alignedDimensions.width / 2
    const centeredY = snappedPosition.y - alignedDimensions.height / 2
    const finalPosition = snapToGridPosition(centeredX, centeredY)
    
    // Check placement validity
    const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
    
    // Draw semi-transparent preview with validity color
    const previewColor = isValid 
      ? element.color.replace('0.3', '0.6') 
      : 'rgba(239, 68, 68, 0.6)' // Red for invalid
    
    ctx.fillStyle = previewColor
    ctx.strokeStyle = isValid ? element.strokeColor : '#ef4444'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    ctx.fillRect(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
    ctx.strokeRect(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
    
    // Draw enhanced grid alignment indicator
    if (snapToGrid) {
      ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444' // Green for valid, red for invalid
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.strokeRect(finalPosition.x - 2, finalPosition.y - 2, alignedDimensions.width + 4, alignedDimensions.height + 4)
    }
    
    // Draw label with validity indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(finalPosition.x, finalPosition.y + alignedDimensions.height - 30, alignedDimensions.width, 30)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.name, finalPosition.x + alignedDimensions.width / 2, finalPosition.y + alignedDimensions.height - 15)
    
    // Draw validity status
    ctx.font = '10px Inter, sans-serif'
    ctx.fillStyle = isValid ? '#22c55e' : '#ef4444'
    ctx.fillText(isValid ? 'VALID' : 'INVALID', finalPosition.x + alignedDimensions.width / 2, finalPosition.y + alignedDimensions.height - 5)
    
    ctx.restore()
  }

  // Event handlers
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const rawX = (event.clientX - rect.left - pan.x) / zoom
    const rawY = (event.clientY - rect.top - pan.y) / zoom

    if (selectedElementForPlacement) {
      // Snap position to grid and align dimensions
      const snappedPosition = snapToGridPosition(rawX, rawY)
      const alignedDimensions = getGridAlignedDimensions(selectedElementForPlacement.width, selectedElementForPlacement.height)
      
      // Center the element on the snapped position
      const centeredX = snappedPosition.x - alignedDimensions.width / 2
      const centeredY = snappedPosition.y - alignedDimensions.height / 2
      
      // Final snap to ensure element is grid-aligned
      const finalPosition = snapToGridPosition(centeredX, centeredY)
      
      // Check if placement is valid before placing
      const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
      
      if (isValid) {
        // Place the selected element
        const newElement: SiteMapElement = {
          id: `element_${Date.now()}`,
          type: selectedElementForPlacement.id,
          x: finalPosition.x,
          y: finalPosition.y,
          width: alignedDimensions.width,
          height: alignedDimensions.height,
          rotation: 0,
          fill: selectedElementForPlacement.color,
          stroke: selectedElementForPlacement.strokeColor,
          strokeWidth: 2,
          label: selectedElementForPlacement.name,
          data: selectedElementForPlacement.properties
        }
        setElements(prev => [...prev, newElement])
        
        // Clear selection after successful placement
        setSelectedElementForPlacement(null)
        setSelectedTool('select')
        setHighlightedGridCells([])
        setIsValidPlacement(true)
      }
      // If invalid, don't place - just keep the preview showing
    } else {
      // Select existing element
      const clickedElement = elements.find(element => 
        rawX >= element.x && rawX <= element.x + element.width &&
        rawY >= element.y && rawY <= element.y + element.height
      )

      if (clickedElement) {
        setSelectedElement(clickedElement.id)
        setSelectedElements([clickedElement.id])
      } else {
        setSelectedElement(null)
        setSelectedElements([])
      }
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedElementForPlacement) {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const rawX = (event.clientX - rect.left - pan.x) / zoom
      const rawY = (event.clientY - rect.top - pan.y) / zoom
      
      // Snap hover position to grid for preview
      const snappedPosition = snapToGridPosition(rawX, rawY)
      setHoverPosition(snappedPosition)
      
      // Calculate highlighted grid cells
      const alignedDimensions = getGridAlignedDimensions(selectedElementForPlacement.width, selectedElementForPlacement.height)
      const centeredX = snappedPosition.x - alignedDimensions.width / 2
      const centeredY = snappedPosition.y - alignedDimensions.height / 2
      const finalPosition = snapToGridPosition(centeredX, centeredY)
      
      const cells = getOccupiedGridCells(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
      setHighlightedGridCells(cells)
      
      // Check placement validity
      const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
      setIsValidPlacement(isValid)
    }
  }

  const handleElementSelect = (element: CannedElement) => {
    setSelectedElementForPlacement(element)
    setSelectedTool('place')
    setHoverPosition(null)
    setHighlightedGridCells([])
    setIsValidPlacement(true)
  }

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool)
    setSelectedElementForPlacement(null)
    setHoverPosition(null)
    setHighlightedGridCells([])
    setIsValidPlacement(true)
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
        {/* Futuristic Header */}
        <div className="relative p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 rounded-t-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.1)_0%,transparent_70%)]"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative p-3 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-2xl shadow-xl border border-white/20">
                  <MapPin className="h-6 w-6 text-white drop-shadow-lg" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/50 to-blue-500/50 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
                  {siteMap.name}
                </h1>
                <div className="flex items-center gap-4">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm transition-all duration-200",
                      siteMap.status === 'published' 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/20" 
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-amber-500/20"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full mr-2", siteMap.status === 'published' ? "bg-emerald-400 animate-pulse" : "bg-amber-400")}></div>
                    {siteMap.status}
                  </Badge>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-600/30 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-slate-300 font-mono">
                      {siteMap.width} × {siteMap.height}px
                    </span>
                  </div>
                </div>
                {siteMap.description && (
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed">{siteMap.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-11 w-11 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "h-11 w-11 rounded-2xl transition-all duration-300 border backdrop-blur-sm hover:scale-105",
                  isEditing 
                    ? "text-purple-300 bg-purple-500/20 border-purple-500/40 shadow-purple-500/20 shadow-lg" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50 border-slate-700/30 hover:shadow-lg"
                )}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-11 w-11 rounded-2xl text-slate-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Futuristic Left Sidebar - Element Library */}
          <div className="w-80 border-r border-slate-700/30 bg-gradient-to-b from-slate-900/40 via-slate-800/40 to-slate-900/40 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-blue-500/5"></div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col relative z-10">
              <div className="p-6 border-b border-slate-700/30">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 border border-slate-700/40 backdrop-blur-xl rounded-2xl p-1 shadow-2xl">
                  <TabsTrigger 
                    value="elements" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Elements
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tools" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Tools
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="elements" className="h-full mt-0">
                  <ElementLibrary 
                    onElementSelect={handleElementSelect}
                    selectedElement={selectedElementForPlacement}
                    className="h-full bg-transparent"
                  />
                </TabsContent>

                <TabsContent value="tools" className="h-full mt-0 p-4">
                  <ToolPalette 
                    selectedTool={selectedTool}
                    onToolSelect={handleToolSelect}
                    className="h-full"
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Futuristic Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.08)_0%,transparent_70%)]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/5 to-purple-500/5"></div>
            {/* Futuristic Toolbar */}
            <div className="p-6 border-b border-slate-700/30 backdrop-blur-sm relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedElementForPlacement && (
                    <div className="flex items-center gap-4 px-5 py-3 bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-2xl border border-slate-600/40 backdrop-blur-xl shadow-lg">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-sm opacity-60"></div>
                        <div className="relative p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                          {selectedElementForPlacement.icon && <selectedElementForPlacement.icon className="h-5 w-5 text-white drop-shadow-lg" />}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-semibold tracking-tight">{selectedElementForPlacement.name}</span>
                        <span className="text-xs text-slate-400 font-medium">Click to place on canvas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-green-400/50"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedElementForPlacement(null)
                            setSelectedTool('select')
                            setHoverPosition(null)
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {!selectedElementForPlacement && (
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-400 font-medium">Active Tool:</div>
                      <Badge 
                        variant="outline" 
                        className="text-sm text-slate-300 border-slate-600/50 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm px-3 py-1.5 rounded-xl font-medium shadow-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          {selectedTool}
                        </div>
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Grid Controls */}
                  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                      className={cn(
                        "h-6 w-6 p-0 rounded transition-all duration-200",
                        showGrid ? "text-purple-400 bg-purple-500/20" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      <Grid className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={cn(
                        "h-6 w-6 p-0 rounded transition-all duration-200",
                        snapToGrid ? "text-green-400 bg-green-500/20" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      )}
                      title="Snap to Grid"
                    >
                      ⚡
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGridSize(prev => Math.max(10, prev - 5))}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-slate-300 w-8 text-center font-mono">
                        {gridSize}px
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGridSize(prev => Math.min(100, prev + 5))}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
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
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 relative z-10">
              <div className="relative w-full h-full bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 rounded-3xl border border-slate-700/40 overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.05)_0%,transparent_70%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/3 to-purple-500/3"></div>
                <canvas
                  ref={canvasRef}
                  width={siteMap.width}
                  height={siteMap.height}
                  className="absolute inset-0 w-full h-full rounded-3xl"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onWheel={(e) => {
                    e.preventDefault()
                    const delta = e.deltaY > 0 ? 0.9 : 1.1
                    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)))
                  }}
                  style={{
                    cursor: selectedElementForPlacement 
                      ? (isValidPlacement ? 'crosshair' : 'not-allowed')
                      : selectedTool === 'select' ? 'default' : 'crosshair'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Futuristic Status Bar */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700/30 bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5"></div>
          <div className="relative flex items-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-blue-400/50"></div>
              <span className="font-medium text-slate-300">Zoom: {Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-purple-400 rounded-full shadow-purple-400/50"></div>
              <span className="font-medium text-slate-300">Elements: {elements.length}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-emerald-400/50"></div>
              <span className="font-medium text-slate-300">Grid: {gridSize}px</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <div className={cn("w-2 h-2 rounded-full shadow-lg", snapToGrid ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-slate-500")}></div>
              <span className="font-medium text-slate-300">Snap: {snapToGrid ? "ON" : "OFF"}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-amber-400 rounded-full shadow-amber-400/50"></div>
              <span className="font-medium text-slate-300">Tool: {selectedTool}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => onSave?.(siteMap)}
              className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 px-6 py-2.5 font-semibold backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Site Map
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Element Library Component
function ElementLibrary({ onElementSelect, selectedElement, className }: {
  onElementSelect: (element: CannedElement) => void
  selectedElement: CannedElement | null
  className?: string
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Group elements by category
  const categorizedElements = CANNED_ELEMENTS.reduce((acc, element) => {
    const category = element.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(element)
    return acc
  }, {} as Record<string, typeof CANNED_ELEMENTS>)

  const categories = Array.from(new Set(CANNED_ELEMENTS.map(el => el.category))).sort()
  const filteredElements = CANNED_ELEMENTS.filter(element => {
    const matchesSearch = element.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || element.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categoryIcons = {
    'infrastructure': Building,
    'venue': MapPin,
    'performance': Users,
    'furniture': Square,
    'food': Users,
    'security': Users,
    'transportation': Truck,
    'technology': Zap
  }

  const categoryColors = {
    'infrastructure': 'from-green-500 to-teal-500',
    'venue': 'from-purple-500 to-indigo-500',
    'performance': 'from-pink-500 to-rose-500',
    'furniture': 'from-amber-500 to-orange-500',
    'food': 'from-orange-500 to-red-500',
    'security': 'from-red-500 to-pink-500',
    'transportation': 'from-gray-500 to-slate-500',
    'technology': 'from-blue-500 to-cyan-500'
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Search */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-2 border-b border-slate-700/30">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "whitespace-nowrap rounded-lg transition-all duration-200",
              selectedCategory === "all"
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            )}
          >
            All
          </Button>
          {categories.map(category => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Square
            const colorClass = categoryColors[category as keyof typeof categoryColors] || 'from-gray-500 to-slate-500'
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-lg transition-all duration-200 flex items-center gap-1",
                  selectedCategory === category
                    ? "text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
                style={selectedCategory === category ? {
                  background: `linear-gradient(to right, var(--${colorClass.split(' ')[0].replace('from-', '')}), var(--${colorClass.split(' ')[2].replace('to-', '')}))`
                } : undefined}
              >
                <Icon className="h-3 w-3" />
                <span className="capitalize">{category}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Elements */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2 py-4">
          {(selectedCategory === "all" ? 
            categories.map(category => {
              const categoryElements = categorizedElements[category]
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || Square
              const colorClass = categoryColors[category as keyof typeof categoryColors] || 'from-gray-500 to-slate-500'
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className={cn("p-1.5 rounded-lg bg-gradient-to-r", colorClass)}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-300 capitalize">{category}</h3>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                      {categoryElements.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1">
                    {categoryElements.map(element => (
                      <Button
                        key={element.id}
                        variant={selectedElement?.id === element.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onElementSelect(element)}
                        className={cn(
                          "h-auto p-3 justify-start rounded-xl transition-all duration-200",
                          selectedElement?.id === element.id
                            ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50 border border-slate-700/20 hover:border-slate-600/40"
                        )}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={cn("p-2 rounded-lg bg-gradient-to-r", colorClass)}>
                            {element.icon ? <element.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium truncate">{element.name}</div>
                            <div className="text-xs opacity-70 truncate">{element.description}</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                              {element.width}×{element.height}
                            </Badge>
                            {selectedElement?.id === element.id && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )
            }) : 
            filteredElements.map(element => (
              <Button
                key={element.id}
                variant={selectedElement?.id === element.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onElementSelect(element)}
                className={cn(
                  "h-auto p-3 justify-start rounded-xl transition-all duration-200",
                  selectedElement?.id === element.id
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50 border border-slate-700/20 hover:border-slate-600/40"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500">
                    {element.icon ? <element.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium truncate">{element.name}</div>
                    <div className="text-xs opacity-70 truncate">{element.description}</div>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                    {element.width}×{element.height}
                  </Badge>
                </div>
              </Button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Tool Palette Component
function ToolPalette({ selectedTool, onToolSelect, className }: {
  selectedTool: string
  onToolSelect: (tool: string) => void
  className?: string
}) {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select', description: 'Select and move elements' },
    { id: 'pan', icon: Hand, label: 'Pan', description: 'Move around the canvas' },
    { id: 'measure', icon: Ruler, label: 'Measure', description: 'Measure distances and areas' },
    { id: 'delete', icon: Trash2, label: 'Delete', description: 'Remove selected elements' }
  ]

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-semibold text-slate-300">Tools</h3>
      <div className="space-y-2">
        {tools.map(tool => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "w-full h-auto p-3 justify-start rounded-xl transition-all duration-200",
              selectedTool === tool.id
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50 border border-slate-700/20 hover:border-slate-600/40"
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                "p-2 rounded-lg transition-all duration-200",
                selectedTool === tool.id 
                  ? "bg-white/20" 
                  : "bg-slate-700/50"
              )}>
                <tool.icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{tool.label}</div>
                <div className="text-xs opacity-70">{tool.description}</div>
              </div>
              {selectedTool === tool.id && (
                <Check className="h-4 w-4 text-white" />
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
