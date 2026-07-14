'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, UserPlus, X } from 'lucide-react'

export interface SiteMapTaskFormSubmit {
  title: string
  description: string
  priority: string
  assignedUserId?: string
  assignedToName?: string
  dueDate?: string
  assignedTeamId?: string
  assignedRole?: string
  elementId?: string | null
  elementType?: 'element' | 'zone' | 'tent'
  checklist?: Array<{ id: string; label: string; done: boolean }>
}

interface SiteMapTaskFormProps {
  eventId?: string | null
  tourId?: string | null
  elementId?: string | null
  elementType?: 'element' | 'zone' | 'tent'
  onSubmit: (payload: SiteMapTaskFormSubmit) => void | Promise<void>
  onCancel?: () => void
}

export function SiteMapTaskForm({
  eventId,
  tourId,
  elementId,
  elementType = 'element',
  onSubmit,
  onCancel,
}: SiteMapTaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assigneeResults, setAssigneeResults] = useState<any[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; name: string; department?: string | null } | null>(null)
  const [assignedRole, setAssignedRole] = useState('')
  const [assignedTeamId, setAssignedTeamId] = useState('')
  const [tourTeams, setTourTeams] = useState<Array<{ id: string; name: string }>>([])
  const [checklistText, setChecklistText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!tourId) return
    let cancelled = false
    fetch(`/api/admin/tours/teams?tour_id=${encodeURIComponent(tourId)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const teams = data.data || data.teams || []
        setTourTeams(teams.map((team: any) => ({ id: team.id, name: team.name || team.title || 'Team' })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tourId])

  useEffect(() => {
    if (assigneeSearch.length < 2) {
      setAssigneeResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        if (eventId) {
          const rosterResp = await fetch(
            `/api/hiring/roster?event_id=${encodeURIComponent(eventId)}&search=${encodeURIComponent(assigneeSearch)}`,
            { credentials: 'include' }
          )
          const rosterData = await rosterResp.json()
          const members = rosterData.data || rosterData.members || []
          setAssigneeResults(
            members
              .slice(0, 8)
              .map((member: any) => ({
                id: member.userId || member.user_id || member.id,
                full_name: member.name || member.fullName || member.full_name || 'Crew member',
                username: member.email || member.name || '',
                avatar_url: member.avatarUrl || member.avatar_url || null,
                department: member.department || null,
              }))
              .filter((member: any) => member.id)
          )
          return
        }

        const resp = await fetch(`/api/social/suggested?search=${encodeURIComponent(assigneeSearch)}&limit=5`, {
          credentials: 'include',
        })
        const data = await resp.json()
        setAssigneeResults(data.data || data.profiles || [])
      } catch {
        setAssigneeResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [assigneeSearch, eventId])

  async function submit() {
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const checklist = checklistText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label, index) => ({ id: `c${index + 1}`, label, done: false }))

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        assignedUserId: selectedAssignee?.id,
        assignedToName: selectedAssignee?.name,
        dueDate: dueDate || undefined,
        assignedTeamId: assignedTeamId || undefined,
        assignedRole: assignedRole || selectedAssignee?.department || undefined,
        elementId,
        elementType,
        checklist,
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      setSelectedAssignee(null)
      setAssignedRole('')
      setAssignedTeamId('')
      setChecklistText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-700/40 bg-slate-900/50 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">New location task</span>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-5 w-5 p-0 text-slate-400">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {elementId && (
        <p className="flex items-center gap-1 text-[10px] text-blue-400">
          <MapPin className="h-2.5 w-2.5" /> Attached to {elementType}
        </p>
      )}

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="h-7 bg-slate-800/50 border-slate-700/50 text-xs text-white"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)..."
        className="min-h-[40px] bg-slate-800/50 border-slate-700/50 text-xs text-white"
      />

      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="h-7 bg-slate-800/50 border-slate-700/50 text-xs text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low Priority</SelectItem>
          <SelectItem value="medium">Medium Priority</SelectItem>
          <SelectItem value="high">High Priority</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-7 bg-slate-800/50 border-slate-700/50 text-xs text-white"
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={assignedRole}
          onChange={(e) => setAssignedRole(e.target.value)}
          placeholder="Crew role / dept"
          className="h-7 bg-slate-800/50 border-slate-700/50 text-xs text-white"
        />
        {tourTeams.length > 0 ? (
          <select
            value={assignedTeamId}
            onChange={(e) => setAssignedTeamId(e.target.value)}
            className="h-7 rounded-md border border-slate-700/50 bg-slate-800/50 px-2 text-xs text-white"
          >
            <option value="">Tour team…</option>
            {tourTeams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        ) : (
          <Input
            value={assignedTeamId}
            onChange={(e) => setAssignedTeamId(e.target.value)}
            placeholder="Team UUID (optional)"
            className="h-7 bg-slate-800/50 border-slate-700/50 text-xs text-white"
          />
        )}
      </div>

      <Textarea
        value={checklistText}
        onChange={(e) => setChecklistText(e.target.value)}
        placeholder="Checklist items (one per line)"
        className="min-h-[48px] bg-slate-800/50 border-slate-700/50 text-xs text-white"
      />

      <div className="space-y-1">
        {selectedAssignee ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1.5">
            <UserPlus className="h-3 w-3 text-green-400" />
            <span className="flex-1 text-xs text-green-300">{selectedAssignee.name}</span>
            <button type="button" onClick={() => setSelectedAssignee(null)} className="text-green-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <UserPlus className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              <Input
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Assign from roster…"
                className="h-7 bg-slate-800/50 border-slate-700/50 pl-7 text-xs text-white"
              />
            </div>
            {assigneeResults.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/80">
                {assigneeResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssignee({
                        id: user.id,
                        name: user.full_name || user.username,
                        department: user.department,
                      })
                      if (user.department && !assignedRole) setAssignedRole(user.department)
                      setAssigneeSearch('')
                      setAssigneeResults([])
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-700/50"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-[8px] text-white">
                        {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs text-white">{user.full_name || user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Button
        size="sm"
        onClick={submit}
        disabled={!title.trim() || isSubmitting}
        className="h-7 w-full bg-green-600 text-xs text-white hover:bg-green-700"
      >
        {selectedAssignee ? 'Assign & create' : 'Create task'}
      </Button>
    </div>
  )
}
