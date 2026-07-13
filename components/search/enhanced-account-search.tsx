"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Clock, Sparkles, ArrowRight, User, Music, Building2, Loader2, Hash, Verified } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandList } from '@/components/ui/command'
import { useEnhancedSearch } from '@/hooks/use-enhanced-search'
import { resolvePublicProfilePath } from '@/lib/utils/public-profile-routes'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  username: string
  account_type: 'artist' | 'venue' | 'general' | 'organization'
  profile_data?: any
  avatar_url?: string
  verified?: boolean
  bio?: string
  location?: string
  stats?: {
    followers?: number
    following?: number
  }
}

interface EnhancedAccountSearchProps {
  placeholder?: string
  className?: string
  onResultSelect?: (result: SearchResult) => void
  showRecentSearches?: boolean
}

// Mock recent searches (in a real app, these would come from localStorage/API)
const RECENT_SEARCHES = [
  { query: "taylor swift", type: "artist" },
  { query: "madison square", type: "venue" },
  { query: "rock concerts", type: "general" }
]

export function EnhancedAccountSearch({ 
  placeholder = "Search artists, venues, and users...", 
  className,
  onResultSelect,
  showRecentSearches = true
}: EnhancedAccountSearchProps) {
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSearchHints, setShowSearchHints] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    searchInputRef,
    clearSearch,
    hasResults,
    recentSearches,
    addToRecentSearches
  } = useEnhancedSearch()

  // Show search hints when input is focused and empty
  useEffect(() => {
    setShowSearchHints(isFocused && !query.trim() && !isOpen)
  }, [isFocused, query, isOpen])

  // Default suggestions for new users
  const defaultSuggestions = [
    { query: "neon pulse", type: "artist", label: "Neon Pulse - Electronic Artist" },
    { query: "neon lounge", type: "venue", label: "The Neon Lounge - Nightclub" },
    { query: "vegas music", type: "general", label: "Vegas Music Scene" },
    { query: "electronic", type: "artist", label: "Electronic Artists" },
    { query: "live venues", type: "venue", label: "Live Music Venues" }
  ]

  const handleResultSelect = (result: SearchResult) => {
    // Save to recent searches
    addToRecentSearches(getDisplayName(result), result.account_type)
    
    if (onResultSelect) {
      onResultSelect(result)
    } else {
      const profilePath = getProfilePath(result)
      router.push(profilePath)
    }
    
    clearSearch()
    setIsOpen(false)
    setSelectedIndex(-1)
    setIsFocused(false)
  }

  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery)
    setIsOpen(true)
  }

  const getProfilePath = (result: SearchResult): string => {
    return resolvePublicProfilePath({
      id: result.id,
      username: result.username,
      account_type: result.account_type,
    }) || `/profile/${result.username}`
  }

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return <Music className="h-4 w-4 text-purple-500" />
      case 'venue':
        return <Building2 className="h-4 w-4 text-blue-500" />
      case 'organization':
      case 'organizer':
      case 'admin':
        return <Building2 className="h-4 w-4 text-amber-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getAccountTypeLabel = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return 'Artist'
      case 'venue':
        return 'Venue'
      case 'organization':
      case 'organizer':
      case 'admin':
        return 'Organization'
      default:
        return 'User'
    }
  }

  const getDisplayName = (result: SearchResult) => {
    if (result.account_type === 'artist') {
      return result.profile_data?.artist_name || result.profile_data?.stage_name || result.username
    }
    if (result.account_type === 'venue') {
      return result.profile_data?.venue_name || result.profile_data?.name || result.username
    }
    return result.profile_data?.name || result.profile_data?.full_name || result.username
  }

  // Enhanced keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex])
        } else if (query.trim()) {
          // Navigate to search results page
          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
          clearSearch()
        }
        break
      case 'Escape':
        clearSearch()
        break
    }
  }

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsOpen(true)
        setIsFocused(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [setIsOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const shouldShowEmptyState = !isLoading && !hasResults && !query
  const shouldShowSuggestions = shouldShowEmptyState && isFocused && (showRecentSearches || defaultSuggestions.length > 0)

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.div
            className="relative"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  setIsOpen(true)
                  setIsFocused(true)
                  // On mobile, prevent scroll reset when keyboard opens
                  requestAnimationFrame(() => searchInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
                }}
                onBlur={() => setIsFocused(false)}
                onClick={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full pl-10 pr-12 rounded-xl border-2 transition-all duration-300",
                  "hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                  "bg-white text-black placeholder:text-gray-500",
                  isFocused && "border-purple-500 shadow-lg shadow-purple-500/10"
                )}
              />
              
              {/* Search button */}
              {query.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                    clearSearch()
                  }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full"
                >
                  <Search className="h-3 w-3" />
                </Button>
              )}
              
              {/* Clear button */}
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </motion.div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[480px] p-0 bg-background/95 backdrop-blur-sm border rounded-xl shadow-xl border-purple-200/50" 
          align="start"
          sideOffset={8}
        >
          <Command className="rounded-xl border-0">
            <CommandList className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
              
              {/* Loading State */}
              {isLoading && (
                <motion.div 
                  className="py-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500 mb-3" />
                  <p className="text-sm text-muted-foreground">Searching accounts...</p>
                </motion.div>
              )}
              
              {/* Empty State with Suggestions */}
              {shouldShowSuggestions && (
                <div className="p-4 space-y-4">
                  {/* Recent Searches */}
                  {showRecentSearches && recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((search, index) => (
                          <motion.button
                            key={`recent-${index}`}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                            onClick={() => handleRecentSearchClick(search.query)}
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                          >
                            {search.type ? getAccountIcon(search.type) : <Search className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm text-foreground">{search.query}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Default Suggestions for New Users */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-muted-foreground">Popular Searches</span>
                    </div>
                    <div className="space-y-1">
                      {defaultSuggestions.map((suggestion, index) => (
                        <motion.button
                          key={`suggestion-${index}`}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          onClick={() => handleRecentSearchClick(suggestion.query)}
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          {getAccountIcon(suggestion.type)}
                          <div className="flex-1">
                            <span className="text-sm text-foreground">{suggestion.label}</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* No Results State */}
              {!isLoading && !hasResults && query && (
                <CommandEmpty>
                  <motion.div 
                    className="py-8 px-4 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Search className="h-8 w-8 text-purple-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No results for "{query}"
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                        We couldn't find any artists, venues, or users matching your search. Try different keywords or check your spelling.
                      </p>
                      
                      {/* Search suggestions */}
                      <div className="text-xs text-muted-foreground mb-4">
                        <p className="mb-2">Suggestions:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <span className="px-2 py-1 bg-muted rounded-full">Try shorter keywords</span>
                          <span className="px-2 py-1 bg-muted rounded-full">Check spelling</span>
                          <span className="px-2 py-1 bg-muted rounded-full">Use @username</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push('/discover')}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50 mr-2"
                      >
                        <Hash className="h-3 w-3 mr-1" />
                        Browse All Accounts
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          clearSearch()
                          setQuery("")
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear Search
                      </Button>
                    </div>
                  </motion.div>
                </CommandEmpty>
              )}
              
              {/* Search Results */}
              {hasResults && !isLoading && (
                <div>
                  {/* Results Header */}
                  <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                        className="text-xs text-purple-600 hover:text-purple-700 h-6 px-2"
                      >
                        View All
                      </Button>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <AnimatePresence>
                      {results.map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          layout
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResultSelect(result)}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left",
                              selectedIndex === index && "bg-purple-500/10"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={result.avatar_url} alt={getDisplayName(result)} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                  {getDisplayName(result).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-foreground">{getDisplayName(result)}</p>
                                <p className="text-xs text-muted-foreground">{result.account_type}</p>
                              </div>
                            </div>
                            {result.verified && <Verified className="h-4 w-4 text-purple-500" />}
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}