"use client"

import { useState, useCallback, useEffect } from "react"
import { MessageSquare, Plus, Send, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { toast } from "sonner"

interface TeamMessage {
  id: string
  subject: string
  content: string
  message_type: string
  priority: string
  sent_at?: string
  created_at: string
  sender_id?: string
  recipients: string[]
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  normal: 'bg-slate-500/20 text-slate-400',
  low: 'bg-slate-600/20 text-slate-500',
}

interface Props { venueId?: string }

export function StaffCommunicationsTab({ venueId }: Props) {
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    subject: '',
    content: '',
    message_type: 'general',
    priority: 'normal',
    recipients: '',
  })

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (venueId) params.set('venue_id', venueId)
      params.set('type', 'communications')
      const res = await fetch(`/api/admin/communications?${params}`, { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setMessages(d.messages || d.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => { void fetchMessages() }, [fetchMessages])

  async function sendMessage() {
    if (!form.content.trim()) { toast.error('Message content is required'); return }
    setSending(true)
    try {
      const recipients = form.recipients.split(/[\s,;]+/).map(r => r.trim()).filter(Boolean)
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject || form.message_type,
          content: form.content,
          message_type: form.message_type,
          priority: form.priority,
          recipients: recipients.length > 0 ? recipients : [],
          type: 'staff_bulletin',
          ...(venueId ? { venue_id: venueId } : {}),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Message sent')
      setShowDialog(false)
      setForm({ subject: '', content: '', message_type: 'general', priority: 'normal', recipients: '' })
      void fetchMessages()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Message
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : messages.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="text-center py-12">
            <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No team messages yet.</p>
            <Button size="sm" onClick={() => setShowDialog(true)} className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Send First Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <Card key={m.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-medium">{m.subject}</p>
                      <Badge className={PRIORITY_COLORS[m.priority] || 'bg-slate-500/20 text-slate-400'}>
                        {m.priority}
                      </Badge>
                      <Badge className="bg-slate-700/50 text-slate-300 text-xs">{m.message_type}</Badge>
                    </div>
                    <p className="text-slate-300 text-sm mt-1 line-clamp-2">{m.content}</p>
                    <p className="text-slate-500 text-xs mt-1">{formatSafeDate(m.sent_at || m.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              Send Team Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Subject</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Message subject..." className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Type</Label>
                <Select value={form.message_type} onValueChange={v => setForm(p => ({ ...p, message_type: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {['general','announcement','schedule','training','emergency','performance','compliance'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {['low','normal','high','urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Message *</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Your message to the team..." className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px] text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Recipients (emails, optional)</Label>
              <Input value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} placeholder="Leave blank for all staff, or enter emails..." className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={sendMessage} disabled={sending} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
