"use client"

import { useEffect, useState } from "react"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface EligibleWorker { user_id: string; name: string; role: string }

export function EventWorkerBriefPublisher({ eventId }: { eventId: string }) {
  const [workers, setWorkers] = useState<EligibleWorker[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle] = useState("Event worker brief")
  const [fields, setFields] = useState({ call_time: "", end_time: "", timezone: "", reporting_location: "", directions: "", supervisor_contact: "", attire_ppe_credentials: "", breaks: "", hazards: "", emergency_procedure: "", emergency_contact: "", notes: "" })
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/work-mode`, { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => { const rows = payload.eligible_workers || []; setWorkers(rows); setSelected(rows.map((row: EligibleWorker) => row.user_id)) })
      .catch(() => setMessage("Assigned workers could not be loaded."))
  }, [eventId])

  async function publish() {
    setSubmitting(true); setMessage(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/work-mode`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publication_type: "event_publish", title, payload: fields, requires_acknowledgement: requiresAcknowledgement, audience_mode: "selected_workers", worker_user_ids: selected }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "Event brief could not be published.")
      setMessage(`Published version ${payload.publication?.version || 1} to ${payload.audience_count} worker${payload.audience_count === 1 ? "" : "s"}.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Event brief could not be published.") } finally { setSubmitting(false) }
  }

  const setField = (key: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [key]: value }))
  return <Card className="border-slate-700 bg-slate-900/60">
    <CardHeader><CardTitle>Worker event brief</CardTitle><CardDescription>Share structured, worker-visible arrival, safety, and contact information. Each publish creates a new version.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <label className="block text-sm text-slate-300">Title<Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="grid gap-3 md:grid-cols-2">{([
        ["call_time", "Call time"], ["end_time", "End time"], ["timezone", "Timezone"], ["reporting_location", "Reporting location"], ["directions", "Directions"], ["supervisor_contact", "Supervisor contact"], ["attire_ppe_credentials", "Attire / PPE / credentials"], ["breaks", "Breaks"], ["hazards", "Known hazards"], ["emergency_procedure", "Emergency procedure"], ["emergency_contact", "Emergency contact"],
      ] as Array<[keyof typeof fields, string]>).map(([key, label]) => <label key={key} className="block text-sm text-slate-300">{label}<Input className="mt-1" value={fields[key]} onChange={(event) => setField(key, event.target.value)} placeholder="Not shared yet" /></label>)}</div>
      <label className="block text-sm text-slate-300">Notes<Textarea className="mt-1" value={fields.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium text-slate-200">Worker audience</legend><div className="grid gap-2 sm:grid-cols-2">{workers.map((worker) => <label key={worker.user_id} className="flex min-h-11 items-center gap-3 rounded-md border border-slate-700 p-2 text-sm"><Checkbox checked={selected.includes(worker.user_id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, worker.user_id])] : current.filter((id) => id !== worker.user_id))} /><span>{worker.name}<span className="block text-xs text-slate-400">{worker.role}</span></span></label>)}</div>{workers.length === 0 ? <p className="text-sm text-slate-400">No confirmed or active workers are assigned to this event.</p> : null}</fieldset>
      <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={requiresAcknowledgement} onCheckedChange={(checked) => setRequiresAcknowledgement(checked === true)} />Require every selected worker to acknowledge this version</label>
      {message ? <p className="text-sm text-slate-300" role="status">{message}</p> : null}
      <Button onClick={() => void publish()} disabled={submitting || selected.length === 0 || !title.trim()}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Publish to workers</Button>
    </CardContent>
  </Card>
}

