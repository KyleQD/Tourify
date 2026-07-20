"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RefreshCw } from "lucide-react"

type QueueCase = { id: string; status: string; requested_level: number; submitted_at?: string; artist_music?: { title?: string } | Array<{ title?: string }>; music_certification_evidence?: Array<{ id: string; evidence_type: string; original_filename?: string; status: string }> }

export function MusicCertificationReviewPanel() {
  const [cases, setCases] = useState<QueueCase[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/content/music/certifications", { credentials: "include", cache: "no-store" })
    if (response.ok) setCases((await response.json()).data || [])
    else if (response.status !== 404 && response.status !== 403) toast.error("Unable to load certification queue")
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  async function decide(caseId: string, action: string) {
    const response = await fetch("/api/admin/content/music/certifications", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, case_id: caseId, artist_message: notes[caseId] || null, reason_codes: [], findings: {}, request_id: crypto.randomUUID() }),
    })
    const body = await response.json()
    if (!response.ok) return toast.error(body?.error?.message || "Review action failed")
    toast.success("Review recorded")
    await load()
  }

  return <Card className="border-slate-700 bg-slate-900/60"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-white">Certification review queue</CardTitle><CardDescription>Restricted to explicit certification reviewers and platform moderators.</CardDescription></div><Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></CardHeader><CardContent className="space-y-4">
    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : !cases.length ? <p className="text-sm text-slate-400">No certification cases in the active queue, or review is disabled.</p> : cases.map((item) => {
      const track = Array.isArray(item.artist_music) ? item.artist_music[0] : item.artist_music
      return <div key={item.id} className="space-y-3 rounded-md border border-slate-700 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-white">{track?.title || "Untitled track"}</p><p className="text-xs text-slate-400">Level {item.requested_level} · {item.music_certification_evidence?.length || 0} evidence items</p></div><Badge>{item.status.replaceAll("_", " ")}</Badge></div><Textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Artist-visible decision message" className="border-slate-700 bg-slate-800" /><div className="flex flex-wrap gap-2">{item.status === "submitted" && <Button size="sm" onClick={() => decide(item.id, "start_review")}>Start review</Button>}{item.status === "in_review" && <><Button size="sm" variant="outline" onClick={() => decide(item.id, "needs_information")}>Needs information</Button><Button size="sm" onClick={() => decide(item.id, "approve")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => decide(item.id, "reject")}>Reject</Button></>}</div></div>
    })}
  </CardContent></Card>
}
