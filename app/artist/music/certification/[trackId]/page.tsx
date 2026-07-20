"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FileCheck2, Loader2, ShieldCheck, Upload } from "lucide-react"

type CertificationCase = {
  id: string; status: string; requested_level: number; disclosures: Record<string, unknown>
  contributor_confirmation: boolean; created_at: string; submitted_at?: string | null
}
type Event = { id: string; event_type: string; from_status?: string | null; to_status?: string | null; created_at: string }

export default function MusicCertificationPage() {
  const { trackId } = useParams<{ trackId: string }>()
  const router = useRouter()
  const [certificationCase, setCertificationCase] = useState<CertificationCase | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [contributorConfirmation, setContributorConfirmation] = useState(false)
  const [disclosure, setDisclosure] = useState("")
  const [evidenceType, setEvidenceType] = useState("source_project")
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/artist/music/certification?trackId=${encodeURIComponent(trackId)}`, { credentials: "include", cache: "no-store" })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to load certification")
      setEnabled(body.enabled === true)
      const current = body.data?.[0] || null
      setCertificationCase(current)
      setContributorConfirmation(current?.contributor_confirmation || false)
      setDisclosure(String(current?.disclosures?.artist_statement || ""))
      if (current) {
        const eventsResponse = await fetch(`/api/artist/music/certification/${current.id}/events`, { credentials: "include", cache: "no-store" })
        if (eventsResponse.ok) setEvents((await eventsResponse.json()).data || [])
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load certification") }
    finally { setLoading(false) }
  }, [trackId])

  useEffect(() => { void load() }, [load])

  async function createCase() {
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/certification", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: trackId, certification_type: "human_created", requested_level: 1, idempotency_key: crypto.randomUUID() }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to create certification case")
      toast.success("Certification workspace created")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to create case") }
    finally { setBusy(false) }
  }

  async function uploadEvidence() {
    if (!certificationCase || !file) return
    setBusy(true)
    try {
      const prepareResponse = await fetch(`/api/artist/music/certification/${certificationCase.id}/evidence`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", file_name: file.name, content_type: file.type || "application/octet-stream" }),
      })
      const prepared = await prepareResponse.json()
      if (!prepareResponse.ok) throw new Error(prepared?.error?.message || "Unable to prepare evidence")
      const { error: uploadError } = await supabase.storage.from(prepared.data.bucket).uploadToSignedUrl(prepared.data.path, prepared.data.token, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const registerResponse = await fetch(`/api/artist/music/certification/${certificationCase.id}/evidence`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", path: prepared.data.path, evidence_type: evidenceType, original_filename: file.name, content_type: file.type, byte_size: file.size }),
      })
      const registered = await registerResponse.json()
      if (!registerResponse.ok) throw new Error(registered?.error?.message || "Unable to register evidence")
      setFile(null)
      toast.success("Evidence added")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Evidence upload failed") }
    finally { setBusy(false) }
  }

  async function transition(status: "submitted" | "withdrawn") {
    if (!certificationCase) return
    setBusy(true)
    try {
      const response = await fetch(`/api/artist/music/certification/${certificationCase.id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, contributor_confirmation: contributorConfirmation, disclosures: { artist_statement: disclosure }, request_id: crypto.randomUUID() }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to update certification")
      toast.success(status === "submitted" ? "Certification submitted" : "Certification withdrawn")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update certification") }
    finally { setBusy(false) }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
    <Button variant="ghost" onClick={() => router.push("/artist/music")}><ArrowLeft className="mr-2 h-4 w-4" />Music library</Button>
    <div><h1 className="flex items-center gap-2 text-3xl font-bold"><ShieldCheck className="h-8 w-8" />Music certification</h1><p className="text-muted-foreground">Document source evidence and request a Human-Created review. This does not replace copyright registration.</p></div>
    {!enabled ? <Card><CardHeader><CardTitle>Pilot not open</CardTitle><CardDescription>Your music is unaffected. Certification requests remain disabled until release gates are approved.</CardDescription></CardHeader></Card> : !certificationCase ? <Card><CardHeader><CardTitle>Start an optional review</CardTitle><CardDescription>Your current declaration must be complete and eligible.</CardDescription></CardHeader><CardContent><Button onClick={createCase} disabled={busy}>Create certification workspace</Button></CardContent></Card> : <>
      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Case overview</CardTitle><Badge>{certificationCase.status.replaceAll("_", " ")}</Badge></div><CardDescription>Requested level {certificationCase.requested_level}</CardDescription></CardHeader></Card>
      {["draft", "needs_information"].includes(certificationCase.status) && <Card><CardHeader><CardTitle>Evidence and disclosures</CardTitle><CardDescription>Evidence is private and becomes locked when submitted.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="artist-statement">Artist statement</Label><Textarea id="artist-statement" value={disclosure} onChange={(event) => setDisclosure(event.target.value)} placeholder="Describe the creative process and source materials." /></div>
        <label className="flex items-start gap-2"><Checkbox checked={contributorConfirmation} onCheckedChange={(checked) => setContributorConfirmation(checked === true)} /><span className="text-sm">I confirm contributor disclosures and permissions are complete.</span></label>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} aria-label="Evidence type" /><Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} aria-label="Evidence file" /><Button onClick={uploadEvidence} disabled={!file || busy}><Upload className="mr-2 h-4 w-4" />Add</Button></div>
        <div className="flex gap-3"><Button onClick={() => transition("submitted")} disabled={busy || !contributorConfirmation}><FileCheck2 className="mr-2 h-4 w-4" />Review and submit</Button><Button variant="outline" onClick={() => transition("withdrawn")} disabled={busy}>Withdraw</Button></div>
      </CardContent></Card>}
      {["submitted", "in_review"].includes(certificationCase.status) && <Card><CardHeader><CardTitle>Under review</CardTitle><CardDescription>Evidence is locked. A reviewer may request more information.</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => transition("withdrawn")} disabled={busy}>Withdraw request</Button></CardContent></Card>}
      {certificationCase.status === "approved" && <Card className="border-emerald-500/40"><CardHeader><CardTitle>Human-created certified</CardTitle><CardDescription>An active certificate is now eligible for the public badge.</CardDescription></CardHeader></Card>}
      {certificationCase.status === "needs_information" && <Card className="border-amber-500/40"><CardHeader><CardTitle>More information needed</CardTitle><CardDescription>Add or revise evidence, then resubmit.</CardDescription></CardHeader></Card>}
      <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent className="space-y-3">{events.length ? events.map((event) => <div key={event.id} className="border-l-2 pl-4"><p className="font-medium">{event.event_type.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No events yet.</p>}</CardContent></Card>
    </>}
  </div>
}
