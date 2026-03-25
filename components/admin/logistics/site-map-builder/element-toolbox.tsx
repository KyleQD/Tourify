"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search,
  Filter,
  Grid3X3,
  Home,
  Zap,
  Droplets,
  Wifi,
  Users,
  Shield,
  Star,
  AlertTriangle,
  Building,
  Car,
  Tent,
  Music,
  Utensils,
  Camera,
  MapPin,
  Navigation,
  Settings,
  TreePine,
  Mountain,
  Waves,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from "lucide-react"
import { useDraggable, DragItem } from "@/contexts/site-map/drag-drop-context"

// Element categories and their icons
const ELEMENT_CATEGORIES = {
  infrastructure: {
    label: "Infrastructure",
    icon: Building,
    color: "#3b82f6"
  },
  power: {
    label: "Power & Utilities", 
    icon: Zap,
    color: "#f59e0b"
  },
  water: {
    label: "Water & Plumbing",
    icon: Droplets,
    color: "#0ea5e9"
  },
  communications: {
    label: "Communications",
    icon: Wifi,
    color: "#10b981"
  },
  accommodation: {
    label: "Accommodation",
    icon: Tent,
    color: "#8b5cf6"
  },
  entertainment: {
    label: "Entertainment",
    icon: Music,
    color: "#ec4899"
  },
  food: {
    label: "Food & Beverage",
    icon: Utensils,
    color: "#f97316"
  },
  safety: {
    label: "Safety & Security",
    icon: Shield,
    color: "#ef4444"
  },
  transportation: {
    label: "Transportation",
    icon: Car,
    color: "#6b7280"
  },
  environment: {
    label: "Environment",
    icon: TreePine,
    color: "#22c55e"
  }
}

