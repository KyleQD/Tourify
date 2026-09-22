"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface ExportJob { id: string; exportType: string; schemaVersion: string | null; status: string; requestedBy: string | null; fileUrl: string | null; recordCount: number | null; createdAt: string; completedAt: string | null; errorMessage: string | null }
interface ExportJobsResponse { jobs: ExportJob[]; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  running: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-green-500/20 text-green-300 border-green-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
}

/**
 * w17-export-jobs
 * EXP-601 / EXP-602 — Authorized, versioned, auditable async exports.
 */
export function ExportJobsPanel() {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const res = await fetch("/api/admin/exports/jobs?limit=20")
      const json = (await res.json()) as ExportJobsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setJobs(json.jobs ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading export jobs…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Export Jobs</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{jobs.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No export jobs.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 capitalize">{job.exportType}</p>
                  {job.schemaVersion && <p className="text-[10px] text-slate-500">v{job.schemaVersion}</p>}
                  {job.recordCount !== null && <p className="text-[10px] text-slate-500">{job.recordCount.toLocaleString()} records</p>}
                  {job.errorMessage && <p className="text-[10px] text-red-400 truncate">{job.errorMessage}</p>}
                </div>
                {job.fileUrl && job.status === "completed" && (
                  <a href={job.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline shrink-0">Download</a>
                )}
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[job.status] ?? STATUS_BADGE.pending}`}>{job.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
