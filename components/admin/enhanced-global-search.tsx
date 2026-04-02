"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "@/hooks/use-debounce"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  Search,
  Globe,
  Calendar,
  Users,
  FileText,
  Building,
  CheckSquare,
  Music,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Activity,
  Filter,
  History,
  TrendingUp,
  Bookmark,
  Hash,
  ArrowRight,
  X,
  Loader2
} from "lucide-react"

interface SearchResult {
  id: string
  type: 'tour' | 'event' | 'person' | 'document' | 'venue' | 'task' | 'artist'
  title: string
  subtitle: string
  description?: string
  url: string
  image?: string
  badge?: string
  badgeColor?: string
  metadata?: Record<string, any>
  relevance?: number
}

interface SearchCategory {
  type: string
  label: string
  icon: any
  count: number
  results: SearchResult[]
}

interface EnhancedGlobalSearchProps {
  trigger?: React.ReactNode
  placeholder?: string
  onResultSelect?: (result: SearchResult) => void
}

export function EnhancedGlobalSearch({ 
  trigger, 
  placeholder = "Search tours, events, people, documents...",
  onResultSelect 
}: EnhancedGlobalSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchCategory[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Summer Music Festival",
    "Sarah Johnson",
    "Contract Templates",
    "Madison Square Garden"
  ])
  const [bookmarkedResults, setBookmarkedResults] = useState<SearchResult[]>([])

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Mock search function - replace with real API
  const performSearch = useCallback(async (query: string): Promise<SearchCategory[]> => {
    if (!query.trim()) return []

    setIsSearching(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockResults: SearchResult[] = [
      // Tours
      {
        id: "tour-1",
        type: "tour",
        title: "West Coast Summer Tour",
        subtitle: "The Electric Waves • 12 events",
        description: "Major summer tour covering California, Oregon, and Washington",
        url: "/admin/dashboard/tours/tour-1",
        badge: "Active",
        badgeColor: "bg-green-500/20 text-green-400",
        metadata: { revenue: 485000, progress: 42, status: "active" }
      },
      {
        id: "tour-2",
        type: "tour",
        title: "European Festival Circuit",
        subtitle: "Acoustic Soul • 8 events",
        description: "European festival tour for summer 2025",
        url: "/admin/dashboard/tours/tour-2",
        badge: "Planning",
        badgeColor: "bg-yellow-500/20 text-yellow-400",
        metadata: { revenue: 0, progress: 15, status: "planning" }
      },

      // Events
      {
        id: "event-1",
        type: "event",
        title: "Summer Music Festival",
        subtitle: "Central Park • Today",
        description: "Main summer festival event with The Electric Waves",
        url: "/admin/dashboard/events/event-1",
        badge: "Live",
        badgeColor: "bg-red-500/20 text-red-400",
        metadata: { capacity: 5000, ticketsSold: 4200, status: "live" }
      },
      {
        id: "event-2",
        type: "event",
        title: "Indie Rock Night",
        subtitle: "Madison Square Garden • Tomorrow",
        description: "Intimate acoustic performance",
        url: "/admin/dashboard/events/event-2",
        badge: "Confirmed",
        badgeColor: "bg-blue-500/20 text-blue-400",
        metadata: { capacity: 8000, ticketsSold: 7200, status: "confirmed" }
      },

      // People
      {
        id: "person-1",
        type: "person",
        title: "Sarah Johnson",
        subtitle: "Tour Manager • West Coast Summer Tour",
        description: "Lead tour manager with 8 years experience",
        url: "/admin/dashboard/staff/person-1",
        image: "/placeholder-user.jpg",
        badge: "Active",
        badgeColor: "bg-green-500/20 text-green-400",
        metadata: { role: "Tour Manager", experience: 8, tours: 3 }
      },
      {
        id: "person-2",
        type: "person",
        title: "Mike Chen",
        subtitle: "Sound Engineer • Acoustic Soul",
        description: "Senior sound engineer specializing in live performances",
        url: "/admin/dashboard/staff/person-2",
        image: "/placeholder-user.jpg",
        badge: "Available",
        badgeColor: "bg-blue-500/20 text-blue-400",
        metadata: { role: "Sound Engineer", experience: 12, tours: 5 }
      },

      // Documents
      {
        id: "doc-1",
        type: "document",
        title: "Stage Plot Template",
        subtitle: "Technical Documents • 2.4 MB",
        description: "Standard stage plot template for venues",
        url: "/admin/dashboard/documents/doc-1",
        badge: "Template",
        badgeColor: "bg-purple-500/20 text-purple-400",
        metadata: { type: "PDF", size: "2.4 MB", category: "Technical" }
      },
      {
        id: "doc-2",
        type: "document",
        title: "Contract Agreement - NYC",
        subtitle: "Legal Documents • 1.8 MB",
        description: "Venue contract for Madison Square Garden",
        url: "/admin/dashboard/documents/doc-2",
        badge: "Active",
        badgeColor: "bg-green-500/20 text-green-400",
        metadata: { type: "PDF", size: "1.8 MB", category: "Legal" }
      },

      // Venues
      {
        id: "venue-1",
        type: "venue",
        title: "Madison Square Garden",
        subtitle: "New York, NY • 20,000 capacity",
        description: "Iconic venue in the heart of Manhattan",
        url: "/admin/dashboard/venues/venue-1",
        badge: "Partner",
        badgeColor: "bg-gold-500/20 text-gold-400",
        metadata: { capacity: 20000, location: "New York, NY", type: "Arena" }
      },
      {
        id: "venue-2",
        type: "venue",
        title: "The Greek Theatre",
        subtitle: "Los Angeles, CA • 5,900 capacity",
        description: "Outdoor amphitheater in Griffith Park",
        url: "/admin/dashboard/venues/venue-2",
        badge: "Available",
        badgeColor: "bg-blue-500/20 text-blue-400",
        metadata: { capacity: 5900, location: "Los Angeles, CA", type: "Amphitheater" }
      },

      // Tasks
      {
        id: "task-1",
        type: "task",
        title: "Sound Check Setup",
        subtitle: "Summer Music Festival • High Priority",
        description: "Complete sound check and equipment setup",
        url: "/admin/dashboard/tasks/task-1",
        badge: "Urgent",
        badgeColor: "bg-red-500/20 text-red-400",
        metadata: { priority: "high", dueDate: "Today", assignee: "Mike Chen" }
      },
      {
        id: "task-2",
        type: "task",
        title: "Catering Coordination",
        subtitle: "Indie Rock Night • Medium Priority",
        description: "Coordinate catering for crew and VIP guests",
        url: "/admin/dashboard/tasks/task-2",
        badge: "In Progress",
        badgeColor: "bg-yellow-500/20 text-yellow-400",
        metadata: { priority: "medium", dueDate: "Tomorrow", assignee: "Lisa Wang" }
      },

      // Artists
      {
        id: "artist-1",
        type: "artist",
        title: "The Electric Waves",
        subtitle: "Electronic/Indie • 2.3M followers",
        description: "Popular electronic indie band from Portland",
        url: "/admin/dashboard/artists/artist-1",
        image: "/placeholder-artist.jpg",
        badge: "Featured",
        badgeColor: "bg-purple-500/20 text-purple-400",
        metadata: { genre: "Electronic/Indie", followers: 2300000, tours: 2 }
      }
    ]

    // Filter results based on query
    const filteredResults = mockResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      result.description?.toLowerCase().includes(query.toLowerCase())
    )

    // Group by category
    const categories: SearchCategory[] = [
      {
        type: "tour",
        label: "Tours",
        icon: Globe,
        count: filteredResults.filter(r => r.type === "tour").length,
        results: filteredResults.filter(r => r.type === "tour")
      },
      {
        type: "event",
        label: "Events",
        icon: Calendar,
        count: filteredResults.filter(r => r.type === "event").length,
        results: filteredResults.filter(r => r.type === "event")
      },
      {
        type: "person",
        label: "People",
        icon: Users,
        count: filteredResults.filter(r => r.type === "person").length,
        results: filteredResults.filter(r => r.type === "person")
      },
      {
        type: "document",
        label: "Documents",
        icon: FileText,
        count: filteredResults.filter(r => r.type === "document").length,
        results: filteredResults.filter(r => r.type === "document")
      },
      {
        type: "venue",
        label: "Venues",
        icon: Building,
        count: filteredResults.filter(r => r.type === "venue").length,
        results: filteredResults.filter(r => r.type === "venue")
      },
      {
        type: "task",
        label: "Tasks",
        icon: CheckSquare,
        count: filteredResults.filter(r => r.type === "task").length,
        results: filteredResults.filter(r => r.type === "task")
      },
      {
        type: "artist",
        label: "Artists",
        icon: Music,
        count: filteredResults.filter(r => r.type === "artist").length,
        results: filteredResults.filter(r => r.type === "artist")
      }
    ].filter(category => category.count > 0)

    setIsSearching(false)
    return categories
  }, [])

  // Perform search when query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery).then(setSearchResults)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }, [debouncedSearchQuery, performSearch])

  const handleResultSelect = (result: SearchResult) => {
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [result.title, ...prev.filter(s => s !== result.title)].slice(0, 5)
      return updated
    })

    // Call callback
    onResultSelect?.(result)

    // Navigate
    router.push(result.url)
    setOpen(false)
    setSearchQuery("")
  }

  const handleRecentSearchClick = (search: string) => {
    setSearchQuery(search)
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'tour': return Globe
      case 'event': return Calendar
      case 'person': return Users
      case 'document': return FileText
      case 'venue': return Building
      case 'task': return CheckSquare
      case 'artist': return Music
      default: return Search
    }
  }

  const getAllResults = () => {
    return searchResults.flatMap(category => category.results)
  }

  const getFilteredResults = () => {
    if (activeCategory === "all") {
      return getAllResults()
    }
    const category = searchResults.find(c => c.type === activeCategory)
    return category?.results || []
  }

  const totalResults = getAllResults().length

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="w-full justify-start text-slate-400 border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50"
          >
            <Search className="h-4 w-4 mr-2" />
            <span>{placeholder}</span>
            <kbd className="pointer-events-none absolute right-2 top-1.5 hidden h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] bg-slate-900 border-slate-700 text-white p-0 gap-0">
        <div className="flex flex-col h-[80vh]">
          {/* Search Header */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 animate-spin" />
              )}
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1 h-8 w-8 p-0 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Category Filters */}
            {totalResults > 0 && (
              <div className="flex items-center space-x-2 mt-3 overflow-x-auto">
                <Button
                  variant={activeCategory === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveCategory("all")}
                  className="text-xs whitespace-nowrap"
                >
                  All ({totalResults})
                </Button>
                {searchResults.map((category) => {
                  const Icon = category.icon
                  return (
                    <Button
                      key={category.type}
                      variant={activeCategory === category.type ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveCategory(category.type)}
                      className="text-xs whitespace-nowrap"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {category.label} ({category.count})
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-hidden">
            {!searchQuery ? (
              // Recent searches and suggestions
              <div className="p-4 space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center text-sm text-slate-400 mb-2">
                      <History className="h-4 w-4 mr-2" />
                      Recent Searches
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(search)}
                          className="flex items-center w-full p-2 text-left text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
                        >
                          <Clock className="h-4 w-4 mr-3 text-slate-400" />
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center text-sm text-slate-400 mb-2">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Quick Access
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors">
                      <Globe className="h-5 w-5 mr-3 text-purple-400" />
                      <div className="text-left">
                        <div className="text-sm text-white">Active Tours</div>
                        <div className="text-xs text-slate-400">3 ongoing</div>
                      </div>
                    </button>
                    <button className="flex items-center p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors">
                      <Calendar className="h-5 w-5 mr-3 text-blue-400" />
                      <div className="text-left">
                        <div className="text-sm text-white">Live Events</div>
                        <div className="text-xs text-slate-400">2 happening now</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : totalResults === 0 && !isSearching ? (
              // No results
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Search className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No results found</h3>
                <p className="text-sm text-slate-500">
                  Try searching for tours, events, people, or documents
                </p>
              </div>
            ) : (
              // Search results
              <ScrollArea className="h-full">
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      {getFilteredResults().map((result, index) => {
                        const Icon = getResultIcon(result.type)
                        return (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleResultSelect(result)}
                            className="group p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all duration-200 border border-slate-700/30 hover:border-slate-600/50"
                          >
                            <div className="flex items-start space-x-3">
                              {result.image ? (
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={result.image} />
                                  <AvatarFallback>
                                    <Icon className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="p-2 bg-slate-700/50 rounded-lg">
                                  <Icon className="h-5 w-5 text-slate-400" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                                    {result.title}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    {result.badge && (
                                      <Badge className={`text-xs ${result.badgeColor}`}>
                                        {result.badge}
                                      </Badge>
                                    )}
                                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 mb-1">{result.subtitle}</p>
                                {result.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2">{result.description}</p>
                                )}

                                {/* Metadata */}
                                {result.metadata && (
                                  <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500">
                                    {result.type === 'tour' && result.metadata.revenue && (
                                      <span className="flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        ${(result.metadata.revenue / 1000).toFixed(0)}K
                                      </span>
                                    )}
                                    {result.type === 'event' && result.metadata.capacity && (
                                      <span className="flex items-center">
                                        <Users className="h-3 w-3 mr-1" />
                                        {formatSafeNumber(result.metadata.ticketsSold)}/{formatSafeNumber(result.metadata.capacity)}
                                      </span>
                                    )}
                                    {result.type === 'person' && result.metadata.experience && (
                                      <span className="flex items-center">
                                        <Star className="h-3 w-3 mr-1" />
                                        {result.metadata.experience} years exp.
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">↑↓</kbd>
                <span>Navigate</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">↵</kbd>
                <span>Select</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">esc</kbd>
                <span>Close</span>
              </div>
              {totalResults > 0 && (
                <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 