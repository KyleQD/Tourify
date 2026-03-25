'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  Grid, 
  List,
  Star,
  Zap,
  Droplets,
  Building,
  Tent,
  Music,
  Square,
  Utensils,
  Shield,
  Car,
  Wifi,
  ChevronDown,
  ChevronRight,
  Plus,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  CANNED_ELEMENTS, 
  ELEMENT_CATEGORIES, 
  getElementsByCategory, 
  getElementsBySubcategory,
  searchElements,
  type CannedElement 
} from '@/lib/data/canned-elements'
import { useDragDrop, useDraggable, type DragItem } from '@/contexts/site-map/drag-drop-context'

interface EnhancedElementToolboxProps {
  onElementSelect?: (element: CannedElement) => void
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  className?: string
}

export function EnhancedElementToolbox({ 
  onElementSelect, 
  selectedCategory = "infrastructure",
  onCategoryChange,
  className = ""
}: EnhancedElementToolboxProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['infrastructure']))
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Filter elements based on search and category
  const filteredElements = useMemo(() => {
    if (searchTerm) {
      return searchElements(searchTerm)
    }
    return getElementsByCategory(selectedCategory)
  }, [searchTerm, selectedCategory])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Toggle favorite
  const toggleFavorite = (elementId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(elementId)) {
      newFavorites.delete(elementId)
    } else {
      newFavorites.add(elementId)
    }
    setFavorites(newFavorites)
  }

  // Convert canned element to drag item
  const createDragItem = (element: CannedElement): DragItem => ({
    id: element.id,
    type: 'element',
    category: element.category,
    data: {
      name: element.name,
      width: element.width,
      height: element.height,
      color: element.color,
      strokeColor: element.strokeColor,
      capacity: element.capacity,
      powerRequirements: element.powerRequirements,
      waterRequirements: element.waterRequirements,
      accessibility: element.accessibility,
      description: element.description,
      properties: element.properties
    },
    element: <element.icon className="h-6 w-6" />
  })

  // Draggable element component
  const DraggableElement = ({ element }: { element: CannedElement }) => {
    const dragItem = createDragItem(element)
    const { handleMouseDown, isDragging } = useDraggable(dragItem)
    const isFavorite = favorites.has(element.id)

    return (
      <div
        className={cn(
          "relative cursor-grab active:cursor-grabbing p-4 rounded-xl border-2 border-transparent",
          "bg-white/90 hover:bg-white hover:border-blue-300 hover:shadow-lg",
          "transition-all duration-200 group",
          isDragging && "opacity-50 scale-95 rotate-2",
          viewMode === 'list' && "flex items-center space-x-4 p-3"
        )}
        onMouseDown={handleMouseDown}
        onClick={() => onElementSelect?.(element)}
      >
        {/* Favorite button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            isFavorite && "opacity-100 text-yellow-500"
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(element.id)
          }}
        >
          <Star className={cn("h-3 w-3", isFavorite && "fill-current")} />
        </Button>

        {viewMode === 'grid' ? (
          <div className="flex flex-col items-center space-y-3">
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-200"
              style={{ 
                backgroundColor: element.color,
                border: `2px solid ${element.strokeColor}`
              }}
            >
              <element.icon className="h-8 w-8 text-white drop-shadow-sm" />
            </div>
            
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {element.name}
              </p>
              
              <div className="flex flex-wrap gap-1 justify-center">
                {element.capacity && (
                  <Badge variant="secondary" className="text-xs">
                    {element.capacity} people
                  </Badge>
                )}
                {element.powerRequirements && (
                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                    <Zap className="h-2 w-2 mr-1" />
                    {element.powerRequirements}
                  </Badge>
                )}
                {element.waterRequirements && (
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                    <Droplets className="h-2 w-2 mr-1" />
                    Water
                  </Badge>
                )}
                {element.accessibility && (
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    ADA
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-slate-600 line-clamp-2">
                {element.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4 w-full">
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-lg shadow-sm"
              style={{ 
                backgroundColor: element.color,
                border: `2px solid ${element.strokeColor}`
              }}
            >
              <element.icon className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {element.name}
                </p>
                <div className="flex space-x-1">
                  {element.powerRequirements && (
                    <Zap className="h-3 w-3 text-yellow-500" />
                  )}
                  {element.waterRequirements && (
                    <Droplets className="h-3 w-3 text-blue-500" />
                  )}
                  {element.accessibility && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      ADA
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-slate-600 truncate">
                {element.description}
              </p>
              
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {element.category}
                </Badge>
                {element.capacity && (
                  <span className="text-xs text-slate-500">
                    {element.capacity} people
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Category section component
  const CategorySection = ({ categoryKey, category }: { categoryKey: string, category: any }) => {
    const elements = getElementsByCategory(categoryKey)
    const isExpanded = expandedCategories.has(categoryKey)
    const hasElements = elements.length > 0

    if (!hasElements) return null

    return (
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start p-2 h-auto"
          onClick={() => toggleCategory(categoryKey)}
        >
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <category.icon className="h-4 w-4" />
            <span className="font-medium">{category.name}</span>
            <Badge variant="secondary" className="ml-auto">
              {elements.length}
            </Badge>
          </div>
        </Button>

        {isExpanded && (
          <div className={cn(
            "space-y-2 pl-6",
            viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-1"
          )}>
            {elements.map((element) => (
              <DraggableElement key={element.id} element={element} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col bg-white/95 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Element Library</h3>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="hover:bg-blue-100"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 border-slate-200 focus:border-blue-300"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {searchTerm ? (
          // Search results
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-900">Search Results</h4>
              <Badge variant="secondary">{filteredElements.length} found</Badge>
            </div>
            
            <div className={cn(
              "space-y-2",
              viewMode === 'grid' ? "grid grid-cols-1 gap-2" : "space-y-1"
            )}>
              {filteredElements.map((element) => (
                <DraggableElement key={element.id} element={element} />
              ))}
            </div>
          </div>
        ) : (
          // Category tabs
          <Tabs value={selectedCategory} onValueChange={onCategoryChange}>
            <div className="p-4 border-b border-slate-200/60">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-slate-100">
                {Object.entries(ELEMENT_CATEGORIES).map(([key, category]) => {
                  const elementCount = getElementsByCategory(key).length
                  return (
                    <TabsTrigger 
                      key={key} 
                      value={key} 
                      className="flex items-center gap-2 text-xs"
                      disabled={elementCount === 0}
                    >
                      <category.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{category.name}</span>
                      {elementCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {elementCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {Object.entries(ELEMENT_CATEGORIES).map(([key, category]) => (
                <TabsContent key={key} value={key} className="mt-0">
                  <div className="space-y-4">
                    {Object.entries(category.subcategories).map(([subKey, subName]) => {
                      const subElements = getElementsBySubcategory(key, subKey)
                      if (subElements.length === 0) return null

                      return (
                        <div key={subKey} className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            {subName}
                            <Badge variant="outline" className="text-xs">
                              {subElements.length}
                            </Badge>
                          </h4>
                          
                          <div className={cn(
                            "space-y-2",
                            viewMode === 'grid' ? "grid grid-cols-1 gap-2" : "space-y-1"
                          )}>
                            {subElements.map((element) => (
                              <DraggableElement key={element.id} element={element} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/60 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{CANNED_ELEMENTS.length} total elements</span>
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span>Drag to canvas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
