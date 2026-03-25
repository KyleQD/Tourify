"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Grid3X3, 
  Target,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MousePointer,
  Hand,
  Ruler,
  Square,
  Circle,
  Type,
  AlertTriangle,
  Save,
  Undo,
  Redo,
  Download,
  Upload,
  Settings
} from "lucide-react"
import { useDragDrop, useDropZone, DragItem, DropZone } from "@/contexts/site-map/drag-drop-context"
import { SiteMapElement, CanvasMeasurement, MapIssue } from "@/types/site-map"

interface CanvasRendererProps {
  siteMapId: string
  elements: SiteMapElement[]
  measurements: CanvasMeasurement[]
  issues: MapIssue[]
  onElementCreate: (element: Partial<SiteMapElement>) => void
  onElementUpdate: (elementId: string, updates: Partial<SiteMapElement>) => void
  onElementDelete: (elementId: string) => void
  onMeasurementCreate: (measurement: Partial<CanvasMeasurement>) => void
  onIssueCreate: (issue: Partial<MapIssue>) => void
  className?: string
}

interface CanvasState {
  zoom: number
  panX: number
  panY: number
  gridVisible: boolean
  snapToGrid: boolean
  gridSize: number
  activeTool: string
  selectedElements: string[]
  showGrid: boolean
}

