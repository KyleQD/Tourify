"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { 
  Search, 
  Filter, 
  X, 
  Save, 
  Bookmark,
  Download,
  Upload,
  Trash2,
  Edit,
  Copy,
  Share2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Star,
  Clock,
  Tag,
  Plus,
  Minus,
  RefreshCw,
  Settings,
  MoreHorizontal,
  CheckSquare,
  Square,
  List,
  Grid3X3,
  SortAsc,
  SortDesc,
  Filter as FilterIcon,
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Trash2 as Trash2Icon,
  Edit as EditIcon,
  Copy as CopyIcon,
  Share2 as Share2Icon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  DollarSign as DollarSignIcon,
  Users as UsersIcon,
  Star as StarIcon,
  Clock as ClockIcon,
  Tag as TagIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  RefreshCw as RefreshCwIcon,
  Settings as SettingsIcon,
  MoreHorizontal as MoreHorizontalIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  List as ListIcon,
  Grid3X3 as Grid3X3Icon,
  SortAsc as SortAscIcon,
  SortDesc as SortDescIcon
} from "lucide-react"
import { mapAdminEventStatus, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"

interface SearchFilter {
  id: string
  name: string
  type: 'tours' | 'events' | 'artists' | 'venues'
  filters: FilterCriteria
  isSaved: boolean
  createdAt: Date
  lastUsed: Date
}

interface FilterCriteria {
  searchTerm: string
  status: string[]
  dateRange: {
    start: string
    end: string
  }
  priceRange: {
    min: number
    max: number
  }
  location: string[]
  tags: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  limit: number
}

interface AdvancedSearchProps {
  dataType: 'tours' | 'events' | 'artists' | 'venues'
  data: any[]
  onFilter: (filteredData: any[]) => void
  onExport?: (data: any[], format: string) => void
  onBulkAction?: (action: string, selectedIds: string[]) => void
  className?: string
}

export default function AdvancedSearch({
  dataType,
  data,
  onFilter,
  onExport,
  onBulkAction,
  className = ""
}: AdvancedSearchProps) {
  const normalizedData = useMemo(() => {
    if (dataType !== "events") return data
    return (data || []).map((item: any) => {
      const normalizedEvent = normalizeAdminEvent(item)
      return {
        ...item,
        ...normalizedEvent,
        status: mapAdminEventStatus(item?.status),
      }
    })
  }, [data, dataType])

  // State
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<SearchFilter[]>([])
  const [showSavedSearches, setShowSavedSearches] = useState(false)

  // Available options based on data type
  const availableOptions = useMemo(() => {
    const options = {
      tours: {
        status: ['active', 'completed', 'planning', 'cancelled'],
        sortBy: ['name', 'artist', 'start_date', 'end_date', 'revenue', 'status'],
        locations: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'Nashville'],
        tags: ['Rock', 'Pop', 'Country', 'Jazz', 'Electronic', 'Hip Hop', 'Classical']
      },
      events: {
        status: ['scheduled', 'confirmed', 'completed', 'cancelled'],
        sortBy: ['name', 'venue_name', 'event_date', 'tickets_sold', 'expected_revenue', 'status'],
        locations: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'Nashville'],
        tags: ['Concert', 'Festival', 'Conference', 'Workshop', 'Meet & Greet', 'VIP']
      },
      artists: {
        status: ['active', 'inactive'],
        sortBy: ['name', 'revenue', 'events_count', 'status'],
        locations: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'Nashville'],
        tags: ['Solo', 'Band', 'Duo', 'Orchestra', 'DJ', 'Comedian']
      },
      venues: {
        status: ['active', 'inactive'],
        sortBy: ['name', 'capacity', 'events_count', 'revenue', 'status'],
        locations: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'Nashville'],
        tags: ['Arena', 'Theater', 'Club', 'Outdoor', 'Convention Center', 'Stadium']
      }
    }
    return options[dataType]
  }, [dataType])

  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = [...normalizedData]

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const searchFields = dataType === 'tours' ? [item.name, item.artist] :
                           dataType === 'events' ? [item.name || item.title, item.venue_name || item.venueName] :
                           dataType === 'artists' ? [item.name] :
                           [item.name]
        
        return searchFields.some(field => 
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(item => {
        if (dataType === 'events') return selectedStatus.includes(mapAdminEventStatus(item.status))
        return selectedStatus.includes(item.status)
      })
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = dataType === 'tours' ? item.start_date :
                        dataType === 'events' ? (item.event_date || item.date || item.start_at) :
                        null
        
        if (!itemDate) return true
        
        const date = new Date(itemDate)
        const start = dateRange.start ? new Date(dateRange.start) : null
        const end = dateRange.end ? new Date(dateRange.end) : null
        
        if (start && date < start) return false
        if (end && date > end) return false
        return true
      })
    }

    // Price range filter
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      filtered = filtered.filter(item => {
        const price = dataType === 'tours' ? item.revenue :
                     dataType === 'events' ? (item.expected_revenue || item.actual_revenue || item.revenue || 0) :
                     dataType === 'artists' ? item.revenue :
                     item.revenue
        
        return price >= priceRange[0] && price <= priceRange[1]
      })
    }

    // Location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(item => {
        const location = dataType === 'tours' ? item.location :
                        dataType === 'events' ? (item.venue_location || item.venue_name || item.venueName || item.location) :
                        dataType === 'artists' ? item.location :
                        item.location
        
        return selectedLocations.includes(location)
      })
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const tags = item.tags || []
        return selectedTags.some(tag => tags.includes(tag))
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      const aValue =
        dataType === 'events' && sortBy === 'event_date'
          ? (a.event_date || a.date || a.start_at || '')
          : a[sortBy]
      const bValue =
        dataType === 'events' && sortBy === 'event_date'
          ? (b.event_date || b.date || b.start_at || '')
          : b[sortBy]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

    return filtered
  }, [normalizedData, searchTerm, selectedStatus, dateRange, priceRange, selectedLocations, selectedTags, sortBy, sortOrder, dataType])

  // Apply filter
  useEffect(() => {
    onFilter(filteredData)
  }, [filteredData, onFilter])

  // Save search
  const saveSearch = useCallback(() => {
    const searchFilter: SearchFilter = {
      id: Date.now().toString(),
      name: `Search ${savedSearches.length + 1}`,
      type: dataType,
      filters: {
        searchTerm,
        status: selectedStatus,
        dateRange,
        priceRange: { min: priceRange[0], max: priceRange[1] },
        location: selectedLocations,
        tags: selectedTags,
        sortBy,
        sortOrder,
        limit: 100
      },
      isSaved: true,
      createdAt: new Date(),
      lastUsed: new Date()
    }

    setSavedSearches(prev => [...prev, searchFilter])
  }, [searchTerm, selectedStatus, dateRange, priceRange, selectedLocations, selectedTags, sortBy, sortOrder, dataType, savedSearches.length])

  // Load search
  const loadSearch = useCallback((search: SearchFilter) => {
    setSearchTerm(search.filters.searchTerm)
    setSelectedStatus(search.filters.status)
    setDateRange(search.filters.dateRange)
    setPriceRange([search.filters.priceRange.min, search.filters.priceRange.max])
    setSelectedLocations(search.filters.location)
    setSelectedTags(search.filters.tags)
    setSortBy(search.filters.sortBy)
    setSortOrder(search.filters.sortOrder)
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedStatus([])
    setDateRange({ start: "", end: "" })
    setPriceRange([0, 10000])
    setSelectedLocations([])
    setSelectedTags([])
    setSortBy("name")
    setSortOrder('asc')
    setSelectedItems([])
  }, [])

  // Bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (onBulkAction && selectedItems.length > 0) {
      onBulkAction(action, selectedItems)
    }
  }, [selectedItems, onBulkAction])

  // Select all/none
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredData.map(item => item.id))
    }
  }, [selectedItems.length, filteredData])

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Advanced Search</span>
            <Badge variant="outline" className="text-xs">
              {filteredData.length} results
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedSearches(!showSavedSearches)}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search ${dataType}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600"
            />
          </div>
          <Button onClick={saveSearch} variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-slate-400">Quick filters:</span>
          {availableOptions.status.map(status => (
            <Button
              key={status}
              variant={selectedStatus.includes(status) ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(prev => 
                prev.includes(status) 
                  ? prev.filter(s => s !== status)
                  : [...prev, status]
              )}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t border-slate-700 pt-4"
            >
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={10000}
                  min={0}
                  step={100}
                  className="w-full"
                />
              </div>

              {/* Locations */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Locations</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableOptions.locations.map(location => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={location}
                        checked={selectedLocations.includes(location)}
                        onCheckedChange={(checked) => {
                          setSelectedLocations(prev => 
                            checked 
                              ? [...prev, location]
                              : prev.filter(l => l !== location)
                          )
                        }}
                      />
                      <label htmlFor={location} className="text-sm text-slate-300">
                        {location}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Tags</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableOptions.tags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          setSelectedTags(prev => 
                            checked 
                              ? [...prev, tag]
                              : prev.filter(t => t !== tag)
                          )
                        }}
                      />
                      <label htmlFor={tag} className="text-sm text-slate-300">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sorting */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.sortBy.map(option => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Order</label>
                  <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Searches */}
        <AnimatePresence>
          {showSavedSearches && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-700 pt-4"
            >
              <h4 className="text-sm font-medium text-white mb-3">Saved Searches</h4>
              {savedSearches.length === 0 ? (
                <p className="text-sm text-slate-400">No saved searches yet</p>
              ) : (
                <div className="space-y-2">
                  {savedSearches.map(search => (
                    <div key={search.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">{search.name}</p>
                        <p className="text-xs text-slate-400">
                          {search.filters.searchTerm || 'No search term'} • {search.filters.status.length} status filters
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => loadSearch(search)}>
                          Load
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSavedSearches(prev => prev.filter(s => s.id !== search.id))
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">
                {selectedItems.length} items selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {selectedItems.length === filteredData.length ? 'Deselect All' : 'Select All'}
            </Button>
            {onExport && (
              <Button size="sm" variant="outline" onClick={() => onExport(filteredData, 'csv')}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for using advanced search
export function useAdvancedSearch<T>(
  data: T[],
  dataType: string
) {
  const [filteredData, setFilteredData] = useState<T[]>(data)
  const [searchFilters, setSearchFilters] = useState<FilterCriteria>({
    searchTerm: "",
    status: [],
    dateRange: { start: "", end: "" },
    priceRange: { min: 0, max: 10000 },
    location: [],
    tags: [],
    sortBy: "name",
    sortOrder: 'asc',
    limit: 100
  })

  const applyFilters = useCallback((filters: FilterCriteria) => {
    setSearchFilters(filters)
    // Apply filters to data
    // This would be implemented based on your data structure
  }, [])

  const clearFilters = useCallback(() => {
    setSearchFilters({
      searchTerm: "",
      status: [],
      dateRange: { start: "", end: "" },
      priceRange: { min: 0, max: 10000 },
      location: [],
      tags: [],
      sortBy: "name",
      sortOrder: 'asc',
      limit: 100
    })
  }, [])

  return {
    filteredData,
    searchFilters,
    applyFilters,
    clearFilters
  }
} 