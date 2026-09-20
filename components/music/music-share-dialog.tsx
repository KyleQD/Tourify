"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, MessageCircle, Music2, Newspaper, Search, Send, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ShareTarget = { id: string; label: string; detail?: string }

interface MusicShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  track: { id: string; title: string } | null
  onSharePost: (track: { id: string; title: string }, note?: string) => Promise<void>
}

export function MusicShareDialog({ open, onOpenChange, track, onSharePost }: MusicShareDialogProps) {
  const [mode, setMode] = useState<"post" | "dm" | "group">("post")
  const [note, setNote] = useState("")
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ShareTarget[]>([])
  const [groups, setGroups] = useState<ShareTarget[]>([])
  const [selected, setSelected] = useState<ShareTarget | null>(null)
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode("post")
    setNote("")
    setQuery("")
    setSelected(null)
    setLoadingTargets(true)
    fetch("/api/groups/threads?limit=50", { credentials: "include" })
      .then((response) => response.ok ? response.json() : { threads: [] })
      .then((groupBody) => setGroups((groupBody.threads || []).map((group: { id: string; name: string; description?: string }) => ({ id: group.id, label: group.name, detail: group.description }))))
      .finally(() => setLoadingTargets(false))
  }, [open])

  useEffect(() => {
    if (!open || mode !== "dm" || query.trim().length < 1) {
      if (mode === "dm") setUsers([])
      return
    }
    fetch(`/api/messages/user-search?q=${encodeURIComponent(query.trim())}&limit=20`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : { users: [] })
      .then((userBody) => setUsers((userBody.users || []).map((user: { id: string; username?: string; full_name?: string }) => ({ id: user.id, label: user.full_name || user.username || "User", detail: user.username ? `@${user.username}` : undefined }))))
  }, [mode, open, query])

  const targets = (mode === "dm" ? users : groups).filter((target) => {
    const needle = query.trim().toLowerCase()
    return !needle || `${target.label} ${target.detail || ""}`.toLowerCase().includes(needle)
  })

  async function submit() {
    if (!track) return
    if (mode === "post") {
      setSending(true)
      try {
        await onSharePost(track, note)
        onOpenChange(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to share track")
      } finally {
        setSending(false)
      }
      return
    }
    if (!selected) {
      toast.error(`Select a ${mode === "dm" ? "person" : "group"} first`)
      return
    }
    setSending(true)
    try {
      const response = await fetch("/api/music/share-message", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId: track.id, note: note.trim() || undefined, ...(mode === "dm" ? { recipientId: selected.id } : { threadId: selected.id }) }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to send track")
      toast.success(mode === "dm" ? "Track sent" : "Track shared with group")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send track")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden border-white/15 bg-slate-950/95 p-0 text-white shadow-2xl shadow-violet-950/30 backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
        <div className="p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">Share music</DialogTitle>
            <DialogDescription className="text-slate-400">Choose where you want to send this track.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600/50 to-fuchsia-600/40">
              <Music2 className="h-6 w-6 text-white/80" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{track?.title || "Track"}</p>
              <p className="text-xs text-slate-400">Tourify music</p>
            </div>
            <span className="ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Music</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Share destination">
            {([['post', Newspaper, 'Post'], ['dm', MessageCircle, 'Message'], ['group', Users, 'Group']] as const).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => { setMode(value); setSelected(null); setQuery("") }}
                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition ${mode === value ? "border-violet-400/50 bg-violet-500/15 text-violet-100 shadow-lg shadow-violet-950/20" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between"><label htmlFor="music-share-note" className="text-sm font-medium text-slate-200">{mode === "post" ? "Add a caption" : "Add a message"}</label><span className="text-xs text-slate-500">{note.length}/1000</span></div>
            <Textarea id="music-share-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === "post" ? "Tell your audience why they should listen…" : "Add a personal note…"} maxLength={1000} className="min-h-24 resize-none border-white/10 bg-black/20 text-white placeholder:text-slate-600 focus-visible:ring-violet-500" />
          </div>
        {mode !== "post" && (
          <div className="mt-5 space-y-2">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${mode === "dm" ? "people" : "groups"}…`} className="h-11 border-white/10 bg-black/20 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-violet-500" /></div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-1.5">
              {loadingTargets ? <div className="flex items-center justify-center gap-2 p-5 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading {mode === "dm" ? "people" : "groups"}…</div> : targets.length === 0 ? <p className="p-5 text-center text-sm text-slate-400">No matches found</p> : targets.map((target) => <button key={target.id} type="button" onClick={() => setSelected(target)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.07] ${selected?.id === target.id ? "bg-violet-500/15 ring-1 ring-violet-400/50" : ""}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">{selected?.id === target.id ? <Check className="h-4 w-4" /> : mode === "dm" ? <MessageCircle className="h-4 w-4" /> : <Users className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100">{target.label}</span>{target.detail && <span className="block truncate text-xs text-slate-400">{target.detail}</span>}</span></button>)}
            </div>
          </div>
        )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="border-white/15 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={sending || (mode !== "post" && !selected)} onClick={submit} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-950/20 hover:from-violet-500 hover:to-fuchsia-500"><>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}</>{mode === "post" ? "Share to post" : mode === "dm" ? "Send message" : "Share with group"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
