"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { EventTaskMessages } from "@/components/admin/event-task-messages"
import { EventSecureUploads } from "@/components/admin/event-secure-uploads"
import { supabase } from "@/lib/supabase"
import {
  Megaphone,
  MessageSquare,
  Map,
  FileText,
  Settings,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Send,
  Users,
  AlertTriangle,
  Info,
  Shield,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  Hash,
  Loader2,
  ChevronRight,
  Lock,
  ClipboardCheck,
  Upload,
} from "lucide-react"

interface EventCommunicationHubProps {
  eventId: string
  eventName: string
}

interface Bulletin {
  id: string
  title: string
  content: string
  priority: string
  pinned: boolean
  visible_to: string[]
  requires_acknowledgment: boolean
  read_by: string[]
  acknowledged_by: string[]
  author_id: string
  created_at: string
}

interface GroupChat {
  id: string
  name: string
  description?: string
  group_type: string
  member_ids: string[]
  created_by: string
  created_at: string
}

interface GroupMessage {
  id: string
  group_id: string
  sender_id: string
  content: string
  message_type: string
  created_at: string
}

interface EventDocument {
  id: string
  title: string
  content: string
  document_type: string
  visible_to: string[]
  pinned: boolean
  author_id: string
  created_at: string
  updated_at: string
}

interface CommSettings {
  bulletins_enabled: boolean
  group_chats_enabled: boolean
  documents_enabled: boolean
  site_map_view_roles: string[]
  document_edit_roles: string[]
  site_map_edit_roles: string[]
  bulletin_create_roles: string[]
  group_chat_create_roles: string[]
  role_management_roles: string[]
}

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof Info; label: string }> = {
  info: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Info, label: 'Info' },
  important: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle, label: 'Important' },
  urgent: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle, label: 'Urgent' },
  emergency: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle, label: 'Emergency' },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  general: 'General',
  runsheet: 'Run Sheet',
  safety: 'Safety',
  contact_list: 'Contact List',
  schedule: 'Schedule',
  map_notes: 'Map Notes',
  technical: 'Technical',
  custom: 'Custom',
}

function buildFetchInit(extra?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...extra,
    headers: { 'Cache-Control': 'no-cache', ...(extra?.headers || {}) },
  }
}

