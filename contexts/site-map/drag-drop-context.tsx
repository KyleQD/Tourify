"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"

// Types for drag and drop functionality
export interface DragDropConfig {
  snapToGrid: boolean
  gridSize: number
  rotationEnabled: boolean
  scalingEnabled: boolean
  collisionDetection: boolean
  multiSelect: boolean
  autoAlign: boolean
}

export interface DragItem {
  id: string
  type: 'element' | 'zone' | 'tent' | 'equipment' | 'custom'
  data: any
  element?: React.ReactNode
  icon?: React.ComponentType<any>
  category?: string
}

export interface DropZone {
  id: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  accepts: string[]
  onDrop: (item: DragItem, position: { x: number; y: number }) => void
  onHover?: (item: DragItem, position: { x: number; y: number }) => void
  onLeave?: () => void
}

export interface DragState {
  isDragging: boolean
  draggedItem: DragItem | null
  dragPosition: { x: number; y: number } | null
  dropZone: DropZone | null
  previewPosition: { x: number; y: number } | null
  isValidDrop: boolean
  snapPosition: { x: number; y: number } | null
}

interface DragDropContextType {
  // Configuration
  config: DragDropConfig
  updateConfig: (updates: Partial<DragDropConfig>) => void
  
  // Drag state
  dragState: DragState
  
  // Drag operations
  startDrag: (item: DragItem, initialPosition: { x: number; y: number }) => void
  updateDrag: (position: { x: number; y: number }) => void
  endDrag: () => void
  
  // Drop zones
  registerDropZone: (zone: DropZone) => void
  unregisterDropZone: (zoneId: string) => void
  
  // Snap to grid
  snapToGrid: (position: { x: number; y: number }) => { x: number; y: number }
  
  // Collision detection
  checkCollision: (position: { x: number; y: number }, size: { width: number; height: number }) => boolean
  
  // Multi-select
  selectedItems: string[]
  selectItem: (itemId: string, multi?: boolean) => void
  clearSelection: () => void
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined)

const defaultConfig: DragDropConfig = {
  snapToGrid: true,
  gridSize: 20,
  rotationEnabled: true,
  scalingEnabled: true,
  collisionDetection: true,
  multiSelect: true,
  autoAlign: true
}

interface DragDropProviderProps {
  children: React.ReactNode
  initialConfig?: Partial<DragDropConfig>
}

