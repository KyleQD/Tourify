"use client"

import { useEffect, useMemo, useState } from "react"
import { Briefcase, Building2, Calendar, Loader2, MapPin, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { JobPostingTemplate } from "@/types/admin-onboarding"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

function employmentLabel(value: string) {
  return value.replace(/_/g, " ")
}

function postedLabel(iso: string) {
  return formatSafeDate(iso)
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPostingTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [didFail, setDidFail] = useState(false)
  const [titleQuery, setTitleQuery] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      setIsLoading(true)
      setDidFail(false)
      try {
        const res = await fetch("/api/job-board", { credentials: "include" })
        const json = await res.json()
        if (!alive) return
        if (json.success && Array.isArray(json.data)) setJobs(json.data)
        else setDidFail(true)
      } catch {
        if (alive) setDidFail(true)
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = titleQuery.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) => j.title.toLowerCase().includes(q))
  }, [jobs, titleQuery])

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800/90 to-indigo-950/50 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Job Postings</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Published roles on the job board. Search by title to narrow the list.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="Filter by title..."
              className="border-slate-700 bg-slate-800/80 pl-9 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/40"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="text-sm">Loading postings…</span>
        </div>
      ) : didFail && jobs.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-6 text-center">
          <Briefcase className="h-10 w-10 text-slate-600" />
          <p className="text-slate-400">Could not load job postings. Try again later.</p>
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-6 text-center">
          <Briefcase className="h-10 w-10 text-slate-600" />
          <p className="font-medium text-slate-300">No postings match</p>
          <p className="max-w-md text-sm text-slate-400">
            {jobs.length === 0
              ? "There are no published job postings yet."
              : "Try a different search term."}
          </p>
          {jobs.length > 0 && titleQuery.trim() ? (
            <Button
              type="button"
              variant="ghost"
              className="text-purple-400 hover:bg-slate-800 hover:text-purple-300"
              onClick={() => setTitleQuery("")}
            >
              Clear search
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((job) => (
            <li key={job.id}>
              <Card className="border-slate-700 bg-slate-800/60 shadow-md backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-snug text-white">{job.title}</CardTitle>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border border-slate-600 bg-slate-700/80 text-xs capitalize text-slate-200"
                    >
                      {employmentLabel(job.employment_type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{job.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-700/80 pt-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Posted {postedLabel(job.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
