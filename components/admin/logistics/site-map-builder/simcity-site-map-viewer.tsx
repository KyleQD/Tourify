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
  AlignHorizontalJustifyCenter, Ruler, AlertTriangle, MousePointer, Check,
  MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CANNED_ELEMENTS, getElementById, type CannedElement } from "@/lib/data/canned-elements"
import { SiteMapShareDialog } from "../site-map-share-dialog"
import { SiteMapCollaborationPanel } from "../site-map-collaboration-panel"

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
  isReadOnly?: boolean
  eventId?: string
}

export function SimCitySiteMapViewer({ siteMap, onClose, onSave, onDelete, isReadOnly = false, eventId }: SimCitySiteMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditing, setIsEditing] = useState(!isReadOnly)
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
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark')
  const [showCollabPanel, setShowCollabPanel] = useState(true)
  const [elementStatuses, setElementStatuses] = useState<Record<string, string>>({})

  // Load element statuses from activity log
  useEffect(() => {
    async function loadStatuses() {
      try {
        const resp = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/activity?limit=200`, { credentials: 'include' })
        const data = await resp.json()
        if (data.success) {
          const statuses: Record<string, string> = {}
          const items = (data.data || []).filter((a: any) => a.action === 'STATUS_CHANGE')
          for (const item of items.reverse()) {
            if (item.entity_id && item.new_values?.status) {
              statuses[item.entity_id] = item.new_values.status
            }
          }
          setElementStatuses(statuses)
        }
      } catch {}
    }
    loadStatuses()
    const interval = setInterval(loadStatuses, 20000)
    return () => clearInterval(interval)
  }, [siteMap.id])

  // Undo/Redo history
  const [history, setHistory] = useState<SiteMapElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const pushHistory = useCallback((newElements: SiteMapElement[]) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, newElements]
    })
    setHistoryIndex(prev => prev + 1)
    setHasUnsavedChanges(true)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setElements(history[historyIndex - 1])
      setHasUnsavedChanges(true)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setElements(history[historyIndex + 1])
      setHasUnsavedChanges(true)
    }
  }, [history, historyIndex])

  const updateElements = useCallback((updater: (prev: SiteMapElement[]) => SiteMapElement[]) => {
    setElements(prev => {
      const next = updater(prev)
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      if (isReadOnly) return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
      if (meta && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault()
          updateElements(prev => prev.filter(el => el.id !== selectedElement))
          setSelectedElement(null)
        }
      }
      if (e.key === 'Escape') {
        setSelectedElementForPlacement(null)
        setSelectedTool('select')
        setSelectedElement(null)
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [isReadOnly, undo, redo, selectedElement, updateElements])

  // Save to API
  const saveToAPI = useCallback(async () => {
    if (isReadOnly) return
    setIsSaving(true)
    try {
      const elementsPayload = elements.map(el => ({
        name: el.label,
        elementType: el.type as any,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        color: el.fill,
        strokeColor: el.stroke,
        strokeWidth: el.strokeWidth,
        opacity: 1,
        properties: el.data || {}
      }))

      await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ elements: elementsPayload, replaceAll: true })
      })

      setHasUnsavedChanges(false)
      onSave?.(siteMap)
    } catch (err) {
      console.error('Failed to save site map:', err)
    } finally {
      setIsSaving(false)
    }
  }, [elements, siteMap, onSave, isReadOnly])

  // Fit to content
  const fitToContent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (elements.length === 0) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const minX = Math.min(...elements.map(e => e.x))
    const minY = Math.min(...elements.map(e => e.y))
    const maxX = Math.max(...elements.map(e => e.x + e.width))
    const maxY = Math.max(...elements.map(e => e.y + e.height))
    const contentW = maxX - minX + 80
    const contentH = maxY - minY + 80
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / contentW
    const scaleY = rect.height / contentH
    const newZoom = Math.min(scaleX, scaleY, 3) * 0.9
    setZoom(newZoom)
    setPan({
      x: -minX * newZoom + (rect.width - contentW * newZoom) / 2 + 40 * newZoom,
      y: -minY * newZoom + (rect.height - contentH * newZoom) / 2 + 40 * newZoom
    })
  }, [elements])

  // Export as PNG
  const exportAsPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Draw a clean full-resolution export
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = siteMap.width
    exportCanvas.height = siteMap.height
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    // Background
    const gradient = ctx.createLinearGradient(0, 0, siteMap.width, siteMap.height)
    gradient.addColorStop(0, canvasTheme === 'light' ? '#f8fafc' : '#0f172a')
    gradient.addColorStop(1, canvasTheme === 'light' ? '#e2e8f0' : '#1e293b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, siteMap.width, siteMap.height)

    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element)
    })

    const dataURL = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${siteMap.name.replace(/\s+/g, '_')}_sitemap.png`
    link.href = dataURL
    link.click()
  }, [siteMap.name, siteMap.width, siteMap.height, elements, canvasTheme])

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    const exportData = {
      siteMap: { id: siteMap.id, name: siteMap.name, description: siteMap.description, width: siteMap.width, height: siteMap.height },
      elements: elements.map(el => ({ type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation, label: el.label, fill: el.fill, stroke: el.stroke, data: el.data })),
      metadata: { exportedAt: new Date().toISOString(), version: '1.0' }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `${siteMap.name.replace(/\s+/g, '_')}_sitemap.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [siteMap, elements])

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

  // Load elements from API (falls back to demo elements)
  useEffect(() => {
    async function loadElements() {
      try {
        const resp = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/elements`, { credentials: 'include' })
        const data = await resp.json()
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: SiteMapElement[] = data.data.map((el: any) => ({
            id: el.id,
            type: el.element_type || el.elementType || 'custom',
            x: el.x ?? 0,
            y: el.y ?? 0,
            width: el.width ?? 60,
            height: el.height ?? 60,
            rotation: el.rotation ?? 0,
            fill: el.color || 'rgba(147, 51, 234, 0.3)',
            stroke: el.stroke_color || el.strokeColor || '#9333ea',
            strokeWidth: el.stroke_width || el.strokeWidth || 2,
            label: el.name || 'Element',
            data: el.properties || {}
          }))
          setElements(mapped)
          setHistory([mapped])
          setHistoryIndex(0)
          return
        }
      } catch {
        // API unavailable, use demo data
      }
      const demo: SiteMapElement[] = [
        { id: '1', type: 'stage', x: 200, y: 150, width: 300, height: 200, rotation: 0, fill: 'rgba(147, 51, 234, 0.3)', stroke: '#9333ea', strokeWidth: 2, label: 'Main Stage' },
        { id: '2', type: 'tent', x: 50, y: 100, width: 120, height: 80, rotation: 0, fill: 'rgba(59, 130, 246, 0.3)', stroke: '#3b82f6', strokeWidth: 2, label: 'VIP Tent' }
      ]
      setElements(demo)
      setHistory([demo])
      setHistoryIndex(0)
    }
    loadElements()
  }, [siteMap.id])

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

    const gradient = ctx.createLinearGradient(0, 0, siteMap.width, siteMap.height)
    if (canvasTheme === 'light') {
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(1, '#e2e8f0')
    } else {
      gradient.addColorStop(0, '#0f172a')
      gradient.addColorStop(1, '#1e293b')
    }
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
      
      const majorGridSize = gridSize * 5
      ctx.strokeStyle = canvasTheme === 'light' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(148, 163, 184, 0.4)'
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
      
      ctx.strokeStyle = canvasTheme === 'light' ? 'rgba(71, 85, 105, 0.15)' : 'rgba(148, 163, 184, 0.2)'
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
  }, [siteMap, elements, zoom, pan, showGrid, selectedElementForPlacement, hoverPosition, canvasTheme, elementStatuses])

  const drawElementSymbol = (ctx: CanvasRenderingContext2D, type: string, w: number, h: number, color: string) => {
    const cx = w / 2
    const cy = (h - 25) / 2
    const s = Math.min(w, h - 25) * 0.3
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const symbolMap: Record<string, () => void> = {
      // Tents & Shelters
      'vip-tent': () => { ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.7); ctx.lineTo(cx, cy - s * 0.7); ctx.lineTo(cx + s, cy + s * 0.7); ctx.closePath(); ctx.stroke() },
      'pop-up-tent-10x10': () => symbolMap['vip-tent'](),
      'frame-tent-20x30': () => symbolMap['vip-tent'](),
      'pole-tent-40x60': () => symbolMap['vip-tent'](),
      'backstage-tent': () => symbolMap['vip-tent'](),
      'merchandise-tent': () => symbolMap['vip-tent'](),
      'information-tent': () => symbolMap['vip-tent'](),
      'check-in-tent': () => symbolMap['vip-tent'](),
      'medical-tent': () => { symbolMap['vip-tent'](); ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx + s * 0.3, cy); ctx.moveTo(cx, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.3); ctx.stroke() },
      'camping-tent-site': () => symbolMap['vip-tent'](),
      'glamping-bell-tent': () => symbolMap['vip-tent'](),
      'shade-sail': () => { ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.4); ctx.lineTo(cx + s, cy - s * 0.4); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); ctx.lineTo(cx - s * 0.5, cy + s * 0.4); ctx.closePath(); ctx.stroke() },

      // Stages & Music
      'main-stage': () => { ctx.fillStyle = color; ctx.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6); ctx.beginPath(); ctx.arc(cx - s * 0.4, cy - s * 0.6, s * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.6, s * 0.15, 0, Math.PI * 2); ctx.fill() },
      'dj-booth': () => symbolMap['main-stage'](),
      'acoustic-stage': () => symbolMap['main-stage'](),

      // Food & Drink
      'food-truck': () => { ctx.strokeRect(cx - s, cy - s * 0.4, s * 2, s * 0.8); ctx.beginPath(); ctx.arc(cx - s * 0.5, cy + s * 0.6, s * 0.2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.5, cy + s * 0.6, s * 0.2, 0, Math.PI * 2); ctx.stroke() },
      'food-vendor-tent': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy + s * 0.3); ctx.lineTo(cx - s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.5, cy + s * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy + s * 0.3); ctx.lineTo(cx, cy - s * 0.1); ctx.lineTo(cx + s * 0.2, cy + s * 0.3); ctx.stroke() },
      'bbq-grill-station': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy + s * 0.3); ctx.lineTo(cx, cy - s * 0.5); ctx.lineTo(cx + s * 0.4, cy + s * 0.3); ctx.stroke() },
      'bar-station': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.2, s * 1.2, s * 0.4); ctx.beginPath(); ctx.arc(cx, cy - s * 0.5, s * 0.15, 0, Math.PI * 2); ctx.stroke() },
      'coffee-cart': () => symbolMap['bar-station'](),
      'ice-cream-stand': () => symbolMap['food-vendor-tent'](),
      'water-refill-station': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx, cy + s * 0.5); ctx.moveTo(cx - s * 0.2, cy - s * 0.3); ctx.lineTo(cx + s * 0.2, cy - s * 0.3); ctx.stroke() },

      // Vendors
      'vendor-booth-10x10': () => { ctx.strokeRect(cx - s * 0.7, cy - s * 0.5, s * 1.4, s); ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy - s * 0.2); ctx.lineTo(cx + s * 0.7, cy - s * 0.2); ctx.stroke() },
      'vendor-booth-10x20': () => symbolMap['vendor-booth-10x10'](),
      'artisan-market-stall': () => symbolMap['vendor-booth-10x10'](),
      'merch-trailer': () => symbolMap['food-truck'](),
      'atm-machine': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.5, s * 0.6, s); ctx.fillStyle = color; ctx.font = `bold ${s * 0.4}px monospace`; ctx.textAlign = 'center'; ctx.fillText('$', cx, cy + s * 0.15) },
      'ticket-booth': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.8); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy); ctx.lineTo(cx + s * 0.2, cy); ctx.stroke() },

      // Security
      'security-checkpoint': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx - s * 0.5, cy + s * 0.4); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.15); ctx.lineTo(cx, cy + s * 0.2); ctx.stroke() },
      'emergency-exit': () => { ctx.beginPath(); ctx.moveTo(cx + s * 0.4, cy); ctx.lineTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.1, cy - s * 0.3); ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.1, cy + s * 0.3); ctx.stroke(); ctx.strokeRect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s) },
      'emergency-exit-gate': () => symbolMap['emergency-exit'](),
      'fire-extinguisher': () => { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.4); ctx.moveTo(cx - s * 0.3, cy + s * 0.4); ctx.lineTo(cx + s * 0.3, cy + s * 0.4); ctx.stroke() },
      'fire-lane': () => { ctx.setLineDash([4, 4]); ctx.strokeRect(cx - s * 0.8, cy - s * 0.15, s * 1.6, s * 0.3); ctx.setLineDash([]) },
      'crowd-barrier': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.8, cy); ctx.lineTo(cx + s * 0.8, cy); ctx.stroke(); ctx.fillRect(cx - s * 0.8, cy - s * 0.1, s * 0.1, s * 0.2); ctx.fillRect(cx + s * 0.7, cy - s * 0.1, s * 0.1, s * 0.2) },
      'security-tower': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.1, s * 0.6, s * 0.6); ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - s * 0.1); ctx.lineTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.4, cy - s * 0.1); ctx.closePath(); ctx.stroke() },
      'bag-check-area': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.3, s, s * 0.6); ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.15, Math.PI, 0); ctx.stroke() },

      // Essential services
      'first-aid-station': () => { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx + s * 0.4, cy); ctx.moveTo(cx, cy - s * 0.4); ctx.lineTo(cx, cy + s * 0.4); ctx.stroke(); ctx.lineWidth = 2 },
      'ambulance-bay': () => symbolMap['first-aid-station'](),
      'info-booth': () => { ctx.font = `bold ${s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('i', cx, cy) },
      'lost-and-found': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = color; ctx.font = `bold ${s * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy - s * 0.1) },
      'phone-charging-station': () => { ctx.strokeRect(cx - s * 0.2, cy - s * 0.4, s * 0.4, s * 0.7); ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy + s * 0.55); ctx.stroke() },
      'baby-changing-station': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.25, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(cx - s * 0.4, cy + s * 0.1, s * 0.8, s * 0.1) },
      'accessibility-ramp': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy + s * 0.3); ctx.lineTo(cx + s * 0.5, cy - s * 0.3); ctx.lineTo(cx + s * 0.5, cy + s * 0.3); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.stroke() },
      'accessible-viewing-platform': () => symbolMap['accessibility-ramp'](),

      // Signage
      'directional-sign': () => { ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.5); ctx.lineTo(cx, cy - s * 0.3); ctx.lineTo(cx + s * 0.4, cy - s * 0.1); ctx.lineTo(cx, cy + s * 0.1); ctx.stroke() },
      'event-banner': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy - s * 0.3); ctx.lineTo(cx - s * 0.6, cy + s * 0.5); ctx.moveTo(cx + s * 0.6, cy - s * 0.3); ctx.lineTo(cx + s * 0.6, cy + s * 0.5); ctx.moveTo(cx - s * 0.6, cy - s * 0.3); ctx.lineTo(cx + s * 0.6, cy - s * 0.3); ctx.stroke() },
      'digital-schedule-board': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.7); ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(cx - s * 0.35, cy - s * 0.15 + i * s * 0.2); ctx.lineTo(cx + s * 0.35, cy - s * 0.15 + i * s * 0.2) }; ctx.stroke() },
      'speaker-pa-tower': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy - s * 0.3); ctx.lineTo(cx + s * 0.15, cy - s * 0.3); ctx.lineTo(cx + s * 0.3, cy); ctx.lineTo(cx + s * 0.15, cy + s * 0.3); ctx.lineTo(cx - s * 0.15, cy + s * 0.3); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.45, cy, s * 0.15, -0.5, 0.5); ctx.stroke() },

      // Sanitation
      'trash-bin': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.2, s * 0.6, s * 0.5); ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - s * 0.2); ctx.lineTo(cx + s * 0.4, cy - s * 0.2); ctx.stroke() },
      'recycling-station': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.1, cy + s * 0.1); ctx.moveTo(cx + s * 0.3, cy - s * 0.3); ctx.lineTo(cx - s * 0.1, cy + s * 0.1); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy - s * 0.1); ctx.stroke() },
      'dumpster': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.2, s, s * 0.5); ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.2); ctx.lineTo(cx - s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.5, cy - s * 0.2); ctx.stroke() },
      'hand-washing-station': () => symbolMap['water-refill-station'](),

      // Transportation
      'parking-lot': () => { ctx.font = `bold ${s * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', cx, cy) },
      'vip-parking': () => symbolMap['parking-lot'](),
      'shuttle-stop': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.3, s * 1.2, s * 0.6); ctx.beginPath(); ctx.arc(cx - s * 0.3, cy + s * 0.4, s * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.3, cy + s * 0.4, s * 0.12, 0, Math.PI * 2); ctx.stroke() },
      'rideshare-zone': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.2); ctx.lineTo(cx, cy + s * 0.5); ctx.stroke() },
      'bicycle-rack': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.35); ctx.lineTo(cx, cy + s * 0.35); ctx.moveTo(cx - s * 0.35, cy); ctx.lineTo(cx + s * 0.35, cy); ctx.stroke() },
      'loading-dock': () => symbolMap['food-truck'](),
      'rv-hookup': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.3, s * 1.2, s * 0.6); ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy - s * 0.1); ctx.lineTo(cx - s * 0.8, cy - s * 0.1); ctx.lineTo(cx - s * 0.8, cy + s * 0.1); ctx.lineTo(cx - s * 0.6, cy + s * 0.1); ctx.stroke() },

      // Landscaping
      'tree': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - s * 0.05, cy + s * 0.15, s * 0.1, s * 0.35) },
      'planter-box': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.15, s, s * 0.4); ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.fill() },
      'string-lights': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy - s * 0.1); ctx.quadraticCurveTo(cx, cy + s * 0.2, cx + s * 0.7, cy - s * 0.1); ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx + i * s * 0.25, cy + Math.abs(i) * s * 0.03, s * 0.06, 0, Math.PI * 2); ctx.fill() } },
      'spotlight': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.25); ctx.lineTo(cx - s * 0.15, cy - s * 0.5); ctx.lineTo(cx + s * 0.15, cy - s * 0.5); ctx.closePath(); ctx.fill() },

      // Technology
      'wifi-tower': () => { ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy - s * 0.2); ctx.stroke(); for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.15 * i, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke() } },
      'camera-mount': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.2, s * 0.6, s * 0.4); ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2); ctx.stroke() },

      // Special areas
      'smoking-area': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy + s * 0.3); ctx.lineTo(cx - s * 0.1, cy - s * 0.1); ctx.quadraticCurveTo(cx - s * 0.1, cy - s * 0.4, cx + s * 0.1, cy - s * 0.4); ctx.stroke() },
      'pet-relief-area': () => { ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.25, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.35, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.35, s * 0.08, 0, Math.PI * 2); ctx.fill() },
      'quiet-zone': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy - s * 0.15); ctx.lineTo(cx + s * 0.15, cy + s * 0.15); ctx.moveTo(cx + s * 0.15, cy - s * 0.15); ctx.lineTo(cx - s * 0.15, cy + s * 0.15); ctx.stroke() },

      // Furniture
      'folding-chair': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6) },
      'round-table': () => { ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke() },
      'rectangular-table': () => { ctx.strokeRect(cx - s * 0.6, cy - s * 0.2, s * 1.2, s * 0.4) },
      'picnic-table': () => { ctx.strokeRect(cx - s * 0.5, cy - s * 0.15, s, s * 0.3); ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy + s * 0.25); ctx.lineTo(cx + s * 0.6, cy + s * 0.25); ctx.moveTo(cx - s * 0.6, cy - s * 0.25); ctx.lineTo(cx + s * 0.6, cy - s * 0.25); ctx.stroke() },

      // Power
      'generator-50kw': () => { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.4); ctx.lineTo(cx + s * 0.1, cy); ctx.lineTo(cx - s * 0.1, cy); ctx.lineTo(cx + s * 0.3, cy + s * 0.4); ctx.stroke() },
      'generator-100kw': () => symbolMap['generator-50kw'](),
      'power-distribution': () => symbolMap['generator-50kw'](),
      'water-station': () => symbolMap['water-refill-station'](),
      'portable-restroom': () => { ctx.strokeRect(cx - s * 0.3, cy - s * 0.4, s * 0.6, s * 0.8); ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.03); ctx.lineTo(cx, cy + s * 0.25); ctx.stroke() },
      'luxury-restroom': () => symbolMap['portable-restroom'](),
    }

    const drawFn = symbolMap[type]
    if (drawFn) {
      ctx.globalAlpha = 0.7
      drawFn()
      ctx.globalAlpha = 1
    }
  }

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

    // Draw icon/symbol in center of element
    drawElementSymbol(ctx, element.type, element.width, element.height, element.stroke)

    // Draw label with background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, element.height - 25, element.width, 25)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.label, element.width / 2, element.height - 8)

    // Draw status indicator
    const status = elementStatuses[element.id]
    if (status) {
      const statusColors: Record<string, string> = {
        not_started: '#64748b',
        in_progress: '#3b82f6',
        setup_complete: '#22c55e',
        needs_attention: '#f59e0b',
        blocked: '#ef4444',
        verified: '#10b981'
      }
      const color = statusColors[status] || '#64748b'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(element.width - 8, 8, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

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
        updateElements(prev => [...prev, newElement])
        
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
                onClick={() => setShowCollabPanel(!showCollabPanel)}
                className={cn(
                  "h-11 px-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg",
                  showCollabPanel
                    ? "text-blue-300 bg-blue-500/20 border-blue-500/40 shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50 border-slate-700/30"
                )}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Collab
              </Button>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                  className="h-11 px-4 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
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
          {/* Left Sidebar - Element Library (hidden in read-only) */}
          {!isReadOnly && <div className="w-80 border-r border-slate-700/30 bg-gradient-to-b from-slate-900/40 via-slate-800/40 to-slate-900/40 backdrop-blur-2xl">
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
          </div>}

          {/* Main Canvas Area */}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fitToContent}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      title="Fit to content"
                    >
                      <Maximize className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Canvas Theme */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCanvasTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className={cn(
                      "h-6 px-2 rounded text-xs transition-all duration-200",
                      canvasTheme === 'light'
                        ? "text-amber-400 bg-amber-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                    title="Toggle canvas theme"
                  >
                    <Palette className="h-3 w-3 mr-1" />
                    {canvasTheme === 'light' ? 'Light' : 'Dark'}
                  </Button>
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
                    const rect = canvasRef.current!.getBoundingClientRect()
                    const mx = e.clientX - rect.left
                    const my = e.clientY - rect.top
                    const factor = e.deltaY > 0 ? 0.9 : 1.1
                    const newZoom = Math.max(0.1, Math.min(5, zoom * factor))
                    setPan(prev => ({
                      x: mx - (mx - prev.x) * (newZoom / zoom),
                      y: my - (my - prev.y) * (newZoom / zoom)
                    }))
                    setZoom(newZoom)
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

          {/* Right Sidebar - Collaboration Panel */}
          {showCollabPanel && (
            <SiteMapCollaborationPanel
              siteMapId={siteMap.id}
              isReadOnly={isReadOnly}
              selectedElementId={selectedElement}
              onNoteClick={(x, y) => {
                setPan({ x: -x * zoom + 400, y: -y * zoom + 300 })
              }}
            />
          )}
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
            {!isReadOnly && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="h-9 px-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl disabled:opacity-30"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="h-9 px-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl disabled:opacity-30"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={exportAsPNG}
                className="h-7 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                title="Export as PNG"
              >
                <Download className="h-3 w-3 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={exportAsJSON}
                className="h-7 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                title="Export as JSON"
              >
                <Download className="h-3 w-3 mr-1" />
                JSON
              </Button>
            </div>
            {!isReadOnly && (
              <Button
                size="sm"
                onClick={saveToAPI}
                disabled={isSaving}
                className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 px-6 py-2.5 font-semibold backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                </div>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <SiteMapShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        siteMapId={siteMap.id}
        siteMapName={siteMap.name}
        eventId={eventId}
      />
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
  const toolGroups = [
    {
      name: 'Navigate',
      tools: [
        { id: 'select', icon: MousePointer, label: 'Select', shortcut: 'V', description: 'Select and move elements' },
        { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H', description: 'Pan around the canvas' },
      ]
    },
    {
      name: 'Annotate',
      tools: [
        { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M', description: 'Measure distances and areas' },
        { id: 'text', icon: Type, label: 'Text', shortcut: 'T', description: 'Add text labels' },
        { id: 'issue', icon: AlertTriangle, label: 'Flag Issue', shortcut: 'I', description: 'Mark issues or notes' },
      ]
    },
    {
      name: 'Edit',
      tools: [
        { id: 'delete', icon: Trash2, label: 'Delete', shortcut: 'Del', description: 'Remove selected elements' },
        { id: 'duplicate', icon: Copy, label: 'Duplicate', shortcut: '⌘D', description: 'Duplicate selection' },
      ]
    }
  ]

  return (
    <div className={cn("space-y-5", className)}>
      {toolGroups.map(group => (
        <div key={group.name} className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">{group.name}</h3>
          <div className="space-y-1">
            {group.tools.map(tool => (
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
                    selectedTool === tool.id ? "bg-white/20" : "bg-slate-700/50"
                  )}>
                    <tool.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{tool.label}</div>
                    <div className="text-xs opacity-70">{tool.description}</div>
                  </div>
                  <kbd className="text-[10px] text-slate-500 bg-slate-800/50 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                    {tool.shortcut}
                  </kbd>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-slate-700/30 px-1">
        <p className="text-xs text-slate-500">Press <kbd className="text-[10px] bg-slate-800/50 border border-slate-700/50 px-1 py-0.5 rounded font-mono">?</kbd> for all shortcuts</p>
      </div>
    </div>
  )
}
