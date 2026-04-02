"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Clock, 
  Users, 
  Truck, 
  Building, 
  Box, 
  Zap, 
  Utensils, 
  MessageSquare,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Share,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Star,
  Flag,
  Bookmark,
  Archive,
  History,
  Undo,
  Redo,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Settings,
  HelpCircle,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface LogisticsItem {
  id: string
  type: 'transportation' | 'equipment' | 'lodging' | 'catering' | 'communication' | 'backline' | 'rental'
  title: string
  description: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'needs_attention'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string
  dueDate?: string
  budget?: number
  actualCost?: number
  notes?: string
  tags?: string[]
  lastUpdated: string
  createdBy: string
  isEditing?: boolean
  originalData?: Partial<LogisticsItem>
}

interface LogisticsDynamicManagerProps {
  eventId?: string
  tourId?: string
  type?: 'all' | 'transportation' | 'equipment' | 'lodging' | 'catering' | 'communication' | 'backline' | 'rental'
  compact?: boolean
  showFilters?: boolean
  enableEditing?: boolean
  autoSave?: boolean
}

export function LogisticsDynamicManager({
  eventId,
  tourId,
  type = 'all',
  compact = false,
  showFilters = true,
  enableEditing = true,
  autoSave = true
}: LogisticsDynamicManagerProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<LogisticsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    search: ''
  })
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'lastUpdated'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showCompleted, setShowCompleted] = useState(true)
  const [bulkActions, setBulkActions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newItem, setNewItem] = useState<Partial<LogisticsItem>>({})
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const [attachAssetByTask, setAttachAssetByTask] = useState<Record<string, { assetId: string; start: string; end: string }>>({})
  const [userQuery, setUserQuery] = useState('')
  const [userOptions, setUserOptions] = useState<{ id: string; full_name?: string; email?: string; avatar_url?: string }[]>([])
  const [assetQueryByTask, setAssetQueryByTask] = useState<Record<string, string>>({})
  const [assetOptionsByTask, setAssetOptionsByTask] = useState<Record<string, any[]>>({})

  // Fetch logistics items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (eventId) params.append('eventId', eventId)
      if (tourId) params.append('tourId', tourId)
      if (type !== 'all') params.append('type', type)

      const response = await fetch(`/api/admin/logistics/items?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const mapped: LogisticsItem[] = (data.items || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        description: r.description || '',
        status: r.status,
        priority: r.priority,
        assignedTo: r.assigned_to_user_id || '',
        dueDate: r.due_date || '',
        budget: r.budget ?? undefined,
        actualCost: r.actual_cost ?? undefined,
        notes: r.notes || '',
        tags: r.tags || [],
        lastUpdated: r.updated_at || r.created_at,
        createdBy: r.created_by || ''
      }))
      setItems(mapped)
    } catch (err) {
      console.error('[LogisticsDynamicManager] Error fetching items:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logistics items')
      
      // Fall back to empty when API fails
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [eventId, tourId, type])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Auto-save functionality
  const saveItem = useCallback(async (item: LogisticsItem) => {
    try {
      const response = await fetch(`/api/admin/logistics/items/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          assignedTo: item.assignedTo,
          dueDate: item.dueDate,
          budget: item.budget,
          actualCost: item.actualCost,
          notes: item.notes,
          tags: item.tags
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Item Updated",
        description: `${item.title} has been saved successfully.`,
        variant: "default"
      })

      // Update local state
      setItems(prev => prev.map(i => i.id === item.id ? { ...item, lastUpdated: new Date().toISOString() } : i))
    } catch (err) {
      console.error('[LogisticsDynamicManager] Error saving item:', err)
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Debounced auto-save
  const debouncedSave = useCallback((item: LogisticsItem) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveItem(item)
    }, 2000)
  }, [saveItem])

  // Search users by query for assignment
  useEffect(() => {
    const controller = new AbortController()
    const q = userQuery.trim()
    async function run() {
      if (!q) { setUserOptions([]); return }
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        setUserOptions(Array.isArray(data?.users) ? data.users : [])
      } catch {}
    }
    const t = setTimeout(run, 250)
    return () => { clearTimeout(t); controller.abort() }
  }, [userQuery])

  // Asset search per task
  useEffect(() => {
    const controllers: AbortController[] = []
    Object.entries(assetQueryByTask).forEach(([taskId, q]) => {
      const query = q.trim()
      const controller = new AbortController()
      controllers.push(controller)
      const run = async () => {
        if (!query) { setAssetOptionsByTask(prev => ({ ...prev, [taskId]: [] })); return }
        try {
          const res = await fetch(`/api/admin/assets/search?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal })
          if (!res.ok) return
          const data = await res.json()
          setAssetOptionsByTask(prev => ({ ...prev, [taskId]: Array.isArray(data?.assets) ? data.assets : [] }))
        } catch {}
      }
      const t = setTimeout(run, 250)
      // store timeout on controller for cleanup
      ;(controller as any)._t = t
    })
    return () => controllers.forEach(c => { if ((c as any)._t) clearTimeout((c as any)._t); c.abort() })
  }, [assetQueryByTask])

  // Handle item editing
  const handleEdit = useCallback((item: LogisticsItem) => {
    setEditingItem(item.id)
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, isEditing: true, originalData: { ...i } }
        : i
    ))
  }, [])

  // Handle item save
  const handleSave = useCallback((item: LogisticsItem) => {
    setEditingItem(null)
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...item, isEditing: false, originalData: undefined }
        : i
    ))
    
    if (autoSave) {
      debouncedSave(item)
    } else {
      saveItem(item)
    }
  }, [autoSave, debouncedSave, saveItem])

  // Handle item cancel
  const handleCancel = useCallback((item: LogisticsItem) => {
    setEditingItem(null)
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, isEditing: false, originalData: undefined }
        : i
    ))
  }, [])

  // Handle item delete
  const handleDelete = useCallback(async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/logistics/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setItems(prev => prev.filter(i => i.id !== itemId))
      toast({
        title: "Item Deleted",
        description: "The logistics item has been removed.",
        variant: "default"
      })
    } catch (err) {
      console.error('[LogisticsDynamicManager] Error deleting item:', err)
      toast({
        title: "Delete Failed",
        description: "Failed to delete item. Please try again.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Attach equipment to a task
  const attachEquipment = useCallback(async (taskId: string) => {
    const form = attachAssetByTask[taskId]
    if (!form?.assetId) {
      toast({ title: 'Missing asset', description: 'Enter an equipment asset ID', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch(`/api/admin/logistics/items/${taskId}/equipment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentAssetId: form.assetId,
          startTime: form.start || null,
          endTime: form.end || null
        })
      })
      if (!res.ok) throw new Error('attach failed')
      toast({ title: 'Equipment attached', description: 'Asset linked to task', variant: 'default' })
      setAttachAssetByTask(prev => ({ ...prev, [taskId]: { assetId: '', start: '', end: '' } }))
    } catch (err) {
      toast({ title: 'Attach failed', description: 'Could not attach equipment', variant: 'destructive' })
    }
  }, [attachAssetByTask, toast])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (bulkActions.length === 0) return

    try {
      const response = await fetch('/api/admin/logistics/items/bulk', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: bulkActions,
          action: action
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state based on action
      setItems(prev => prev.map(item => 
        bulkActions.includes(item.id) 
          ? { ...item, status: action === 'mark_complete' ? 'completed' : item.status }
          : item
      ))

      setBulkActions([])
      toast({
        title: "Bulk Action Completed",
        description: `Successfully updated ${bulkActions.length} items.`,
        variant: "default"
      })
    } catch (err) {
      console.error('[LogisticsDynamicManager] Error performing bulk action:', err)
      toast({
        title: "Bulk Action Failed",
        description: "Failed to perform bulk action. Please try again.",
        variant: "destructive"
      })
    }
  }, [bulkActions, toast])

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      if (!showCompleted && item.status === 'completed') return false
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.priority !== 'all' && item.priority !== filters.priority) return false
      if (filters.assignedTo !== 'all' && item.assignedTo !== filters.assignedTo) return false
      if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'lastUpdated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400'
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400'
      case 'pending': return 'bg-slate-500/20 text-slate-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      case 'needs_attention': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/20 text-orange-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transportation': return <Truck className="h-4 w-4" />
      case 'equipment': return <Box className="h-4 w-4" />
      case 'lodging': return <Building className="h-4 w-4" />
      case 'catering': return <Utensils className="h-4 w-4" />
      case 'communication': return <MessageSquare className="h-4 w-4" />
      case 'backline': return <Zap className="h-4 w-4" />
      case 'rental': return <Box className="h-4 w-4" />
      default: return <Box className="h-4 w-4" />
    }
  }

  // Quick status change helper
  const updateStatus = useCallback(async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/logistics/items/${taskId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('status failed')
      const { item } = await res.json()
      setItems(prev => prev.map(i => i.id === taskId ? { ...i, status: item.status } : i))
      toast({ title: 'Status updated', description: `Task marked as ${status.replace('_',' ')}` })
    } catch {
      toast({ title: 'Update failed', description: 'Could not update status', variant: 'destructive' })
    }
  }, [toast])

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-slate-400">Loading logistics items...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Logistics Management</h3>
          <p className="text-sm text-slate-400">
            {filteredAndSortedItems.length} items • {items.filter(i => i.status === 'completed').length} completed
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {bulkActions.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">{bulkActions.length} selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('mark_complete')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActions([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
            <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-slate-400">Search</Label>
                <Input
                  placeholder="Search items..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs text-slate-400">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="needs_attention">Needs Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-slate-400">Priority</Label>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-slate-400">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="lastUpdated">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showCompleted}
                    onCheckedChange={setShowCompleted}
                  />
                  <Label className="text-xs text-slate-400">Show Completed</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAndSortedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-slate-800/50 border-slate-600/50 hover:bg-slate-800/70 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={bulkActions.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkActions(prev => [...prev, item.id])
                              } else {
                                setBulkActions(prev => prev.filter(id => id !== item.id))
                              }
                            }}
                            className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                          />
                          
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(item.type)}
                            <span className="text-sm font-medium text-white">{item.title}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-300">{item.description}</p>

                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">Assigned:</span>
                          <span className="ml-1 text-white">{item.assignedTo || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Due:</span>
                          <span className="ml-1 text-white">
                            {item.dueDate ? formatSafeDate(item.dueDate) : 'No due date'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Budget:</span>
                          <span className="ml-1 text-white">
                            {formatSafeCurrency(item.budget || 0)} / {formatSafeCurrency(item.actualCost || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Updated:</span>
                          <span className="ml-1 text-white">
                            {formatSafeDate(item.lastUpdated)}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center space-x-2">
                          {item.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="text-sm text-slate-400 bg-slate-700/50 p-2 rounded">
                          <span className="font-medium">Notes:</span> {item.notes}
                        </div>
                      )}

                      {/* Equipment attachment (for equipment/backline tasks) */}
                      {(item.type === 'equipment' || item.type === 'backline') && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Input
                              placeholder="Search equipment by name or serial"
                              value={assetQueryByTask[item.id] || ''}
                              onChange={(e) => setAssetQueryByTask(prev => ({ ...prev, [item.id]: e.target.value }))}
                            />
                            <Input
                              type="datetime-local"
                              value={attachAssetByTask[item.id]?.start || ''}
                              onChange={(e) => setAttachAssetByTask(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { assetId: '', start: '', end: '' }), start: e.target.value } }))}
                            />
                            <Input
                              type="datetime-local"
                              value={attachAssetByTask[item.id]?.end || ''}
                              onChange={(e) => setAttachAssetByTask(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { assetId: '', start: '', end: '' }), end: e.target.value } }))}
                            />
                            <Button size="sm" onClick={() => attachEquipment(item.id)}>Attach Equipment</Button>
                          </div>
                          {(assetOptionsByTask[item.id]?.length || 0) > 0 && (
                            <div className="max-h-40 overflow-auto rounded border border-slate-700/50 bg-slate-800">
                              {assetOptionsByTask[item.id].map(a => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => setAttachAssetByTask(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { start: '', end: '' }), assetId: a.id } }))}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-700/50 text-sm"
                                >
                                  <span className="text-white">{a.name}</span>
                                  <span className="text-slate-400 ml-2">{a.serial_number || ''}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {enableEditing && (
                      <div className="flex items-center space-x-1 ml-4">
                        {editingItem === item.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSave(item)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(item)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {/* Quick status actions */}
                            {item.status !== 'in_progress' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, 'in_progress')} className="text-yellow-400 hover:text-yellow-300">Start</Button>
                            )}
                            {item.status !== 'completed' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, 'completed')} className="text-green-400 hover:text-green-300">Complete</Button>
                            )}
                            {item.status !== 'cancelled' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, 'cancelled')} className="text-slate-400 hover:text-slate-300">Cancel</Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSortedItems.length === 0 && (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-8 text-center">
              <Box className="h-12 w-12 mx-auto mb-4 text-slate-500" />
              <h3 className="text-lg font-medium text-white mb-2">No logistics items found</h3>
              <p className="text-slate-400 mb-4">
                {filters.search || filters.status !== 'all' || filters.priority !== 'all'
                  ? 'Try adjusting your filters to see more items.'
                  : 'Get started by adding your first logistics item.'}
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Item Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Logistics Item</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-300">Type</Label>
                <Select value={newItem.type} onValueChange={(value: any) => setNewItem(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="lodging">Lodging</SelectItem>
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="backline">Backline</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm text-slate-300">Priority</Label>
                <Select value={newItem.priority} onValueChange={(value: any) => setNewItem(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-slate-300">Title</Label>
              <Input
                value={newItem.title || ''}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter item title"
              />
            </div>
            
            <div>
              <Label className="text-sm text-slate-300">Description</Label>
              <Textarea
                value={newItem.description || ''}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter detailed description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-300">Assigned To</Label>
                <Combobox
                  value={typeof newItem.assignedTo === 'string' ? newItem.assignedTo : ''}
                  placeholder="Search by name or email"
                  items={userOptions.map(u => ({ id: u.id, label: u.full_name || u.email || 'User', subLabel: u.email }))}
                  onSearch={(q) => setUserQuery(q)}
                  onChange={(val) => setNewItem(prev => ({ ...prev, assignedTo: val }))}
                />
              </div>
              
              <div>
                <Label className="text-sm text-slate-300">Due Date</Label>
                <Input
                  type="date"
                  value={newItem.dueDate || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-300">Budget</Label>
                <Input
                  type="number"
                  value={newItem.budget || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter budget amount"
                />
              </div>
              
              <div>
                <Label className="text-sm text-slate-300">Notes</Label>
                <Input
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter notes"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const payload = {
                  eventId,
                  tourId,
                  ...newItem
                }
                try {
                  const res = await fetch('/api/admin/logistics/items', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  })
                  if (!res.ok) throw new Error('Failed to create item')
                  await fetchItems()
                  setIsCreating(false)
                  setNewItem({})
                  toast({ title: 'Item Created', description: 'New logistics item has been added successfully.', variant: 'default' })
                } catch (err) {
                  toast({ title: 'Create Failed', description: 'Could not create item', variant: 'destructive' })
                }
              }}
            >
              Create Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 