export function DragDropProvider({ children, initialConfig = {} }: DragDropProviderProps) {
  const [config, setConfig] = useState<DragDropConfig>({
    ...defaultConfig,
    ...initialConfig
  })
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragPosition: null,
    dropZone: null,
    previewPosition: null,
    isValidDrop: false,
    snapPosition: null
  })
  
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const dropZonesRef = useRef<Map<string, DropZone>>(new Map())
  
  const updateConfig = useCallback((updates: Partial<DragDropConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])
  
  const snapToGrid = useCallback((position: { x: number; y: number }) => {
    if (!config.snapToGrid) return position
    
    const snappedX = Math.round(position.x / config.gridSize) * config.gridSize
    const snappedY = Math.round(position.y / config.gridSize) * config.gridSize
    
    return { x: snappedX, y: snappedY }
  }, [config.snapToGrid, config.gridSize])
  
  const checkCollision = useCallback((position: { x: number; y: number }, size: { width: number; height: number }) => {
    if (!config.collisionDetection) return false
    
    // Simple collision detection - can be enhanced with spatial indexing
    // For now, we'll implement basic boundary checking
    return position.x >= 0 && position.y >= 0 && 
           position.x + size.width <= 1000 && position.y + size.height <= 1000
  }, [config.collisionDetection])
  
  const registerDropZone = useCallback((zone: DropZone) => {
    dropZonesRef.current.set(zone.id, zone)
  }, [])
  
  const unregisterDropZone = useCallback((zoneId: string) => {
    dropZonesRef.current.delete(zoneId)
  }, [])
  
  const findDropZone = useCallback((position: { x: number; y: number }) => {
    for (const [, zone] of dropZonesRef.current) {
      const { bounds, accepts } = zone
      if (
        position.x >= bounds.x &&
        position.x <= bounds.x + bounds.width &&
        position.y >= bounds.y &&
        position.y <= bounds.y + bounds.height
      ) {
        return zone
      }
    }
    return null
  }, [])
  
  const startDrag = useCallback((item: DragItem, initialPosition: { x: number; y: number }) => {
    const snappedPosition = snapToGrid(initialPosition)
    
    setDragState({
      isDragging: true,
      draggedItem: item,
      dragPosition: snappedPosition,
      dropZone: null,
      previewPosition: snappedPosition,
      isValidDrop: false,
      snapPosition: snappedPosition
    })
  }, [snapToGrid])
  
  const updateDrag = useCallback((position: { x: number; y: number }) => {
    if (!dragState.isDragging) return
    
    const snappedPosition = snapToGrid(position)
    const dropZone = findDropZone(snappedPosition)
    const isValidDrop = dropZone ? dropZone.accepts.includes(dragState.draggedItem?.type || '') : false
    
    setDragState(prev => ({
      ...prev,
      dragPosition: snappedPosition,
      dropZone,
      previewPosition: snappedPosition,
      isValidDrop,
      snapPosition: snappedPosition
    }))
    
    // Call hover handler if valid drop zone
    if (dropZone && isValidDrop && dropZone.onHover && dragState.draggedItem) {
      dropZone.onHover(dragState.draggedItem, snappedPosition)
    }
  }, [dragState.isDragging, dragState.draggedItem, snapToGrid, findDropZone])
  
  const endDrag = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedItem) return
    
    const { dropZone, snapPosition } = dragState
    
    if (dropZone && dragState.isValidDrop && snapPosition) {
      dropZone.onDrop(dragState.draggedItem, snapPosition)
    }
    
    // Call leave handler if there was a drop zone
    if (dropZone?.onLeave) {
      dropZone.onLeave()
    }
    
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragPosition: null,
      dropZone: null,
      previewPosition: null,
      isValidDrop: false,
      snapPosition: null
    })
  }, [dragState])
  
  const selectItem = useCallback((itemId: string, multi = false) => {
    if (multi && config.multiSelect) {
      setSelectedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      )
    } else {
      setSelectedItems([itemId])
    }
  }, [config.multiSelect])
  
  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dragState.isDragging) {
          endDrag()
        } else {
          clearSelection()
        }
      }
      
      if (e.key === 'Delete' && selectedItems.length > 0) {
        // Handle delete selected items
        console.log('Delete selected items:', selectedItems)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dragState.isDragging, selectedItems, endDrag, clearSelection])
  
  const contextValue: DragDropContextType = {
    config,
    updateConfig,
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    snapToGrid,
    checkCollision,
    selectedItems,
    selectItem,
    clearSelection
  }
  
  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (context === undefined) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

// Hook for draggable items
export function useDraggable(item: DragItem) {
  const { startDrag, updateDrag, endDrag, dragState } = useDragDrop()
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const initialPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    startDrag(item, initialPosition)
  }, [item, startDrag])
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return
    
    updateDrag({
      x: e.clientX,
      y: e.clientY
    })
  }, [dragState.isDragging, updateDrag])
  
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      endDrag()
    }
  }, [dragState.isDragging, endDrag])
  
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp])
  
  return {
    handleMouseDown,
    isDragging: dragState.isDragging,
    draggedItem: dragState.draggedItem
  }
}

// Hook for drop zones
export function useDropZone(zone: DropZone) {
  const { registerDropZone, unregisterDropZone } = useDragDrop()
  
  useEffect(() => {
    registerDropZone(zone)
    return () => unregisterDropZone(zone.id)
  }, [zone, registerDropZone, unregisterDropZone])
  
  return {
    isActive: true
  }
}