export function CanvasRenderer({
  siteMapId,
  elements,
  measurements,
  issues,
  onElementCreate,
  onElementUpdate,
  onElementDelete,
  onMeasurementCreate,
  onIssueCreate,
  className = ""
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    gridVisible: true,
    snapToGrid: true,
    gridSize: 20,
    activeTool: 'select',
    selectedElements: [],
    showGrid: true
  })
  
  const { 
    config, 
    updateConfig, 
    dragState, 
    startDrag, 
    updateDrag, 
    endDrag,
    snapToGrid,
    selectedItems,
    selectItem
  } = useDragDrop()
  
  // Canvas tools configuration
  const canvasTools = [
    { id: 'select', name: 'Select', icon: MousePointer, cursor: 'default' },
    { id: 'pan', name: 'Pan', icon: Hand, cursor: 'grab' },
    { id: 'measure', name: 'Measure', icon: Ruler, cursor: 'crosshair' },
    { id: 'rectangle', name: 'Rectangle', icon: Square, cursor: 'crosshair' },
    { id: 'circle', name: 'Circle', icon: Circle, cursor: 'crosshair' },
    { id: 'text', name: 'Text', icon: Type, cursor: 'text' },
    { id: 'issue', name: 'Report Issue', icon: AlertTriangle, cursor: 'crosshair' }
  ]
  
  // Set up drop zone for the canvas
  const canvasDropZone: DropZone = {
    id: 'canvas-drop-zone',
    bounds: { x: 0, y: 0, width: 1000, height: 1000 }, // Will be updated dynamically
    accepts: ['element', 'zone', 'tent', 'equipment', 'custom'],
    onDrop: handleElementDrop,
    onHover: handleElementHover,
    onLeave: handleElementLeave
  }
  
  useDropZone(canvasDropZone)
  
  function handleElementDrop(item: DragItem, position: { x: number; y: number }) {
    const snappedPosition = snapToGrid(position)
    
    const newElement: Partial<SiteMapElement> = {
      name: item.data.name || 'New Element',
      elementType: item.type as any,
      x: snappedPosition.x,
      y: snappedPosition.y,
      width: item.data.width || 100,
      height: item.data.height || 100,
      rotation: 0,
      color: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 1,
      opacity: 1,
      properties: {
        ...item.data,
        category: item.category,
        visible: true,
        locked: false,
        scale: 1
      }
    }
    
    onElementCreate(newElement)
  }
  
  function handleElementHover(item: DragItem, position: { x: number; y: number }) {
    // Visual feedback for valid drop position
    console.log('Hovering over canvas with:', item.data.name)
  }
  
  function handleElementLeave() {
    // Clear hover feedback
    console.log('Left canvas drop zone')
  }
  
  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Apply transformations
    ctx.save()
    ctx.translate(canvasState.panX, canvasState.panY)
    ctx.scale(canvasState.zoom, canvasState.zoom)
    
    // Draw grid
    if (canvasState.showGrid) {
      drawGrid(ctx, canvas.width, canvas.height)
    }
    
    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element)
    })
    
    // Draw measurements
    measurements.forEach(measurement => {
      drawMeasurement(ctx, measurement)
    })
    
    // Draw issues
    issues.forEach(issue => {
      drawIssue(ctx, issue)
    })
    
    // Draw drag preview
    if (dragState.isDragging && dragState.previewPosition) {
      drawDragPreview(ctx, dragState.draggedItem, dragState.previewPosition)
    }
    
    // Draw selection
    selectedItems.forEach(elementId => {
      const element = elements.find(e => e.id === elementId)
      if (element) {
        drawSelection(ctx, element)
      }
    })
    
    ctx.restore()
  }, [canvasState, elements, measurements, issues, dragState, selectedItems])
  
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1 / canvasState.zoom
    ctx.setLineDash([])
    
    const gridSize = canvasState.gridSize
    
    // Vertical lines
    for (let x = 0; x < width / canvasState.zoom; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height / canvasState.zoom)
      ctx.stroke()
    }
    
    // Horizontal lines
    for (let y = 0; y < height / canvasState.zoom; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width / canvasState.zoom, y)
      ctx.stroke()
    }
  }
  
  const drawElement = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.save()
    
    // Apply transformations
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    ctx.rotate(element.rotation * Math.PI / 180)
    ctx.globalAlpha = element.opacity
    
    // Draw element based on type
    ctx.fillStyle = element.color
    ctx.strokeStyle = element.strokeColor || '#000'
    ctx.lineWidth = element.strokeWidth
    
    switch (element.elementType) {
      case 'building':
      case 'sign':
      case 'marker':
        ctx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height)
        ctx.strokeRect(-element.width / 2, -element.height / 2, element.width, element.height)
        break
      
      case 'tree':
        ctx.beginPath()
        ctx.arc(0, 0, element.width / 2, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        break
      
      case 'path':
      case 'road':
      case 'fence':
        ctx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height)
        ctx.strokeRect(-element.width / 2, -element.height / 2, element.width, element.height)
        break
      
      default:
        // Draw as rectangle for unknown types
        ctx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height)
        ctx.strokeRect(-element.width / 2, -element.height / 2, element.width, element.height)
    }
    
    // Draw element label
    if (element.name) {
      ctx.fillStyle = '#000'
      ctx.font = `${12}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(element.name, 0, element.height / 2 + 5)
    }
    
    ctx.restore()
  }
  
  const drawMeasurement = (ctx: CanvasRenderingContext2D, measurement: CanvasMeasurement) => {
    ctx.strokeStyle = measurement.color || '#ef4444'
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
    
    ctx.fillStyle = measurement.color || '#ef4444'
    ctx.font = `${12 / canvasState.zoom}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText(`${measurement.value?.toFixed(1)}m`, midX, midY)
  }
  
  const drawIssue = (ctx: CanvasRenderingContext2D, issue: MapIssue) => {
    const color = issue.severity === 'critical' ? '#ef4444' : 
                 issue.severity === 'high' ? '#f59e0b' : 
                 issue.severity === 'medium' ? '#3b82f6' : '#10b981'
    
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(issue.x, issue.y, 8 / canvasState.zoom, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = `${10 / canvasState.zoom}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('!', issue.x, issue.y + 3 / canvasState.zoom)
  }
  
  const drawDragPreview = (ctx: CanvasRenderingContext2D, item: DragItem | null, position: { x: number; y: number }) => {
    if (!item) return
    
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#3b82f6'
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2 / canvasState.zoom
    
    const width = item.data.width || 100
    const height = item.data.height || 100
    
    ctx.fillRect(position.x, position.y, width, height)
    ctx.strokeRect(position.x, position.y, width, height)
    
    // Draw preview label
    ctx.fillStyle = '#000'
    ctx.font = `${12 / canvasState.zoom}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText(item.data.name || 'Element', position.x + width / 2, position.y + height / 2)
    
    ctx.restore()
  }
  
  const drawSelection = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2 / canvasState.zoom
    ctx.setLineDash([5 / canvasState.zoom, 5 / canvasState.zoom])
    
    ctx.strokeRect(element.x, element.y, element.width, element.height)
    
    // Draw selection handles
    const handleSize = 8 / canvasState.zoom
    const handles = [
      { x: element.x - handleSize / 2, y: element.y - handleSize / 2 },
      { x: element.x + element.width - handleSize / 2, y: element.y - handleSize / 2 },
      { x: element.x + element.width - handleSize / 2, y: element.y + element.height - handleSize / 2 },
      { x: element.x - handleSize / 2, y: element.y + element.height - handleSize / 2 }
    ]
    
    ctx.fillStyle = '#3b82f6'
    ctx.setLineDash([])
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    })
    
    ctx.restore()
  }
  
  // Event handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - canvasState.panX) / canvasState.zoom
    const y = (e.clientY - rect.top - canvasState.panY) / canvasState.zoom
    
    if (canvasState.activeTool === 'select') {
      // Find clicked element
      const clickedElement = elements.find(element => 
        x >= element.x && x <= element.x + element.width &&
        y >= element.y && y <= element.y + element.height
      )
      
      if (clickedElement) {
        selectItem(clickedElement.id, e.ctrlKey || e.metaKey)
      } else {
        selectItem('', false) // Clear selection
      }
    }
  }
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragState.isDragging) {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      updateDrag({ x, y })
    }
  }
  
  const handleCanvasMouseUp = () => {
    if (dragState.isDragging) {
      endDrag()
    }
  }
  
  // Zoom and pan controls
  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.8
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * factor))
    }))
  }
  
  const handleResetView = () => {
    setCanvasState(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0
    }))
  }
  
  const handleGridToggle = () => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }))
  }
  
  const handleSnapToggle = () => {
    updateConfig({ snapToGrid: !config.snapToGrid })
  }
  
  const handleToolSelect = (toolId: string) => {
    setCanvasState(prev => ({
      ...prev,
      activeTool: toolId
    }))
  }
  
  // Update canvas when dependencies change
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])
  
  // Update drop zone bounds when canvas size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      canvasDropZone.bounds = {
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height
      }
    }
  }, [canvasState.zoom, canvasState.panX, canvasState.panY])
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Tools */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-slate-50/50">
              {canvasTools.map((tool) => {
                const IconComponent = tool.icon
                return (
                  <Button
                    key={tool.id}
                    variant={canvasState.activeTool === tool.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleToolSelect(tool.id)}
                    className={`rounded-none first:rounded-l-md last:rounded-r-md transition-all duration-200 ${
                      canvasState.activeTool === tool.id 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </Button>
                )
              })}
            </div>
            
            {/* Grid and snap controls */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant={canvasState.showGrid ? "default" : "outline"}
                size="sm"
                onClick={handleGridToggle}
                className={`transition-all duration-200 ${
                  canvasState.showGrid 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'hover:bg-green-50 border-green-200'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              
              <Button
                variant={config.snapToGrid ? "default" : "outline"}
                size="sm"
                onClick={handleSnapToggle}
                className={`transition-all duration-200 ${
                  config.snapToGrid 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'hover:bg-purple-50 border-purple-200'
                }`}
              >
                <Target className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Zoom and view controls */}
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
            
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="h-4 w-4" />
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
      
      {/* Canvas */}
      <div className="flex-1 relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{ 
            cursor: canvasTools.find(t => t.id === canvasState.activeTool)?.cursor || 'default'
          }}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 text-sm shadow-lg border border-slate-200/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-slate-700">
                {canvasTools.find(t => t.id === canvasState.activeTool)?.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600">{Math.round(canvasState.zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600">{canvasState.gridSize}m</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600">{elements.length}</span>
            </div>
            {selectedItems.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                {selectedItems.length} selected
              </Badge>
            )}
          </div>
        </div>
        
        {/* Drag overlay */}
        {dragState.isDragging && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute w-4 h-4 bg-blue-500 rounded-full transform -translate-x-2 -translate-y-2"
              style={{
                left: dragState.dragPosition?.x,
                top: dragState.dragPosition?.y
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