// Predefined element library
const ELEMENT_LIBRARY: Record<string, DragItem[]> = {
  infrastructure: [
    {
      id: "stage-main",
      type: "element",
      category: "infrastructure",
      data: { 
        name: "Main Stage",
        width: 200,
        height: 100,
        capacity: 5000,
        powerRequirements: 50
      },
      icon: Music,
      element: <div className="w-12 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs">STAGE</div>
    },
    {
      id: "stage-secondary",
      type: "element",
      category: "infrastructure", 
      data: {
        name: "Secondary Stage",
        width: 150,
        height: 80,
        capacity: 2000,
        powerRequirements: 30
      },
      icon: Music,
      element: <div className="w-10 h-5 bg-purple-500 rounded flex items-center justify-center text-white text-xs">STAGE</div>
    },
    {
      id: "tent-large",
      type: "element",
      category: "infrastructure",
      data: {
        name: "Large Tent",
        width: 300,
        height: 200,
        capacity: 1000,
        powerRequirements: 20
      },
      icon: Tent,
      element: <div className="w-16 h-10 bg-blue-500 rounded flex items-center justify-center text-white text-xs">TENT</div>
    },
    {
      id: "tent-medium",
      type: "element", 
      category: "infrastructure",
      data: {
        name: "Medium Tent",
        width: 200,
        height: 150,
        capacity: 500,
        powerRequirements: 15
      },
      icon: Tent,
      element: <div className="w-12 h-8 bg-blue-400 rounded flex items-center justify-center text-white text-xs">TENT</div>
    }
  ],
  power: [
    {
      id: "generator-large",
      type: "equipment",
      category: "power",
      data: {
        name: "Large Generator",
        width: 80,
        height: 60,
        powerOutput: 100,
        fuelType: "diesel"
      },
      icon: Zap,
      element: <div className="w-8 h-6 bg-yellow-600 rounded flex items-center justify-center text-white text-xs">GEN</div>
    },
    {
      id: "power-distribution",
      type: "equipment",
      category: "power",
      data: {
        name: "Power Distribution",
        width: 60,
        height: 40,
        outlets: 12,
        voltage: 240
      },
      icon: Zap,
      element: <div className="w-6 h-4 bg-yellow-500 rounded flex items-center justify-center text-white text-xs">PDU</div>
    },
    {
      id: "power-cable",
      type: "element",
      category: "power",
      data: {
        name: "Power Cable",
        width: 200,
        height: 10,
        capacity: 100,
        length: 50
      },
      icon: Zap,
      element: <div className="w-20 h-2 bg-yellow-400 rounded"></div>
    }
  ],
  water: [
    {
      id: "water-station",
      type: "equipment",
      category: "water",
      data: {
        name: "Water Station",
        width: 60,
        height: 40,
        capacity: 1000,
        connections: 4
      },
      icon: Droplets,
      element: <div className="w-6 h-4 bg-blue-600 rounded flex items-center justify-center text-white text-xs">H2O</div>
    },
    {
      id: "water-tank",
      type: "equipment",
      category: "water",
      data: {
        name: "Water Tank",
        width: 100,
        height: 80,
        capacity: 5000,
        material: "plastic"
      },
      icon: Droplets,
      element: <div className="w-8 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs">TANK</div>
    }
  ],
  communications: [
    {
      id: "wifi-tower",
      type: "equipment",
      category: "communications",
      data: {
        name: "WiFi Tower",
        width: 40,
        height: 60,
        range: 500,
        users: 200
      },
      icon: Wifi,
      element: <div className="w-4 h-8 bg-green-600 rounded flex items-center justify-center text-white text-xs">WIFI</div>
    },
    {
      id: "communication-hub",
      type: "equipment",
      category: "communications",
      data: {
        name: "Comm Hub",
        width: 80,
        height: 60,
        channels: 16,
        range: 1000
      },
      icon: Wifi,
      element: <div className="w-6 h-4 bg-green-500 rounded flex items-center justify-center text-white text-xs">COMM</div>
    }
  ],
  accommodation: [
    {
      id: "glamping-tent",
      type: "tent",
      category: "accommodation",
      data: {
        name: "Glamping Tent",
        width: 120,
        height: 100,
        capacity: 4,
        amenities: ["power", "heating", "bathroom"]
      },
      icon: Tent,
      element: <div className="w-10 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs">GLAMP</div>
    },
    {
      id: "standard-tent",
      type: "tent",
      category: "accommodation",
      data: {
        name: "Standard Tent",
        width: 100,
        height: 80,
        capacity: 2,
        amenities: ["basic"]
      },
      icon: Tent,
      element: <div className="w-8 h-6 bg-purple-400 rounded flex items-center justify-center text-white text-xs">TENT</div>
    }
  ],
  entertainment: [
    {
      id: "dj-booth",
      type: "element",
      category: "entertainment",
      data: {
        name: "DJ Booth",
        width: 80,
        height: 60,
        equipment: ["mixer", "speakers", "lights"]
      },
      icon: Music,
      element: <div className="w-6 h-4 bg-pink-500 rounded flex items-center justify-center text-white text-xs">DJ</div>
    },
    {
      id: "bar-area",
      type: "element",
      category: "entertainment",
      data: {
        name: "Bar Area",
        width: 120,
        height: 80,
        capacity: 50,
        equipment: ["cooler", "taps", "shelving"]
      },
      icon: Utensils,
      element: <div className="w-8 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-xs">BAR</div>
    }
  ],
  safety: [
    {
      id: "first-aid",
      type: "element",
      category: "safety",
      data: {
        name: "First Aid Station",
        width: 60,
        height: 40,
        staff: 2,
        equipment: ["defibrillator", "oxygen", "stretcher"]
      },
      icon: Shield,
      element: <div className="w-5 h-3 bg-red-600 rounded flex items-center justify-center text-white text-xs">AID</div>
    },
    {
      id: "security-post",
      type: "element",
      category: "safety",
      data: {
        name: "Security Post",
        width: 40,
        height: 40,
        staff: 1,
        equipment: ["radio", "flashlight", "first-aid"]
      },
      icon: Shield,
      element: <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center text-white text-xs">SEC</div>
    }
  ],
  transportation: [
    {
      id: "parking-area",
      type: "zone",
      category: "transportation",
      data: {
        name: "Parking Area",
        width: 300,
        height: 200,
        capacity: 100,
        surface: "gravel"
      },
      icon: Car,
      element: <div className="w-16 h-10 bg-gray-500 rounded flex items-center justify-center text-white text-xs">PARK</div>
    },
    {
      id: "loading-zone",
      type: "zone",
      category: "transportation",
      data: {
        name: "Loading Zone",
        width: 200,
        height: 100,
        access: "delivery",
        restrictions: ["no-parking"]
      },
      icon: Car,
      element: <div className="w-12 h-6 bg-gray-400 rounded flex items-center justify-center text-white text-xs">LOAD</div>
    }
  ],
  environment: [
    {
      id: "tree-large",
      type: "element",
      category: "environment",
      data: {
        name: "Large Tree",
        width: 40,
        height: 40,
        type: "oak",
        age: 50
      },
      icon: TreePine,
      element: <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">🌳</div>
    },
    {
      id: "shade-area",
      type: "zone",
      category: "environment",
      data: {
        name: "Shade Area",
        width: 150,
        height: 100,
        coverage: "partial",
        type: "natural"
      },
      icon: TreePine,
      element: <div className="w-10 h-6 bg-green-400 rounded flex items-center justify-center text-white text-xs">SHADE</div>
    }
  ]
}

