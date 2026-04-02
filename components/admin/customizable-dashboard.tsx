"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { motion, AnimatePresence } from "framer-motion"
import { useTourEventContext } from "@/app/admin/dashboard/components/tour-event-provider"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  type Active,
  type Over,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  CSS,
  Transform,
} from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"
import {
  Plus,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Globe,
  Calendar,
  Users,
  DollarSign,
  CheckSquare,
  Bell,
  TrendingUp,
  Activity,
  Star,
  Clock,
  MapPin,
  Music,
  Building,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Radio,
  Target,
  Zap,
  Info,
  X
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface DashboardWidget {
  id: string
  type: 'my-tours' | 'upcoming-events' | 'active-tasks' | 'recent-notifications' | 'budget-overview' | 'performance-metrics' | 'quick-stats' | 'recent-activity'
  title: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  isVisible: boolean
  settings?: Record<string, any>
  data?: any
}

interface WidgetTemplate {
  type: string
  title: string
  description: string
  icon: any
  defaultSize: 'small' | 'medium' | 'large'
  category: 'tours' | 'events' | 'team' | 'finance' | 'analytics' | 'general'
}

interface CustomizableDashboardProps {
  userId?: string
  onWidgetUpdate?: (widgets: DashboardWidget[]) => void
  className?: string
}

// Sortable widget component
function SortableWidget({ widget, isCustomizing, onRemove, onToggleVisibility, onDuplicate }: {
  widget: DashboardWidget
  isCustomizing: boolean
  onRemove: (id: string) => void
  onToggleVisibility: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 ${
        isDragging ? 'opacity-50' : ''
      } ${
        widget.size === 'large' 
          ? 'lg:col-span-2' 
          : widget.size === 'medium' 
            ? 'lg:col-span-1' 
            : 'lg:col-span-1'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm font-medium flex items-center">
              {isCustomizing && (
                <div {...listeners} className="mr-2 cursor-grab hover:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                </div>
              )}
              {widget.title}
            </CardTitle>
            {isCustomizing && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleVisibility(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  {widget.isVisible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(widget.id)}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <WidgetContent widget={widget} />
        </CardContent>
      </Card>
    </div>
  )
}

export function CustomizableDashboard({ userId, onWidgetUpdate, className = "" }: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [availableWidgets, setAvailableWidgets] = useState<WidgetTemplate[]>([])
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showDemoBanner, setShowDemoBanner] = useState(false)

  const { tours, events, loading } = useTourEventContext()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Widget templates
  const widgetTemplates: WidgetTemplate[] = [
    {
      type: 'my-tours',
      title: 'My Active Tours',
      description: 'Overview of your currently active tours',
      icon: Globe,
      defaultSize: 'medium',
      category: 'tours'
    },
    {
      type: 'upcoming-events',
      title: 'Upcoming Events',
      description: 'Next events in your schedule',
      icon: Calendar,
      defaultSize: 'medium',
      category: 'events'
    },
    {
      type: 'active-tasks',
      title: 'My Upcoming Tasks',
      description: 'Tasks assigned to you with deadlines',
      icon: CheckSquare,
      defaultSize: 'small',
      category: 'general'
    },
    {
      type: 'recent-notifications',
      title: 'Recent Notifications',
      description: 'Latest updates and alerts',
      icon: Bell,
      defaultSize: 'small',
      category: 'general'
    },
    {
      type: 'budget-overview',
      title: 'Budget At-a-Glance',
      description: 'Financial summary across all tours',
      icon: DollarSign,
      defaultSize: 'medium',
      category: 'finance'
    },
    {
      type: 'performance-metrics',
      title: 'Performance Dashboard',
      description: 'Key performance indicators and metrics',
      icon: BarChart3,
      defaultSize: 'large',
      category: 'analytics'
    },
    {
      type: 'quick-stats',
      title: 'Quick Stats',
      description: 'Overview of key numbers',
      icon: TrendingUp,
      defaultSize: 'small',
      category: 'analytics'
    },
    {
      type: 'recent-activity',
      title: 'Recent Activity',
      description: 'Latest actions and updates from your team',
      icon: Activity,
      defaultSize: 'medium',
      category: 'general'
    }
  ]

  // Create widgets with real data from context
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      
      // Remove demo data banner logic - we don't show demo data anymore
      setShowDemoBanner(false)

      // Use actual data from context - widgets will handle empty states
      const defaultWidgets: DashboardWidget[] = [
        {
          id: 'widget-1',
          type: 'my-tours',
          title: 'My Active Tours',
          size: 'medium',
          position: { x: 0, y: 0 },
          isVisible: true,
          data: {
            tours: tours.map(tour => ({
              id: tour.id,
              name: tour.name,
              status: tour.status,
              progress: tour.total_shows > 0 ? Math.round((tour.completed_shows / tour.total_shows) * 100) : 0,
              nextEvent: 'Next Show',
              startDate: tour.start_date,
              endDate: tour.end_date
            }))
          }
        },
        {
          id: 'widget-2',
          type: 'upcoming-events',
          title: 'Upcoming Events',
          size: 'medium',
          position: { x: 1, y: 0 },
          isVisible: true,
          data: {
            events: events.slice(0, 5).map(event => ({
              id: event.id,
              name: event.name,
              date: formatSafeDate(event.event_date),
              venue: event.venue?.name || 'TBD',
              status: event.status,
              capacity: event.capacity || 0,
              tickets_sold: event.tickets_sold || 0
            }))
          }
        },
        {
          id: 'widget-3',
          type: 'budget-overview',
          title: 'Budget At-a-Glance',
          size: 'medium',
          position: { x: 0, y: 1 },
          isVisible: true,
          data: {
            totalBudget: tours.reduce((sum, tour) => sum + (tour.revenue || 0), 0),
            spent: 0, // Will be calculated when expenses are implemented
            remaining: tours.reduce((sum, tour) => sum + (tour.revenue || 0), 0),
            monthlySpend: 0,
            categories: [] // Empty for now, will be populated when expense tracking is added
          }
        },
        {
          id: 'widget-4',
          type: 'recent-notifications',
          title: 'Recent Notifications',
          size: 'small',
          position: { x: 1, y: 1 },
          isVisible: true,
          data: {
            notifications: [
              {
                id: 'notif-1',
                type: 'info',
                message: 'Dashboard loaded successfully',
                time: 'just now',
                priority: 'info'
              }
            ]
          }
        }
      ]

      setWidgets(defaultWidgets)
      setAvailableWidgets(widgetTemplates)
      setIsLoading(false)
    }

    if (!loading) {
      loadDashboard()
    }
  }, [tours, events, loading])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        const newWidgets = arrayMove(items, oldIndex, newIndex)
        onWidgetUpdate?.(newWidgets)
        return newWidgets
      })
    }

    setActiveId(null)
  }

  const addWidget = (template: WidgetTemplate) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: template.type as any,
      title: template.title,
      size: template.defaultSize,
      position: { x: 0, y: widgets.length },
      isVisible: true,
      data: {} // This would be populated by API call
    }

    const updatedWidgets = [...widgets, newWidget]
    setWidgets(updatedWidgets)
    onWidgetUpdate?.(updatedWidgets)
  }

  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId)
    setWidgets(updatedWidgets)
    onWidgetUpdate?.(updatedWidgets)
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    const updatedWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
    )
    setWidgets(updatedWidgets)
    onWidgetUpdate?.(updatedWidgets)
  }

  const updateWidgetSettings = (widgetId: string, settings: Record<string, any>) => {
    const updatedWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, settings: { ...w.settings, ...settings } } : w
    )
    setWidgets(updatedWidgets)
    onWidgetUpdate?.(updatedWidgets)
  }

  const duplicateWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    const duplicatedWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (Copy)`,
      position: { x: widget.position.x, y: widget.position.y + 1 }
    }

    const updatedWidgets = [...widgets, duplicatedWidget]
    setWidgets(updatedWidgets)
    onWidgetUpdate?.(updatedWidgets)
  }

  const getGridColumns = () => {
    const maxX = Math.max(...widgets.map(w => w.position.x), 2)
    return Math.max(maxX + 1, 3)
  }

  if (isLoading || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-700 rounded w-48"></div>
                <div className="h-24 bg-slate-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Dashboard</h2>
          <Badge variant="outline" className="text-slate-400 border-slate-600">
            {widgets.filter(w => w.isVisible).length} widgets
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            {isCustomizing ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Customize
              </>
            )}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="tours" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                  <TabsTrigger value="tours">Tours</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="finance">Finance</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                {['tours', 'events', 'finance', 'analytics'].map(category => (
                  <TabsContent key={category} value={category} className="space-y-3">
                    {widgetTemplates
                      .filter(template => template.category === category)
                      .map(template => {
                        const Icon = template.icon
                        return (
                          <div
                            key={template.type}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className="h-5 w-5 text-purple-400" />
                              <div>
                                <h4 className="text-sm font-medium">{template.title}</h4>
                                <p className="text-xs text-slate-400">{template.description}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addWidget(template)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Add
                            </Button>
                          </div>
                        )
                      })}
                  </TabsContent>
                ))}
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Grid */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.filter(w => w.isVisible).map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className={`grid gap-6 ${
            getGridColumns() === 3 
              ? 'grid-cols-1 lg:grid-cols-3' 
              : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            <AnimatePresence>
              {widgets.filter(w => w.isVisible).map((widget) => (
                <motion.div
                  key={widget.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <SortableWidget
                    widget={widget}
                    isCustomizing={isCustomizing}
                    onRemove={removeWidget}
                    onToggleVisibility={toggleWidgetVisibility}
                    onDuplicate={duplicateWidget}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId ? (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm opacity-80 rotate-3 scale-105">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium">
                  {widgets.find(w => w.id === activeId)?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-24 bg-slate-700 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Widget Settings Dialog */}
      {selectedWidget && (
        <Dialog open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Widget Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Widget Title</Label>
                <Input
                  value={selectedWidget.title}
                  onChange={(e) => setSelectedWidget({ ...selectedWidget, title: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label>Size</Label>
                <Select
                  value={selectedWidget.size}
                  onValueChange={(value) => setSelectedWidget({ ...selectedWidget, size: value as any })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={selectedWidget.isVisible}
                  onCheckedChange={(checked) => setSelectedWidget({ ...selectedWidget, isVisible: checked })}
                />
                <Label>Visible</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedWidget(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateWidgetSettings(selectedWidget.id, selectedWidget)
                    setSelectedWidget(null)
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Widget Content Component
function WidgetContent({ widget }: { widget: DashboardWidget }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400'
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400'
      case 'planning': return 'bg-yellow-500/20 text-yellow-400'
      case 'scheduled': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  switch (widget.type) {
    case 'my-tours':
      return (
        <div className="space-y-3">
          {widget.data?.tours?.length > 0 ? (
            widget.data.tours.map((tour: any) => (
              <div key={tour.id} className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white truncate">{tour.name}</h4>
                  <Badge className={getStatusColor(tour.status)}>
                    {tour.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-2">{tour.startDate} - {tour.endDate}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white">{tour.progress}%</span>
                  </div>
                  <Progress value={tour.progress} className="h-1" />
                </div>
                {tour.nextEvent && (
                  <p className="text-xs text-slate-500 mt-2">Next: {tour.nextEvent}</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Globe className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              <p className="text-sm">No tours yet</p>
              <p className="text-xs text-slate-500">Create your first tour to get started</p>
            </div>
          )}
        </div>
      )

    case 'upcoming-events':
      return (
        <div className="space-y-2">
          {widget.data?.events?.length > 0 ? (
            widget.data.events.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{event.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" />
                    <span>{event.venue}</span>
                    <span>•</span>
                    <span>{event.date}</span>
                  </div>
                </div>
                <Badge className={getStatusColor(event.status)}>
                  {event.status}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              <p className="text-sm">No events scheduled</p>
              <p className="text-xs text-slate-500">Add events to your tours</p>
            </div>
          )}
        </div>
      )

    case 'budget-overview':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-400">
                ${widget.data?.totalBudget > 0 ? (widget.data.totalBudget / 1000000).toFixed(1) + 'M' : '0'}
              </p>
              <p className="text-xs text-slate-400">Total Budget</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-400">
                ${widget.data?.spent > 0 ? (widget.data.spent / 1000000).toFixed(1) + 'M' : '0'}
              </p>
              <p className="text-xs text-slate-400">Spent</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">
                ${widget.data?.remaining > 0 ? (widget.data.remaining / 1000000).toFixed(1) + 'M' : '0'}
              </p>
              <p className="text-xs text-slate-400">Remaining</p>
            </div>
          </div>
          <div className="space-y-2">
            {widget.data?.categories?.length > 0 ? (
              widget.data.categories.map((category: any) => (
                <div key={category.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{category.name}</span>
                    <span className="text-white">${(category.amount / 1000).toFixed(0)}K</span>
                  </div>
                  <Progress value={category.percentage} className="h-1" />
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-slate-500" />
                <p className="text-sm">No budget data yet</p>
                <p className="text-xs text-slate-500">Add tour budgets to track expenses</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'recent-notifications':
      return (
        <div className="space-y-2">
          {widget.data?.notifications?.length > 0 ? (
            widget.data.notifications.map((notification: any) => (
              <div key={notification.id} className="p-2 bg-slate-800/30 rounded-lg">
                <p className="text-sm text-white">{notification.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge className={getPriorityColor(notification.priority)}>
                    {notification.type}
                  </Badge>
                  <span className="text-xs text-slate-500">{notification.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs text-slate-500">Stay updated with tour activity</p>
            </div>
          )}
        </div>
      )

    default:
      return (
        <div className="text-center py-8 text-slate-400">
          <div className="text-sm">Widget content not implemented</div>
          <div className="text-xs mt-1">Type: {widget.type}</div>
        </div>
      )
  }
} 