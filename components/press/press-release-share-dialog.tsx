'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Search, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useActingContext } from '@/hooks/use-acting-context'
import { ARTIST_PRIMARY_BTN, ARTIST_OUTLINE_BTN } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'

interface SearchUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface PressReleaseShareDialogProps {
  pressPostId: string
  title: string
  onClose: () => void
  onShared?: () => void
}

export function PressReleaseShareDialog({
  pressPostId,
  title,
  onClose,
  onShared,
}: PressReleaseShareDialogProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [selected, setSelected] = useState<SearchUser[]>([])
  const [note, setNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    let cancelled = false
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/messages/user-search?q=${encodeURIComponent(q)}&limit=8`,
          { credentials: 'include' }
        )
        const data = await response.json().catch(() => ({}))
        if (!cancelled)
          setSearchResults(Array.isArray(data.users) ? data.users : [])
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  function toggleUser(user: SearchUser) {
    setSelected(prev =>
      prev.some(entry => entry.id === user.id)
        ? prev.filter(entry => entry.id !== user.id)
        : [...prev, user]
    )
  }

  async function handleShare() {
    if (!isActingReady) {
      toast.error('Account is still preparing')
      return
    }
    if (selected.length === 0) {
      toast.error('Select at least one recipient')
      return
    }

    setIsSharing(true)
    try {
      const response = await fetch(`/api/press/releases/${pressPostId}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        body: JSON.stringify({
          recipientIds: selected.map(user => user.id),
          note: note.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to share press release')

      toast.success(`Shared with ${data.sharedCount} recipient${data.sharedCount === 1 ? '' : 's'}`)
      onShared?.()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Share press release</h3>
          <p className="mt-1 text-sm text-slate-400 line-clamp-1">{title}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search people…"
          className="border-white/10 bg-white/5 pl-9 text-white"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => toggleUser(user)}
              className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-2.5 py-1 text-xs text-purple-100"
            >
              {user.full_name || user.username || 'User'}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
        {isSearching ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-slate-500">
            <Users className="h-5 w-5" />
            Search for people to share with
          </div>
        ) : (
          searchResults.map(user => {
            const isSelected = selected.some(entry => entry.id === user.id)
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                  isSelected ? 'bg-purple-500/20' : 'hover:bg-white/5'
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{(user.full_name || user.username || '?').slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{user.full_name || user.username}</span>
                  {user.username ? <span className="block truncate text-xs text-slate-500">@{user.username}</span> : null}
                </span>
              </button>
            )
          })
        )}
      </div>

      <Textarea
        value={note}
        onChange={event => setNote(event.target.value)}
        placeholder="Optional note"
        className="min-h-[80px] border-white/10 bg-white/5 text-white"
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className={ARTIST_OUTLINE_BTN}>
          Cancel
        </Button>
        <Button onClick={handleShare} disabled={isSharing || selected.length === 0} className={ARTIST_PRIMARY_BTN}>
          {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Share
        </Button>
      </div>
    </div>
  )
}
