'use client'

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MessageCircle, Send, AlertTriangle, CheckCircle, Clock, Users,
  MapPin, Flag, X, ChevronDown, ChevronUp, Circle, Loader2,
  Bell, Eye, Shield, Zap, RefreshCw, ListChecks, Activity,
  Plus, UserPlus, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ElementStatus } from "@/types/site-map"
import { useSiteMapRealtime } from "@/hooks/use-site-map-realtime"
import { useAuth } from "@/contexts/auth-context"

interface CollabPanelProps {
  siteMapId: string
  eventId?: string
  isReadOnly?: boolean
  onNoteClick?: (x: number, y: number) => void
  selectedElementId?: string | null
  selectedElementPosition?: { x: number; y: number } | null
}

interface ActivityItem {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  new_values?: Record<string, any>
  old_values?: Record<string, any>
  created_at: string
  user?: { id: string; username: string; full_name: string; avatar_url?: string }
}

interface ViewerInfo {
  userId: string
  username: string
  fullName: string
  avatarUrl?: string
  joinedAt: string
}

const STATUS_CONFIG: Record<ElementStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: 'Not Started', color: 'bg-slate-500', icon: <Circle className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: <Clock className="h-3 w-3" /> },
  setup_complete: { label: 'Setup Complete', color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  needs_attention: { label: 'Needs Attention', color: 'bg-amber-500', icon: <AlertTriangle className="h-3 w-3" /> },
  blocked: { label: 'Blocked', color: 'bg-red-500', icon: <Flag className="h-3 w-3" /> },
  verified: { label: 'Verified', color: 'bg-emerald-500', icon: <Shield className="h-3 w-3" /> },
}

