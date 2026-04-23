"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, RadioTower, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TeamCommunicationRow {
  id: string
  subject: string
  content: string
  message_type: string
  priority: string
  sent_at: string
  sender_id: string | null
}

interface VenueTeamCommunicationsPanelProps {
  venueId: string
}

export function VenueTeamCommunicationsPanel({ venueId }: VenueTeamCommunicationsPanelProps) {
  const { toast } = useToast()
  const [rows, setRows] = useState<TeamCommunicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState("")

  const loadRows = useCallback(async () => {
    if (!venueId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("team_communications")
        .select("id, subject, content, message_type, priority, sent_at, sender_id")
        .eq("venue_id", venueId)
        .order("sent_at", { ascending: false })
        .limit(80)

      if (error) throw error
      setRows((data || []) as TeamCommunicationRow[])
    } catch (e) {
      console.error(e)
      toast({
        title: "Could not load messages",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [venueId, toast])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    if (!venueId) return
    const channel = supabase
      .channel(`venue-team-comms-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_communications",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          const row = payload.new as TeamCommunicationRow
          setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_communications",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          const row = payload.new as TeamCommunicationRow
          setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [venueId])

  async function handleSend() {
    const text = draft.trim()
    if (!text) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      toast({ title: "Sign in required", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const subject = text.length > 120 ? `${text.slice(0, 117)}…` : text
      const { error } = await supabase.from("team_communications").insert({
        venue_id: venueId,
        sender_id: auth.user.id,
        subject,
        content: text,
        message_type: "general",
        priority: "normal",
        recipients: [],
        requires_acknowledgment: false,
      })
      if (error) throw error
      setDraft("")
      toast({ title: "Message sent" })
      await loadRows()
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <RadioTower className="h-5 w-5" />
          Venue team messages
        </CardTitle>
        <CardDescription className="text-slate-400">
          Live feed from <code className="text-xs">team_communications</code> for this venue (RLS: authenticated).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write an update for your team…"
            className="min-h-[88px] bg-slate-900/60 border-slate-600 text-slate-100"
          />
          <Button
            type="button"
            className="self-end shrink-0"
            disabled={sending || !draft.trim()}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No messages yet. Send the first update above.</p>
        ) : (
          <ScrollArea className="h-[420px] pr-3">
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400">
                      {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
                    </span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px] border-slate-600">
                        {r.message_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-slate-600">
                        {r.priority}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-200">{r.subject}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap mt-1">{r.content}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
