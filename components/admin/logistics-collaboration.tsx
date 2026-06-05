"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Send, RefreshCw, Clock } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { toast } from "sonner"

interface Message {
  id: string
  subject: string
  content: string
  message_type: string
  priority: string
  sent_at?: string
  created_at: string
}

interface LogisticsCollaborationProps {
  eventId?: string
  tourId?: string
  siteMapId?: string
  teamMembers?: string[]
}

export function LogisticsCollaboration({
  eventId,
  tourId,
  siteMapId,
  teamMembers = [],
}: LogisticsCollaborationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (eventId) params.set('event_id', eventId)
      if (tourId) params.set('tour_id', tourId)
      params.set('limit', '30')

      const res = await fetch(`/api/admin/communications?${params}`, { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setMessages(d.messages || d.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId, tourId])

  useEffect(() => { void fetchMessages() }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Logistics Update',
          content: newMessage.trim(),
          message_type: 'general',
          priority: 'normal',
          type: 'logistics_update',
          ...(eventId ? { event_id: eventId } : {}),
          ...(tourId ? { tour_id: tourId } : {}),
          recipients: teamMembers,
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setNewMessage('')
      void fetchMessages()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send update')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            Logistics Communications
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchMessages} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      {/* Message list */}
      <CardContent className="flex-1 overflow-y-auto space-y-3 px-4 pb-2 min-h-0">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No messages yet. Send the first update.</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className="flex items-start gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-purple-600/20 text-purple-400 text-xs">
                  {(m.subject || 'L').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-300 text-xs font-medium">{m.message_type}</span>
                  <Badge className={`text-[10px] ${m.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'}`}>
                    {m.priority}
                  </Badge>
                  <span className="text-slate-600 text-[10px] flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatSafeDate(m.sent_at || m.created_at)}
                  </span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </CardContent>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Send a logistics update to the team..."
            className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[60px] resize-none flex-1"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { void sendMessage() } }}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 self-end h-9 w-9 p-0 shrink-0"
          >
            {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-slate-600 text-[10px] mt-1">Cmd+Enter to send</p>
      </div>
    </Card>
  )
}