export function EventCommunicationHub({ eventId, eventName }: EventCommunicationHubProps) {
  const [activeSection, setActiveSection] = useState('bulletins')
  const [userRole, setUserRole] = useState<string>('staff')
  const [settings, setSettings] = useState<CommSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/communication-settings`, buildFetchInit())
        const data = await res.json()
        if (data.success) {
          setSettings(data.settings)
          setUserRole(data.userRole || 'staff')
        }
      } catch {
        // fallback defaults
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [eventId])

  if (settingsLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
            <MessageSquare className="h-5 w-5 text-purple-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Event Communications</h2>
            <p className="text-sm text-slate-400">Internal communications for {eventName}</p>
          </div>
        </div>
        <Badge className="bg-slate-700/50 text-slate-300 border-slate-600">
          <Shield className="h-3 w-3 mr-1" />
          {userRole}
        </Badge>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <TabsList className="flex w-full bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
          <TabsTrigger value="bulletins" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <Megaphone className="h-4 w-4 mr-2" />
            Bulletins
          </TabsTrigger>
          <TabsTrigger value="group-chats" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <Hash className="h-4 w-4 mr-2" />
            Group Chats
          </TabsTrigger>
          <TabsTrigger value="site-map" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <Map className="h-4 w-4 mr-2" />
            Site Map
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="secure-uploads" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
            <Upload className="h-4 w-4 mr-2" />
            Secure Uploads
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm transition-all">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="bulletins">
          <BulletinsSection eventId={eventId} userRole={userRole} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="group-chats">
          <GroupChatsSection eventId={eventId} userRole={userRole} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="site-map">
          <SiteMapSection eventId={eventId} eventName={eventName} isAdmin={isAdmin} userRole={userRole} />
        </TabsContent>

        <TabsContent value="tasks">
          <EventTaskMessages eventId={eventId} isAdmin={isAdmin} userRole={userRole} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection eventId={eventId} userRole={userRole} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="secure-uploads">
          <EventSecureUploads eventId={eventId} isAdmin={isAdmin} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <CommunicationSettingsSection
              eventId={eventId}
              settings={settings}
              onSettingsUpdate={setSettings}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// =============================================================================
// BULLETINS SECTION
// =============================================================================

function BulletinsSection({ eventId, userRole, isAdmin }: { eventId: string; userRole: string; isAdmin: boolean }) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBulletin, setNewBulletin] = useState({
    title: '',
    content: '',
    priority: 'info',
    pinned: false,
    visible_to: ['all'] as string[],
    requires_acknowledgment: false,
  })

  const fetchBulletins = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/events/${eventId}/communications`, buildFetchInit())
      const data = await res.json()
      if (data.success) setBulletins(data.bulletins || [])
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchBulletins() }, [fetchBulletins])

  async function handleCreate() {
    if (!newBulletin.title.trim() || !newBulletin.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/communications`, buildFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBulletin),
      }))
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success('Bulletin posted')
      setShowCreate(false)
      setNewBulletin({ title: '', content: '', priority: 'info', pinned: false, visible_to: ['all'], requires_acknowledgment: false })
      await fetchBulletins()
    } catch (e: any) {
      toast.error(e.message || 'Failed to post bulletin')
    } finally {
      setCreating(false)
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      await fetch(`/api/admin/events/${eventId}/communications`, buildFetchInit({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      }))
      await fetchBulletins()
      toast.success(action === 'delete' ? 'Bulletin deleted' : 'Updated')
    } catch {
      toast.error('Action failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Bulletins & Announcements</h3>
          <p className="text-sm text-slate-400">Important updates visible to event team members</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Plus className="mr-2 h-4 w-4" /> Post Bulletin
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : bulletins.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Megaphone className="h-10 w-10 text-slate-500" />
            <p className="text-lg font-medium text-white">No bulletins yet</p>
            <p className="text-sm text-slate-400">
              {isAdmin ? 'Post a bulletin to communicate with your event team' : 'No announcements from the event team yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bulletins.map((bulletin) => {
            const config = PRIORITY_CONFIG[bulletin.priority] || PRIORITY_CONFIG.info
            const PriorityIcon = config.icon
            return (
              <Card key={bulletin.id} className={`bg-slate-900/50 border-slate-700/50 ${bulletin.pinned ? 'ring-1 ring-purple-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {bulletin.pinned && (
                          <Pin className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-white truncate">{bulletin.title}</h4>
                        <Badge className={config.color}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {bulletin.requires_acknowledgment && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ack Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap mt-1">{bulletin.content}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(bulletin.created_at), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {bulletin.read_by?.length || 0} read
                        </span>
                        {bulletin.requires_acknowledgment && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {bulletin.acknowledged_by?.length || 0} acknowledged
                          </span>
                        )}
                        {bulletin.visible_to && !bulletin.visible_to.includes('all') && (
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {bulletin.visible_to.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {bulletin.requires_acknowledgment && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(bulletin.id, 'acknowledge')}
                          className="border-slate-600 text-slate-300 text-xs h-7"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ack
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(bulletin.id, bulletin.pinned ? 'unpin' : 'pin')}
                            className="text-slate-400 hover:text-white h-7 w-7 p-0"
                          >
                            {bulletin.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(bulletin.id, 'delete')}
                            className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Post Bulletin</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create an announcement for your event team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Title</Label>
              <Input
                value={newBulletin.title}
                onChange={(e) => setNewBulletin(p => ({ ...p, title: e.target.value }))}
                placeholder="Bulletin title"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Content</Label>
              <Textarea
                value={newBulletin.content}
                onChange={(e) => setNewBulletin(p => ({ ...p, content: e.target.value }))}
                placeholder="Write your bulletin..."
                rows={4}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Priority</Label>
                <Select value={newBulletin.priority} onValueChange={(v) => setNewBulletin(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Visible To</Label>
                <Select
                  value={newBulletin.visible_to[0]}
                  onValueChange={(v) => setNewBulletin(p => ({ ...p, visible_to: [v] }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="crew">Crew</SelectItem>
                    <SelectItem value="vendor">Vendors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newBulletin.pinned}
                  onCheckedChange={(v) => setNewBulletin(p => ({ ...p, pinned: v }))}
                />
                <Label className="text-slate-300 text-sm">Pin to top</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newBulletin.requires_acknowledgment}
                  onCheckedChange={(v) => setNewBulletin(p => ({ ...p, requires_acknowledgment: v }))}
                />
                <Label className="text-slate-300 text-sm">Require acknowledgment</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
              {creating ? 'Posting...' : 'Post Bulletin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// GROUP CHATS SECTION
// =============================================================================

function GroupChatsSection({ eventId, userRole, isAdmin }: { eventId: string; userRole: string; isAdmin: boolean }) {
  const [groups, setGroups] = useState<GroupChat[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { id: string; full_name: string | null; avatar_url: string | null }>>({})
  const senderProfilesRef = useRef(senderProfiles)
  senderProfilesRef.current = senderProfiles
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const ensureSenderProfile = useCallback(async (senderId: string) => {
    if (senderProfilesRef.current[senderId]) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', senderId)
      .maybeSingle()
    if (!data) return
    setSenderProfiles((prev) => {
      if (prev[senderId]) return prev
      return { ...prev, [senderId]: { id: data.id, full_name: data.full_name, avatar_url: data.avatar_url } }
    })
  }, [])

  const hydrateSenderProfiles = useCallback(async (rows: GroupMessage[]) => {
    const unique = Array.from(new Set(rows.map((row) => row.sender_id))).filter(
      (id) => !senderProfilesRef.current[id],
    )
    if (unique.length === 0) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', unique)
    if (!data) return
    setSenderProfiles((prev) => {
      const next = { ...prev }
      data.forEach((row: any) => { next[row.id] = row })
      return next
    })
  }, [])

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    group_type: 'general',
    member_ids: [] as string[],
  })
  const [eventParticipants, setEventParticipants] = useState<Array<{
    participant_id: string
    role?: string | null
    display_name?: string
    avatar_url?: string | null
  }>>([])

  useEffect(() => {
    async function loadParticipants() {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/participants?role=staff`, buildFetchInit())
        const data = await res.json()
        if (res.ok) setEventParticipants(data.participants || [])
      } catch { /* silent */ }
    }
    void loadParticipants()
  }, [eventId])

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/events/${eventId}/group-chats`, buildFetchInit())
      const data = await res.json()
      if (data.success) setGroups(data.groups || [])
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchGroups() }, [fetchGroups])

  const fetchMessages = useCallback(async (groupId: string) => {
    try {
      setMessagesLoading(true)
      const res = await fetch(`/api/admin/events/${eventId}/group-chats?groupId=${groupId}&messages=true`, buildFetchInit())
      const data = await res.json()
      if (data.success) {
        const list = (data.messages || []) as GroupMessage[]
        setMessages(list)
        await hydrateSenderProfiles(list)
      }
    } catch { /* */ } finally {
      setMessagesLoading(false)
    }
  }, [eventId, hydrateSenderProfiles])

  useEffect(() => {
    if (selectedGroup) void fetchMessages(selectedGroup.id)
  }, [selectedGroup, fetchMessages])

  useEffect(() => {
    // One event-scoped channel handles every group; messages route into the open
    // pane client-side rather than re-subscribing on every group switch.
    const channel = supabase
      .channel(`event-${eventId}-group-messages-hub`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_group_messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const incoming = payload.new as GroupMessage
          setMessages((prev) => {
            if (!selectedGroup || incoming.group_id !== selectedGroup.id) return prev
            if (prev.some((message) => message.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          void ensureSenderProfile(incoming.sender_id)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, selectedGroup, ensureSenderProfile])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleCreateGroup() {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/group-chats`, buildFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      }))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details?.member_ids?.[0] || 'Failed to create group')
      toast.success('Group created')
      setShowCreate(false)
      setNewGroup({ name: '', description: '', group_type: 'general', member_ids: [] })
      await fetchGroups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  async function handleSendMessage() {
    if (!messageInput.trim() || !selectedGroup) return
    const pending = messageInput.trim()
    setSending(true)
    setMessageInput('')
    try {
      const res = await fetch(`/api/admin/events/${eventId}/group-chats`, buildFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroup.id, content: pending }),
      }))
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to send')
      }
      const data = await res.json().catch(() => ({}))
      if (data?.message) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.message.id)) return prev
          return [...prev, data.message as GroupMessage]
        })
      }
    } catch (error) {
      setMessageInput(pending)
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const GROUP_TYPE_COLORS: Record<string, string> = {
    general: 'bg-blue-500/20 text-blue-400',
    staff: 'bg-green-500/20 text-green-400',
    crew: 'bg-yellow-500/20 text-yellow-400',
    vendors: 'bg-orange-500/20 text-orange-400',
    management: 'bg-purple-500/20 text-purple-400',
    custom: 'bg-slate-500/20 text-slate-400',
  }

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedGroup(null)}
            className="text-slate-400 hover:text-white"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-white">{selectedGroup.name}</h3>
            <p className="text-sm text-slate-400">
              {selectedGroup.member_ids?.length || 0} members
              {selectedGroup.description && ` — ${selectedGroup.description}`}
            </p>
          </div>
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const sender = senderProfiles[msg.sender_id]
                    const displayName = sender?.full_name?.trim() || `User ${msg.sender_id.slice(0, 6)}`
                    return (
                      <div key={msg.id} className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={sender?.avatar_url || ''} alt={displayName} />
                          <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-300">{displayName}</span>
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-white mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center gap-2 p-3 border-t border-slate-700/50">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="bg-slate-800 border-slate-600 text-white flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Group Chats</h3>
          <p className="text-sm text-slate-400">Communicate with specific team groups</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Hash className="h-10 w-10 text-slate-500" />
            <p className="text-lg font-medium text-white">No group chats yet</p>
            <p className="text-sm text-slate-400">
              Create groups for staff, crew, vendors, or custom teams
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="bg-slate-900/50 border-slate-700/50 cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <Hash className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{group.name}</h4>
                      <p className="text-xs text-slate-400">
                        {group.member_ids?.length || 0} members
                      </p>
                    </div>
                  </div>
                  <Badge className={GROUP_TYPE_COLORS[group.group_type] || GROUP_TYPE_COLORS.custom}>
                    {group.group_type}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-1">{group.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Create Group Chat</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a communication channel for specific team members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Group Name</Label>
              <Input
                value={newGroup.name}
                onChange={(e) => setNewGroup(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Stage Crew, Security Team"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Input
                value={newGroup.description}
                onChange={(e) => setNewGroup(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this group for?"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Group Type</Label>
              <Select value={newGroup.group_type} onValueChange={(v) => setNewGroup(p => ({ ...p, group_type: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="crew">Crew</SelectItem>
                  <SelectItem value="vendors">Vendors</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Members</Label>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1 rounded-md border border-slate-700 bg-slate-900/50 p-2">
                {eventParticipants.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No staff participants found for this event.</p>
                ) : (
                  eventParticipants.map((participant) => {
                    const checked = newGroup.member_ids.includes(participant.participant_id)
                    return (
                      <label
                        key={participant.participant_id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setNewGroup((prev) => ({
                              ...prev,
                              member_ids: e.target.checked
                                ? [...prev.member_ids, participant.participant_id]
                                : prev.member_ids.filter((id) => id !== participant.participant_id),
                            }))
                          }}
                          className="rounded border-slate-600"
                        />
                        <span className="truncate">{participant.display_name || participant.participant_id.slice(0, 8)}</span>
                        {participant.role ? (
                          <Badge variant="secondary" className="ml-auto text-[10px]">{participant.role}</Badge>
                        ) : null}
                      </label>
                    )
                  })
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Select team members to add. You are added automatically as the creator.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// SITE MAP SECTION (Read-only for non-admin)
// =============================================================================

function SiteMapSection({ eventId, eventName, isAdmin, userRole }: {
  eventId: string; eventName: string; isAdmin: boolean; userRole: string
}) {
  const [maps, setMaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMaps() {
      try {
        const params = new URLSearchParams({ eventId, includeData: 'false' })
        const resp = await fetch(`/api/admin/logistics/site-maps?${params}`, buildFetchInit())
        const data = await resp.json()
        if (data.success) setMaps(data.data || [])
      } catch { /* */ } finally {
        setLoading(false)
      }
    }
    loadMaps()
  }, [eventId])

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Event Site Maps</h3>
          <p className="text-sm text-slate-400">
            {isAdmin
              ? 'View and manage site maps for this event'
              : 'View site maps for this event (read-only)'}
          </p>
        </div>
        {!isAdmin && (
          <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
            <Eye className="h-3 w-3 mr-1" /> View Only
          </Badge>
        )}
      </div>

      {maps.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Map className="h-10 w-10 text-slate-500" />
            <p className="text-lg font-medium text-white">No site maps available</p>
            <p className="text-sm text-slate-400">
              {isAdmin
                ? 'Create a site map from the Site Map tab to make it available here'
                : 'The event admin has not created a site map yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {maps.map((map: any) => (
            <Card key={map.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
                      <Map className="h-5 w-5 text-purple-300" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{map.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>{map.width}x{map.height} units</span>
                        <Badge className="bg-slate-700/50 text-slate-400 text-xs">{map.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Edit className="h-3 w-3 mr-1" /> Can Edit
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
                        <Eye className="h-3 w-3 mr-1" /> View Only
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-slate-500 text-center mt-2">
            {isAdmin
              ? 'Full editing available from the Site Map tab above'
              : 'Contact the event admin to request changes to site maps'}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// DOCUMENTS SECTION
// =============================================================================

function DocumentsSection({ eventId, userRole, isAdmin }: { eventId: string; userRole: string; isAdmin: boolean }) {
  const [documents, setDocuments] = useState<EventDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<EventDocument | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')

  const [newDoc, setNewDoc] = useState({
    title: '',
    content: '',
    document_type: 'general',
    visible_to: ['all'] as string[],
    pinned: false,
  })

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/events/${eventId}/documents`, buildFetchInit())
      const data = await res.json()
      if (data.success) setDocuments(data.documents || [])
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchDocuments() }, [fetchDocuments])

  async function handleCreate() {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/documents`, buildFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc),
      }))
      if (!res.ok) throw new Error()
      toast.success('Document created')
      setShowCreate(false)
      setNewDoc({ title: '', content: '', document_type: 'general', visible_to: ['all'], pinned: false })
      await fetchDocuments()
    } catch {
      toast.error('Failed to create document')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveEdit() {
    if (!selectedDoc) return
    try {
      const res = await fetch(`/api/admin/events/${eventId}/documents`, buildFetchInit({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDoc.id, title: editTitle, content: editContent }),
      }))
      if (!res.ok) throw new Error()
      toast.success('Document updated')
      setEditMode(false)
      setSelectedDoc(null)
      await fetchDocuments()
    } catch {
      toast.error('Failed to update document')
    }
  }

  async function handleDelete(docId: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/documents?id=${docId}`, buildFetchInit({ method: 'DELETE' }))
      if (!res.ok) throw new Error()
      toast.success('Document deleted')
      setSelectedDoc(null)
      await fetchDocuments()
    } catch {
      toast.error('Failed to delete document')
    }
  }

  if (selectedDoc) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedDoc(null); setEditMode(false) }}
              className="text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <div>
              {editMode ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white text-lg font-semibold"
                />
              ) : (
                <h3 className="text-lg font-semibold text-white">{selectedDoc.title}</h3>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-slate-700/50 text-slate-400">
                  {DOC_TYPE_LABELS[selectedDoc.document_type] || selectedDoc.document_type}
                </Badge>
                <span className="text-xs text-slate-500">
                  Updated {formatDistanceToNow(new Date(selectedDoc.updated_at || selectedDoc.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="border-slate-600 text-slate-300">Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} className="bg-purple-600 hover:bg-purple-700">Save</Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode(true)
                      setEditTitle(selectedDoc.title)
                      setEditContent(selectedDoc.content)
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedDoc.id)}
                    className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-6">
            {editMode ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white min-h-[400px] font-mono text-sm"
              />
            ) : (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed">
                  {selectedDoc.content}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Event Documents</h3>
          <p className="text-sm text-slate-400">
            {isAdmin
              ? 'Create and manage documents for your event team'
              : 'View event documentation (read-only)'}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Plus className="mr-2 h-4 w-4" /> Create Document
          </Button>
        ) : (
          <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
            <Eye className="h-3 w-3 mr-1" /> View Only
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-slate-500" />
            <p className="text-lg font-medium text-white">No documents yet</p>
            <p className="text-sm text-slate-400">
              {isAdmin
                ? 'Create run sheets, safety docs, schedules, and more'
                : 'No documents have been shared for this event yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="bg-slate-900/50 border-slate-700/50 cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => setSelectedDoc(doc)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {doc.pinned && <Pin className="h-3.5 w-3.5 text-purple-400" />}
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <h4 className="font-medium text-white">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-slate-700/50 text-slate-400 text-xs">
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(doc.updated_at || doc.created_at), { addSuffix: true })}
                        </span>
                        {doc.visible_to && !doc.visible_to.includes('all') && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {doc.visible_to.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create Document</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a document for your event team to reference
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={newDoc.title}
                  onChange={(e) => setNewDoc(p => ({ ...p, title: e.target.value }))}
                  placeholder="Document title"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Type</Label>
                <Select value={newDoc.document_type} onValueChange={(v) => setNewDoc(p => ({ ...p, document_type: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="runsheet">Run Sheet</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="contact_list">Contact List</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="map_notes">Map Notes</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Content</Label>
              <Textarea
                value={newDoc.content}
                onChange={(e) => setNewDoc(p => ({ ...p, content: e.target.value }))}
                placeholder="Write your document content..."
                rows={10}
                className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Visible To</Label>
                <Select
                  value={newDoc.visible_to[0]}
                  onValueChange={(v) => setNewDoc(p => ({ ...p, visible_to: [v] }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-40"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newDoc.pinned}
                  onCheckedChange={(v) => setNewDoc(p => ({ ...p, pinned: v }))}
                />
                <Label className="text-slate-300 text-sm">Pin to top</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
              {creating ? 'Creating...' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// COMMUNICATION SETTINGS SECTION (Admin-only)
// =============================================================================

function CommunicationSettingsSection({ eventId, settings, onSettingsUpdate }: {
  eventId: string
  settings: CommSettings | null
  onSettingsUpdate: (s: CommSettings) => void
}) {
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState<CommSettings>(
    settings || {
      bulletins_enabled: true,
      group_chats_enabled: true,
      documents_enabled: true,
      site_map_view_roles: ['admin', 'manager', 'staff', 'crew', 'vendor'],
      document_edit_roles: ['admin'],
      site_map_edit_roles: ['admin'],
      bulletin_create_roles: ['admin', 'manager'],
      group_chat_create_roles: ['admin', 'manager', 'staff'],
      role_management_roles: ['admin'],
    }
  )

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/communication-settings`, buildFetchInit({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      }))
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.success) {
        onSettingsUpdate(data.settings)
        toast.success('Communication settings saved')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function toggleRole(field: keyof CommSettings, role: string) {
    setLocalSettings((prev) => {
      const current = prev[field] as string[]
      const updated = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role]
      return { ...prev, [field]: updated }
    })
  }

  const ROLES = ['admin', 'manager', 'staff', 'crew', 'vendor']

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Communication Settings</h3>
        <p className="text-sm text-slate-400">
          Manage who can access and modify communication features for this event
        </p>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white text-base">Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Bulletins</p>
              <p className="text-xs text-slate-400">Allow posting announcements and bulletins</p>
            </div>
            <Switch
              checked={localSettings.bulletins_enabled}
              onCheckedChange={(v) => setLocalSettings(p => ({ ...p, bulletins_enabled: v }))}
            />
          </div>
          <Separator className="bg-slate-700/50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Group Chats</p>
              <p className="text-xs text-slate-400">Allow creating group conversations</p>
            </div>
            <Switch
              checked={localSettings.group_chats_enabled}
              onCheckedChange={(v) => setLocalSettings(p => ({ ...p, group_chats_enabled: v }))}
            />
          </div>
          <Separator className="bg-slate-700/50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Documents</p>
              <p className="text-xs text-slate-400">Allow creating and sharing event documents</p>
            </div>
            <Switch
              checked={localSettings.documents_enabled}
              onCheckedChange={(v) => setLocalSettings(p => ({ ...p, documents_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white text-base">Permission Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PermissionRow
            label="Site Map Viewing"
            description="Who can view site maps in the communications hub"
            roles={ROLES}
            activeRoles={localSettings.site_map_view_roles}
            onToggle={(role) => toggleRole('site_map_view_roles', role)}
          />
          <Separator className="bg-slate-700/50" />
          <PermissionRow
            label="Site Map Editing"
            description="Who can edit and modify site maps"
            roles={ROLES}
            activeRoles={localSettings.site_map_edit_roles}
            onToggle={(role) => toggleRole('site_map_edit_roles', role)}
            restrictedNote="Recommended: Admin only"
          />
          <Separator className="bg-slate-700/50" />
          <PermissionRow
            label="Document Editing"
            description="Who can create and edit event documents"
            roles={ROLES}
            activeRoles={localSettings.document_edit_roles}
            onToggle={(role) => toggleRole('document_edit_roles', role)}
            restrictedNote="Recommended: Admin only"
          />
          <Separator className="bg-slate-700/50" />
          <PermissionRow
            label="Bulletin Posting"
            description="Who can create new bulletins and announcements"
            roles={ROLES}
            activeRoles={localSettings.bulletin_create_roles}
            onToggle={(role) => toggleRole('bulletin_create_roles', role)}
          />
          <Separator className="bg-slate-700/50" />
          <PermissionRow
            label="Group Chat Creation"
            description="Who can create new group conversations"
            roles={ROLES}
            activeRoles={localSettings.group_chat_create_roles}
            onToggle={(role) => toggleRole('group_chat_create_roles', role)}
          />
          <Separator className="bg-slate-700/50" />
          <PermissionRow
            label="Role Management"
            description="Who can assign and update member roles"
            roles={ROLES}
            activeRoles={localSettings.role_management_roles}
            onToggle={(role) => toggleRole('role_management_roles', role)}
            restrictedNote="Recommended: Admin only"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

function PermissionRow({ label, description, roles, activeRoles, onToggle, restrictedNote }: {
  label: string
  description: string
  roles: string[]
  activeRoles: string[]
  onToggle: (role: string) => void
  restrictedNote?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        {restrictedNote && (
          <span className="text-xs text-amber-400/80 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {restrictedNote}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const isActive = activeRoles.includes(role)
          return (
            <button
              key={role}
              onClick={() => onToggle(role)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              {role}
            </button>
          )
        })}
      </div>
    </div>
  )
}
