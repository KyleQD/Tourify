'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ZoomIn, ZoomOut, Save, Trash2, Eye, EyeOff,
  Layers, Grid, Square, MapPin, Zap,
  Building, Download, Share, Plus, Minus,
  Maximize, Minimize, Type,
  Copy, RotateCw, RotateCcw, Palette, Filter,
  Ruler, AlertTriangle, MousePointer,
  MessageCircle, Send, ChevronLeft, ChevronRight, PanelRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getElementById, type CannedElement } from "@/lib/data/canned-elements"
import { SiteMapShareDialog } from "../site-map-share-dialog"
import { useSiteMapRealtime } from "@/hooks/use-site-map-realtime"
import type { ElementStatus } from "@/types/site-map"
import {
  snapToGridPosition as snapPoint,
  getGridAlignedDimensions as alignDims,
  getOccupiedGridCells as occupiedCells,
  checkPlacementValidity as placementValid,
  screenToMapCoords,
  hitTestRect,
  normalizeZoneBounds as normZone,
  normalizeTentBounds as normTent,
  computeCenteredPlacement,
  hitTestResizeHandle,
  applyResize,
  getNumber as toNumber,
  LIBRARY_DND_TYPE,
  type LibraryDragPayload,
  type ResizeHandle,
} from './canvas-coords'
import { drawElementSymbol, roundRect, drawFittedLabel } from './canvas-draw'
import { ElementLibraryPanel } from './element-library-panel'
import { ElementInspector } from './element-inspector'
import { ToolPalette } from './tool-palette'
import { SiteMapContextDrawer, type SelectedMapObject, type ContextDrawerTab } from './site-map-context-drawer'
import { SiteMapFilterBar, hasActiveCanvasFilters as filtersAreActive, defaultFilters, type CanvasFilters as FilterBarFilters } from './site-map-filter-bar'
import { SiteMapTaskForm } from './site-map-task-form'

interface SiteMap {
  id: string
  name: string
  description: string
  width: number
  height: number
  scale?: number
  scale_unit?: string
  scaleUnit?: string
  created_at: string
  status: string
  backgroundImageUrl?: string
  background_image_url?: string
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

interface MapBounds {
  x: number
  y: number
  width: number
  height: number
}

interface MapMeasurementRow {
  id: string
  measurement_type?: string
  measurementType?: string
  start_x?: number
  startX?: number
  start_y?: number
  startY?: number
  end_x?: number
  endX?: number
  end_y?: number
  endY?: number
  width?: number
  height?: number
  value?: number
  unit?: string
  label?: string
  color?: string
  is_compliant?: boolean
  compliance_notes?: string
}

interface MapIssueRow {
  id: string
  issue_type?: string
  issueType?: string
  severity?: string
  title?: string
  description?: string
  x: number
  y: number
  status?: string
}

interface CanvasFilters extends FilterBarFilters {}

interface SimCitySiteMapViewerProps {
  siteMap: SiteMap
  onClose: () => void
  onSave?: (siteMap: SiteMap) => void
  onDelete?: (siteMapId: string) => void
  onPublish?: (siteMap: SiteMap) => void | Promise<void>
  isReadOnly?: boolean
  eventId?: string
}

function CanvasDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'site-map-canvas-drop' })
  return (
    <div ref={setNodeRef} className={cn('relative flex-1 min-h-0', isOver && 'ring-2 ring-emerald-400/50')}>
      {children}
    </div>
  )
}

