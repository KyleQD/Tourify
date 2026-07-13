'use client'

import { useState, useEffect, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  UserPlus,
  MapPin,
  Users,
  X,
  Filter,
  Loader2,
  User,
  Check,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface FriendSearchResult {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  bio?: string
  location?: string
  is_verified: boolean
  followers_count: number
  following_count: number
  created_at: string
  account_type?: string | null
  mutual_friends: Array<{
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }>
  mutual_count: number
  outgoing_request?: { id: string; status: string }
  incoming_request?: { id: string; status: string }
  can_send_request: boolean
}

interface EnhancedFriendSearchProps {
  onFriendSelect?: (friend: FriendSearchResult) => void
  onSendRequest?: (friendId: string) => void
  className?: string
  placeholder?: string
  showInlineResults?: boolean
}

export function EnhancedFriendSearch({
  onFriendSelect,
  onSendRequest,
  className = '',
  placeholder = 'Search for friends...',
  showInlineResults = false,
}: EnhancedFriendSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [filters, setFilters] = useState({
    location: '',
    mutualOnly: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  const performSearch = useCallback(
    async (searchQuery: string, filterOptions: typeof filters) => {
      if (!searchQuery.trim() && !filterOptions.location && !filterOptions.mutualOnly) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: '20',
        })

        if (filterOptions.location) params.append('location', filterOptions.location)
        if (filterOptions.mutualOnly) params.append('mutualOnly', 'true')

        const response = await fetch(`/api/social/friend-search?${params}`)
        const data = await response.json()

        if (response.ok) {
          setResults(data.users || [])
        } else {
          console.error('Search failed:', data.error)
          toast.error('Search failed. Please try again.')
        }
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Search failed. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void performSearch(query, filters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, filters, performSearch])

  async function handleSendFriendRequest(friendId: string) {
    try {
      const response = await fetch('/api/social/relationship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'friend_request',
          intent: 'friend',
          targetUserId: friendId,
        }),
      })

      if (response.ok) {
        toast.success('Friend request sent!')

        setResults((prev) =>
          prev.map((result) =>
            result.id === friendId
              ? {
                  ...result,
                  can_send_request: false,
                  outgoing_request: { id: 'temp', status: 'pending' },
                }
              : result
          )
        )

        onSendRequest?.(friendId)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send friend request')
    }
  }

  function handleSelectFriend(result: FriendSearchResult) {
    onFriendSelect?.(result)
    setIsOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectFriend(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  function getRelationshipStatus(result: FriendSearchResult) {
    if (result.outgoing_request?.status === 'pending') {
      return { text: 'Request Sent', color: 'bg-blue-500/20 text-blue-400' }
    }
    if (result.incoming_request?.status === 'pending') {
      return { text: 'Wants to Connect', color: 'bg-green-500/20 text-green-400' }
    }
    return null
  }

  const hasActiveSearch = Boolean(query || filters.location || filters.mutualOnly)
  const showInline = showInlineResults && hasActiveSearch

  function renderResultRow(result: FriendSearchResult, index: number) {
    const relationshipStatus = getRelationshipStatus(result)

    return (
      <motion.div
        key={result.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all duration-200 cursor-pointer',
          'hover:bg-muted/50',
          selectedIndex === index && 'border-purple-500/20 bg-purple-500/10'
        )}
        onClick={() => handleSelectFriend(result)}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={result.avatar_url} alt={result.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            {result.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate text-sm font-medium">{result.full_name}</p>
            {result.is_verified && (
              <Badge
                variant="secondary"
                className="bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400"
              >
                <Check className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>

          <p className="mb-1 text-xs text-muted-foreground">@{result.username}</p>

          {result.bio && (
            <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{result.bio}</p>
          )}

          <div className="flex items-center gap-2">
            {result.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{result.location}</span>
              </div>
            )}

            {result.mutual_count > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {result.mutual_count} mutual
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="hidden items-center gap-1 text-xs text-purple-400 opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex">
            <ExternalLink className="h-3 w-3" />
            View profile
          </span>

          {relationshipStatus ? (
            <Badge className={relationshipStatus.color}>{relationshipStatus.text}</Badge>
          ) : result.can_send_request ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                void handleSendFriendRequest(result.id)
              }}
              className="h-8 bg-purple-500 px-3 text-xs hover:bg-purple-600"
            >
              <UserPlus className="mr-1 h-3 w-3" />
              Add Friend
            </Button>
          ) : null}

          {result.mutual_friends?.length > 0 && (
            <div className="flex -space-x-1">
              {result.mutual_friends.slice(0, 3).map((mutual) => (
                <Avatar key={mutual.id} className="h-5 w-5 border-2 border-background">
                  <AvatarImage src={mutual.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {mutual.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {result.mutual_count > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted">
                  <span className="text-xs">+{result.mutual_count - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  function renderInlineCard(result: FriendSearchResult) {
    const relationshipStatus = getRelationshipStatus(result)

    return (
      <Card
        key={result.id}
        className="cursor-pointer border-slate-700/60 bg-slate-800/60 transition-colors hover:border-purple-500/40 hover:bg-slate-800"
        onClick={() => handleSelectFriend(result)}
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-slate-600">
              <AvatarImage src={result.avatar_url} alt={result.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {result.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-white">{result.full_name}</p>
                {result.is_verified && (
                  <Badge className="border-0 bg-blue-500/20 text-blue-200">Verified</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">@{result.username}</p>
            </div>
          </div>

          {result.bio && (
            <p className="line-clamp-2 text-sm text-slate-300">{result.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {result.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {result.location}
              </span>
            )}
            <span>{result.followers_count || 0} followers</span>
            {result.mutual_count > 0 && <span>{result.mutual_count} mutual</span>}
          </div>

          <div
            className="flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl border-slate-600 text-white hover:bg-slate-700"
              onClick={() => handleSelectFriend(result)}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Profile
            </Button>
            {relationshipStatus ? (
              <Button size="sm" disabled className="flex-1 rounded-xl bg-slate-700 text-slate-300">
                {relationshipStatus.text}
              </Button>
            ) : result.can_send_request ? (
              <Button
                size="sm"
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500"
                onClick={() => void handleSendFriendRequest(result.id)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add Friend
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('relative space-y-4', className)}>
      <Popover open={isOpen && !showInline} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (!showInline) setIsOpen(true)
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full rounded-xl border-2 pl-10 pr-12 transition-all duration-300',
                'hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
                'bg-white text-black placeholder:text-gray-500'
              )}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-8 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full p-0 hover:bg-muted"
              aria-label="Toggle filters"
            >
              <Filter className="h-3 w-3" />
            </Button>

            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full p-0 hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[480px] rounded-xl border border-purple-200/50 bg-background/95 p-0 shadow-xl backdrop-blur-sm"
          align="start"
          sideOffset={8}
        >
          {showFilters && (
            <div className="border-b border-border/50 bg-muted/30 p-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, State..."
                    value={filters.location}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="mutual-only"
                    checked={filters.mutualOnly}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, mutualOnly: checked }))
                    }
                  />
                  <Label htmlFor="mutual-only" className="text-sm">
                    Show mutual friends only
                  </Label>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[450px]">
            <div className="p-2">
              {isLoading && (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-500" />
                  <p className="text-sm text-muted-foreground">Searching for friends...</p>
                </div>
              )}

              {!isLoading && results.length === 0 && hasActiveSearch && (
                <div className="py-8 text-center">
                  <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No friends found</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Try adjusting your search terms or filters
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setFilters({ location: '', mutualOnly: false })
                    }}
                  >
                    Clear Search
                  </Button>
                </div>
              )}

              {!isLoading && results.length === 0 && !hasActiveSearch && (
                <div className="py-8 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-purple-500" />
                  <h3 className="mb-2 text-lg font-semibold">Find Friends</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Search by name, username, or location to find people you know
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Try searching for:</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-1">@username</span>
                      <span className="rounded-full bg-muted px-2 py-1">Full name</span>
                      <span className="rounded-full bg-muted px-2 py-1">City name</span>
                    </div>
                  </div>
                </div>
              )}

              {results.length > 0 && !isLoading && (
                <div className="space-y-2">
                  <div className="border-b border-border/50 px-2 py-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Found {results.length} friend{results.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <AnimatePresence>
                    {results.map((result, index) => renderResultRow(result, index))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {showInline && showFilters && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="inline-location" className="text-sm text-slate-300">
                Location
              </Label>
              <Input
                id="inline-location"
                placeholder="City, State..."
                value={filters.location}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                className="mt-1 border-slate-600 bg-slate-900/60 text-white"
              />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="inline-mutual-only"
                  checked={filters.mutualOnly}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, mutualOnly: checked }))
                  }
                />
                <Label htmlFor="inline-mutual-only" className="text-sm text-slate-300">
                  Mutual friends only
                </Label>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInline && (
        <div className="space-y-3">
          {isLoading && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 py-8 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-400" />
              <p className="text-sm text-slate-400">Searching for friends...</p>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 py-8 text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <p className="text-slate-300">No friends found</p>
              <p className="mt-1 text-sm text-slate-400">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {results.map((result) => renderInlineCard(result))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
