'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ZoomIn, 
  ZoomOut, 
  Grid3X3, 
  Target, 
  Ruler, 
  Square, 
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-react'
import { 
  Measurement, 
  MeasurementPoint, 
  ComplianceCheck, 
  MeasurementCanvasState,
  MEASUREMENT_UTILS,
  DEFAULT_COMPLIANCE_RULES
} from '@/types/measurements'

interface MeasurementCanvasProps {
  width: number
  height: number
  measurements: Measurement[]
  onMeasurementCreate: (measurement: Partial<Measurement>) => void
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void
  onMeasurementDelete: (id: string) => void
  activeTool: string | null
  config: {
    snapToGrid: boolean
    gridSize: number
    showGrid: boolean
    showMeasurements: boolean
    showCompliance: boolean
    defaultUnit: string
    precision: number
  }
  enabledComplianceRules: string[]
  className?: string
}

export function MeasurementCanvas({
  width,
  height,
  measurements,
  onMeasurementCreate,
  onMeasurementUpdate,
  onMeasurementDelete,
  activeTool,
  config,
  enabledComplianceRules,
  className
}: MeasurementCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasState, setCanvasState] = useState<MeasurementCanvasState>({
    activeTool,
    currentMeasurement: null,
    isDrawing: false,
    points: [],
    hoverPoint: null,
    selectedMeasurement: null,
    showGrid: config.showGrid,
    showMeasurements: config.showMeasurements,
    showCompliance: config.showCompliance
  })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Drawing tools configuration
  const drawingTools = {
    distance: {
      icon: Ruler,
      cursor: 'crosshair',
      minPoints: 2,
      maxPoints: 2
    },
    area: {
      icon: Square,
      cursor: 'crosshair',
      minPoints: 3,
      maxPoints: Infinity
    },
    clearance: {
      icon: Shield,
      cursor: 'crosshair',
      minPoints: 2,
      maxPoints: 2
    },
    perimeter: {
      icon: Square,
      cursor: 'crosshair',
      minPoints: 3,
      maxPoints: Infinity
    },
    angle: {
      icon: Target,
      cursor: 'crosshair',
      minPoints: 3,
      maxPoints: 3
    }
  }

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    }
  }, [zoom, pan])

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + pan.x,
      y: canvasY * zoom + pan.y
    }
  }, [zoom, pan])

  // Snap to grid if enabled
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!config.snapToGrid) return { x, y }
    
    const gridSize = config.gridSize * zoom
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    }
  }, [config.snapToGrid, config.gridSize, zoom])

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool || !drawingTools[activeTool as keyof typeof drawingTools]) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const snapped = snapToGrid(x, y)
    const canvasCoords = screenToCanvas(snapped.x, snapped.y)

    setCanvasState(prev => ({
      ...prev,
      isDrawing: true,
      points: [{
        ...canvasCoords,
        id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }]
    }))
  }, [activeTool, screenToCanvas, snapToGrid])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasState.isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const snapped = snapToGrid(x, y)
    const canvasCoords = screenToCanvas(snapped.x, snapped.y)

    setCanvasState(prev => ({
      ...prev,
      hoverPoint: {
        ...canvasCoords,
        id: `hover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    }))
  }, [canvasState.isDrawing, screenToCanvas, snapToGrid])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!canvasState.isDrawing || !activeTool) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const snapped = snapToGrid(x, y)
    const canvasCoords = screenToCanvas(snapped.x, snapped.y)

    const tool = drawingTools[activeTool as keyof typeof drawingTools]
    const newPoints = [...canvasState.points, {
      ...canvasCoords,
      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }]

    // Check if we have enough points for this tool
    if (newPoints.length >= tool.minPoints) {
      // Calculate measurement value
      let value = 0
      let measurementType: 'distance' | 'area' | 'perimeter' | 'angle' | 'clearance' = 'distance'

      switch (activeTool) {
        case 'distance':
        case 'clearance':
          value = MEASUREMENT_UTILS.calculateDistance(newPoints[0], newPoints[1])
          measurementType = activeTool as 'distance' | 'clearance'
          break
        case 'area':
          value = MEASUREMENT_UTILS.calculateArea(newPoints)
          measurementType = 'area'
          break
        case 'perimeter':
          value = MEASUREMENT_UTILS.calculatePerimeter(newPoints)
          measurementType = 'perimeter'
          break
        case 'angle':
          value = MEASUREMENT_UTILS.calculateAngle(newPoints[0], newPoints[1], newPoints[2])
          measurementType = 'angle'
          break
      }

      // Create new measurement
      const newMeasurement: Partial<Measurement> = {
        type: measurementType,
        points: newPoints,
        value,
        unit: config.defaultUnit as 'meters' | 'feet' | 'inches' | 'centimeters',
        label: `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} ${measurements.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      onMeasurementCreate(newMeasurement)
    }

    setCanvasState(prev => ({
      ...prev,
      isDrawing: false,
      points: [],
      hoverPoint: null
    }))
  }, [canvasState.isDrawing, canvasState.points, activeTool, screenToCanvas, snapToGrid, measurements.length, config.defaultUnit, onMeasurementCreate])

  // Drawing functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!config.showGrid) return

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1 / zoom
    ctx.setLineDash([5 / zoom, 5 / zoom])

    const gridSize = config.gridSize * zoom
    const startX = Math.floor(pan.x / gridSize) * gridSize
    const startY = Math.floor(pan.y / gridSize) * gridSize

    // Vertical lines
    for (let x = startX; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal lines
    for (let y = startY; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }, [config.showGrid, config.gridSize, zoom, pan, width, height])

  const drawMeasurement = useCallback((ctx: CanvasRenderingContext2D, measurement: Measurement) => {
    if (measurement.points.length === 0) return

    ctx.strokeStyle = '#3b82f6'
    ctx.fillStyle = '#3b82f6'
    ctx.lineWidth = 2 / zoom
    ctx.setLineDash([])

    // Draw measurement lines
    if (measurement.type === 'distance' || measurement.type === 'clearance') {
      const p1 = canvasToScreen(measurement.points[0].x, measurement.points[0].y)
      const p2 = canvasToScreen(measurement.points[1].x, measurement.points[1].y)
      
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      // Draw points
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 4 / zoom, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p2.x, p2.y, 4 / zoom, 0, 2 * Math.PI)
      ctx.fill()

      // Draw measurement label
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      ctx.fillStyle = '#1e40af'
      ctx.font = `${12 / zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(
        MEASUREMENT_UTILS.formatValue(measurement.value, measurement.unit, config.precision),
        midX,
        midY - 10 / zoom
      )
    } else if (measurement.type === 'area' || measurement.type === 'perimeter') {
      // Draw polygon
      const screenPoints = measurement.points.map(p => canvasToScreen(p.x, p.y))
      
      ctx.beginPath()
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y)
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // Fill area for area measurements
      if (measurement.type === 'area') {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
        ctx.fill()
      }

      // Draw points
      screenPoints.forEach(point => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI)
        ctx.fill()
      })

      // Draw measurement label
      const centerX = screenPoints.reduce((sum, p) => sum + p.x, 0) / screenPoints.length
      const centerY = screenPoints.reduce((sum, p) => sum + p.y, 0) / screenPoints.length
      ctx.fillStyle = '#1e40af'
      ctx.font = `${12 / zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(
        MEASUREMENT_UTILS.formatValue(measurement.value, measurement.unit, config.precision),
        centerX,
        centerY
      )
    } else if (measurement.type === 'angle') {
      // Draw angle
      const p1 = canvasToScreen(measurement.points[0].x, measurement.points[0].y)
      const vertex = canvasToScreen(measurement.points[1].x, measurement.points[1].y)
      const p2 = canvasToScreen(measurement.points[2].x, measurement.points[2].y)
      
      // Draw lines
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(vertex.x, vertex.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      // Draw points
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 4 / zoom, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(vertex.x, vertex.y, 6 / zoom, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p2.x, p2.y, 4 / zoom, 0, 2 * Math.PI)
      ctx.fill()

      // Draw angle label
      ctx.fillStyle = '#1e40af'
      ctx.font = `${12 / zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(
        `${measurement.value.toFixed(1)}°`,
        vertex.x,
        vertex.y - 15 / zoom
      )
    }

    // Draw compliance indicators
    if (config.showCompliance && measurement.compliance) {
      const violations = measurement.compliance.status === 'violation' ? [measurement.compliance] : []
      const warnings = measurement.compliance.status === 'warning' ? [measurement.compliance] : []
      
      if (violations.length > 0 || warnings.length > 0) {
        const centerX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length
        const centerY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length
        const screenCenter = canvasToScreen(centerX, centerY)
        
        // Draw compliance icon
        ctx.fillStyle = violations.length > 0 ? '#ef4444' : '#f59e0b'
        ctx.beginPath()
        ctx.arc(screenCenter.x, screenCenter.y, 8 / zoom, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw icon
        ctx.fillStyle = 'white'
        ctx.font = `${10 / zoom}px Arial`
        ctx.textAlign = 'center'
        ctx.fillText(violations.length > 0 ? '!' : '⚠', screenCenter.x, screenCenter.y + 3 / zoom)
      }
    }
  }, [canvasToScreen, zoom, config.precision, config.showCompliance])

  const drawCurrentMeasurement = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!canvasState.isDrawing || canvasState.points.length === 0) return

    const tool = drawingTools[activeTool as keyof typeof drawingTools]
    if (!tool) return

    ctx.strokeStyle = '#8b5cf6'
    ctx.fillStyle = '#8b5cf6'
    ctx.lineWidth = 2 / zoom
    ctx.setLineDash([5 / zoom, 5 / zoom])

    // Draw current points
    const screenPoints = canvasState.points.map(p => canvasToScreen(p.x, p.y))
    
    screenPoints.forEach((point, index) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw point number
      ctx.fillStyle = 'white'
      ctx.font = `${8 / zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText((index + 1).toString(), point.x, point.y + 3 / zoom)
      ctx.fillStyle = '#8b5cf6'
    })

    // Draw preview lines
    if (screenPoints.length > 1) {
      ctx.beginPath()
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y)
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y)
      }
      
      if (canvasState.hoverPoint) {
        const hoverScreen = canvasToScreen(canvasState.hoverPoint.x, canvasState.hoverPoint.y)
        ctx.lineTo(hoverScreen.x, hoverScreen.y)
      }
      
      ctx.stroke()
    } else if (canvasState.hoverPoint) {
      const hoverScreen = canvasToScreen(canvasState.hoverPoint.x, canvasState.hoverPoint.y)
      ctx.beginPath()
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y)
      ctx.lineTo(hoverScreen.x, hoverScreen.y)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }, [canvasState, activeTool, canvasToScreen, zoom])

  // Main draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Save context
    ctx.save()

    // Apply zoom and pan
    ctx.scale(zoom, zoom)
    ctx.translate(pan.x / zoom, pan.y / zoom)

    // Draw grid
    drawGrid(ctx)

    // Draw measurements
    if (config.showMeasurements) {
      measurements.forEach(measurement => {
        drawMeasurement(ctx, measurement)
      })
    }

    // Draw current measurement being created
    drawCurrentMeasurement(ctx)

    // Restore context
    ctx.restore()
  }, [width, height, zoom, pan, drawGrid, drawMeasurement, drawCurrentMeasurement, measurements, config.showMeasurements])

  // Redraw when dependencies change
  useEffect(() => {
    draw()
  }, [draw])

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1))

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: activeTool && drawingTools[activeTool as keyof typeof drawingTools] 
            ? drawingTools[activeTool as keyof typeof drawingTools].cursor 
            : 'default'
        }}
        className="border border-slate-200 rounded-lg bg-white"
      />
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-slate-200/50">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-slate-200"></div>
        <span className="text-sm text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Measurement Info */}
      {measurements.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200/50 max-w-xs">
          <div className="text-sm font-medium text-slate-900 mb-2">Measurements</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {measurements.map((measurement, index) => (
              <div key={measurement.id || index} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate">
                  {measurement.label || `${measurement.type} ${index + 1}`}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {MEASUREMENT_UTILS.formatValue(measurement.value, measurement.unit, config.precision)}
                  </span>
                  {measurement.compliance && (
                    <div className="flex items-center gap-1">
                      {measurement.compliance.status === 'violation' && (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      {measurement.compliance.status === 'warning' && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      {measurement.compliance.status === 'compliant' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
