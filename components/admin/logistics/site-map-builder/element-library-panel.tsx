'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building, MapPin, Music, Square, Utensils, Shield, Truck, Zap, Star, Heart,
  Trash2, TreePine, Search, ChevronDown, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CANNED_ELEMENTS, type CannedElement } from '@/lib/data/canned-elements'
import { LIBRARY_DND_TYPE, type LibraryDragPayload } from './canvas-coords'

interface ElementLibraryPanelProps {
  onElementSelect: (element: CannedElement) => void
  selectedElement: CannedElement | null
  className?: string
}

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

export function ElementLibraryPanel({ onElementSelect, selectedElement, className }: ElementLibraryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const categorizedElements = CANNED_ELEMENTS.reduce((acc, element) => {
    if (!acc[element.category]) acc[element.category] = []
    acc[element.category].push(element)
    return acc
  }, {} as Record<string, CannedElement[]>)

  const categories = Array.from(new Set(CANNED_ELEMENTS.map((el) => el.category))).sort()
  const filteredElements = CANNED_ELEMENTS.filter((element) => {
    const matchesSearch =
      !searchTerm ||
      element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      element.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || element.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div className="p-3 border-b border-slate-700/30">
        <p className="text-[10px] text-slate-500 mb-2">Drag onto canvas or click then place</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg"
          />
        </div>
      </div>

      <div className="px-3 py-1.5 border-b border-slate-700/30">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg',
              selectedCategory === 'all'
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const conf = categoryConfig[cat] || { icon: Square, colors: '#6b7280', label: cat }
            const Icon = conf.icon
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg',
                  selectedCategory === cat ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
                style={selectedCategory === cat ? { backgroundColor: conf.colors } : undefined}
              >
                <Icon className="h-3 w-3" />
                {conf.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5 py-2">
          {searchTerm || selectedCategory !== 'all' ? (
            filteredElements.map((element) => {
              const conf = categoryConfig[element.category] || { icon: Square, colors: '#6b7280', label: element.category }
              return (
                <DraggableElementButton
                  key={element.id}
                  element={element}
                  isSelected={selectedElement?.id === element.id}
                  onSelect={onElementSelect}
                  color={conf.colors}
                />
              )
            })
          ) : (
            categories.map((cat) => {
              const elems = categorizedElements[cat]
              if (!elems?.length) return null
              const conf = categoryConfig[cat] || { icon: Square, colors: '#6b7280', label: cat }
              const Icon = conf.icon
              const isCollapsed = collapsedCategories.has(cat)
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-800/40"
                  >
                    <div className="p-1 rounded-md" style={{ backgroundColor: conf.colors }}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 flex-1 text-left">{conf.label}</span>
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-700 bg-transparent px-1.5 py-0">
                      {elems.length}
                    </Badge>
                    <ChevronDown className={cn('h-3 w-3 text-slate-500 transition-transform', isCollapsed && '-rotate-90')} />
                  </button>
                  {!isCollapsed && (
                    <div className="ml-2 space-y-0.5 mt-0.5">
                      {elems.map((element) => (
                        <DraggableElementButton
                          key={element.id}
                          element={element}
                          isSelected={selectedElement?.id === element.id}
                          onSelect={onElementSelect}
                          color={conf.colors}
                        />
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

function DraggableElementButton({
  element,
  isSelected,
  onSelect,
  color,
}: {
  element: CannedElement
  isSelected: boolean
  onSelect: (el: CannedElement) => void
  color: string
}) {
  const payload: LibraryDragPayload = {
    cannedElementId: element.id,
    width: element.width,
    height: element.height,
    name: element.name,
    color: element.color,
    strokeColor: element.strokeColor,
    properties: element.properties,
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${element.id}`,
    data: { type: LIBRARY_DND_TYPE, payload, cannedElement: element },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(element)}
      className={cn(
        'flex items-center gap-2 w-full px-2 py-2 rounded-lg transition-all duration-150 text-left cursor-grab active:cursor-grabbing',
        isSelected
          ? 'bg-slate-700/80 border border-slate-500/50 shadow-sm'
          : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-700/30'
      )}
    >
      <div className="shrink-0 p-1.5 rounded-md" style={{ backgroundColor: isSelected ? color : `${color}33` }}>
        {element.icon ? <element.icon className="h-3.5 w-3.5 text-white" /> : <Square className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-slate-300')}>
          {element.name}
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-mono shrink-0">
        {element.width}×{element.height}
      </span>
      {isSelected && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
    </button>
  )
}
