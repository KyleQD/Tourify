'use client'

import React, { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Filter, Zap, Droplets, Building, Users, Utensils, Camera, MapPin, Navigation, TreePine, Shield, Wifi, Car, Music, Home, Bed, Coffee, Gift, Heart, Star, Square, Circle, Triangle, RectangleHorizontal, Hexagon, Tent } from "lucide-react"
import { cn } from "@/lib/utils"
import { CANNED_ELEMENTS } from "@/lib/data/canned-elements"
import { useDragDrop } from "@/contexts/site-map/drag-drop-context"

interface SleekElementToolboxProps {
  onElementSelect?: (element: any) => void
  className?: string
}

const categoryIcons = {
  'power': Zap,
  'utilities': Droplets,
  'venue': Building,
  'people': Users,
  'services': Utensils,
  'media': Camera,
  'navigation': MapPin,
  'equipment': Navigation,
  'infrastructure': TreePine,
  'security': Shield,
  'technology': Wifi,
  'transportation': Car,
  'entertainment': Music,
  'accommodation': Home,
  'dining': Coffee,
  'retail': Gift,
  'health': Heart,
  'premium': Star,
  'shapes': Square,
  'tents': Tent,
  'performance': Music,
  'furniture': Square,
  'food': Utensils
}

const categoryColors = {
  'power': 'from-yellow-500 to-orange-500',
  'utilities': 'from-blue-500 to-cyan-500',
  'venue': 'from-purple-500 to-indigo-500',
  'people': 'from-pink-500 to-rose-500',
  'services': 'from-green-500 to-emerald-500',
  'media': 'from-red-500 to-pink-500',
  'navigation': 'from-slate-500 to-gray-500',
  'equipment': 'from-orange-500 to-red-500',
  'infrastructure': 'from-green-600 to-green-800',
  'security': 'from-red-600 to-red-800',
  'technology': 'from-blue-600 to-indigo-600',
  'transportation': 'from-gray-600 to-slate-600',
  'entertainment': 'from-purple-600 to-violet-600',
  'accommodation': 'from-blue-500 to-teal-500',
  'dining': 'from-orange-600 to-yellow-600',
  'retail': 'from-pink-600 to-purple-600',
  'health': 'from-red-500 to-pink-500',
  'premium': 'from-yellow-600 to-orange-600',
  'shapes': 'from-gray-500 to-slate-500',
  'tents': 'from-green-500 to-teal-500',
  'performance': 'from-purple-600 to-violet-600',
  'furniture': 'from-amber-500 to-orange-500',
  'food': 'from-orange-600 to-yellow-600'
}

export function SleekElementToolbox({ onElementSelect, className }: SleekElementToolboxProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { startDrag } = useDragDrop()

  // Group elements by category
  const categorizedElements = CANNED_ELEMENTS.reduce((acc, element) => {
    const category = element.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(element)
    return acc
  }, {} as Record<string, typeof CANNED_ELEMENTS>)

  // Get all unique categories
  const categories = Array.from(new Set(CANNED_ELEMENTS.map(el => el.category))).sort()

  // Filter elements based on search and category
  const filteredElements = CANNED_ELEMENTS.filter(element => {
    const matchesSearch = element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         element.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || element.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleElementDragStart = useCallback((element: any, event: React.MouseEvent) => {
    const dragItem = {
      id: element.id,
      type: 'element' as const,
      data: element,
      element: (
        <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
          {element.icon ? <element.icon className="h-4 w-4 text-slate-300" /> : <Square className="h-4 w-4 text-slate-300" />}
          <span className="text-sm text-slate-300">{element.name}</span>
        </div>
      ),
      icon: element.icon,
      category: element.category
    }
    
    startDrag(dragItem, { x: event.clientX, y: event.clientY })
  }, [startDrag])

  return (
    <div className={cn("h-full flex flex-col bg-gradient-to-b from-slate-900/50 to-slate-800/50", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search elements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-200"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Categories</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-2">
        <div className="w-full overflow-x-auto">
          <div className="flex gap-2 pb-2">
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
              const Icon = categoryIcons[category as keyof typeof categoryIcons]
              const colorClass = categoryColors[category as keyof typeof categoryColors]
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
                  {Icon && <Icon className="h-3 w-3" />}
                  <span className="capitalize">{category}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Elements Grid */}
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-4 pb-4">
          {selectedCategory === "all" ? (
            categories.map(category => {
              const categoryElements = categorizedElements[category]
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || Square
              const colorClass = categoryColors[category as keyof typeof categoryColors] || 'from-gray-500 to-slate-500'
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className={cn(
                      "p-1.5 rounded-lg bg-gradient-to-r",
                      colorClass
                    )}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-300 capitalize">{category}</h3>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                      {categoryElements.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {categoryElements.map(element => (
                      <div
                        key={element.id}
                        draggable
                        onMouseDown={(e) => handleElementDragStart(element, e)}
                        onClick={() => onElementSelect?.(element)}
                        className="group p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/20 hover:border-slate-600/40 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-r",
                            colorClass
                          )}>
                            {element.icon ? <element.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors duration-200">
                              {element.name}
                            </h4>
                            <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors duration-200">
                              {element.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                              {element.width}×{element.height}
                            </Badge>
                            {element.capacity && (
                              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                                {element.capacity}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="text-xs text-slate-400">Drag to canvas</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-2">
              {filteredElements.map(element => {
                const Icon = categoryIcons[element.category as keyof typeof categoryIcons] || Square
                const colorClass = categoryColors[element.category as keyof typeof categoryColors] || 'from-gray-500 to-slate-500'
                
                return (
                  <div
                    key={element.id}
                    draggable
                    onMouseDown={(e) => handleElementDragStart(element, e)}
                    onClick={() => onElementSelect?.(element)}
                    className="group p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/20 hover:border-slate-600/40 transition-all duration-200 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-r",
                        colorClass
                      )}>
                        {element.icon ? <element.icon className="h-4 w-4 text-white" /> : <Square className="h-4 w-4 text-white" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors duration-200">
                          {element.name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors duration-200">
                          {element.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                          {element.width}×{element.height}
                        </Badge>
                        {element.capacity && (
                          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 bg-slate-800/50">
                            {element.capacity}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="text-xs text-slate-400">Drag to canvas</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span>{filteredElements.length} elements</span>
          </div>
          <div className="text-xs text-slate-500">Drag to canvas</div>
        </div>
      </div>
    </div>
  )
}
