"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileText, Hash, Loader2, MessageSquare, Paperclip, Plus, Send, Settings2, Users, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useActingContext } from "@/hooks/use-acting-context"
import { supabase } from "@/lib/supabase"
import type { HiringEntity } from "@/types/hiring-entity"
import type { StaffOperationsChannel, StaffOperationsChannelMember } from "@/types/staff-operations"

interface MessageAttachment { url: string; name: string; type: "image" | "file" | "audio"; size: number }
interface ChannelMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
  attachments?: MessageAttachment[]
  sender?: { full_name?: string | null; username?: string | null } | null
}
interface WorkforcePerson { userId: string; name: string; email: string | null; role: string | null }

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function attachmentType(mime: string): MessageAttachment["type"] {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  return "file"
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TM"
}

export function StaffOperationsChannelsDialog({
  open,
  onOpenChange,
  employer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employer: HiringEntity
}) {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [channels, setChannels] = useState<StaffOperationsChannel[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [people, setPeople] = useState<WorkforcePerson[]>([])
  const [members, setMembers] = useState<StaffOperationsChannelMember[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [composer, setComposer] = useState("")
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [editor, setEditor] = useState<"create" | "manage" | null>(null)
  const [channelName, setChannelName] = useState("")
  const [channelDescription, setChannelDescription] = useState("")
  const [draftMemberIds, setDraftMemberIds] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const selected = channels.find((channel) => channel.id === selectedId) ?? null

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...actingHeaders, ...(init?.headers ?? {}) },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Request failed")
    return payload
  }, [actingHeaders])

  const loadChannels = useCallback(async () => {
    if (!isActingReady) return
    const payload = await request("/api/admin/staff-operations/channels")
    const next = (payload.channels ?? []) as StaffOperationsChannel[]
    setChannels(next)
    setSelectedId((current) => current && next.some((channel) => channel.id === current) ? current : next[0]?.id ?? null)
  }, [isActingReady, request])

  const loadPeople = useCallback(async () => {
    const params = new URLSearchParams({
      employer_entity_type: employer.entityType,
      employer_entity_id: employer.entityId,
      include_pending: "false",
      limit: "500",
    })
    const payload = await request(`/api/admin/workforce/people?${params.toString()}`)
    setPeople((payload.people ?? []).map((person: Record<string, unknown>) => ({
      userId: String(person.userId ?? person.user_id ?? ""),
      name: String(person.name ?? "Team member"),
      email: typeof person.email === "string" ? person.email : null,
      role: typeof person.role === "string" ? person.role : null,
    })).filter((person: WorkforcePerson) => person.userId))
  }, [employer.entityId, employer.entityType, request])

  const loadSelected = useCallback(async (id: string) => {
    const [messagePayload, memberPayload] = await Promise.all([
      request(`/api/groups/threads/${id}/messages?limit=100`),
      request(`/api/admin/staff-operations/channels/${id}`),
    ])
    setMessages(messagePayload.messages ?? [])
    setMembers(memberPayload.members ?? [])
    await request(`/api/admin/staff-operations/channels/${id}`, { method: "PATCH", body: JSON.stringify({ markRead: true }) })
    setChannels((current) => current.map((channel) => channel.id === id ? { ...channel, unreadCount: 0 } : channel))
  }, [request])

  useEffect(() => {
    if (!open || !isActingReady) return
    setLoading(true)
    Promise.all([loadChannels(), loadPeople()])
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load team messages"))
      .finally(() => setLoading(false))
  }, [actingContextKey, isActingReady, loadChannels, loadPeople, open])

  useEffect(() => {
    if (!open || !selectedId) {
      setMessages([])
      setMembers([])
      return
    }
    void loadSelected(selectedId).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load messages"))
  }, [loadSelected, open, selectedId])

  useEffect(() => {
    if (!open || !selectedId) return
    const realtime = supabase
      .channel(`staff-operations-${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `thread_id=eq.${selectedId}` }, () => {
        void loadSelected(selectedId)
      })
      .subscribe()
    return () => { void supabase.removeChannel(realtime) }
  }, [loadSelected, open, selectedId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function sendMessage() {
    if (!selectedId || (!composer.trim() && attachments.length === 0)) return
    setSending(true)
    try {
      const payload = await request(`/api/groups/threads/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: composer.trim(), attachments }),
      })
      setMessages((current) => current.some((message) => message.id === payload.message.id) ? current : [...current, payload.message])
      setComposer("")
      setAttachments([])
      await loadChannels()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message")
    } finally {
      setSending(false)
    }
  }

  async function upload(file: File) {
    if (!selectedId) return
    if (file.size > MAX_ATTACHMENT_BYTES) return toast.error("Attachments must be under 25 MB")
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `staff/${selectedId}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from("message-attachments").upload(path, file, { cacheControl: "3600", upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from("message-attachments").getPublicUrl(path)
      setAttachments((current) => [...current, { url: data.publicUrl, name: file.name, type: attachmentType(file.type), size: file.size }])
    } catch {
      toast.error("Unable to upload the attachment")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function openCreate() {
    setChannelName("")
    setChannelDescription("")
    setDraftMemberIds(new Set())
    setEditor("create")
  }

  function openManage() {
    if (!selected) return
    setChannelName(selected.name)
    setChannelDescription(selected.description ?? "")
    setDraftMemberIds(new Set(members.map((member) => member.userId)))
    setEditor("manage")
  }

  async function saveChannel() {
    if (!channelName.trim()) return
    try {
      if (editor === "create") {
        const payload = await request("/api/admin/staff-operations/channels", {
          method: "POST",
          body: JSON.stringify({ name: channelName, description: channelDescription || null, memberIds: Array.from(draftMemberIds) }),
        })
        await loadChannels()
        setSelectedId(payload.channel.id)
        toast.success("Team channel created")
      } else if (editor === "manage" && selected) {
        const current = new Set(members.map((member) => member.userId))
        const ownerIds = new Set(members.filter((member) => member.membershipRole === "owner").map((member) => member.userId))
        const addMemberIds = Array.from(draftMemberIds).filter((id) => !current.has(id))
        const removeMemberIds = Array.from(current).filter((id) => !draftMemberIds.has(id) && !ownerIds.has(id))
        await request(`/api/admin/staff-operations/channels/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: channelName, description: channelDescription || null, addMemberIds, removeMemberIds }),
        })
        await Promise.all([loadChannels(), loadSelected(selected.id)])
        toast.success("Channel updated")
      }
      setEditor(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the channel")
    }
  }

  const currentMemberById = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[88vh] max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-100 sm:rounded-2xl">
          <DialogHeader className="border-b border-slate-800 px-5 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-cyan-300" />Team communications</DialogTitle>
            <DialogDescription className="text-slate-400">Private channels for approved members of {employer.displayName}.</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
            <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-800 bg-slate-950/80`}>
              <div className="flex items-center justify-between border-b border-slate-800 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Channels</p>
                <Button size="icon" variant="ghost" onClick={openCreate} aria-label="Create channel" className="h-8 w-8 text-cyan-300"><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="flex-1 p-2">
                {loading ? <div className="flex items-center gap-2 p-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading channels</div> : null}
                {!loading && channels.length === 0 ? (
                  <div className="p-5 text-center"><Hash className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-2 text-sm text-slate-300">No team channels yet</p><Button size="sm" onClick={openCreate} className="mt-3 bg-purple-600 text-white">Create channel</Button></div>
                ) : null}
                <div className="space-y-1">{channels.map((channel) => (
                  <button key={channel.id} type="button" onClick={() => setSelectedId(channel.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === channel.id ? "border-purple-400/30 bg-purple-500/10" : "border-transparent hover:bg-slate-900"}`}>
                    <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-slate-500" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{channel.name}</span>{channel.unreadCount > 0 ? <Badge className="bg-blue-500 text-white">{channel.unreadCount}</Badge> : null}</div>
                    <p className="mt-1 truncate text-xs text-slate-500">{channel.lastMessage || `${channel.memberCount} members`}</p>
                  </button>
                ))}</div>
              </ScrollArea>
            </aside>

            <section className={`${selected ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
              {selected ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-cyan-300" /><h3 className="font-semibold text-white">{selected.name}</h3></div><p className="mt-0.5 text-xs text-slate-500">{selected.description || `${selected.memberCount} approved members`}</p></div>
                    <div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedId(null)}>Channels</Button>{(["owner", "admin"] as string[]).includes(selected.role) ? <Button variant="ghost" size="icon" onClick={openManage} aria-label="Manage members" className="text-slate-300"><Settings2 className="h-4 w-4" /></Button> : null}</div>
                  </div>
                  <ScrollArea className="flex-1 px-4 py-3">
                    {messages.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><MessageSquare className="h-7 w-7 text-slate-600" /><p className="mt-2 text-sm text-slate-300">Start the team conversation</p><p className="text-xs text-slate-500">Everyone in this channel will receive new messages.</p></div> : null}
                    <div className="space-y-4">{messages.map((message) => {
                      const sender = message.sender?.full_name || message.sender?.username || "Team member"
                      return <div key={message.id} className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 text-[10px] font-semibold text-white">{initials(sender)}</div><div className="min-w-0"><div className="flex items-baseline gap-2"><p className="text-xs font-medium text-slate-200">{sender}</p><time className="text-[10px] text-slate-600">{new Date(message.created_at).toLocaleString()}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{message.content}</p>{message.attachments?.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-cyan-300"><FileText className="h-3.5 w-3.5" />{attachment.name}</a>)}</div></div>
                    })}</div><div ref={endRef} />
                  </ScrollArea>
                  <div className="border-t border-slate-800 p-3">
                    {attachments.length ? <div className="mb-2 flex flex-wrap gap-2">{attachments.map((attachment) => <span key={attachment.url} className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300">{attachment.name}<button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}><X className="h-3 w-3" /></button></span>)}</div> : null}
                    <div className="flex items-end gap-2"><input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf,audio/*" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} /><Button type="button" size="icon" variant="ghost" disabled={uploading} onClick={() => fileRef.current?.click()} aria-label="Attach file" className="shrink-0 text-slate-400">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}</Button><Textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} placeholder={`Message #${selected.name}`} className="min-h-[42px] resize-none border-slate-700 bg-slate-900 text-slate-100" /><Button size="icon" disabled={sending || (!composer.trim() && attachments.length === 0)} onClick={() => void sendMessage()} className="shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
                  </div>
                </>
              ) : <div className="flex flex-1 items-center justify-center text-center text-slate-500"><div><Users className="mx-auto h-8 w-8" /><p className="mt-2 text-sm">Select a channel to message your team.</p></div></div>}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editor !== null} onOpenChange={(value) => !value && setEditor(null)}>
        <DialogContent className="max-w-xl border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader><DialogTitle>{editor === "create" ? "Create team channel" : "Manage channel"}</DialogTitle><DialogDescription className="text-slate-400">Membership is manual. Only approved active workforce members can be selected.</DialogDescription></DialogHeader>
          <div className="space-y-3"><Input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name" className="border-slate-700 bg-slate-900" /><Textarea value={channelDescription} onChange={(event) => setChannelDescription(event.target.value)} placeholder="Description (optional)" className="border-slate-700 bg-slate-900" /></div>
          <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Approved members</p><ScrollArea className="h-64 rounded-xl border border-slate-800 bg-slate-900/50 p-2"><div className="space-y-1">{people.map((person) => {
            const member = currentMemberById.get(person.userId)
            const locked = member?.membershipRole === "owner"
            const checked = draftMemberIds.has(person.userId)
            return <label key={person.userId} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800"><input type="checkbox" checked={checked} disabled={locked} onChange={(event) => setDraftMemberIds((current) => { const next = new Set(current); if (event.target.checked) next.add(person.userId); else next.delete(person.userId); return next })} className="h-4 w-4 accent-purple-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-200">{person.name}</span><span className="block truncate text-xs text-slate-500">{person.role || person.email || "Approved staff"}</span></span>{locked ? <Badge className="bg-purple-500/15 text-purple-300">Owner</Badge> : null}</label>
          })}{people.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">No approved active workforce members are available.</p> : null}</div></ScrollArea></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={!channelName.trim()} onClick={() => void saveChannel()} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">{editor === "create" ? "Create channel" : "Save changes"}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  )
}
