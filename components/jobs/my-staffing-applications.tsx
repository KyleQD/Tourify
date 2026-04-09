"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase } from "lucide-react"

interface StaffingApplicationRow {
  id: string
  status: string
  applied_at: string
  job_posting_id: string
  job_posting?: {
    id?: string
    title?: string
    department?: string
    position?: string
    location?: string
    employment_type?: string
  } | null
}

export function MyStaffingApplications() {
  const [rows, setRows] = useState<StaffingApplicationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/job-applications?limit=20")
        const json = await res.json()
        if (!cancelled && json.success) setRows(json.data || [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card className="bg-slate-800/40 border-slate-700/60 mb-6">
        <CardContent className="flex items-center gap-2 py-6 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your staffing applications…
        </CardContent>
      </Card>
    )
  }

  if (!rows.length) return null

  return (
    <Card className="bg-slate-800/40 border-slate-700/60 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-cyan-400" />
          Your staffing applications
        </CardTitle>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href="/jobs?tab=staffing" className="text-cyan-300 hover:underline">
            Open staffing board
          </Link>
          <Link
            href="/admin/dashboard/tours?tab=overview&workflowFilter=task&workflowDialog=1"
            className="text-purple-300 hover:underline"
          >
            Open workflow timeline
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const jp = r.job_posting
          const title = jp?.title || "Role"
          const sub = [jp?.department, jp?.position].filter(Boolean).join(" · ")
          return (
            <div
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2"
            >
              <div>
                <p className="text-white font-medium">{title}</p>
                {sub ? <p className="text-sm text-slate-400">{sub}</p> : null}
                <p className="text-xs text-slate-500 mt-1">
                  Applied {new Date(r.applied_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="capitalize bg-slate-700 text-slate-100">
                  {r.status}
                </Badge>
                <Link
                  href={`/jobs/${r.job_posting_id}`}
                  className="text-sm text-cyan-400 hover:underline"
                >
                  View posting
                </Link>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