export function SimCitySiteMapViewer({ siteMap, onClose, onSave, onDelete, onPublish, isReadOnly = false, eventId }: SimCitySiteMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
  const [activeTab, setActiveTab] = useState('library')
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedElementForPlacement, setSelectedElementForPlacement] = useState<CannedElement | null>(null)
  const [highlightedGridCells, setHighlightedGridCells] = useState<Array<{x: number, y: number}>>([])
  const [isValidPlacement, setIsValidPlacement] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark')
  const [showContextDrawer, setShowContextDrawer] = useState(true)
  const [contextTab, setContextTab] = useState<ContextDrawerTab>('properties')
  const [selectedObject, setSelectedObject] = useState<SelectedMapObject>(null)
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [readinessExpanded, setReadinessExpanded] = useState(false)

  const [elementStatuses, setElementStatuses] = useState<Record<string, string>>({})
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [dragTarget, setDragTarget] = useState<{ kind: 'element' | 'zone' | 'tent'; id: string } | null>(null)
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null)
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueDraft, setIssueDraft] = useState({ title: '', description: '', severity: 'medium', x: 0, y: 0 })
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [textDraft, setTextDraft] = useState({ label: '', x: 0, y: 0 })
  const [isPublishing, setIsPublishing] = useState(false)
  const [activeLibraryDrag, setActiveLibraryDrag] = useState<CannedElement | null>(null)
  const [mapStatus, setMapStatus] = useState(siteMap.status)
  const { activityVersion, tasksVersion, geometryVersion } = useSiteMapRealtime({ siteMapId: siteMap.id })
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // ─── Zones, Tents, Layers state ───────────────────────────────────────────
  const [zones, setZones] = useState<any[]>([])
  const [tents, setTents] = useState<any[]>([])
  const [layers, setLayers] = useState<any[]>([])
  const [measurements, setMeasurements] = useState<MapMeasurementRow[]>([])
  const [issues, setIssues] = useState<MapIssueRow[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [zoneForm, setZoneForm] = useState({ name: '', color: '#9333ea', capacity: '', zoneType: 'other' })
  const [tentForm, setTentForm] = useState({ name: '', type: 'custom', width_ft: '', depth_ft: '', capacity: '' })
  const [layerForm, setLayerForm] = useState({ name: '', color: '#3b82f6' })
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
  const [measureHover, setMeasureHover] = useState<{ x: number; y: number } | null>(null)
  const [toolError, setToolError] = useState<string | null>(null)
  const [canvasFilters, setCanvasFilters] = useState<CanvasFilters>({
    ...defaultFilters,
  })

  const getNumber = toNumber
  const normalizeZoneBounds = useCallback((zone: any, index = 0): MapBounds => normZone(zone, index), [])
  const normalizeTentBounds = useCallback((tent: any, index = 0): MapBounds => normTent(tent, index), [])
  const snapOptions = useMemo(() => ({ snapToGrid, gridSize }), [snapToGrid, gridSize])

  const unresolvedNoteObjectIds = useMemo(() => {
    const ids = new Set<string>()
    notes.forEach(note => {
      const values = note.new_values || note.newValues || {}
      const entityId = note.entity_id || note.entityId || values.element_id || values.elementId
      if (entityId && values.is_resolved !== true) ids.add(entityId)
    })
    return ids
  }, [notes])

  const taskObjectIds = useMemo(() => {
    const ids = new Set<string>()
    tasks.forEach(task => {
      const elementId = task.elementId || task.element_id
      if (!elementId) return
      if (canvasFilters.taskState === 'all' || task.status === canvasFilters.taskState) {
        ids.add(elementId)
      }
    })
    return ids
  }, [canvasFilters.taskState, tasks])

  const assigneeOptions = useMemo(() => {
    const options = new Map<string, string>()
    tasks.forEach(task => {
      const userId = task.assignedUserId || task.assignedTo || task.assigned_user_id
      if (userId) options.set(`user:${userId}`, task.assignedToName || 'Assigned user')
      const teamId = task.assignedTeamId || task.assigned_team_id
      if (teamId) options.set(`team:${teamId}`, 'Assigned team')
      const role = task.assignedRole || task.assigned_role
      if (role) options.set(`role:${role}`, role)
    })
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }))
  }, [tasks])

  const elementMatchesAssigneeFilter = useCallback((elementId: string) => {
    if (canvasFilters.assignee === 'all') return true
    const [scope, value] = canvasFilters.assignee.split(':')
    return tasks.some(task => {
      const taskElementId = task.elementId || task.element_id
      if (taskElementId !== elementId) return false
      if (scope === 'user') return (task.assignedUserId || task.assignedTo || task.assigned_user_id) === value
      if (scope === 'team') return (task.assignedTeamId || task.assigned_team_id) === value
      if (scope === 'role') return (task.assignedRole || task.assigned_role) === value
      return false
    })
  }, [canvasFilters.assignee, tasks])

  const getVisibleElements = useCallback(() => {
    return elements.filter(element => {
      const layerId = element.data?.layerId || element.data?.layer_id
      if (layerId && hiddenLayers.has(layerId)) return false
      if (canvasFilters.layerId !== 'all' && layerId !== canvasFilters.layerId) return false
      if (canvasFilters.status !== 'all') {
        const status = elementStatuses[element.id] || 'not_started'
        if (status !== canvasFilters.status) return false
      }
      if (canvasFilters.taskState !== 'all' && !taskObjectIds.has(element.id)) return false
      if (canvasFilters.unresolvedNotesOnly && !unresolvedNoteObjectIds.has(element.id)) return false
      if (!elementMatchesAssigneeFilter(element.id)) return false
      return true
    })
  }, [canvasFilters.layerId, canvasFilters.status, canvasFilters.taskState, canvasFilters.unresolvedNotesOnly, elementMatchesAssigneeFilter, elementStatuses, elements, hiddenLayers, taskObjectIds, unresolvedNoteObjectIds])

  const getVisibleIssues = useCallback(() => {
    return issues.filter(issue => canvasFilters.issueSeverity === 'all' || issue.severity === canvasFilters.issueSeverity)
  }, [canvasFilters.issueSeverity, issues])

  const getVisibleZones = useCallback(() => {
    return zones.filter((zone: any) => {
      if (canvasFilters.unassignedZonesOnly) {
        const hasLead = Boolean(zone.lead_user_id || zone.leadUserId)
        const hasDept = Boolean(zone.assigned_department || zone.assignedDepartment)
        if (hasLead || hasDept) return false
      }
      if (canvasFilters.myDepartment) {
        const dept = String(zone.assigned_department || zone.assignedDepartment || '')
        if (dept.toLowerCase() !== String(canvasFilters.myDepartment).toLowerCase()) return false
      }
      return true
    })
  }, [canvasFilters.myDepartment, canvasFilters.unassignedZonesOnly, zones])

  const getUnresolvedNotes = useCallback(() => {
    return notes.filter(note => {
      const values = note.new_values || note.newValues || {}
      return values.is_resolved !== true
    })
  }, [notes])

  const hasActiveCanvasFilters = useMemo(
    () => filtersAreActive(canvasFilters),
    [canvasFilters]
  )

  const readinessSummary = useMemo(() => {
    const objectIds = [
      ...elements.map(element => element.id),
      ...zones.map(zone => zone.id).filter(Boolean),
      ...tents.map(tent => tent.id).filter(Boolean),
    ]
    const totalObjects = objectIds.length
    const assignedObjects = new Set(tasks.map(task => task.elementId || task.element_id).filter(Boolean)).size
    const openIssues = issues.filter(issue => !['resolved', 'closed'].includes(issue.status || 'open')).length
    const blockedTasks = tasks.filter(task => task.status === 'blocked').length
    const setupComplete = objectIds.filter(id => ['setup_complete', 'verified'].includes(elementStatuses[id])).length
    const setupCompletion = totalObjects > 0 ? Math.round((setupComplete / totalObjects) * 100) : 0
    const criticalZoneTypes = new Set(['medical', 'security', 'entrance', 'exit', 'utility'])
    const unverifiedCriticalZones = zones.filter(zone => {
      const tags = Array.isArray(zone.tags) ? zone.tags.map((tag: any) => String(tag).toLowerCase()) : []
      const isCritical = criticalZoneTypes.has(zone.zone_type || zone.zoneType) || tags.includes('critical')
      return isCritical && elementStatuses[zone.id] !== 'verified'
    }).length

    return {
      totalObjects,
      assignedObjects,
      openIssues,
      blockedTasks,
      setupCompletion,
      unverifiedCriticalZones,
    }
  }, [elementStatuses, elements, issues, tasks, tents, zones])

  // Load zones, tents, layers
  useEffect(() => {
    const id = siteMap.id
    Promise.allSettled([
      fetch(`/api/admin/logistics/site-maps/${id}/zones`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/${id}/tents`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/layers?siteMapId=${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/measurements?siteMapId=${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/issues?siteMapId=${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/${id}/tasks`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/logistics/site-maps/${id}/notes`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([zr, tr, lr, mr, ir, tar, nr]) => {
      if (zr.status === 'fulfilled') setZones((zr.value as any).data || (zr.value as any).zones || [])
      if (tr.status === 'fulfilled') setTents((tr.value as any).data || (tr.value as any).tents || [])
      if (lr.status === 'fulfilled') {
        const list = (lr.value as any).data || (lr.value as any).layers || []
        setLayers(list)
        setHiddenLayers(new Set(list.filter((layer: any) => layer.is_visible === false || layer.isVisible === false).map((layer: any) => layer.id)))
        if (list.length > 0 && !activeLayerId) setActiveLayerId(list[0].id)
      }
      if (mr.status === 'fulfilled') setMeasurements((mr.value as any).data || (mr.value as any).measurements || [])
      if (ir.status === 'fulfilled') setIssues((ir.value as any).data || (ir.value as any).issues || [])
      if (tar.status === 'fulfilled') setTasks((tar.value as any).data || (tar.value as any).tasks || [])
      if (nr.status === 'fulfilled') setNotes((nr.value as any).data || (nr.value as any).notes || [])
    })
  }, [siteMap.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addZone() {
    if (!zoneForm.name.trim()) return
    const offset = zones.length * 28
    const res = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/zones`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: zoneForm.name,
        zoneType: zoneForm.zoneType || 'other',
        x: 80 + offset,
        y: 80 + offset,
        width: 220,
        height: 140,
        color: zoneForm.color,
        borderColor: zoneForm.color,
        capacity: zoneForm.capacity ? Number(zoneForm.capacity) : null,
        tags: [],
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setZones(prev => [...prev, d.data || d.zone || {}])
      setZoneForm({ name: '', color: '#9333ea', capacity: '', zoneType: 'other' })
    }
  }

  async function deleteZone(zoneId: string) {
    await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/zones/${zoneId}`, { method: 'DELETE', credentials: 'include' })
    setZones(prev => prev.filter(z => z.id !== zoneId))
  }

  async function addTent() {
    if (!tentForm.name.trim()) return
    if (!tentForm.capacity.trim()) return
    const width = tentForm.width_ft ? Number(tentForm.width_ft) : 100
    const height = tentForm.depth_ft ? Number(tentForm.depth_ft) : 80
    const res = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tents`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tentNumber: tentForm.name,
        tentType: tentForm.type,
        width,
        height,
        capacity: Number(tentForm.capacity),
        x: 120 + (tents.length % 5) * 120,
        y: 140 + Math.floor(tents.length / 5) * 110,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setTents(prev => [...prev, d.data || d.tent || {}])
      setTentForm({ name: '', type: 'custom', width_ft: '', depth_ft: '', capacity: '' })
    }
  }

  async function deleteTent(tentId: string) {
    await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tents/${tentId}`, { method: 'DELETE', credentials: 'include' })
    setTents(prev => prev.filter(t => t.id !== tentId))
  }

  async function addLayer() {
    if (!layerForm.name.trim()) return
    const res = await fetch(`/api/admin/logistics/site-maps/layers`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteMapId: siteMap.id,
        name: layerForm.name,
        layerType: 'custom',
        color: layerForm.color,
        zIndex: layers.length,
        isVisible: true,
        isLocked: false,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      const newLayer = d.data || d.layer || {}
      setLayers(prev => [...prev, newLayer])
      setActiveLayerId(newLayer.id || activeLayerId)
      setLayerForm({ name: '', color: '#3b82f6' })
    }
  }

  function toggleLayerVisibility(layerId: string) {
    setHiddenLayers(prev => {
      const next = new Set(prev)
      next.has(layerId) ? next.delete(layerId) : next.add(layerId)
      return next
    })
    const currentlyHidden = hiddenLayers.has(layerId)
    void fetch(`/api/admin/logistics/site-maps/layers/${layerId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: currentlyHidden }),
    }).catch(() => undefined)
  }

  useEffect(() => {
    const backgroundUrl = siteMap.backgroundImageUrl || siteMap.background_image_url
    if (!backgroundUrl) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = backgroundUrl
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [siteMap.backgroundImageUrl, siteMap.background_image_url])

  useEffect(() => {
    if (activityVersion === 0) return
    let cancelled = false
    async function refreshActivityBackedData() {
      try {
        const [issuesResponse, notesResponse] = await Promise.all([
          fetch(`/api/admin/logistics/site-maps/issues?siteMapId=${siteMap.id}`, { credentials: 'include' }),
          fetch(`/api/admin/logistics/site-maps/${siteMap.id}/notes`, { credentials: 'include' }),
        ])
        const [issuesPayload, notesPayload] = await Promise.all([
          issuesResponse.json().catch(() => null),
          notesResponse.json().catch(() => null),
        ])
        if (cancelled) return
        if (issuesPayload?.success) setIssues(issuesPayload.data || [])
        if (notesPayload?.success) setNotes(notesPayload.data || [])
      } catch {}
    }
    void refreshActivityBackedData()
    return () => { cancelled = true }
  }, [activityVersion, siteMap.id])

  useEffect(() => {
    if (tasksVersion === 0) return
    let cancelled = false
    async function refreshTasks() {
      try {
        const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tasks`, { credentials: 'include' })
        const payload = await response.json()
        if (!cancelled && payload.success) setTasks(payload.data || [])
      } catch {}
    }
    void refreshTasks()
    return () => { cancelled = true }
  }, [siteMap.id, tasksVersion])

  useEffect(() => {
    if (geometryVersion === 0) return
    let cancelled = false
    async function refreshGeometry() {
      try {
        const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}`, { credentials: 'include' })
        const payload = await response.json()
        const map = payload.data || payload.siteMap
        if (cancelled || !map) return
        if (Array.isArray(map.zones)) setZones(map.zones)
        if (Array.isArray(map.tents)) setTents(map.tents)
        if (Array.isArray(map.elements)) {
          setElements(map.elements.map((el: any) => ({
            id: el.id,
            type: el.element_type || el.elementType || el.type || 'custom',
            x: Number(el.x) || 0,
            y: Number(el.y) || 0,
            width: Number(el.width) || 40,
            height: Number(el.height) || 40,
            rotation: Number(el.rotation) || 0,
            label: el.label || el.name || 'Element',
            fill: el.fill || el.fill_color || '#334155',
            stroke: el.stroke || el.stroke_color || '#94a3b8',
            strokeWidth: Number(el.stroke_width || el.strokeWidth || 2),
            data: el.data || el.properties || {},
          })))
        }
      } catch {}
    }
    void refreshGeometry()
    return () => { cancelled = true }
  }, [geometryVersion, siteMap.id])

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
  }, [siteMap.id, activityVersion])

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

  const createElementId = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }, [])


  // Save to API
  const saveToAPI = useCallback(async () => {
    if (isReadOnly) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const elementsPayload = elements.map(el => ({
        id: el.id,
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
        properties: {
          ...(el.data || {}),
          layerId: el.data?.layerId || activeLayerId || null,
        }
      }))

      const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ elements: elementsPayload, upsert: true, sync: true })
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Save failed')
      }

      setHasUnsavedChanges(false)
      setLastSavedAt(new Date())
      onSave?.(siteMap)
    } catch (err) {
      console.error('Failed to save site map:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save site map')
    } finally {
      setIsSaving(false)
    }
  }, [activeLayerId, elements, siteMap, onSave, isReadOnly])

  useEffect(() => {
    if (isReadOnly || !hasUnsavedChanges) return
    const timer = window.setTimeout(() => {
      void saveToAPI()
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [hasUnsavedChanges, isReadOnly, saveToAPI])

  useEffect(() => {
    if (isReadOnly || !hasUnsavedChanges || !saveError) return
    const timer = window.setTimeout(() => {
      void saveToAPI()
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [hasUnsavedChanges, isReadOnly, saveError, saveToAPI])

  useEffect(() => {
    if (isReadOnly || !hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isReadOnly])

  const handleClose = useCallback(() => {
    if (!isReadOnly && hasUnsavedChanges && !window.confirm('You have unsaved map changes. Close anyway?')) {
      return
    }
    onClose()
  }, [hasUnsavedChanges, isReadOnly, onClose])

  // Fit to content
  const fitToContent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = [
      ...getVisibleElements().map(element => ({ x: element.x, y: element.y, width: element.width, height: element.height })),
      ...zones.map((zone, index) => normalizeZoneBounds(zone, index)),
      ...tents.map((tent, index) => normalizeTentBounds(tent, index)),
    ]
    if (bounds.length === 0) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const minX = Math.min(...bounds.map(e => e.x))
    const minY = Math.min(...bounds.map(e => e.y))
    const maxX = Math.max(...bounds.map(e => e.x + e.width))
    const maxY = Math.max(...bounds.map(e => e.y + e.height))
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
  }, [getVisibleElements, normalizeTentBounds, normalizeZoneBounds, tents, zones])

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
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, siteMap.width, siteMap.height)
    } else {
      const gradient = ctx.createLinearGradient(0, 0, siteMap.width, siteMap.height)
      gradient.addColorStop(0, canvasTheme === 'light' ? '#f8fafc' : '#0f172a')
      gradient.addColorStop(1, canvasTheme === 'light' ? '#e2e8f0' : '#1e293b')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, siteMap.width, siteMap.height)
    }

    getVisibleZones().forEach((zone, index) => {
      drawZone(ctx, zone, index)
    })

    tents.forEach((tent, index) => {
      drawTent(ctx, tent, index)
    })

    getVisibleElements().forEach(element => {
      drawElement(ctx, element)
    })

    measurements.forEach(measurement => {
      drawMeasurement(ctx, measurement)
    })

    getVisibleIssues().forEach(issue => {
      drawIssue(ctx, issue)
    })

    const notesToDraw = canvasFilters.unresolvedNotesOnly ? getUnresolvedNotes() : notes
    notesToDraw.forEach(note => {
      drawNotePin(ctx, note)
    })

    const dataURL = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${siteMap.name.replace(/\s+/g, '_')}_sitemap.png`
    link.href = dataURL
    link.click()
  }, [siteMap.name, siteMap.width, siteMap.height, canvasFilters.unresolvedNotesOnly, zones, tents, getVisibleElements, getVisibleIssues, getVisibleZones, getUnresolvedNotes, measurements, canvasTheme, backgroundImage, elements, tasks, selectedObject])

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    const exportData = {
      siteMap: { id: siteMap.id, name: siteMap.name, description: siteMap.description, width: siteMap.width, height: siteMap.height },
      elements: elements.map(el => ({ type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation, label: el.label, fill: el.fill, stroke: el.stroke, data: el.data })),
      zones,
      tents,
      measurements,
      issues,
      notes,
      tasks,
      metadata: { exportedAt: new Date().toISOString(), version: '1.0' }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `${siteMap.name.replace(/\s+/g, '_')}_sitemap.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [siteMap, elements, zones, tents, measurements, issues, notes, tasks])

  const exportAsPDF = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageDataUrl = canvas.toDataURL('image/png')
    const popup = window.open('', '_blank', 'width=1200,height=900')
    if (!popup) return
    popup.document.write(`
      <html>
        <head><title>${siteMap.name} - Site Map</title></head>
        <body style="margin:0;padding:20px;background:#0f172a;color:white;font-family:Inter,system-ui,sans-serif;">
          <h2 style="margin:0 0 12px 0;">${siteMap.name}</h2>
          <p style="margin:0 0 16px 0;color:#94a3b8;">${siteMap.width} x ${siteMap.height}</p>
          <img src="${imageDataUrl}" style="width:100%;border:1px solid #334155;border-radius:8px;" />
          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `)
    popup.document.close()
  }, [siteMap.height, siteMap.name, siteMap.width])

  const snapToGridPosition = useCallback((x: number, y: number) => snapPoint(x, y, snapOptions), [snapOptions])
  const getGridAlignedDimensions = useCallback((width: number, height: number) => alignDims(width, height, snapOptions), [snapOptions])
  const getOccupiedGridCells = useCallback((x: number, y: number, width: number, height: number) => occupiedCells(x, y, width, height, gridSize), [gridSize])
  const checkPlacementValidity = useCallback((x: number, y: number, width: number, height: number, ignoreIds: string[] = []) => {
    return placementValid(
      { x, y, width, height },
      {
        mapWidth: siteMap.width,
        mapHeight: siteMap.height,
        obstacles: elements.map((el) => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height })),
        ignoreIds,
      }
    )
  }, [elements, siteMap.width, siteMap.height])

  // Load elements from API — show empty state instead of demo data on failure
  useEffect(() => {
    async function loadElements() {
      try {
        const resp = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/elements`, { credentials: 'include' })
        if (!resp.ok) {
          setLoadError('Failed to load map elements')
          return
        }
        setLoadError(null)
        const data = await resp.json()
        if (data.success && Array.isArray(data.data)) {
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
        }
        // If data.data is empty array, elements stays [] — canvas shows empty state hint
      } catch {
        console.warn('[SiteMapViewer] Failed to load elements — showing empty canvas')
        setLoadError('Failed to load map elements')
      }
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

    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, siteMap.width, siteMap.height)
    } else {
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
    }

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

    // Draw first-class site map objects
    getVisibleZones().forEach((zone, index) => {
      drawZone(ctx, zone, index)
    })

    tents.forEach((tent, index) => {
      drawTent(ctx, tent, index)
    })

    getVisibleElements().forEach(element => {
      drawElement(ctx, element)
    })

    measurements.forEach(measurement => {
      drawMeasurement(ctx, measurement)
    })

    if (measureStart && measureHover) {
      drawMeasurementPreview(ctx, measureStart, measureHover)
    }

    getVisibleIssues().forEach(issue => {
      drawIssue(ctx, issue)
    })

    const notesToDraw = canvasFilters.unresolvedNotesOnly ? getUnresolvedNotes() : notes
    notesToDraw.forEach(note => {
      drawNotePin(ctx, note)
    })

    // Draw placement preview
    if (selectedElementForPlacement && hoverPosition) {
      drawPlacementPreview(ctx, selectedElementForPlacement, hoverPosition)
    }

    ctx.restore()
  }, [siteMap, canvasFilters.unresolvedNotesOnly, getUnresolvedNotes, getVisibleElements, getVisibleIssues, getVisibleZones, zones, tents, measurements, measureStart, measureHover, zoom, pan, showGrid, gridSize, snapToGrid, selectedElement, selectedElements, selectedElementForPlacement, hoverPosition, highlightedGridCells, isValidPlacement, canvasTheme, elementStatuses, backgroundImage, notes, marqueeStart, marqueeEnd, tasks, selectedObject])

  const countOpenTasksForObject = (objectId: string) =>
    tasks.filter((task) => {
      const id = task.elementId || task.element_id
      return id === objectId && task.status !== 'completed'
    }).length

  const drawOpsBadge = (
    ctx: CanvasRenderingContext2D,
    width: number,
    leadLabel?: string | null,
    openTaskCount = 0
  ) => {
    let offsetX = width - 12
    if (openTaskCount > 0) {
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(offsetX, 12, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.font = '700 10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(Math.min(openTaskCount, 99)), offsetX, 12)
      offsetX -= 22
    }
    if (leadLabel) {
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(offsetX, 12, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#052e16'
      ctx.font = '700 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(leadLabel.slice(0, 2).toUpperCase(), offsetX, 12)
    }
  }

  const drawZone = (ctx: CanvasRenderingContext2D, zone: any, index: number) => {
    const bounds = normalizeZoneBounds(zone, index)
    const color = zone.color || '#9333ea'
    const borderColor = zone.border_color || zone.borderColor || color
    const opacity = getNumber(zone.opacity, 0.22)
    const rotation = getNumber(zone.rotation, 0)
    const isSelected = selectedObject?.kind === 'zone' && selectedObject.id === zone.id

    ctx.save()
    ctx.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-bounds.width / 2, -bounds.height / 2)

    ctx.globalAlpha = Math.min(0.85, Math.max(0.12, opacity))
    ctx.fillStyle = color
    roundRect(ctx, 0, 0, bounds.width, bounds.height, 8)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.strokeStyle = isSelected ? '#fbbf24' : borderColor
    ctx.lineWidth = isSelected ? 3 : getNumber(zone.border_width ?? zone.borderWidth, 2)
    ctx.setLineDash(isSelected ? [] : [10, 6])
    roundRect(ctx, 0, 0, bounds.width, bounds.height, 8)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
    roundRect(ctx, 8, 8, Math.min(bounds.width - 16, 180), 34, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    drawFittedLabel(ctx, zone.name || `Zone ${index + 1}`, 18, 21, Math.min(bounds.width - 36, 150))
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '500 10px Inter, system-ui, sans-serif'
    drawFittedLabel(ctx, (zone.zone_type || zone.zoneType || 'zone').replace(/_/g, ' '), 18, 35, Math.min(bounds.width - 36, 150))

    const leadId = zone.lead_user_id || zone.leadUserId
    const leadInitials = leadId ? String(leadId).slice(0, 2) : (zone.assigned_department || zone.assignedDepartment || '').slice(0, 2)
    drawOpsBadge(ctx, bounds.width, leadInitials || null, countOpenTasksForObject(zone.id))

    ctx.restore()
  }

  const drawTent = (ctx: CanvasRenderingContext2D, tent: any, index: number) => {
    const bounds = normalizeTentBounds(tent, index)
    const status = tent.status || 'available'
    const statusColors: Record<string, string> = {
      available: '#2563eb',
      occupied: '#f59e0b',
      reserved: '#7c3aed',
      maintenance: '#ef4444',
    }
    const color = statusColors[status] || '#2563eb'
    const rotation = getNumber(tent.rotation, 0)

    ctx.save()
    ctx.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-bounds.width / 2, -bounds.height / 2)

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    roundRect(ctx, 0, 0, bounds.width, bounds.height, 7)
    ctx.fill()
    ctx.shadowColor = 'transparent'

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    roundRect(ctx, 0, 0, bounds.width, bounds.height, 7)
    ctx.stroke()

    ctx.strokeStyle = `${color}cc`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bounds.width * 0.18, bounds.height * 0.64)
    ctx.lineTo(bounds.width * 0.5, bounds.height * 0.22)
    ctx.lineTo(bounds.width * 0.82, bounds.height * 0.64)
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawFittedLabel(ctx, tent.tent_number || tent.name || `Structure ${index + 1}`, bounds.width / 2, bounds.height - 16, bounds.width - 12)

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(bounds.width - 10, 10, 4.5, 0, Math.PI * 2)
    ctx.fill()

    drawOpsBadge(ctx, bounds.width, null, countOpenTasksForObject(tent.id))

    ctx.restore()
  }

  const drawMeasurement = (ctx: CanvasRenderingContext2D, measurement: MapMeasurementRow) => {
    const startX = getNumber(measurement.start_x ?? measurement.startX, 0)
    const startY = getNumber(measurement.start_y ?? measurement.startY, 0)
    const endX = getNumber(measurement.end_x ?? measurement.endX, startX)
    const endY = getNumber(measurement.end_y ?? measurement.endY, startY)
    const color = measurement.color || '#fb7185'
    const label = measurement.label || `${measurement.value ?? ''} ${measurement.unit || ''}`.trim()

    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 3
    ctx.setLineDash([8, 5])
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(startX, startY, 5, 0, Math.PI * 2)
    ctx.arc(endX, endY, 5, 0, Math.PI * 2)
    ctx.fill()

    if (label) {
      const midX = (startX + endX) / 2
      const midY = (startY + endY) / 2
      ctx.font = '700 11px Inter, system-ui, sans-serif'
      const textWidth = Math.min(ctx.measureText(label).width + 16, 180)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
      roundRect(ctx, midX - textWidth / 2, midY - 14, textWidth, 24, 6)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      drawFittedLabel(ctx, label, midX, midY - 2, textWidth - 10)
    }

    ctx.restore()
  }

  const drawMeasurementPreview = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const pixels = Math.hypot(end.x - start.x, end.y - start.y)
    const scale = getNumber(siteMap.scale, 1)
    const unit = siteMap.scaleUnit || siteMap.scale_unit || 'meters'
    const label = `${(pixels * scale).toFixed(1)} ${unit}`
    drawMeasurement(ctx, {
      id: 'preview',
      start_x: start.x,
      start_y: start.y,
      end_x: end.x,
      end_y: end.y,
      value: Number((pixels * scale).toFixed(1)),
      unit,
      label,
      color: '#38bdf8',
    })
  }

  const drawIssue = (ctx: CanvasRenderingContext2D, issue: MapIssueRow) => {
    const severityColors: Record<string, string> = {
      low: '#38bdf8',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    }
    const color = severityColors[issue.severity || 'medium'] || '#f59e0b'

    ctx.save()
    ctx.translate(issue.x, issue.y)
    ctx.fillStyle = color
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -16)
    ctx.lineTo(15, 12)
    ctx.lineTo(-15, 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = '900 16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', 0, 3)

    if (issue.title) {
      ctx.font = '700 10px Inter, system-ui, sans-serif'
      const textWidth = Math.min(ctx.measureText(issue.title).width + 14, 150)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      roundRect(ctx, -textWidth / 2, 18, textWidth, 22, 6)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      drawFittedLabel(ctx, issue.title, 0, 29, textWidth - 10)
    }

    ctx.restore()
  }

  const drawNotePin = (ctx: CanvasRenderingContext2D, note: any) => {
    const values = note.new_values || note.newValues || {}
    const x = getNumber(values.x, 0)
    const y = getNumber(values.y, 0)
    const label = values.content || 'Note'

    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = '#38bdf8'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = '900 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N', 0, 1)

    ctx.font = '700 10px Inter, system-ui, sans-serif'
    const textWidth = Math.min(ctx.measureText(label).width + 14, 150)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    roundRect(ctx, -textWidth / 2, 16, textWidth, 22, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    drawFittedLabel(ctx, label, 0, 27, textWidth - 10)
    ctx.restore()
  }

  const drawElement = (ctx: CanvasRenderingContext2D, element: SiteMapElement) => {
    ctx.save()
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.translate(-element.width / 2, -element.height / 2)

    const r = Math.min(8, element.width * 0.08, element.height * 0.08)
    const isSelected = (selectedElement === element.id || selectedElements.includes(element.id))

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

    drawOpsBadge(ctx, element.width, null, countOpenTasksForObject(element.id))

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

  const getMapCoords = useCallback((event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    return screenToMapCoords(event.clientX, event.clientY, canvas.getBoundingClientRect(), pan, zoom)
  }, [pan, zoom])

  const hitTestElement = useCallback((mx: number, my: number) => hitTestRect(elements, mx, my), [elements])

  const hitTestZone = useCallback((mx: number, my: number) => {
    const rects = zones.map((zone, index) => ({ ...normalizeZoneBounds(zone, index), id: zone.id, __raw: zone, __index: index }))
    return hitTestRect(rects, mx, my)
  }, [normalizeZoneBounds, zones])

  const hitTestTent = useCallback((mx: number, my: number) => {
    const rects = tents.map((tent, index) => ({ ...normalizeTentBounds(tent, index), id: tent.id, __raw: tent, __index: index }))
    return hitTestRect(rects, mx, my)
  }, [normalizeTentBounds, tents])

  const persistZonePosition = useCallback(async (zoneId: string, bounds: MapBounds) => {
    try {
      await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/zones/${zoneId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }),
      })
    } catch (error) {
      console.error('Failed to persist zone position', error)
      setToolError('Failed to save zone position')
    }
  }, [siteMap.id])

  const persistTentPosition = useCallback(async (tentId: string, bounds: MapBounds) => {
    try {
      await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tents/${tentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }),
      })
    } catch (error) {
      console.error('Failed to persist tent position', error)
      setToolError('Failed to save structure position')
    }
  }, [siteMap.id])

  const placeCannedElementAt = useCallback((canned: CannedElement | LibraryDragPayload, rawX: number, rawY: number) => {
    const width = 'width' in canned ? canned.width : 60
    const height = 'height' in canned ? canned.height : 60
    const aligned = getGridAlignedDimensions(width, height)
    const finalPosition = computeCenteredPlacement({ x: rawX, y: rawY }, aligned.width, aligned.height, snapOptions)
    const isValid = checkPlacementValidity(finalPosition.x, finalPosition.y, aligned.width, aligned.height)
    if (!isValid) return false

    const id = 'cannedElementId' in canned ? canned.cannedElementId : canned.id
    const name = canned.name
    const color = canned.color
    const strokeColor = 'strokeColor' in canned ? canned.strokeColor : (canned as CannedElement).strokeColor
    const properties = canned.properties || {}

    const newElement: SiteMapElement = {
      id: createElementId(),
      type: id,
      x: finalPosition.x,
      y: finalPosition.y,
      width: aligned.width,
      height: aligned.height,
      rotation: 0,
      fill: color,
      stroke: strokeColor,
      strokeWidth: 2,
      label: name,
      data: { ...properties, layerId: activeLayerId },
    }
    updateElements((prev) => [...prev, newElement])
    setSelectedElement(newElement.id)
    setSelectedElements([newElement.id])
    setSelectedElementForPlacement(null)
    setSelectedTool('select')
    setHighlightedGridCells([])
    setIsValidPlacement(true)
    return true
  }, [activeLayerId, checkPlacementValidity, createElementId, getGridAlignedDimensions, snapOptions, updateElements])

  const updateElementStatus = useCallback(async (elementId: string, status: ElementStatus) => {
    if (isReadOnly) return
    setElementStatuses(prev => ({ ...prev, [elementId]: status }))
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'STATUS_CHANGE',
          entityType: 'status_change',
          entityId: elementId,
          newValues: { status }
        })
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update element status:', error)
      setToolError(error instanceof Error ? error.message : 'Failed to update status')
    }
  }, [isReadOnly, siteMap.id])

  const createMeasurementAt = useCallback(async (x: number, y: number) => {
    if (isReadOnly) return
    setToolError(null)

    if (!measureStart) {
      setMeasureStart({ x, y })
      setMeasureHover({ x, y })
      return
    }

    const scale = getNumber(siteMap.scale, 1)
    const unit = siteMap.scaleUnit || siteMap.scale_unit || 'meters'
    const distance = Math.hypot(x - measureStart.x, y - measureStart.y)
    const value = Number((distance * scale).toFixed(2))

    try {
      const response = await fetch('/api/admin/logistics/site-maps/measurements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteMapId: siteMap.id,
          measurementType: 'distance',
          startX: Math.round(measureStart.x),
          startY: Math.round(measureStart.y),
          endX: Math.round(x),
          endY: Math.round(y),
          value,
          unit,
          label: `${value} ${unit}`,
          color: '#fb7185',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Failed to save measurement')
      }
      setMeasurements(prev => [payload.data, ...prev].filter(Boolean))
      setMeasureStart(null)
      setMeasureHover(null)
    } catch (error) {
      console.error('Failed to create measurement:', error)
      setToolError(error instanceof Error ? error.message : 'Failed to create measurement')
    }
  }, [getNumber, isReadOnly, measureStart, siteMap.id, siteMap.scale, siteMap.scaleUnit, siteMap.scale_unit])

  const createIssueAt = useCallback(async (x: number, y: number) => {
    if (isReadOnly) return
    setIssueDraft({ title: '', description: '', severity: 'medium', x, y })
    setIssueDialogOpen(true)
  }, [isReadOnly])

  const submitIssue = useCallback(async () => {
    if (!issueDraft.title.trim()) return
    setToolError(null)
    try {
      const response = await fetch('/api/admin/logistics/site-maps/issues', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteMapId: siteMap.id,
          issueType: 'logistics',
          severity: issueDraft.severity || 'medium',
          title: issueDraft.title.trim(),
          description: issueDraft.description.trim() || undefined,
          x: Math.round(issueDraft.x),
          y: Math.round(issueDraft.y),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Failed to save issue')
      }
      setIssues(prev => [payload.data, ...prev].filter(Boolean))
      setSelectedTool('select')
      setIssueDialogOpen(false)
      setIssueDraft({ title: '', description: '', severity: 'medium', x: 0, y: 0 })
    } catch (error) {
      console.error('Failed to create issue:', error)
      setToolError(error instanceof Error ? error.message : 'Failed to create issue')
    }
  }, [issueDraft, siteMap.id])

  const submitTextLabel = useCallback(() => {
    if (!textDraft.label.trim()) return
    const aligned = getGridAlignedDimensions(120, 40)
    const pos = snapToGridPosition(textDraft.x - aligned.width / 2, textDraft.y - aligned.height / 2)
    const newElement: SiteMapElement = {
      id: createElementId(),
      type: 'custom',
      x: pos.x,
      y: pos.y,
      width: aligned.width,
      height: aligned.height,
      rotation: 0,
      fill: 'rgba(15, 23, 42, 0.7)',
      stroke: '#94a3b8',
      strokeWidth: 1,
      label: textDraft.label.trim(),
      data: { layerId: activeLayerId, isTextLabel: true },
    }
    updateElements(prev => [...prev, newElement])
    setTextDialogOpen(false)
    setTextDraft({ label: '', x: 0, y: 0 })
    setSelectedTool('select')
  }, [activeLayerId, createElementId, getGridAlignedDimensions, snapToGridPosition, textDraft, updateElements])

  const deleteSelectedMeasurementOrIssue = useCallback(async () => {
    if (selectedMeasurementId) {
      const res = await fetch(`/api/admin/logistics/site-maps/measurements/${selectedMeasurementId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setMeasurements((prev) => prev.filter((m) => m.id !== selectedMeasurementId))
        setSelectedMeasurementId(null)
      }
      return
    }
    if (selectedIssueId) {
      const res = await fetch(`/api/admin/logistics/site-maps/issues/${selectedIssueId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId))
        setSelectedIssueId(null)
      }
    }
  }, [selectedIssueId, selectedMeasurementId])

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
          const dup = { ...el, id: createElementId(), x: el.x + 20, y: el.y + 20 }
          updateElements(prev => [...prev, dup])
          setSelectedElement(dup.id)
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (selectedElements.length) {
          updateElements(prev => prev.filter(el => !selectedElements.includes(el.id)))
          setSelectedElement(null)
          setSelectedElements([])
          setSelectedObject(null)
          return
        }
        void deleteSelectedMeasurementOrIssue()
      }
      if (e.key === 'Escape') {
        setSelectedElementForPlacement(null)
        setSelectedTool('select')
        setSelectedElement(null)
        setContextMenu(null)
        setMeasureStart(null)
        setMeasureHover(null)
      }
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (e.key === 'v' || e.key === 'V') setSelectedTool('select')
      if (e.key === 'h' || e.key === 'H') setSelectedTool('pan')
      if (e.key === 'm' || e.key === 'M') setSelectedTool('measure')
      if (e.key === 't' || e.key === 'T') setSelectedTool('text')
      if (e.key === 'i' || e.key === 'I') setSelectedTool('issue')
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElements.length) {
        e.preventDefault()
        const step = e.shiftKey ? gridSize * 5 : gridSize
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        updateElements((prev) => prev.map((el) => selectedElements.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el))
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setIsSpaceHeld(false)
    }
    window.addEventListener('keydown', handleKeyboard)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyboard); window.removeEventListener('keyup', handleKeyUp) }
  }, [isReadOnly, undo, redo, selectedElement, selectedElements, updateElements, elements, createElementId, gridSize, deleteSelectedMeasurementOrIssue])

  const handleLibraryDragStart = useCallback((event: DragStartEvent) => {
    const canned = event.active.data.current?.cannedElement as CannedElement | undefined
    setActiveLibraryDrag(canned || null)
  }, [])

  const handleLibraryDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLibraryDrag(null)
    if (isReadOnly) return
    if (event.over?.id !== 'site-map-canvas-drop') return
    const payload = event.active.data.current?.payload as LibraryDragPayload | undefined
    const canned = event.active.data.current?.cannedElement as CannedElement | undefined
    if (!payload && !canned) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const activator = event.activatorEvent as PointerEvent | undefined
    const dropX = (activator?.clientX ?? rect.left + rect.width / 2) + event.delta.x
    const dropY = (activator?.clientY ?? rect.top + rect.height / 2) + event.delta.y
    const coords = screenToMapCoords(dropX, dropY, rect, pan, zoom)
    placeCannedElementAt(canned || payload!, coords.x, coords.y)
  }, [isReadOnly, pan, placeCannedElementAt, zoom])

  const handlePublishClick = useCallback(async () => {
    if (!onPublish || isPublishing) return
    setIsPublishing(true)
    try {
      await onPublish({ ...siteMap, status: 'published' })
      setMapStatus('published')
    } finally {
      setIsPublishing(false)
    }
  }, [isPublishing, onPublish, siteMap])

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
      const selectedEl = selectedElement ? elements.find((el) => el.id === selectedElement) : null
      if (selectedEl) {
        const handle = hitTestResizeHandle(selectedEl, rawX, rawY, 12)
        if (handle) {
          setResizeHandle(handle)
          setIsDragging(true)
          setDragTarget({ kind: 'element', id: selectedEl.id })
          return
        }
      }

      const hit = hitTestElement(rawX, rawY)
      if (hit) {
        if (event.shiftKey) {
          setSelectedElements((prev) => prev.includes(hit.id) ? prev.filter((id) => id !== hit.id) : [...prev, hit.id])
          setSelectedElement(hit.id)
        } else {
          setSelectedElement(hit.id)
          setSelectedElements([hit.id])
        }
        setSelectedObject({ kind: 'element', id: hit.id })
        setShowContextDrawer(true)
        setContextTab('properties')
        setIsDragging(true)
        setDragTarget({ kind: 'element', id: hit.id })
        setDragStart({ x: rawX - hit.x, y: rawY - hit.y })
        return
      }

      const zoneHit = hitTestZone(rawX, rawY)
      if (zoneHit) {
        setSelectedElement(null)
        setSelectedElements([])
        setSelectedObject({ kind: 'zone', id: zoneHit.id })
        setShowContextDrawer(true)
        setContextTab('properties')
        setIsDragging(true)
        setDragTarget({ kind: 'zone', id: zoneHit.id })
        setDragStart({ x: rawX - zoneHit.x, y: rawY - zoneHit.y })
        return
      }

      const tentHit = hitTestTent(rawX, rawY)
      if (tentHit) {
        setSelectedElement(null)
        setSelectedElements([])
        setSelectedObject({ kind: 'tent', id: tentHit.id })
        setShowContextDrawer(true)
        setContextTab('properties')
        setIsDragging(true)
        setDragTarget({ kind: 'tent', id: tentHit.id })
        setDragStart({ x: rawX - tentHit.x, y: rawY - tentHit.y })
        return
      }

      setMarqueeStart({ x: rawX, y: rawY })
      setMarqueeEnd({ x: rawX, y: rawY })
      setSelectedElement(null)
      setSelectedElements([])
      setSelectedObject(null)
    }
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (isDragging) {
      if (dragTarget?.kind === 'element') pushHistory(elements)
      if (dragTarget?.kind === 'zone') {
        const zone = zones.find((z) => z.id === dragTarget.id)
        if (zone) {
          const idx = zones.indexOf(zone)
          void persistZonePosition(zone.id, normalizeZoneBounds(zone, idx))
        }
      }
      if (dragTarget?.kind === 'tent') {
        const tent = tents.find((t) => t.id === dragTarget.id)
        if (tent) {
          const idx = tents.indexOf(tent)
          void persistTentPosition(tent.id, normalizeTentBounds(tent, idx))
        }
      }
      setIsDragging(false)
      setResizeHandle(null)
      setDragTarget(null)
      return
    }

    if (marqueeStart && marqueeEnd) {
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x)
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y)
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x)
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y)
      if (x2 - x1 > 4 && y2 - y1 > 4) {
        const ids = elements.filter((el) =>
          el.x + el.width >= x1 && el.x <= x2 && el.y + el.height >= y1 && el.y <= y2
        ).map((el) => el.id)
        setSelectedElements(ids)
        setSelectedElement(ids[0] || null)
      }
      setMarqueeStart(null)
      setMarqueeEnd(null)
      return
    }

    if (event.button !== 0) return
    const { x: rawX, y: rawY } = getMapCoords(event)

    if (!isReadOnly && selectedTool === 'measure') {
      void createMeasurementAt(rawX, rawY)
      return
    }

    if (!isReadOnly && selectedTool === 'issue') {
      void createIssueAt(rawX, rawY)
      return
    }

    if (!isReadOnly && selectedTool === 'text') {
      setTextDraft({ label: '', x: rawX, y: rawY })
      setTextDialogOpen(true)
      return
    }

    if (!isReadOnly && selectedTool === 'delete') {
      const hit = hitTestElement(rawX, rawY)
      if (hit) deleteElement(hit.id)
      return
    }

    if (!isReadOnly && selectedTool === 'duplicate') {
      const hit = hitTestElement(rawX, rawY)
      if (hit) duplicateElement(hit.id)
      return
    }

    if (selectedElementForPlacement) {
      placeCannedElementAt(selectedElementForPlacement, rawX, rawY)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y })
      return
    }

    if (marqueeStart) {
      setMarqueeEnd(getMapCoords(event))
      return
    }

    if (isDragging && !isReadOnly && dragTarget) {
      const { x: rawX, y: rawY } = getMapCoords(event)
      if (dragTarget.kind === 'element' && resizeHandle) {
        setElements((prev) => prev.map((el) => {
          if (el.id !== dragTarget.id) return el
          const next = applyResize(el, resizeHandle, rawX, rawY, gridSize)
          const snapped = {
            ...next,
            ...snapToGridPosition(next.x, next.y),
            ...getGridAlignedDimensions(next.width, next.height),
          }
          return { ...el, ...snapped }
        }))
        setHasUnsavedChanges(true)
        return
      }

      if (dragTarget.kind === 'element') {
        const newX = rawX - dragStart.x
        const newY = rawY - dragStart.y
        const snapped = snapToGridPosition(newX, newY)
        const primary = elements.find((el) => el.id === dragTarget.id)
        if (!primary) return
        const dx = snapped.x - primary.x
        const dy = snapped.y - primary.y
        const ids = selectedElements.includes(dragTarget.id) ? selectedElements : [dragTarget.id]
        setElements((prev) => prev.map((el) => ids.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el))
        setHasUnsavedChanges(true)
        return
      }

      if (dragTarget.kind === 'zone') {
        const snapped = snapToGridPosition(rawX - dragStart.x, rawY - dragStart.y)
        setZones((prev) => prev.map((zone) => zone.id === dragTarget.id ? { ...zone, x: snapped.x, y: snapped.y } : zone))
        return
      }

      if (dragTarget.kind === 'tent') {
        const snapped = snapToGridPosition(rawX - dragStart.x, rawY - dragStart.y)
        setTents((prev) => prev.map((tent) => tent.id === dragTarget.id ? { ...tent, x: snapped.x, y: snapped.y } : tent))
        return
      }
    }

    if (selectedElementForPlacement) {
      const { x: rawX, y: rawY } = getMapCoords(event)
      const snappedPosition = snapToGridPosition(rawX, rawY)
      setHoverPosition(snappedPosition)
      const alignedDimensions = getGridAlignedDimensions(selectedElementForPlacement.width, selectedElementForPlacement.height)
      const finalPosition = computeCenteredPlacement(snappedPosition, alignedDimensions.width, alignedDimensions.height, snapOptions)
      setHighlightedGridCells(getOccupiedGridCells(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height))
      setIsValidPlacement(checkPlacementValidity(finalPosition.x, finalPosition.y, alignedDimensions.width, alignedDimensions.height))
      return
    }

    if (selectedTool === 'measure' && measureStart) {
      setMeasureHover(getMapCoords(event))
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
    const dup = { ...el, id: createElementId(), x: el.x + gridSize, y: el.y + gridSize }
    updateElements(prev => [...prev, dup])
    setSelectedElement(dup.id)
    setContextMenu(null)
  }, [elements, updateElements, gridSize, createElementId])

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
    setMeasureStart(null)
    setMeasureHover(null)
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
    <DndContext sensors={dndSensors} onDragStart={handleLibraryDragStart} onDragEnd={handleLibraryDragEnd}>
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
                      mapStatus === 'published'
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1", mapStatus === 'published' ? "bg-emerald-400" : "bg-amber-400")}></div>
                    {mapStatus}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono shrink-0">{siteMap.width}×{siteMap.height}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContextDrawer((open) => !open)}
                className={cn(
                  "h-8 px-2.5 rounded-lg border text-xs",
                  showContextDrawer ? "text-blue-300 bg-blue-500/20 border-blue-500/40" : "text-slate-400 hover:text-white border-slate-700/30"
                )}
              >
                <PanelRight className="h-3.5 w-3.5 mr-1.5" />Context
              </Button>
              {!isReadOnly && onPublish && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPublishing}
                  onClick={() => void handlePublishClick()}
                  className="h-8 px-2.5 rounded-lg text-xs text-emerald-300 hover:text-white border border-emerald-500/30"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />{isPublishing ? 'Publishing…' : 'Publish'}
                </Button>
              )}
              {!isReadOnly && (
                <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(true)} className="h-8 px-2.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700/30">
                  <Share className="h-3.5 w-3.5 mr-1.5" />Share
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white border border-slate-700/30">
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 border border-red-500/30">
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setLeftSidebarOpen((open) => !open)}
              className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-md border border-slate-700/40 bg-slate-900/90 p-1 text-slate-400 hover:text-white"
              style={{ marginLeft: leftSidebarOpen ? '18rem' : 0 }}
            >
              {leftSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!isReadOnly && leftSidebarOpen && <div className="w-72 border-r border-slate-700/30 bg-slate-900/40 backdrop-blur-2xl flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-2 py-2 border-b border-slate-700/30">
                <TabsList className="grid grid-cols-3 gap-0.5 bg-slate-800/60 border border-slate-700/40 rounded-lg p-0.5 h-auto">
                  <TabsTrigger value="library" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white rounded text-[10px] font-medium h-7 px-1.5">
                    Library
                  </TabsTrigger>
                  <TabsTrigger value="layers" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white rounded text-[10px] font-medium h-7 px-1.5">
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="objects" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white rounded text-[10px] font-medium h-7 px-1.5">
                    Objects
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="library" className="h-full mt-0 flex flex-col">
                  <div className="p-2 border-b border-slate-700/30">
                    <ToolPalette selectedTool={selectedTool} onToolSelect={handleToolSelect} />
                  </div>
                  <ElementLibraryPanel onElementSelect={handleElementSelect} selectedElement={selectedElementForPlacement} className="flex-1 min-h-0" />
                </TabsContent>

                {/* Zones Panel */}
                <TabsContent value="objects" className="h-full mt-0 p-2 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Add Zone</p>
                      <input value={zoneForm.name} onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))} placeholder="Zone name..." className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2" />
                      <select value={zoneForm.zoneType} onChange={e => setZoneForm(p => ({ ...p, zoneType: e.target.value }))} className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2">
                        {['stage','security','medical','entrance','exit','vendor','food','parking','utility','storage','other'].map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
                        <input type="color" value={zoneForm.color} onChange={e => setZoneForm(p => ({ ...p, color: e.target.value }))} className="h-7 w-10 rounded border-0 bg-transparent cursor-pointer" />
                        <input type="number" value={zoneForm.capacity} onChange={e => setZoneForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Capacity" className="flex-1 h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2" />
                      </div>
                      <button onClick={addZone} className="w-full h-7 text-xs bg-purple-600/80 hover:bg-purple-600 text-white rounded font-medium">+ Add Zone</button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{zones.length} Zones</p>
                      {zones.map((z: any) => (
                        <div key={z.id} className="flex items-center gap-2 p-1.5 bg-slate-800/30 rounded text-xs">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color || '#9333ea' }} />
                          <span className="text-slate-200 flex-1 truncate">{z.name}</span>
                          {z.capacity && <span className="text-slate-500 text-[10px]">{z.capacity}</span>}
                          <button onClick={() => deleteZone(z.id)} className="text-slate-500 hover:text-red-400 shrink-0">×</button>
                        </div>
                      ))}
                      {zones.length === 0 && <p className="text-slate-600 text-[10px] text-center py-4">No zones yet.</p>}
                    </div>
                    {zones.length > 0 && (
                      <div className="text-[10px] text-slate-500 border-t border-slate-700/30 pt-2">
                        Total capacity: {zones.reduce((s: number, z: any) => s + (Number(z.capacity) || 0), 0)}
                      </div>
                    )}
                    <div className="space-y-1.5 border-t border-slate-700/30 pt-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Add Structure</p>
                      <input value={tentForm.name} onChange={e => setTentForm(p => ({ ...p, name: e.target.value }))} placeholder="Structure name..." className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2" />
                      <select value={tentForm.type} onChange={e => setTentForm(p => ({ ...p, type: e.target.value }))} className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2">
                        {[
                          ['custom', 'Custom Structure'],
                          ['bell_tent', 'Bell Tent'],
                          ['safari_tent', 'Safari Tent'],
                          ['yurt', 'Yurt'],
                          ['tipi', 'Tipi'],
                          ['dome', 'Dome'],
                          ['cabin', 'Cabin'],
                        ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="number" value={tentForm.width_ft} onChange={e => setTentForm(p => ({ ...p, width_ft: e.target.value }))} placeholder="W (ft)" className="h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-1.5" />
                        <input type="number" value={tentForm.depth_ft} onChange={e => setTentForm(p => ({ ...p, depth_ft: e.target.value }))} placeholder="D (ft)" className="h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-1.5" />
                        <input type="number" value={tentForm.capacity} onChange={e => setTentForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Cap" className="h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-1.5" />
                      </div>
                      <button onClick={addTent} className="w-full h-7 text-xs bg-blue-600/80 hover:bg-blue-600 text-white rounded font-medium">+ Add Structure</button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{tents.length} Structures</p>
                      {tents.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2 p-1.5 bg-slate-800/30 rounded text-xs">
                          <Building className="h-3 w-3 text-blue-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 truncate">{t.tent_number || t.name}</p>
                            <p className="text-slate-500 text-[10px] capitalize">{(t.tent_type || t.type || 'structure').replace(/_/g, ' ')} {t.width ? `${t.width}×${t.height}` : ''}</p>
                          </div>
                          <button onClick={() => deleteTent(t.id)} className="text-slate-500 hover:text-red-400 shrink-0">×</button>
                        </div>
                      ))}
                      {tents.length === 0 && <p className="text-slate-600 text-[10px] text-center py-4">No structures yet.</p>}
                    </div>
                  </div>
                </TabsContent>

                {/* Layers Panel */}
                <TabsContent value="layers" className="h-full mt-0 p-2 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Add Layer</p>
                      <input value={layerForm.name} onChange={e => setLayerForm(p => ({ ...p, name: e.target.value }))} placeholder="Layer name..." className="w-full h-7 text-xs bg-slate-800/50 border border-slate-700/50 text-white rounded px-2" />
                      <div className="flex gap-1.5">
                        <input type="color" value={layerForm.color} onChange={e => setLayerForm(p => ({ ...p, color: e.target.value }))} className="h-7 w-10 rounded border-0 bg-transparent cursor-pointer" />
                        <button onClick={addLayer} className="flex-1 h-7 text-xs bg-cyan-600/80 hover:bg-cyan-600 text-white rounded font-medium">+ Add Layer</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{layers.length} Layers</p>
                      {layers.map((l: any) => (
                        <div
                          key={l.id}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${activeLayerId === l.id ? 'bg-slate-700/50 border border-slate-500/30' : 'bg-slate-800/30 hover:bg-slate-800/50'}`}
                          onClick={() => setActiveLayerId(l.id)}
                        >
                          <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: l.color || '#3b82f6' }} />
                          <span className="text-slate-200 flex-1 truncate">{l.name}</span>
                          {activeLayerId === l.id && <span className="text-[9px] text-purple-400 shrink-0">active</span>}
                          <button
                            onClick={e => { e.stopPropagation(); toggleLayerVisibility(l.id) }}
                            className={`shrink-0 ${hiddenLayers.has(l.id) ? 'text-slate-600' : 'text-slate-400 hover:text-white'}`}
                            title={hiddenLayers.has(l.id) ? 'Show layer' : 'Hide layer'}
                          >
                            {hiddenLayers.has(l.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                      {layers.length === 0 && <p className="text-slate-600 text-[10px] text-center py-4">No layers yet.</p>}
                    </div>
                  </div>
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
                      <span className="text-xs text-slate-500">Mode:</span>
                      <Badge className="text-xs bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg capitalize">
                        {selectedElementForPlacement ? 'Place' : selectedTool}
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

              <div className="mt-2">
                <SiteMapFilterBar
                  filters={canvasFilters}
                  onChange={setCanvasFilters}
                  layers={layers}
                  assigneeOptions={assigneeOptions}
                />
                <div className="mt-1 text-right text-[10px] text-slate-500">
                  {getVisibleElements().length}/{elements.length} elements · {getVisibleZones().length}/{zones.length} zones · {getVisibleIssues().length}/{issues.length} issues
                </div>
              </div>
            </div>

            <CanvasDropZone>
            <div className="flex-1 p-2 relative z-10 h-full">
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
                  onTouchStart={(event) => {
                    const touch = event.touches[0]
                    if (!touch) return
                    setIsPanning(true)
                    setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y })
                  }}
                  onTouchMove={(event) => {
                    const touch = event.touches[0]
                    if (!touch || !isPanning) return
                    setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y })
                  }}
                  onTouchEnd={() => setIsPanning(false)}
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
                    touchAction: 'none',
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
                    {zones.map((zone, index) => {
                      const bounds = normalizeZoneBounds(zone, index)
                      const sx = (bounds.x / siteMap.width) * 100
                      const sy = (bounds.y / siteMap.height) * 100
                      const sw = (bounds.width / siteMap.width) * 100
                      const sh = (bounds.height / siteMap.height) * 100
                      return (
                        <div
                          key={`zone-${zone.id || index}`}
                          className="absolute border border-purple-300/70 bg-purple-400/20"
                          style={{ left: `${sx}%`, top: `${sy}%`, width: `${Math.max(sw, 2)}%`, height: `${Math.max(sh, 2)}%`, borderRadius: 2 }}
                        />
                      )
                    })}
                    {tents.map((tent, index) => {
                      const bounds = normalizeTentBounds(tent, index)
                      const sx = (bounds.x / siteMap.width) * 100
                      const sy = (bounds.y / siteMap.height) * 100
                      const sw = (bounds.width / siteMap.width) * 100
                      const sh = (bounds.height / siteMap.height) * 100
                      return (
                        <div
                          key={`tent-${tent.id || index}`}
                          className="absolute bg-blue-400/70"
                          style={{ left: `${sx}%`, top: `${sy}%`, width: `${Math.max(sw, 2)}%`, height: `${Math.max(sh, 2)}%`, borderRadius: 1 }}
                        />
                      )
                    })}
                    {getVisibleElements().map(el => {
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
            </CanvasDropZone>

          {showContextDrawer && (
            <SiteMapContextDrawer
              open={showContextDrawer}
              onClose={() => setShowContextDrawer(false)}
              activeTab={contextTab}
              onTabChange={setContextTab}
              selectedObject={selectedObject}
              element={selectedObject?.kind === 'element' ? elements.find((e) => e.id === selectedObject.id) || null : null}
              zone={selectedObject?.kind === 'zone' ? zones.find((z) => z.id === selectedObject.id) || null : null}
              tent={selectedObject?.kind === 'tent' ? tents.find((t) => t.id === selectedObject.id) || null : null}
              layers={layers}
              elementStatus={selectedObject?.kind === 'element' ? elementStatuses[selectedObject.id] : undefined}
              tasks={tasks}
              issues={issues}
              notes={notes}
              isReadOnly={isReadOnly}
              modeLabel={selectedTool}
              eventId={eventId || (siteMap as any).event_id || (siteMap as any).eventId}
              siteMapId={siteMap.id}
              onUpdateElement={(id, updates) => {
                updateElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)))
              }}
              onStatusUpdate={updateElementStatus}
              onDeleteElement={(id) => {
                deleteElement(id)
                setSelectedObject(null)
              }}
              onUpdateZone={async (id, updates) => {
                setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)))
                await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/zones/${id}`, {
                  method: 'PUT',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates),
                })
              }}
              onUpdateTent={async (id, updates) => {
                setTents((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
                await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tents/${id}`, {
                  method: 'PUT',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates),
                })
              }}
              onCreateTask={() => setContextTab('tasks')}
              onCompleteTask={async (taskId) => {
                await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tasks`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'COMPLETE_TASK', taskId }),
                })
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t)))
              }}
              childrenTasks={
                !isReadOnly ? (
                  <div className="space-y-3">
                    <SiteMapTaskForm
                      eventId={eventId || (siteMap as any).event_id || (siteMap as any).eventId}
                      tourId={(siteMap as any).tour_id || (siteMap as any).tourId}
                      elementId={selectedObject?.id || null}
                      elementType={selectedObject?.kind || 'element'}
                      onSubmit={async (payload) => {
                        const resp = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tasks`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'ASSIGN_TASK',
                            title: payload.title,
                            description: payload.description,
                            priority: payload.priority,
                            assignedUserId: payload.assignedUserId,
                            assignedTo: payload.assignedUserId,
                            assignedToName: payload.assignedToName,
                            assignedTeamId: payload.assignedTeamId,
                            assignedRole: payload.assignedRole,
                            dueDate: payload.dueDate,
                            elementId: payload.elementId,
                            elementType: payload.elementType || 'element',
                            checklist: payload.checklist || [],
                          }),
                        })
                        const result = await resp.json()
                        if (resp.ok) {
                          const tasksResp = await fetch(`/api/admin/logistics/site-maps/${siteMap.id}/tasks`, { credentials: 'include' })
                          const tasksData = await tasksResp.json()
                          setTasks(tasksData.data || tasksData.tasks || [])
                        } else {
                          setToolError(result.error || 'Failed to create task')
                        }
                      }}
                    />
                  </div>
                ) : undefined
              }
            />
          )}
          </div>
        </div>

        <div className="px-3 py-1.5 border-t border-slate-700/30 bg-slate-950/45 flex items-center gap-2">
          <button type="button" onClick={() => setReadinessExpanded((v) => !v)} className="text-[10px] uppercase tracking-wide text-slate-400 hover:text-white">
            Readiness {readinessExpanded ? '▾' : '▸'} · {readinessSummary.setupCompletion}% setup · {readinessSummary.openIssues} issues
          </button>
        </div>
        {readinessExpanded && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 px-3 py-2 border-t border-slate-700/30 bg-slate-950/45">
          {[
            { label: 'Objects', value: readinessSummary.totalObjects, tone: 'text-slate-200', bar: null },
            { label: 'Assigned', value: readinessSummary.assignedObjects, tone: 'text-blue-300', bar: null },
            { label: 'Open Issues', value: readinessSummary.openIssues, tone: readinessSummary.openIssues > 0 ? 'text-rose-300' : 'text-emerald-300', bar: null },
            { label: 'Blocked', value: readinessSummary.blockedTasks, tone: readinessSummary.blockedTasks > 0 ? 'text-amber-300' : 'text-emerald-300', bar: null },
            { label: 'Setup', value: `${readinessSummary.setupCompletion}%`, tone: readinessSummary.setupCompletion >= 80 ? 'text-emerald-300' : 'text-cyan-300', bar: readinessSummary.setupCompletion },
            { label: 'Critical Zones', value: readinessSummary.unverifiedCriticalZones, tone: readinessSummary.unverifiedCriticalZones > 0 ? 'text-red-300' : 'text-emerald-300', bar: null },
          ].map(item => (
            <div key={item.label} className="rounded-md border border-slate-700/30 bg-slate-900/55 px-2.5 py-2">
              <div className={cn("text-base font-semibold leading-none", item.tone)}>{item.value}</div>
              <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">{item.label}</div>
              {item.bar !== null && (
                <div className="mt-1.5 h-1 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-emerald-400" style={{ width: `${item.bar}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>}

        {/* Compact Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700/30 bg-slate-900/60 backdrop-blur-xl relative">
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              <span>{elements.length + zones.length + tents.length} objects</span>
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
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
              <span>{getVisibleIssues().length}/{issues.length} issues</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
              <span>{measurements.length} measures</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
              <span>{getUnresolvedNotes().length} notes</span>
            </div>
            {hasActiveCanvasFilters && (
              <div className="flex items-center gap-1.5 text-blue-300">
                <Filter className="h-3 w-3" />
                <span>Filtered</span>
              </div>
            )}
            {saveError ? (
              <div className="flex items-center gap-1.5 text-red-400">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                <span>{saveError}</span>
              </div>
            ) : isSaving ? (
              <div className="flex items-center gap-1.5 text-blue-400">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Saving</span>
              </div>
            ) : hasUnsavedChanges ? (
              <div className="flex items-center gap-1.5 text-amber-400">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                <span>Unsaved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>{lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Saved'}</span>
              </div>
            )}
            {toolError && (
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="h-3 w-3" />
                <span>{toolError}</span>
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
            <Button size="sm" variant="ghost" onClick={exportAsPDF} className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" title="Export PDF">
              <Download className="h-3 w-3 mr-0.5" />PDF
            </Button>
            {!isReadOnly && (
              <>
                <div className="w-px h-3 bg-slate-700/40 mx-0.5"></div>
                {saveError && (
                  <Button size="sm" variant="ghost" onClick={saveToAPI} disabled={isSaving} className="h-6 px-2 text-[10px] text-red-300 hover:text-white hover:bg-red-500/10" title="Retry save">
                    Retry
                  </Button>
                )}
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

      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create issue</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={issueDraft.title}
            onChange={(e) => setIssueDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Issue title"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <select
            value={issueDraft.severity}
            onChange={(e) => setIssueDraft((prev) => ({ ...prev, severity: e.target.value }))}
            className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <Textarea
            value={issueDraft.description}
            onChange={(e) => setIssueDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitIssue()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add text label</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={textDraft.label}
            onChange={(e) => setTextDraft((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Label text"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTextDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitTextLabel}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    <DragOverlay>
      {activeLibraryDrag ? (
        <div className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-xs text-white shadow-xl">
          {activeLibraryDrag.name}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}
