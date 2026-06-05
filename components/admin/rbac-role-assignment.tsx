"use client"

import { useEffect, useMemo, useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, AlertCircle, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RbacRole {
  id: string
  name: string
  display_name?: string
  scope_type?: string
  permission_count?: number
}

interface UserResult {
  id: string
  full_name?: string
  display_name?: string
  username?: string
  email?: string
  avatar_url?: string
}

interface RbacRoleAssignmentProps {
  entityType?: string
  entityId?: string
  className?: string
}

export function RbacRoleAssignment({ entityType, entityId, className }: RbacRoleAssignmentProps) {
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [assigning, setAssigning] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRolesLoading(true)
    fetch('/api/admin/rbac/roles', { cache: 'no-store', credentials: 'include' })
      .then(r => r.ok ? r.json() : { roles: [] })
      .then(d => setRoles(Array.isArray(d?.roles) ? d.roles : []))
      .finally(() => setRolesLoading(false))
  }, [])

  function handleUserSearchChange(q: string) {
    setUserSearch(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setUserResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setUserSearching(true)
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        if (res.ok) {
          const d = await res.json()
          setUserResults(d.users || d.results || [])
        }
      } finally {
        setUserSearching(false)
      }
    }, 300)
  }

  function selectUser(u: UserResult) {
    setSelectedUser(u)
    setUserSearch(u.full_name || u.display_name || u.username || u.email || '')
    setUserResults([])
  }

  function clearUser() {
    setSelectedUser(null)
    setUserSearch('')
    setUserResults([])
  }

  async function onAssign() {
    setMessage(null)
    if (!selectedUser?.id || !roleName) {
      setMessage({ text: 'Select a user and a role', ok: false })
      return
    }
    setAssigning(true)
    try {
      const res = await fetch('/api/admin/rbac/assign-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id, entityType, entityId, roleName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to assign role')
      setMessage({ text: `Role "${roleName}" assigned to ${selectedUser.full_name || selectedUser.username}`, ok: true })
    } catch (e: any) {
      setMessage({ text: e?.message || 'Failed to assign role', ok: false })
    } finally {
      setAssigning(false)
    }
  }

  const sortedRoles = useMemo(() => roles.slice().sort((a, b) => a.name.localeCompare(b.name)), [roles])

  return (
    <div className={cn('grid gap-4 rounded-sm border border-slate-700/50 bg-slate-900/40 p-4', className)}>
      {/* User search picker */}
      <div className="grid gap-1.5">
        <Label className="text-slate-300 text-sm">User *</Label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={userSearch}
              onChange={e => handleUserSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 pr-8 bg-slate-800/50 border-slate-700/50 text-white text-sm"
            />
            {(selectedUser || userSearch) && (
              <button type="button" onClick={clearUser} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {userResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-sm mt-1 z-50 max-h-48 overflow-y-auto shadow-xl">
              {userResults.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-left"
                  onClick={() => selectUser(u)}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-purple-600/20 text-purple-400 text-xs">
                      {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{u.full_name || u.display_name || u.username}</p>
                    <p className="text-slate-400 text-xs truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected user chip */}
        {selectedUser && (
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">
              ✓ {selectedUser.full_name || selectedUser.username || selectedUser.email}
            </Badge>
          </div>
        )}
      </div>

      {/* Role selector */}
      <div className="grid gap-1.5">
        <Label className="text-slate-300 text-sm">Role *</Label>
        <Select value={roleName} onValueChange={setRoleName} disabled={rolesLoading || sortedRoles.length === 0}>
          <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm">
            <SelectValue placeholder={rolesLoading ? 'Loading roles...' : 'Select a role'} />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-white">
            {sortedRoles.map(r => (
              <SelectItem key={r.id} value={r.name}>
                <div className="flex items-center gap-2">
                  <span>{r.display_name || r.name}</span>
                  {r.permission_count ? (
                    <span className="text-slate-500 text-xs">{r.permission_count} perms</span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope info */}
      {(entityType || entityId) && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Scope:</span>
          <Badge className="bg-slate-700/50 text-slate-300 text-xs">{entityType || 'global'}</Badge>
          {entityId && <span className="font-mono truncate max-w-[120px]">{entityId}</span>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={onAssign}
          disabled={!selectedUser?.id || !roleName || assigning}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
          size="sm"
        >
          {assigning ? 'Assigning...' : 'Assign Role'}
        </Button>
        {message && (
          <div className={`flex items-center gap-1.5 text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
            {message.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
