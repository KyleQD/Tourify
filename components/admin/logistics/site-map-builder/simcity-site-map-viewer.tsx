'use client'

import React, { useState, useRef, useEffect, useCallback } from "react"
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
  MessageCircle, Utensils, Music, Shield, Heart, TreePine
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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        setIsSpaceHeld(true)
      }
      if (isReadOnly) return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
      if (meta && e.key === 'y') { e.preventDefault(); redo() }
      if (meta && e.key === 'd' && selectedElement) {
        e.preventDefault()
        const el = elements.find(el => el.id === selectedElement)
        if (el) {
          const dup = { ...el, id: `element_${Date.now()}`, x: el.x + 20, y: el.y + 20 }
          updateElements(prev => [...prev, dup])
          setSelectedElement(dup.id)
        }
      }
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
        setContextMenu(null)
      }
      if (e.key === 'v' || e.key === 'V') { if (document.activeElement?.tagName !== 'INPUT') setSelectedTool('select') }
      if (e.key === 'h' || e.key === 'H') { if (document.activeElement?.tagName !== 'INPUT') setSelectedTool('pan') }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setIsSpaceHeld(false)
    }
    window.addEventListener('keydown', handleKeyboard)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyboard); window.removeEventListener('keyup', handleKeyUp) }
  }, [isReadOnly, undo, redo, selectedElement, updateElements, elements])

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
  }, [siteMap, elements, zoom, pan, showGrid, gridSize, snapToGrid, selectedElement, selectedElementForPlacement, hoverPosition, highlightedGridCells, isValidPlacement, canvasTheme, elementStatuses])

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

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const drawElement = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.save()
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.translate(-element.width / 2, -element.height / 2)

    const r = Math.min(8, element.width * 0.08, element.height * 0.08)
    const isSelected = selectedElement === element.id

    // Drop shadow
    ctx.shadowColor = isSelected ? 'rgba(251, 191, 36, 0.5)' : 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = isSelected ? 16 : 8
    ctx.shadowOffsetY = isSelected ? 0 : 2

    // Body fill with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, element.height)
    gradient.addColorStop(0, element.fill)
    const darker = element.fill.replace(/[\d.]+\)$/, (m) => `${Math.max(0, parseFloat(m) * 0.5)})`)
    gradient.addColorStop(1, darker || element.fill)
    ctx.fillStyle = gradient
    roundRect(ctx, 0, 0, element.width, element.height, r)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // Border
    ctx.strokeStyle = isSelected ? '#fbbf24' : element.stroke
    ctx.lineWidth = isSelected ? 3 : element.strokeWidth
    if (isSelected) ctx.setLineDash([6, 4])
    roundRect(ctx, 0, 0, element.width, element.height, r)
    ctx.stroke()
    ctx.setLineDash([])

    // Icon/symbol
    drawElementSymbol(ctx, element.type, element.width, element.height, element.stroke)

    // Label bar at bottom with rounded bottom corners
    const labelH = Math.min(22, element.height * 0.3)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    roundRect(ctx, 0, element.height - labelH, element.width, labelH, r)
    ctx.fill()
    // Clip top corners of label bar (flat top)
    ctx.fillRect(0, element.height - labelH, element.width, Math.min(r, labelH * 0.5))

    ctx.fillStyle = '#ffffff'
    const fontSize = Math.min(11, element.width * 0.12)
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxLabelW = element.width - 8
    let label = element.label
    while (ctx.measureText(label).width > maxLabelW && label.length > 3) {
      label = label.slice(0, -2) + '…'
    }
    ctx.fillText(label, element.width / 2, element.height - labelH / 2)

    // Status indicator
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
      const c = statusColors[status] || '#64748b'
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(element.width - 8, 8, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Drag handle indicator when selected
    if (isSelected) {
      const handleSize = 6
      const handles = [
        { x: 0, y: 0 }, { x: element.width, y: 0 },
        { x: 0, y: element.height }, { x: element.width, y: element.height }
      ]
      handles.forEach(h => {
        ctx.fillStyle = '#fbbf24'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize)
      })
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

  // Helper to get map coords from mouse event
  const getMapCoords = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left - pan.x) / zoom,
      y: (event.clientY - rect.top - pan.y) / zoom
    }
  }, [pan, zoom])

  const hitTestElement = useCallback((mx: number, my: number) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (mx >= el.x && mx <= el.x + el.width && my >= el.y && my <= el.y + el.height) return el
    }
    return null
  }, [elements])

  // Event handlers
  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setContextMenu(null)
    const shouldPan = selectedTool === 'pan' || isSpaceHeld || event.button === 1
    if (shouldPan) {
      setIsPanning(true)
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
      event.preventDefault()
      return
    }

    if (event.button !== 0) return
    const { x: rawX, y: rawY } = getMapCoords(event)

    if (selectedElementForPlacement) return

    if (selectedTool === 'select' && !isReadOnly) {
      const hit = hitTestElement(rawX, rawY)
      if (hit) {
        setSelectedElement(hit.id)
        setSelectedElements([hit.id])
        setIsDragging(true)
        setDragStart({ x: rawX - hit.x, y: rawY - hit.y })
      }
    }
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (isDragging) {
      setIsDragging(false)
      return
    }

    if (event.button !== 0) return
    const { x: rawX, y: rawY } = getMapCoords(event)

    if (selectedElementForPlacement) {
      const snappedPosition = snapToGridPosition(rawX, rawY)
      const alignedDimensions = getGridAlignedDimensions(selectedElementForPlacement.width, selectedElementForPlacement.height)
      const centeredX = snappedPosition.x - alignedDimensions.width / 2
      const centeredY = snappedPosition.y - alignedDimensions.height / 2
      const finalPosition = snapToGridPosition(centeredX, centeredY)
      const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)

      if (isValid) {
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
    } else {
      const clickedElement = hitTestElement(rawX, rawY)
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
    if (isPanning) {
      setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y })
      return
    }

    if (isDragging && selectedElement && !isReadOnly) {
      const { x: rawX, y: rawY } = getMapCoords(event)
      const newX = rawX - dragStart.x
      const newY = rawY - dragStart.y
      const snapped = snapToGridPosition(newX, newY)
      setElements(prev => prev.map(el =>
        el.id === selectedElement ? { ...el, x: snapped.x, y: snapped.y } : el
      ))
      setHasUnsavedChanges(true)
      return
    }

    if (selectedElementForPlacement) {
      const { x: rawX, y: rawY } = getMapCoords(event)
      const snappedPosition = snapToGridPosition(rawX, rawY)
      setHoverPosition(snappedPosition)

      const alignedDimensions = getGridAlignedDimensions(selectedElementForPlacement.width, selectedElementForPlacement.height)
      const centeredX = snappedPosition.x - alignedDimensions.width / 2
      const centeredY = snappedPosition.y - alignedDimensions.height / 2
      const finalPosition = snapToGridPosition(centeredX, centeredY)
      const cells = getOccupiedGridCells(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
      setHighlightedGridCells(cells)
      const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height)
      setIsValidPlacement(isValid)
    }
  }

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const { x: rawX, y: rawY } = getMapCoords(event)
    const hit = hitTestElement(rawX, rawY)
    if (hit && !isReadOnly) {
      setSelectedElement(hit.id)
      setContextMenu({ x: event.clientX, y: event.clientY, elementId: hit.id })
    } else {
      setContextMenu(null)
    }
  }

  const duplicateElement = useCallback((elementId: string) => {
    const el = elements.find(e => e.id === elementId)
    if (!el) return
    const dup = { ...el, id: `element_${Date.now()}`, x: el.x + gridSize, y: el.y + gridSize }
    updateElements(prev => [...prev, dup])
    setSelectedElement(dup.id)
    setContextMenu(null)
  }, [elements, updateElements, gridSize])

  const deleteElement = useCallback((elementId: string) => {
    updateElements(prev => prev.filter(el => el.id !== elementId))
    setSelectedElement(null)
    setContextMenu(null)
  }, [updateElements])

  const rotateElement = useCallback((elementId: string) => {
    updateElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, rotation: (el.rotation + 90) % 360 } : el
    ))
    setContextMenu(null)
  }, [updateElements])

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
        {/* Compact Header */}
        <div className="relative px-4 py-2.5 border-b border-slate-700/30 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold text-white truncate">{siteMap.name}</h1>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium rounded-full border shrink-0",
                      siteMap.status === 'published'
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1", siteMap.status === 'published' ? "bg-emerald-400" : "bg-amber-400")}></div>
                    {siteMap.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono shrink-0">{siteMap.width}×{siteMap.height}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCollabPanel(!showCollabPanel)}
                className={cn(
                  "h-8 px-2.5 rounded-lg border text-xs",
                  showCollabPanel ? "text-blue-300 bg-blue-500/20 border-blue-500/40" : "text-slate-400 hover:text-white border-slate-700/30"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />Collab
              </Button>
              {!isReadOnly && (
                <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(true)} className="h-8 px-2.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700/30">
                  <Share className="h-3.5 w-3.5 mr-1.5" />Share
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white border border-slate-700/30">
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={cn("h-8 w-8 rounded-lg border", isEditing ? "text-purple-300 bg-purple-500/20 border-purple-500/40" : "text-slate-400 hover:text-white border-slate-700/30")}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 border border-red-500/30">
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          {!isReadOnly && <div className="w-72 border-r border-slate-700/30 bg-slate-900/40 backdrop-blur-2xl flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-3 py-2 border-b border-slate-700/30">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 border border-slate-700/40 rounded-lg p-0.5 h-8">
                  <TabsTrigger value="elements" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-md text-xs font-medium h-7">
                    <Square className="h-3 w-3 mr-1" />Elements
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-md text-xs font-medium h-7">
                    <Settings className="h-3 w-3 mr-1" />Tools
                  </TabsTrigger>
                  <TabsTrigger value="inspect" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-md text-xs font-medium h-7">
                    <Eye className="h-3 w-3 mr-1" />Inspect
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="elements" className="h-full mt-0">
                  <ElementLibrary onElementSelect={handleElementSelect} selectedElement={selectedElementForPlacement} className="h-full" />
                </TabsContent>
                <TabsContent value="tools" className="h-full mt-0 p-3">
                  <ToolPalette selectedTool={selectedTool} onToolSelect={handleToolSelect} className="h-full" />
                </TabsContent>
                <TabsContent value="inspect" className="h-full mt-0">
                  <ElementInspector
                    element={elements.find(e => e.id === selectedElement) || null}
                    onUpdate={(id, updates) => {
                      updateElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
                    }}
                    onDelete={(id) => { deleteElement(id) }}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>}

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 relative min-w-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.06)_0%,transparent_70%)]"></div>
            {/* Compact Toolbar */}
            <div className="px-3 py-2 border-b border-slate-700/30 backdrop-blur-sm relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedElementForPlacement ? (
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-600/40 backdrop-blur-xl">
                      <div className="p-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                        {selectedElementForPlacement.icon && <selectedElementForPlacement.icon className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-xs text-white font-semibold">{selectedElementForPlacement.name}</span>
                        <span className="text-[10px] text-slate-400">Click canvas to place</span>
                      </div>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedElementForPlacement(null); setSelectedTool('select'); setHoverPosition(null) }}
                        className="h-5 w-5 p-0 text-slate-400 hover:text-white hover:bg-red-500/20 rounded"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Tool:</span>
                      <Badge variant="outline" className="text-xs text-slate-300 border-slate-600/50 bg-slate-800/60 px-2 py-0.5 rounded-lg capitalize">
                        {selectedTool}
                      </Badge>
                    </div>
                  )}

                  {selectedElement && !selectedElementForPlacement && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700/40">
                      <span className="text-xs text-slate-500 truncate max-w-24">
                        {elements.find(e => e.id === selectedElement)?.label}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => duplicateElement(selectedElement)} className="h-5 w-5 p-0 text-slate-400 hover:text-white" title="Duplicate (Cmd+D)">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => rotateElement(selectedElement)} className="h-5 w-5 p-0 text-slate-400 hover:text-white" title="Rotate 90°">
                        <RotateCw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteElement(selectedElement)} className="h-5 w-5 p-0 text-slate-400 hover:text-red-400" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
                    <Button variant="ghost" size="sm" onClick={() => setShowGrid(!showGrid)} className={cn("h-6 w-6 p-0 rounded", showGrid ? "text-purple-400 bg-purple-500/20" : "text-slate-400 hover:text-white")} title="Toggle Grid">
                      <Grid className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSnapToGrid(!snapToGrid)} className={cn("h-6 w-6 p-0 rounded", snapToGrid ? "text-green-400 bg-green-500/20" : "text-slate-400 hover:text-white")} title="Snap to Grid">
                      <Zap className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setGridSize(prev => Math.max(10, prev - 5))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] text-slate-400 w-7 text-center font-mono">{gridSize}px</span>
                    <Button variant="ghost" size="sm" onClick={() => setGridSize(prev => Math.min(100, prev + 5))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="w-px h-4 bg-slate-700/40"></div>

                  <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
                    <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] text-slate-300 w-9 text-center font-mono">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(5, prev + 0.1))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fitToContent} className="h-6 w-6 p-0 text-slate-400 hover:text-white" title="Fit to content">
                      <Maximize className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="w-px h-4 bg-slate-700/40"></div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCanvasTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className={cn("h-6 px-2 rounded text-[10px]", canvasTheme === 'light' ? "text-amber-400 bg-amber-500/20" : "text-slate-400 hover:text-white")}
                    title="Toggle canvas theme"
                  >
                    <Palette className="h-3 w-3 mr-1" />
                    {canvasTheme === 'light' ? 'Light' : 'Dark'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-2 relative z-10">
              <div className="relative w-full h-full bg-slate-950/30 rounded-xl border border-slate-700/30 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={siteMap.width}
                  height={siteMap.height}
                  className="absolute inset-0 w-full h-full"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => { setIsPanning(false); if (isDragging) { setIsDragging(false); pushHistory(elements) } }}
                  onContextMenu={handleContextMenu}
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
                    cursor: isPanning || isSpaceHeld || selectedTool === 'pan'
                      ? (isPanning ? 'grabbing' : 'grab')
                      : isDragging ? 'move'
                      : selectedElementForPlacement
                        ? (isValidPlacement ? 'crosshair' : 'not-allowed')
                        : selectedTool === 'select' ? 'default' : 'crosshair'
                  }}
                />

                {/* Minimap */}
                <div className="absolute bottom-3 right-3 w-36 h-24 bg-slate-900/90 border border-slate-600/50 rounded-lg overflow-hidden backdrop-blur-sm shadow-lg">
                  <div className="relative w-full h-full">
                    {elements.map(el => {
                      const sx = (el.x / siteMap.width) * 100
                      const sy = (el.y / siteMap.height) * 100
                      const sw = (el.width / siteMap.width) * 100
                      const sh = (el.height / siteMap.height) * 100
                      return (
                        <div
                          key={el.id}
                          className="absolute"
                          style={{
                            left: `${sx}%`, top: `${sy}%`,
                            width: `${Math.max(sw, 2)}%`, height: `${Math.max(sh, 2)}%`,
                            backgroundColor: el.stroke,
                            opacity: el.id === selectedElement ? 1 : 0.6,
                            borderRadius: 1
                          }}
                        />
                      )
                    })}
                    {/* Viewport indicator */}
                    {canvasRef.current && (() => {
                      const rect = canvasRef.current!.getBoundingClientRect()
                      const vx = (-pan.x / zoom / siteMap.width) * 100
                      const vy = (-pan.y / zoom / siteMap.height) * 100
                      const vw = (rect.width / zoom / siteMap.width) * 100
                      const vh = (rect.height / zoom / siteMap.height) * 100
                      return (
                        <div
                          className="absolute border border-white/60 bg-white/10 rounded-sm"
                          style={{ left: `${vx}%`, top: `${vy}%`, width: `${vw}%`, height: `${vh}%` }}
                        />
                      )
                    })()}
                  </div>
                </div>

                {/* Context Menu */}
                {contextMenu && (
                  <div
                    className="fixed z-[100] bg-slate-800/95 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-xl py-1.5 min-w-40"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                  >
                    <button onClick={() => duplicateElement(contextMenu.elementId)} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                      <Copy className="h-3.5 w-3.5 text-slate-400" /> Duplicate
                      <kbd className="ml-auto text-[10px] text-slate-500 font-mono">⌘D</kbd>
                    </button>
                    <button onClick={() => rotateElement(contextMenu.elementId)} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                      <RotateCw className="h-3.5 w-3.5 text-slate-400" /> Rotate 90°
                    </button>
                    <div className="my-1 border-t border-slate-700/50"></div>
                    <button onClick={() => deleteElement(contextMenu.elementId)} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                      <kbd className="ml-auto text-[10px] text-slate-500 font-mono">Del</kbd>
                    </button>
                  </div>
                )}
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

        {/* Compact Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700/30 bg-slate-900/60 backdrop-blur-xl relative">
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              <span>{elements.length} elements</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              <span>Grid {gridSize}px</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", snapToGrid ? "bg-green-400" : "bg-slate-500")}></div>
              <span>Snap {snapToGrid ? "ON" : "OFF"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              <span className="capitalize">{selectedTool}</span>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                <span>Unsaved</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!isReadOnly && (
              <>
                <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndex <= 0} className="h-6 w-6 p-0 text-slate-400 hover:text-white disabled:opacity-30" title="Undo (⌘Z)">
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-6 w-6 p-0 text-slate-400 hover:text-white disabled:opacity-30" title="Redo (⌘⇧Z)">
                  <RotateCw className="h-3 w-3" />
                </Button>
                <div className="w-px h-3 bg-slate-700/40 mx-0.5"></div>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={exportAsPNG} className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" title="Export PNG">
              <Download className="h-3 w-3 mr-0.5" />PNG
            </Button>
            <Button size="sm" variant="ghost" onClick={exportAsJSON} className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" title="Export JSON">
              <Download className="h-3 w-3 mr-0.5" />JSON
            </Button>
            {!isReadOnly && (
              <>
                <div className="w-px h-3 bg-slate-700/40 mx-0.5"></div>
                <Button
                  size="sm"
                  onClick={saveToAPI}
                  disabled={isSaving}
                  className={cn(
                    "h-7 px-3 text-xs font-semibold rounded-lg transition-all duration-200",
                    hasUnsavedChanges
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
                      : "bg-slate-700/50 text-slate-400"
                  )}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save' : 'Saved'}
                </Button>
              </>
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const categorizedElements = CANNED_ELEMENTS.reduce((acc, element) => {
    const category = element.category
    if (!acc[category]) acc[category] = []
    acc[category].push(element)
    return acc
  }, {} as Record<string, typeof CANNED_ELEMENTS>)

  const categories = Array.from(new Set(CANNED_ELEMENTS.map(el => el.category))).sort()
  const filteredElements = CANNED_ELEMENTS.filter(element => {
    const matchesSearch = !searchTerm || element.name.toLowerCase().includes(searchTerm.toLowerCase()) || element.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || element.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categoryConfig: Record<string, { icon: typeof Building; colors: string; label: string }> = {
    infrastructure: { icon: Building, colors: '#059669', label: 'Infrastructure' },
    venue: { icon: MapPin, colors: '#7c3aed', label: 'Tents & Venue' },
    performance: { icon: Music, colors: '#db2777', label: 'Performance' },
    furniture: { icon: Square, colors: '#d97706', label: 'Furniture' },
    food: { icon: Utensils, colors: '#ea580c', label: 'Food & Drink' },
    security: { icon: Shield, colors: '#dc2626', label: 'Security' },
    transportation: { icon: Truck, colors: '#475569', label: 'Transport' },
    technology: { icon: Zap, colors: '#0891b2', label: 'Technology' },
    vendors: { icon: Star, colors: '#e27419', label: 'Vendors' },
    essential_services: { icon: Heart, colors: '#2563eb', label: 'Services' },
    signage: { icon: MapPin, colors: '#9333ea', label: 'Signage' },
    sanitation: { icon: Trash2, colors: '#334155', label: 'Sanitation' },
    landscaping: { icon: TreePine, colors: '#15803d', label: 'Landscaping' },
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="p-3 border-b border-slate-700/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>
      </div>

      <div className="px-3 py-1.5 border-b border-slate-700/30">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all",
              selectedCategory === "all"
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            )}
          >
            All
          </button>
          {categories.map(cat => {
            const conf = categoryConfig[cat] || { icon: Square, colors: '#6b7280', label: cat }
            const Icon = conf.icon
            const count = categorizedElements[cat]?.length || 0
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-all",
                  selectedCategory === cat
                    ? "text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
                style={selectedCategory === cat ? { backgroundColor: conf.colors } : undefined}
              >
                <Icon className="h-3 w-3" />
                {conf.label}
                <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5 py-2">
          {searchTerm ? (
            filteredElements.map(element => {
              const conf = categoryConfig[element.category] || { icon: Square, colors: '#6b7280', label: element.category }
              return (
                <ElementButton key={element.id} element={element} isSelected={selectedElement?.id === element.id} onSelect={onElementSelect} color={conf.colors} />
              )
            })
          ) : selectedCategory !== "all" ? (
            filteredElements.map(element => {
              const conf = categoryConfig[element.category] || { icon: Square, colors: '#6b7280', label: element.category }
              return (
                <ElementButton key={element.id} element={element} isSelected={selectedElement?.id === element.id} onSelect={onElementSelect} color={conf.colors} />
              )
            })
          ) : (
            categories.map(cat => {
              const elems = categorizedElements[cat]
              if (!elems?.length) return null
              const conf = categoryConfig[cat] || { icon: Square, colors: '#6b7280', label: cat }
              const Icon = conf.icon
              const isCollapsed = collapsedCategories.has(cat)
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="p-1 rounded-md" style={{ backgroundColor: conf.colors }}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 flex-1 text-left">{conf.label}</span>
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-700 bg-transparent px-1.5 py-0">
                      {elems.length}
                    </Badge>
                    <ChevronDown className={cn("h-3 w-3 text-slate-500 transition-transform", isCollapsed && "-rotate-90")} />
                  </button>
                  {!isCollapsed && (
                    <div className="ml-2 space-y-0.5 mt-0.5">
                      {elems.map(element => (
                        <ElementButton key={element.id} element={element} isSelected={selectedElement?.id === element.id} onSelect={onElementSelect} color={conf.colors} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {filteredElements.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">No elements found</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ElementButton({ element, isSelected, onSelect, color }: {
  element: CannedElement
  isSelected: boolean
  onSelect: (el: CannedElement) => void
  color: string
}) {
  return (
    <button
      onClick={() => onSelect(element)}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-2 rounded-lg transition-all duration-150 text-left group",
        isSelected
          ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40 shadow-sm"
          : "hover:bg-slate-800/50 border border-transparent hover:border-slate-700/30"
      )}
    >
      <div className="shrink-0 p-1.5 rounded-md transition-colors" style={{ backgroundColor: isSelected ? color : `${color}33` }}>
        {element.icon ? <element.icon className="h-3.5 w-3.5 text-white" /> : <Square className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-xs font-medium truncate", isSelected ? "text-white" : "text-slate-300")}>
          {element.name}
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-mono shrink-0">{element.width}×{element.height}</span>
      {isSelected && <Check className="h-3 w-3 text-purple-400 shrink-0" />}
    </button>
  )
}

// Element Inspector Component
function ElementInspector({ element, onUpdate, onDelete }: {
  element: SiteMapElement | null
  onUpdate: (id: string, updates: Partial<SiteMapElement>) => void
  onDelete: (id: string) => void
}) {
  if (!element) return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <MousePointer className="h-8 w-8 text-slate-600 mx-auto" />
        <p className="text-sm text-slate-500">Select an element on the canvas to inspect its properties</p>
      </div>
    </div>
  )

  const cannedInfo = getElementById(element.type)

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: element.stroke }}>
          {cannedInfo?.icon ? <cannedInfo.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{element.label}</div>
          <div className="text-[10px] text-slate-400">{element.type}</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Position</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-slate-400">X</Label>
            <Input type="number" value={element.x} onChange={e => onUpdate(element.id, { x: +e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Y</Label>
            <Input type="number" value={element.y} onChange={e => onUpdate(element.id, { y: +e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Width</Label>
            <Input type="number" value={element.width} onChange={e => onUpdate(element.id, { width: +e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Height</Label>
            <Input type="number" value={element.height} onChange={e => onUpdate(element.id, { height: +e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-slate-400">Rotation</Label>
          <Input type="number" value={element.rotation} onChange={e => onUpdate(element.id, { rotation: +e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Appearance</h4>
        <div>
          <Label className="text-[10px] text-slate-400">Label</Label>
          <Input value={element.label} onChange={e => onUpdate(element.id, { label: e.target.value })} className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-slate-400">Fill</Label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={element.fill.startsWith('rgba') ? element.stroke : element.fill} onChange={e => onUpdate(element.id, { fill: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              <span className="text-[10px] text-slate-400 truncate">{element.fill.slice(0, 12)}</span>
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Stroke</Label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={element.stroke} onChange={e => onUpdate(element.id, { stroke: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              <span className="text-[10px] text-slate-400 truncate">{element.stroke}</span>
            </div>
          </div>
        </div>
      </div>

      {cannedInfo && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Properties</h4>
          <div className="space-y-1 bg-slate-800/30 rounded-lg p-2">
            {Object.entries(cannedInfo.properties).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-slate-300 font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-700/30">
        <Button variant="ghost" size="sm" onClick={() => onDelete(element.id)} className="w-full h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg">
          <Trash2 className="h-3 w-3 mr-1.5" /> Delete Element
        </Button>
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
    <div className={cn("space-y-4", className)}>
      {toolGroups.map(group => (
        <div key={group.name} className="space-y-1">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">{group.name}</h3>
          <div className="space-y-0.5">
            {group.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all duration-150 text-left",
                  selectedTool === tool.id
                    ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40"
                    : "hover:bg-slate-800/50 border border-transparent"
                )}
              >
                <div className={cn("p-1.5 rounded-md", selectedTool === tool.id ? "bg-purple-500/30" : "bg-slate-700/50")}>
                  <tool.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <div className={cn("text-xs font-medium", selectedTool === tool.id ? "text-white" : "text-slate-300")}>{tool.label}</div>
                  <div className="text-[10px] text-slate-500">{tool.description}</div>
                </div>
                <kbd className="text-[9px] text-slate-500 bg-slate-800/50 border border-slate-700/50 px-1 py-0.5 rounded font-mono">{tool.shortcut}</kbd>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-slate-700/30 px-1">
        <p className="text-[10px] text-slate-500">
          <kbd className="bg-slate-800/50 border border-slate-700/50 px-1 py-0.5 rounded font-mono text-[9px]">Space</kbd> + drag to pan
        </p>
      </div>
    </div>
  )
}
