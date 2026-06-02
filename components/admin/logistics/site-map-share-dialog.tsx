'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Share2, UserPlus, Trash2, Shield, Eye, Edit3,
  Building, Loader2, Check, Copy, Link
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Collaborator {
  id: string
  site_map_id: string
  user_id: string
  can_edit: boolean
  can_manage_tents: boolean
  can_manage_zones: boolean
  can_invite_users: boolean
  can_export: boolean
  is_active: boolean
  invited_at: string
  user?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    email?: string
  }
}

interface SiteMapShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteMapId: string
  siteMapName: string
  eventId?: string
}

export function SiteMapShareDialog({
  open,
  onOpenChange,
  siteMapId,
  siteMapName,
  eventId
}: SiteMapShareDialogProps) {
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit' | 'admin'>('view')
  const [venueUser, setVenueUser] = useState<any>(null)
  const [publicLink, setPublicLink] = useState('')

  const loadCollaborators = useCallback(async () => {
    setIsLoading(true)
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/collaborators`, {
        credentials: 'include'
      })
      const data = await resp.json()
      if (data.success) setCollaborators(data.data || [])
    } catch {} finally {
      setIsLoading(false)
    }
  }, [siteMapId])

  // Load venue user for the event (if eventId provided)
  useEffect(() => {
    if (!eventId || !open) return
    async function loadVenue() {
      try {
        const resp = await fetch(`/api/admin/events/${eventId}`, { credentials: 'include' })
        const data = await resp.json()
        if (data.venue_id) {
          const venueResp = await fetch(`/api/admin/venues?id=${data.venue_id}`, { credentials: 'include' })
          const venueData = await venueResp.json()
          if (venueData.data?.[0]?.user_id) {
            setVenueUser({
              id: venueData.data[0].user_id,
              name: venueData.data[0].name || 'Event Venue',
              type: 'venue'
            })
          }
        }
      } catch {}
    }
    loadVenue()
  }, [eventId, open])

  useEffect(() => {
    if (open) loadCollaborators()
  }, [open, loadCollaborators])

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const resp = await fetch(`/api/social/suggested?search=${encodeURIComponent(query)}&limit=5`, {
        credentials: 'include'
      })
      const data = await resp.json()
      setSearchResults(data.data || data.profiles || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchUsers])

  const shareWith = async (userId: string, permissions: 'view' | 'edit' | 'admin') => {
    setIsSharing(true)
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, permissions })
      })
      const data = await resp.json()
      if (data.success) {
        toast({ title: "Shared", description: `Site map shared with ${permissions} access` })
        setSearchQuery('')
        setSearchResults([])
        loadCollaborators()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsSharing(false)
    }
  }

  const removeCollab = async (userId: string) => {
    try {
      const resp = await fetch(
        `/api/admin/logistics/site-maps/${siteMapId}/collaborators?userId=${userId}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const data = await resp.json()
      if (data.success) {
        toast({ title: "Removed", description: "Collaborator access revoked" })
        loadCollaborators()
      }
    } catch {}
  }

  const getPermissionLevel = (c: Collaborator): string => {
    if (c.can_invite_users) return 'admin'
    if (c.can_edit) return 'edit'
    return 'view'
  }

  const generatePublicLink = async () => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/public-link`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await resp.json()
      if (!data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to generate link', variant: 'destructive' })
        return
      }
      const link = `${window.location.origin}/site-maps/shared/${data.data.token}`
      setPublicLink(link)
      await navigator.clipboard.writeText(link)
      toast({ title: 'Public link copied', description: 'Read-only link copied to clipboard' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const permissionBadge = (level: string) => {
    const styles = {
      admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      edit: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      view: 'bg-green-500/20 text-green-300 border-green-500/30'
    }
    return styles[level as keyof typeof styles] || styles.view
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900/95 border-slate-700/50 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-400" />
            Share &ldquo;{siteMapName}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick share with venue */}
          {venueUser && !collaborators.find(c => c.user_id === venueUser.id) && (
            <Button
              onClick={() => shareWith(venueUser.id, 'view')}
              disabled={isSharing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              <Building className="h-4 w-4 mr-2" />
              Share with Event Venue ({venueUser.name})
            </Button>
          )}

          {/* Search to add */}
          <div className="space-y-2">
            <Label className="text-slate-300">Public read-only link</Label>
            <div className="flex gap-2">
              <Button
                onClick={generatePublicLink}
                disabled={isSharing}
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                <Link className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
              {publicLink && (
                <Button
                  onClick={() => navigator.clipboard.writeText(publicLink)}
                  variant="ghost"
                  className="text-slate-300"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
            {publicLink && <p className="text-xs text-slate-500 break-all">{publicLink}</p>}
          </div>

          {/* Search to add */}
          <div className="space-y-2">
            <Label className="text-slate-300">Add people</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white"
                />
              </div>
              <Select value={selectedPermission} onValueChange={(v: any) => setSelectedPermission(v)}>
                <SelectTrigger className="w-28 bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> View</div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-1"><Edit3 className="h-3 w-3" /> Edit</div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> Admin</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search results */}
            {(searchResults.length > 0 || isSearching) && (
              <div className="border border-slate-700/50 rounded-xl bg-slate-800/50 overflow-hidden">
                {isSearching ? (
                  <div className="p-3 text-center text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Searching...
                  </div>
                ) : searchResults.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => shareWith(user.id, selectedPermission)}
                    disabled={isSharing || collaborators.some(c => c.user_id === user.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white text-xs">
                        {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.full_name || user.username}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    {collaborators.some(c => c.user_id === user.id) ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current collaborators */}
          <div className="space-y-2">
            <Label className="text-slate-300">People with access ({collaborators.length})</Label>
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading...
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">No one else has access yet</p>
            ) : (
              <div className="space-y-1">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.user?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white text-xs">
                        {(c.user?.full_name || c.user?.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.user?.full_name || c.user?.username || 'User'}</p>
                      <p className="text-xs text-slate-400 truncate">{c.user?.email}</p>
                    </div>
                    <Badge className={cn("text-xs", permissionBadge(getPermissionLevel(c)))}>
                      {getPermissionLevel(c)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCollab(c.user_id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