const NOTE_TYPE_CONFIG = {
  general: { label: 'Note', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  warning: { label: 'Warning', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  question: { label: 'Question', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  task: { label: 'Task', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  resolved: { label: 'Resolved', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
}

export function SiteMapCollaborationPanel({
  siteMapId,
  eventId,
  isReadOnly,
  onNoteClick,
  selectedElementId,
  selectedElementPosition,
}: CollabPanelProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('notes')
  const [notes, setNotes] = useState<ActivityItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<string>('general')
  const [isSending, setIsSending] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [viewers, setViewers] = useState<ViewerInfo[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tasks, setTasks] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const { presenceCount, activityVersion, tasksVersion } = useSiteMapRealtime({ siteMapId })
  const { user } = useAuth()
  const openTasks = tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled')
  const myTasks = user ? tasks.filter(task => task.assignedUserId === user.id || task.assignedTo === user.id) : []
  const overdueTasks = openTasks.filter(task => task.dueDate && new Date(task.dueDate).getTime() < Date.now())
  const blockedTasks = tasks.filter(task => task.status === 'blocked')
  const readyTasks = tasks.filter(task => task.status === 'completed')
  const recentlyChangedTasks = tasks.filter(task => {
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0
    return updatedAt > Date.now() - 24 * 60 * 60 * 1000
  })

  const loadNotes = useCallback(async () => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/notes`, { credentials: 'include' })
      const data = await resp.json()
      if (data.success) setNotes(data.data || [])
    } catch {}
  }, [siteMapId])

  const loadActivity = useCallback(async () => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/activity?limit=50`, { credentials: 'include' })
      const data = await resp.json()
      if (data.success) setActivity(data.data || [])
    } catch {}
  }, [siteMapId])

  const loadTasks = useCallback(async () => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tasks`, { credentials: 'include' })
      const data = await resp.json()
      if (data.success) setTasks(data.data || [])
    } catch {}
  }, [siteMapId])

  const loadIssues = useCallback(async () => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/issues?siteMapId=${siteMapId}`, { credentials: 'include' })
      const data = await resp.json()
      if (data.success) setIssues(data.data || [])
    } catch {}
  }, [siteMapId])

  // Register presence
  useEffect(() => {
    const registerPresence = async () => {
      try {
        await fetch(`/api/admin/logistics/site-maps/${siteMapId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'VIEW',
            entityType: 'presence',
            newValues: { action: 'joined' }
          })
        })
      } catch {}
    }
    registerPresence()
  }, [siteMapId])

  // Load data once on mount
  useEffect(() => {
    setIsLoading(true)
    Promise.all([loadNotes(), loadActivity(), loadTasks(), loadIssues()]).finally(() => setIsLoading(false))
  }, [loadNotes, loadActivity, loadTasks, loadIssues])

  // React to realtime activity updates
  useEffect(() => {
    if (activityVersion === 0) return
    void loadNotes()
    void loadActivity()
    void loadIssues()
  }, [activityVersion, loadNotes, loadActivity, loadIssues])

  // React to realtime task updates
  useEffect(() => {
    if (tasksVersion === 0) return
    void loadTasks()
  }, [tasksVersion, loadTasks])

  // Derive viewers from recent presence logs
  useEffect(() => {
    const recent = activity
      .filter(a => a.entity_type === 'presence' && a.new_values?.action === 'joined')
      .slice(0, 10)
    const seen = new Set<string>()
    const uniqueViewers: ViewerInfo[] = []
    for (const a of recent) {
      if (!seen.has(a.user_id) && a.user) {
        seen.add(a.user_id)
        uniqueViewers.push({
          userId: a.user_id,
          username: a.user.username,
          fullName: a.user.full_name,
          avatarUrl: a.user.avatar_url,
          joinedAt: a.created_at
        })
      }
    }
    setViewers(uniqueViewers)
  }, [activity])

  const sendNote = async () => {
    if (!newNote.trim() || isSending) return
    setIsSending(true)
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newNote.trim(),
          noteType,
          elementId: selectedElementId || undefined,
          x: selectedElementPosition?.x ?? 0,
          y: selectedElementPosition?.y ?? 0
        })
      })
      const data = await resp.json()
      if (data.success) {
        setNewNote('')
        loadNotes()
        notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const updateElementStatus = async (elementId: string, status: ElementStatus, statusNote?: string) => {
    try {
      await fetch(`/api/admin/logistics/site-maps/${siteMapId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'STATUS_CHANGE',
          entityType: 'status_change',
          entityId: elementId,
          newValues: { status, notes: statusNote }
        })
      })
      toast({ title: "Status Updated", description: `Element marked as ${STATUS_CONFIG[status].label}` })
      loadActivity()
    } catch {}
  }

  const createTask = async (
    title: string,
    description: string,
    priority: string,
    assignedTo?: string,
    assignedToName?: string,
    dueDate?: string,
    assignedTeamId?: string,
    assignedRole?: string
  ) => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ASSIGN_TASK',
          title,
          description,
          priority,
          assignedTo,
          assignedToName,
          assignedTeamId,
          assignedRole,
          dueDate,
          elementId: selectedElementId || undefined
        })
      })
      const data = await resp.json()
      if (data.success) {
        toast({ title: "Task Created", description: assignedTo ? `Task assigned and notification sent` : 'Task created' })
        loadTasks()
        loadActivity()
        setShowTaskForm(false)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const completeTask = async (taskId: string, title: string) => {
    try {
      await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'COMPLETE_TASK', taskId, title })
      })
      toast({ title: "Task Completed" })
      loadTasks()
      loadActivity()
    } catch {}
  }

  const reportIssue = async (title: string, severity: string, description: string) => {
    try {
      const resp = await fetch(`/api/admin/logistics/site-maps/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          siteMapId,
          issueType: 'logistics',
          severity,
          title,
          description,
          x: Math.round(selectedElementPosition?.x ?? 0),
          y: Math.round(selectedElementPosition?.y ?? 0),
          notes: selectedElementId ? `Linked to ${selectedElementId}` : undefined,
        })
      })
      const data = await resp.json()
      if (!resp.ok || data.success === false) throw new Error(data.error || 'Failed to report issue')
      toast({ title: "Issue Reported", description: "The issue has been logged" })
      loadIssues()
      loadActivity()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const getActionLabel = (item: ActivityItem) => {
    switch (item.action) {
      case 'NOTE': return 'left a note'
      case 'STATUS_CHANGE': return `changed status to ${item.new_values?.status || 'unknown'}`
      case 'REPORT_ISSUE': return `reported: ${item.new_values?.title || 'an issue'}`
      case 'ASSIGN_TASK': return `assigned task: "${item.new_values?.title || 'Untitled'}"${item.new_values?.assignedToName ? ` to ${item.new_values.assignedToName}` : ''}`
      case 'COMPLETE_TASK': return `completed task: "${item.new_values?.title || 'Untitled'}"`
      case 'VIEW': return 'joined the map'
      case 'CREATE': return 'created this map'
      case 'SHARE': return 'shared this map'
      case 'EDIT': return 'edited elements'
      default: return item.action.toLowerCase()
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'NOTE': return <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
      case 'STATUS_CHANGE': return <Zap className="h-3.5 w-3.5 text-amber-400" />
      case 'REPORT_ISSUE': return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
      case 'ASSIGN_TASK': return <ListChecks className="h-3.5 w-3.5 text-green-400" />
      case 'COMPLETE_TASK': return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
      case 'VIEW': return <Eye className="h-3.5 w-3.5 text-green-400" />
      case 'SHARE': return <Users className="h-3.5 w-3.5 text-purple-400" />
      default: return <Activity className="h-3.5 w-3.5 text-slate-400" />
    }
  }

  const onlineCount = Math.max(viewers.length, presenceCount)

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-slate-700/30 bg-slate-900/60 flex flex-col items-center py-4 gap-3">
        <Button size="sm" variant="ghost" onClick={() => setIsCollapsed(false)} className="h-8 w-8 p-0 text-slate-400 hover:text-white">
          <ChevronDown className="h-4 w-4 rotate-90" />
        </Button>
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <MessageCircle className="h-4 w-4 text-blue-400" />
            {notes.filter(n => n.entity_type === 'note').length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
          <Activity className="h-4 w-4 text-slate-400" />
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        {onlineCount > 0 && (
          <div className="mt-auto flex flex-col items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-500">{onlineCount}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-slate-700/30 bg-gradient-to-b from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl flex flex-col h-full">
      {/* Header with viewers */}
      <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Collaboration</span>
          {onlineCount > 0 && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] px-1.5 py-0">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse" />
              {onlineCount} online
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsCollapsed(true)} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Viewer avatars */}
      {viewers.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-700/30 flex items-center gap-1">
          {viewers.slice(0, 6).map(v => (
            <Avatar key={v.userId} className="h-6 w-6 border border-slate-600">
              <AvatarImage src={v.avatarUrl} />
              <AvatarFallback className="bg-slate-700 text-white text-[9px]">
                {(v.fullName || v.username || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {viewers.length > 6 && (
            <span className="text-[10px] text-slate-500 ml-1">+{viewers.length - 6}</span>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-4 bg-slate-800/60 border border-slate-700/40 rounded-xl p-0.5 h-8">
          <TabsTrigger value="notes" className="text-[11px] rounded-lg data-[state=active]:bg-blue-500/30 data-[state=active]:text-blue-300 h-7">
            <MessageCircle className="h-3 w-3 mr-1" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-[11px] rounded-lg data-[state=active]:bg-purple-500/30 data-[state=active]:text-purple-300 h-7">
            <Activity className="h-3 w-3 mr-1" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="status" className="text-[11px] rounded-lg data-[state=active]:bg-green-500/30 data-[state=active]:text-green-300 h-7">
            <ListChecks className="h-3 w-3 mr-1" />
            Status
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-[11px] rounded-lg data-[state=active]:bg-red-500/30 data-[state=active]:text-red-300 h-7">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Issues
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 flex flex-col mt-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              </div>
            ) : notes.filter(n => n.entity_type === 'note').length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notes yet. Start the conversation.
              </div>
            ) : (
              notes.filter(n => n.entity_type === 'note').map(note => {
                const typeConfig = NOTE_TYPE_CONFIG[(note.new_values?.note_type as keyof typeof NOTE_TYPE_CONFIG) || 'general']
                return (
                  <div key={note.id} className={cn("p-2.5 rounded-xl border", typeConfig.bg)}>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-5 w-5 mt-0.5">
                        <AvatarImage src={note.user?.avatar_url} />
                        <AvatarFallback className="bg-slate-700 text-white text-[8px]">
                          {(note.user?.full_name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate">{note.user?.full_name || note.user?.username || 'User'}</span>
                          <Badge className={cn("text-[9px] px-1 py-0 h-3.5 border", typeConfig.bg)}>
                            <span className={typeConfig.color}>{typeConfig.label}</span>
                          </Badge>
                          <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{timeAgo(note.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{note.new_values?.content}</p>
                        {note.entity_id && (
                          <button
                            onClick={() => onNoteClick?.(note.new_values?.x || 0, note.new_values?.y || 0)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-0.5"
                          >
                            <MapPin className="h-2.5 w-2.5" /> On element
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={notesEndRef} />
          </div>

          {/* Note composer */}
          {!isReadOnly && (
            <div className="p-3 border-t border-slate-700/30 space-y-2">
              <div className="flex gap-1.5">
                {(['general', 'warning', 'question', 'task'] as const).map(type => {
                  const cfg = NOTE_TYPE_CONFIG[type]
                  return (
                    <button
                      key={type}
                      onClick={() => setNoteType(type)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-lg border transition-all",
                        noteType === type ? cfg.bg + ' ' + cfg.color : 'border-slate-700/30 text-slate-500 hover:text-slate-400'
                      )}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendNote()}
                  placeholder={selectedElementId ? "Note on selected element..." : "Leave a note..."}
                  className="text-xs h-8 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
                />
                <Button
                  size="sm"
                  onClick={sendNote}
                  disabled={!newNote.trim() || isSending}
                  className="h-8 w-8 p-0 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg"
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Activity Feed Tab */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0 min-h-0">
          <div className="px-3 py-2 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Recent Activity</span>
              <Button size="sm" variant="ghost" onClick={() => { loadActivity(); loadNotes() }} className="h-5 w-5 p-0 text-slate-500 hover:text-white">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {activity.filter(a => a.entity_type !== 'presence').length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No activity yet.
              </div>
            ) : (
              activity.filter(a => a.entity_type !== 'presence').map(item => (
                <div key={item.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                  <div className="mt-0.5">{getActionIcon(item.action)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300">
                      <span className="font-medium text-white">{item.user?.full_name || item.user?.username || 'Someone'}</span>
                      {' '}{getActionLabel(item)}
                    </p>
                    {item.new_values?.content && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">&ldquo;{item.new_values.content}&rdquo;</p>
                    )}
                    <span className="text-[9px] text-slate-600">{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="status" className="flex-1 flex flex-col mt-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {/* Element status quick-set */}
            {!isReadOnly && selectedElementId && (
              <div className="p-2 rounded-xl border border-slate-700/30 bg-slate-800/20 space-y-1.5 mb-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Element Status</p>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.entries(STATUS_CONFIG) as [ElementStatus, typeof STATUS_CONFIG[ElementStatus]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateElementStatus(selectedElementId, key)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-lg border border-slate-700/30 hover:border-slate-600 text-left transition-all hover:bg-slate-800/50"
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", cfg.color)} />
                      <span className="text-[9px] text-slate-300 truncate">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'My Tasks', count: myTasks.filter(task => task.status !== 'completed').length, tone: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
                { label: 'Overdue', count: overdueTasks.length, tone: 'text-red-300 border-red-500/30 bg-red-500/10' },
                { label: 'Blocked', count: blockedTasks.length, tone: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
                { label: 'Ready', count: readyTasks.length, tone: 'text-green-300 border-green-500/30 bg-green-500/10' },
                { label: 'Changed', count: recentlyChangedTasks.length, tone: 'text-purple-300 border-purple-500/30 bg-purple-500/10' },
              ].map(bucket => (
                <div key={bucket.label} className={cn("rounded-lg border px-2 py-1.5", bucket.tone)}>
                  <div className="text-[15px] font-semibold leading-none">{bucket.count}</div>
                  <div className="text-[9px] uppercase tracking-wide mt-1">{bucket.label}</div>
                </div>
              ))}
            </div>

            {/* Task list */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Tasks ({tasks.filter(t => t.status !== 'completed').length} pending)
              </p>
              {!isReadOnly && (
                <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(!showTaskForm)} className="h-5 w-5 p-0 text-slate-400 hover:text-white">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {tasks.length === 0 && !showTaskForm ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No tasks yet. Assign work to your team.
              </div>
            ) : (
              tasks.map(task => {
                const prioColors: Record<string, string> = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-blue-400' }
                const isComplete = task.status === 'completed'
                return (
                  <div key={task.id} className={cn("p-2.5 rounded-xl border transition-all", isComplete ? "border-slate-700/20 bg-slate-800/10 opacity-60" : "border-slate-700/30 bg-slate-800/30")}>
                    <div className="flex items-start gap-2">
                      {!isReadOnly && !isComplete && (
                        <button
                          onClick={() => completeTask(task.id, task.title)}
                          className="mt-0.5 w-4 h-4 rounded border border-slate-600 hover:border-green-500 hover:bg-green-500/20 flex items-center justify-center transition-all flex-shrink-0"
                          title="Mark complete"
                        >
                          <Check className="h-2.5 w-2.5 text-transparent hover:text-green-400" />
                        </button>
                      )}
                      {isComplete && (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-xs font-medium truncate", isComplete ? "text-slate-500 line-through" : "text-white")}>{task.title}</span>
                          <span className={cn("text-[9px] font-medium flex-shrink-0", prioColors[task.priority] || 'text-slate-400')}>{task.priority}</span>
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-600">
                          {task.assignedToName && (
                            <span className="flex items-center gap-0.5">
                              <UserPlus className="h-2.5 w-2.5" />
                              {task.assignedToName}
                            </span>
                          )}
                          {task.assignedRole && <span>{task.assignedRole}</span>}
                          {task.dueDate && (
                            <span className={new Date(task.dueDate).getTime() < Date.now() && !isComplete ? "text-red-400" : ""}>
                              Due {new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                          <span>{timeAgo(task.createdAt)}</span>
                          {task.completedAt && <span className="text-green-500">Done {timeAgo(task.completedAt)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Task creator */}
          {!isReadOnly && showTaskForm && (
            <TaskCreator
              onSubmit={createTask}
              onCancel={() => setShowTaskForm(false)}
              siteMapId={siteMapId}
              elementId={selectedElementId}
              eventId={eventId}
            />
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="flex-1 flex flex-col mt-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No issues reported.
              </div>
            ) : (
              issues.map(issue => {
                const severity = issue.severity || 'medium'
                const sevColors: Record<string, string> = {
                  low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                  critical: 'bg-red-500/20 text-red-300 border-red-500/30'
                }
                return (
                  <div key={issue.id} className="p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/30">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                        <span className="text-xs font-medium text-white">{issue.title}</span>
                      </div>
                      <Badge className={cn("text-[9px] px-1.5 py-0 border", sevColors[severity])}>
                        {severity}
                      </Badge>
                    </div>
                    {issue.description && (
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{issue.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-[9px] text-slate-500">
                      <span>{issue.reported_by_user?.full_name || issue.reported_by_user?.username || 'User'}</span>
                      <span>{timeAgo(issue.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Issue reporter */}
          {!isReadOnly && (
            <IssueReporter onSubmit={reportIssue} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function IssueReporter({ onSubmit }: { onSubmit: (title: string, severity: string, description: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!title.trim()) return
    onSubmit(title.trim(), severity, description.trim())
    setTitle('')
    setDescription('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="p-3 border-t border-slate-700/30">
        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          className="w-full h-8 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
          variant="outline"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Report Issue
        </Button>
      </div>
    )
  }

  return (
    <div className="p-3 border-t border-slate-700/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">Report Issue</span>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-5 w-5 p-0 text-slate-400">
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Issue title..."
        className="text-xs h-7 bg-slate-800/50 border-slate-700/50 text-white"
      />
      <Select value={severity} onValueChange={setSeverity}>
        <SelectTrigger className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Describe the issue..."
        className="text-xs min-h-[50px] bg-slate-800/50 border-slate-700/50 text-white"
      />
      <Button size="sm" onClick={submit} disabled={!title.trim()} className="w-full h-7 text-xs bg-red-500 hover:bg-red-600 text-white">
        Submit Issue
      </Button>
    </div>
  )
}

function TaskCreator({ onSubmit, onCancel, eventId, elementId, siteMapId }: {
  onSubmit: (title: string, description: string, priority: string, assignedTo?: string, assignedToName?: string, dueDate?: string, assignedTeamId?: string, assignedRole?: string) => void
  onCancel: () => void
  eventId?: string
  elementId?: string | null
  siteMapId?: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assigneeResults, setAssigneeResults] = useState<any[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; name: string } | null>(null)
  const [assignedRole, setAssignedRole] = useState('')
  const [assignedTeamId, setAssignedTeamId] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (assigneeSearch.length < 2) { setAssigneeResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        if (eventId) {
          const rosterResp = await fetch(`/api/hiring/roster?event_id=${encodeURIComponent(eventId)}&search=${encodeURIComponent(assigneeSearch)}`, { credentials: 'include' })
          const rosterData = await rosterResp.json()
          const members = rosterData.data || rosterData.members || []
          setAssigneeResults(members.slice(0, 8).map((member: any) => ({
            id: member.userId || member.user_id || member.id,
            full_name: member.name || member.fullName || member.full_name || 'Crew member',
            username: member.email || member.name || '',
            avatar_url: member.avatarUrl || member.avatar_url || null,
            department: member.department || null,
          })).filter((member: any) => member.id))
        } else {
          const resp = await fetch(`/api/social/suggested?search=${encodeURIComponent(assigneeSearch)}&limit=5`, { credentials: 'include' })
          const data = await resp.json()
          setAssigneeResults(data.data || data.profiles || [])
        }
      } catch {
        setAssigneeResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [assigneeSearch, eventId])

  const submit = () => {
    if (!title.trim()) return
    onSubmit(
      title.trim(),
      description.trim(),
      priority,
      selectedAssignee?.id,
      selectedAssignee?.name,
      dueDate || undefined,
      assignedTeamId.trim() || undefined,
      assignedRole.trim() || undefined
    )
  }

  return (
    <div className="p-3 border-t border-slate-700/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">New Task</span>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-5 w-5 p-0 text-slate-400">
          <X className="h-3 w-3" />
        </Button>
      </div>
      {elementId && (
        <p className="text-[10px] text-blue-400 flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5" /> Attached to selected element
        </p>
      )}
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="text-xs h-7 bg-slate-800/50 border-slate-700/50 text-white"
      />
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Details (optional)..."
        className="text-xs min-h-[40px] bg-slate-800/50 border-slate-700/50 text-white"
      />
      <div className="flex gap-2">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-7 text-xs bg-slate-800/50 border-slate-700/50 text-white flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="text-xs h-7 bg-slate-800/50 border-slate-700/50 text-white"
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={assignedRole}
          onChange={e => setAssignedRole(e.target.value)}
          placeholder="Crew role..."
          className="text-xs h-7 bg-slate-800/50 border-slate-700/50 text-white"
        />
        <Input
          value={assignedTeamId}
          onChange={e => setAssignedTeamId(e.target.value)}
          placeholder="Team/department..."
          className="text-xs h-7 bg-slate-800/50 border-slate-700/50 text-white"
        />
      </div>

      {/* Assignee search */}
      <div className="space-y-1">
        {selectedAssignee ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
            <UserPlus className="h-3 w-3 text-green-400" />
            <span className="text-xs text-green-300 flex-1">{selectedAssignee.name}</span>
            <button onClick={() => setSelectedAssignee(null)} className="text-green-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <UserPlus className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                value={assigneeSearch}
                onChange={e => setAssigneeSearch(e.target.value)}
                placeholder="Assign to team member..."
                className="text-xs h-7 pl-7 bg-slate-800/50 border-slate-700/50 text-white"
              />
            </div>
            {assigneeResults.length > 0 && (
              <div className="border border-slate-700/50 rounded-lg bg-slate-800/80 overflow-hidden">
                {assigneeResults.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedAssignee({ id: u.id, name: u.full_name || u.username })
                      setAssigneeSearch('')
                      setAssigneeResults([])
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700/50 text-left"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white text-[8px]">
                        {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-white truncate">{u.full_name || u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Button size="sm" onClick={submit} disabled={!title.trim()} className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
        {selectedAssignee ? 'Assign & Notify' : 'Create Task'}
      </Button>
    </div>
  )
}
