"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MessageSquare,
  Send,
  Bell,
  Megaphone,
  AlertCircle,
  Plus,
  CheckCircle,
  Loader2,
  RefreshCw,
  Inbox,
} from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminStatCard } from "../components/admin-stat-card"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface TeamMessage {
  id: string
  sender_id: string | null
  subject: string
  content: string
  message_type: string
  priority: string
  recipients: string[]
  read_by: string[]
  requires_acknowledgment: boolean
  acknowledged_by: string[]
  sent_at: string
  created_at: string
}

function priorityColor(p: string): string {
  switch (p) {
    case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'announcement': return <Megaphone className="h-4 w-4 text-blue-400" />
    case 'alert': return <AlertCircle className="h-4 w-4 text-red-400" />
    case 'update': return <Bell className="h-4 w-4 text-yellow-400" />
    default: return <MessageSquare className="h-4 w-4 text-slate-400" />
  }
}

function formatTime(ts: string): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return "TBD"
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (hours > 24) return formatSafeDate(ts)
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export default function CommunicationsPage() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [total, setTotal] = useState(0)
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)

  const [newMsg, setNewMsg] = useState({
    subject: '',
    content: '',
    message_type: 'general',
    priority: 'normal',
    requires_acknowledgment: false,
  })

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/communications?limit=100')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  async function handleSend() {
    if (!newMsg.subject.trim() || !newMsg.content.trim()) {
      toast.error('Subject and content are required')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      })
      if (!res.ok) throw new Error('Failed to send')
      toast.success('Message sent')
      setShowCompose(false)
      setNewMsg({ subject: '', content: '', message_type: 'general', priority: 'normal', requires_acknowledgment: false })
      fetchMessages()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch('/api/admin/communications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark_read' }),
      })
    } catch { /* silent */ }
  }

  async function handleAcknowledge(id: string) {
    try {
      const res = await fetch('/api/admin/communications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'acknowledge' }),
      })
      if (res.ok) {
        toast.success('Acknowledged')
        fetchMessages()
      }
    } catch {
      toast.error('Failed to acknowledge')
    }
  }

  const announcements = messages.filter(m => m.message_type === 'announcement')
  const alerts = messages.filter(m => m.message_type === 'alert' || m.priority === 'urgent')
  const unacknowledged = messages.filter(m => m.requires_acknowledgment && m.acknowledged_by.length === 0)

  if (loading) return <AdminPageSkeleton />

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Communications"
        subtitle="Team messaging, announcements, and updates"
        icon={MessageSquare}
        actions={
          <>
            <Dialog open={showCompose} onOpenChange={setShowCompose}>
              <DialogTrigger asChild>
                <Button className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Compose Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300">Type</Label>
                      <Select value={newMsg.message_type} onValueChange={(v) => setNewMsg(p => ({ ...p, message_type: v }))}>
                        <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-800">
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Priority</Label>
                      <Select value={newMsg.priority} onValueChange={(v) => setNewMsg(p => ({ ...p, priority: v }))}>
                        <SelectTrigger className="border-slate-700 bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-800">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Subject</Label>
                    <Input
                      placeholder="Message subject"
                      value={newMsg.subject}
                      onChange={(e) => setNewMsg(p => ({ ...p, subject: e.target.value }))}
                      className="border-slate-700 bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Content</Label>
                    <Textarea
                      placeholder="Write your message..."
                      rows={4}
                      value={newMsg.content}
                      onChange={(e) => setNewMsg(p => ({ ...p, content: e.target.value }))}
                      className="border-slate-700 bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ack"
                      checked={newMsg.requires_acknowledgment}
                      onChange={(e) => setNewMsg(p => ({ ...p, requires_acknowledgment: e.target.checked }))}
                      className="rounded border-slate-600"
                    />
                    <Label htmlFor="ack" className="text-slate-300 text-sm">Require acknowledgment</Label>
                  </div>
                  <Button onClick={handleSend} disabled={sending} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Message
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-slate-700 text-slate-300 backdrop-blur-sm transition-all duration-200" onClick={fetchMessages}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Total Messages" value={String(total)} icon={MessageSquare} color="blue" size="lg" />
        <AdminStatCard title="Announcements" value={String(announcements.length)} icon={Megaphone} color="purple" size="lg" />
        <AdminStatCard title="Active Alerts" value={String(alerts.length)} icon={AlertCircle} color={alerts.length > 0 ? 'red' : 'blue'} size="lg" />
        <AdminStatCard title="Pending Ack" value={String(unacknowledged.length)} icon={CheckCircle} color={unacknowledged.length > 0 ? 'orange' : 'green'} size="lg" />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex w-full max-w-2xl overflow-x-auto bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">All</TabsTrigger>
          <TabsTrigger value="announcement" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Announcements</TabsTrigger>
          <TabsTrigger value="alert" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Alerts</TabsTrigger>
          <TabsTrigger value="update" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">Updates</TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">General</TabsTrigger>
        </TabsList>

        {['all', 'announcement', 'alert', 'update', 'general'].map(tab => {
          const filtered = tab === 'all' ? messages : messages.filter(m => m.message_type === tab)
          return (
          <TabsContent key={tab} value={tab} className="space-y-3 pt-4">
            {filtered.length === 0 ? (
              <AdminEmptyState
                icon={Inbox}
                title={tab === 'all' ? "No messages yet" : `No ${tab} messages`}
                description="Send your first team communication to get started"
              />
            ) : (
              filtered.map((msg) => (
                <Card
                  key={msg.id}
                  className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm hover:bg-slate-900/80 hover:border-slate-600/40 transition-all duration-200"
                  onClick={() => handleMarkRead(msg.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-0.5 flex-shrink-0">{typeIcon(msg.message_type)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium text-white truncate">{msg.subject}</h4>
                            <Badge className={`text-[10px] ${priorityColor(msg.priority)}`}>{msg.priority}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{msg.message_type}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{msg.content}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                            <span>{formatTime(msg.sent_at)}</span>
                            <span>{msg.read_by?.length || 0} read</span>
                            {msg.requires_acknowledgment && (
                              <span>{msg.acknowledged_by?.length || 0} acknowledged</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {msg.requires_acknowledgment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-xs flex-shrink-0 backdrop-blur-sm transition-all duration-200"
                          onClick={(e) => { e.stopPropagation(); handleAcknowledge(msg.id) }}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ack
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