interface ElementToolboxProps {
  onElementSelect?: (element: DragItem) => void
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  className?: string
}

export function ElementToolbox({ 
  onElementSelect, 
  selectedCategory = "infrastructure",
  onCategoryChange,
  className = ""
}: ElementToolboxProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  
  // Filter elements based on search term and category
  const filteredElements = useMemo(() => {
    let elements = ELEMENT_LIBRARY[selectedCategory] || []
    
    if (searchTerm) {
      elements = elements.filter(element => 
        element.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        element.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return elements
  }, [selectedCategory, searchTerm])
  
  const DraggableElement = ({ element }: { element: DragItem }) => {
    const { handleMouseDown, isDragging } = useDraggable(element)
    
    return (
      <div
        className={`
          relative cursor-grab active:cursor-grabbing p-3 rounded-xl border-2 border-transparent
          bg-white/80 hover:bg-white hover:border-blue-300 hover:shadow-md 
          transition-all duration-200 group
          ${isDragging ? 'opacity-50 scale-95 rotate-2' : ''}
        `}
        onMouseDown={handleMouseDown}
        onClick={() => onElementSelect?.(element)}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-200">
            {element.element}
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200">
              {element.data.name}
            </p>
            {element.data.capacity && (
              <p className="text-xs text-slate-500 mt-1">
                Capacity: {element.data.capacity}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`w-full h-full bg-transparent ${className}`}>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 border-slate-200 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedCategory} onValueChange={onCategoryChange}>
          <TabsList className="grid w-full grid-cols-2 mb-4 mx-4 bg-slate-100">
            <TabsTrigger 
              value="infrastructure" 
              className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              Infrastructure
            </TabsTrigger>
            <TabsTrigger 
              value="equipment" 
              className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              Equipment
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="infrastructure" className="px-4">
            <div className="space-y-4">
              {Object.entries(ELEMENT_CATEGORIES).map(([key, category]) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${category.color}20` }}>
                      <category.icon className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900">{category.label}</h3>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-2 gap-2 pr-2">
                      {(ELEMENT_LIBRARY[key] || []).map((element) => (
                        <DraggableElement key={element.id} element={element} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="equipment" className="px-4">
            <div className="space-y-4">
              {['power', 'water', 'communications', 'safety'].map((categoryKey) => {
                const category = ELEMENT_CATEGORIES[categoryKey as keyof typeof ELEMENT_CATEGORIES]
                return (
                  <div key={categoryKey}>
                    <div className="flex items-center gap-2 mb-2">
                      <category.icon className="h-4 w-4" style={{ color: category.color }} />
                      <h3 className="font-medium text-sm">{category.label}</h3>
                    </div>
                    <ScrollArea className="h-32">
                      <div className="grid grid-cols-2 gap-2 pr-2">
                        {(ELEMENT_LIBRARY[categoryKey] || []).map((element) => (
                          <DraggableElement key={element.id} element={element} />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
        
        {searchTerm && (
          <div className="px-4 py-2 border-t">
            <h3 className="font-medium text-sm mb-2">Search Results</h3>
            <ScrollArea className="h-40">
              <div className="grid grid-cols-2 gap-2 pr-2">
                {filteredElements.map((element) => (
                  <DraggableElement key={element.id} element={element} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
