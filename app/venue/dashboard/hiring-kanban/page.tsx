"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCurrentVenue } from "@/hooks/use-venue"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { JOB_APPLICATION_STATUSES, isJobApplicationStatus } from "@/lib/hiring/states"
import { cn } from "@/lib/utils"

const COLUMN_STATUSES = JOB_APPLICATION_STATUSES.filter((s) => s !== "withdrawn")

function VenueHiringKanbanPageContent() {
  const searchParams = useSearchParams()
  const { venue, loading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  const queryVenueId = searchParams.get("venue_id")?.trim() || ""
  const venueId = venue?.id ?? ""
  const resolvedVenueId = venueId || queryVenueId
  const [loading, setLoading] = useState(false)
  const [applications, setApplications] = useState<any[]>([])

  const load = useCallback(async () => {
    if (!resolvedVenueId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/applications?venue_id=${encodeURIComponent(resolvedVenueId)}`, {
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
  }, [resolvedVenueId, toast])

  useEffect(() => {
    if (venueLoading) return
    if (resolvedVenueId) void load()
  }, [venueLoading, resolvedVenueId, load])

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
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
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

  if (venueLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  if (!resolvedVenueId) {
    return (
      <div className="p-8 text-center text-slate-300">
        <p>Select a venue or open this board from an event link (includes <code className="text-slate-500">venue_id</code>).</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/venue/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/venue/dashboard/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Venue jobs
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Hiring board</h1>
          <Badge variant="outline" className="border-slate-600">
            {venue?.name || resolvedVenueId}
          </Badge>
        </div>

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
                      <p className="text-xs text-slate-500 line-clamp-2">{app.job_posting?.title || "Role"}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {COLUMN_STATUSES.filter((s) => s !== status).map((target) => (
                          <Button
                            key={target}
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-7 border-slate-700 px-2 text-[10px] uppercase tracking-wide",
                              target === "rejected" && "text-red-300"
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
      </div>
    </div>
  )
}

export default function VenueHiringKanbanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <VenueHiringKanbanPageContent />
    </Suspense>
  )
}
