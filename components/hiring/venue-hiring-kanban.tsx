"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { JOB_APPLICATION_STATUSES, isJobApplicationStatus } from "@/lib/hiring/states"
import { cn } from "@/lib/utils"

const COLUMN_STATUSES = JOB_APPLICATION_STATUSES.filter((s) => s !== "withdrawn")

interface VenueHiringKanbanProps {
  venueId: string
  venueName?: string | null
  showHeader?: boolean
  className?: string
}

export function VenueHiringKanban({
  venueId,
  venueName,
  showHeader = true,
  className,
}: VenueHiringKanbanProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  // VEN-139 — candidate drawer (snapshot/answers/timeline)
  const [detailApp, setDetailApp] = useState<any | null>(null)
  const [auditEvents, setAuditEvents] = useState<any[]>([])

  const load = useCallback(async () => {
    if (!venueId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/venue/hiring/applications?venue_id=${encodeURIComponent(venueId)}`, {
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load")
      setApplications(json.data || [])
    } catch (e) {
      toast({
        title: "Unable to load applications",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [venueId, toast])

  useEffect(() => {
    if (venueId) void load()
  }, [venueId, load])

  const byStatus = useMemo(() => {
    const map = new Map<string, any[]>()
    COLUMN_STATUSES.forEach((s) => map.set(s, []))
    for (const row of applications) {
      const st = row.status as string
      if (!map.has(st)) continue
      map.get(st)!.push(row)
    }
    return map
  }, [applications])

  async function moveApplication(applicationId: string, status: string) {
    if (!isJobApplicationStatus(status)) return
    try {
      const res = await fetch(`/api/venue/hiring/applications/${applicationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        const msg = json.error || json.eligibility?.blocking_reasons?.join?.(", ") || "Update failed"
        throw new Error(typeof msg === "string" ? msg : "Update failed")
      }
      toast({ title: "Status updated" })
      await load()
    } catch (e) {
      toast({
        title: "Could not move card",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    }
  }

  if (!venueId) {
    return (
      <div className="p-8 text-center text-slate-300">
        <p>
          Select a venue or open this board from an event link (includes{" "}
          <code className="text-slate-500">venue_id</code>).
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/venue/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6 text-slate-100", className)}>
      {showHeader ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/venue/dashboard/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Venue jobs
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Hiring board</h1>
          <Badge variant="outline" className="border-slate-600">
            {venueName || venueId}
          </Badge>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {COLUMN_STATUSES.map((status) => (
            <Card key={status} className="min-w-[220px] border-slate-800 bg-slate-900/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-slate-200">{status}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(byStatus.get(status) || []).map((app) => (
                  <div key={app.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm">
                    <p className="font-medium text-white">
                      {app.applicant_name || app.contact_email || "Applicant"}
                    </p>
                    <p className="line-clamp-2 text-xs text-slate-500">{app.job_posting?.title || "Role"}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mb-2 h-7 w-full justify-start px-2 text-[10px] uppercase tracking-wide text-slate-400"
                      onClick={async () => {
                        setDetailApp(app)
                        setAuditEvents([])
                        try {
                          const res = await fetch(
                            `/api/venue/hiring/audit?application_id=${encodeURIComponent(app.id)}&venue_id=${encodeURIComponent(venueId)}`,
                            { credentials: "include", cache: "no-store" },
                          )
                          const json = await res.json()
                          if (res.ok && json.success) setAuditEvents(json.data ?? [])
                        } catch {
                          // Timeline is supplementary.
                        }
                      }}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Details
                    </Button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMN_STATUSES.filter((s) => s !== status).map((target) => (
                        <Button
                          key={target}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 border-slate-700 px-2 text-[10px] uppercase tracking-wide",
                            target === "rejected" && "text-red-300",
                          )}
                          onClick={() => void moveApplication(app.id, target)}
                        >
                          {target.slice(0, 4)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {(byStatus.get(status) || []).length === 0 ? (
                  <p className="text-xs text-slate-600">Empty</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VEN-139 — candidate detail drawer */}
      <Dialog open={Boolean(detailApp)} onOpenChange={(open) => !open && setDetailApp(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl">{detailApp?.applicant_name || "Candidate"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {detailApp?.applicant_email}
              {detailApp?.applicant_phone ? ` · ${detailApp.applicant_phone}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailApp ? (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Applied</p>
                  <p>{detailApp.applied_at ? new Date(detailApp.applied_at).toLocaleDateString() : "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="capitalize">{detailApp.status}</p>
                </div>
                {detailApp.interview_date ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Interview</p>
                    <p>{new Date(detailApp.interview_date).toLocaleString()}</p>
                  </div>
                ) : null}
                {detailApp.offer_date ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Offer</p>
                    <p>{new Date(detailApp.offer_date).toLocaleString()}</p>
                  </div>
                ) : null}
              </div>

              {typeof detailApp.profile_snapshot === "object" &&
                detailApp.profile_snapshot !== null &&
                Object.keys(detailApp.profile_snapshot as object).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Profile snapshot
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                      {JSON.stringify(detailApp.profile_snapshot, null, 2)}
                    </pre>
                  </div>
                )}

              {typeof detailApp.form_responses === "object" &&
                detailApp.form_responses !== null &&
                Object.keys(detailApp.form_responses as object).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Answers</p>
                    <div className="space-y-2">
                      {Object.entries(detailApp.form_responses as Record<string, unknown>).map(([q, a]) => (
                        <div key={q} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">{q}</p>
                          <p className="text-slate-200">{String(a)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {(detailApp.reviewer_notes || detailApp.decision_note) && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-slate-300">
                    {detailApp.reviewer_notes || detailApp.decision_note}
                  </p>
                </div>
              )}

              {auditEvents.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                  <ol className="space-y-1.5">
                    {auditEvents.map((event: any) => (
                      <li key={event.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        <span className="capitalize">{event.to_status || event.action}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
