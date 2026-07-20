'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, PenSquare, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useActingContext } from '@/hooks/use-acting-context'

interface FriendRow {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
}

interface ComposeNewMessageDialogProps {
  onSelected: (friend: FriendRow) => void
  disabled?: boolean
}

export function ComposeNewMessageDialog({ onSelected, disabled }: ComposeNewMessageDialogProps) {
  const { actingHeaders } = useActingContext()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (query.trim()) params.set('q', query.trim())
        const response = await fetch(`/api/messages/friends?${params.toString()}`, {
          credentials: 'include',
          headers: { ...actingHeaders },
        })
        if (!response.ok) throw new Error('Failed to load friends')
        const data = await response.json()
        setFriends(data.friends || [])
      } catch (error) {
        console.error(error)
        toast.error('Could not load friends list')
        setFriends([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [open, query, actingHeaders])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={disabled}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <PenSquare className="mr-1.5 h-4 w-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-slate-700 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose a friend to start a conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search friends…"
            className="border-slate-600 bg-slate-800 pl-9 text-white"
          />
        </div>
        <ScrollArea className="h-72 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading friends…
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
              <Users className="h-8 w-8 opacity-60" />
              <p className="text-sm">No mutual friends found.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {friends.map((friend) => (
                <li key={friend.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-800"
                    onClick={() => {
                      onSelected(friend)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={friend.avatar_url || undefined} alt="" />
                      <AvatarFallback className="bg-slate-700">
                        {(friend.full_name || friend.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">
                        {friend.full_name || friend.username}
                      </span>
                      <span className="block truncate text-xs text-slate-400">@{friend.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
