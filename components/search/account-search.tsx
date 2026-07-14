"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  User, 
  Music, 
  Building2, 
  Verified,
  Loader2,
  X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAccountSearch, type SearchResult } from '@/hooks/use-account-search'
import { resolvePublicProfilePath } from '@/lib/utils/public-profile-routes'
import { cn } from '@/lib/utils'

interface AccountSearchProps {
  placeholder?: string
  className?: string
  onResultSelect?: (result: SearchResult) => void
}

export function AccountSearch({ 
  placeholder = "Search accounts...", 
  className,
  onResultSelect 
}: AccountSearchProps) {
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    searchInputRef,
    clearSearch,
    hasResults
  } = useAccountSearch()

  const handleResultSelect = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result)
    } else {
      // Default navigation behavior
      const profilePath = getProfilePath(result)
      router.push(profilePath)
    }
    
    clearSearch()
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || !hasResults) return

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
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        clearSearch()
        setIsOpen(false)
        setSelectedIndex(-1)
        searchInputRef.current?.blur()
        break
    }
  }, [isOpen, hasResults, results, selectedIndex, handleResultSelect, clearSearch, setIsOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative flex-1 max-w-sm", className)}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-background pl-8 pr-8 rounded-lg"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[400px] p-0 bg-background border rounded-lg shadow-lg" 
        align="start"
        sideOffset={8}
      >
        <Command className="rounded-lg border-0">
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading && (
              <div className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Searching accounts...</p>
              </div>
            )}
            
            {!isLoading && !hasResults && query && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No accounts found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching for a different username or name
                  </p>
                </div>
              </CommandEmpty>
            )}

            {!isLoading && !query && (
              <div className="py-6 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Start typing to search accounts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Find artists, venues, and other users
                </p>
              </div>
            )}
            
            {hasResults && !isLoading && (
              <CommandGroup>
                {results.map((result, index) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleResultSelect(result)}
                    className={cn(
                      "cursor-pointer p-3 hover:bg-muted/50 rounded-md",
                      selectedIndex === index && "bg-muted/80"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage 
                          src={result.avatar_url} 
                          alt={getDisplayName(result)}
                        />
                        <AvatarFallback className="rounded-lg">
                          {getDisplayName(result).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {getDisplayName(result)}
                          </p>
                          {result.verified && (
                            <Verified className="h-4 w-4 text-blue-500 fill-current" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            @{result.username}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0.5 h-5"
                          >
                            <span className="flex items-center gap-1">
                              {getAccountIcon(result.account_type)}
                              {getAccountTypeLabel(result.account_type)}
                            </span>
                          </Badge>
                        </div>
                        
                        {result.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {result.bio}
                          </p>
                        )}
                        
                        {result.location && (
                          <p className="text-xs text-muted-foreground">
                            📍 {result.location}
                          </p>
                        )}
                        
                        {result.stats?.followers && (
                          <p className="text-xs text-muted-foreground">
                            {result.stats.followers.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}