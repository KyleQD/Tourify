"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Briefcase, Loader2, RefreshCw, XCircle } from "lucide-react"

import { applicationStatusLabel } from "@/lib/general/action-center"
import { canApplicantWithdraw } from "@/lib/general/application-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ArtistApplication {
  id: string
  status: string | null
  applied_at: string | null
  job_id: string
  job: {
    id: string
    title: string
  } | null
}

interface StaffingApplication {
  id: string
  status: string | null
  applied_at: string | null
  job_posting_id: string
  job_posting: {
    id: string
    title: string
  } | null
}

interface ApplicationsPayload {
  artist_applications: ArtistApplication[]
  venue_applications: StaffingApplication[]
  sources: {
    artist: "ready" | "unavailable"
    staffing: "ready" | "unavailable"
  }
  partial: boolean
}

function AppliedDate({ value }: { value: string | null }) {
  const date = value ? new Date(value) : null
  return (
    <span className="text-slate-400">
      Applied {date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "date unavailable"}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized = applicationStatusLabel(status)
  const className =
    normalized === "accepted"
      ? "border-emerald-500/30 text-emerald-300"
      : normalized === "declined" || normalized === "withdrawn"
        ? "border-slate-500/30 text-slate-300"
        : normalized === "interview" || normalized === "in review"
          ? "border-cyan-500/30 text-cyan-300"
          : "border-amber-500/30 text-amber-300"
  return (
    <Badge variant="outline" className={className}>
      {normalized}
    </Badge>
  )
}

export default function MyApplicationsPage() {
  const [payload, setPayload] = useState<ApplicationsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/me/applications", {
        credentials: "include",
        cache: "no-store",
      })
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: ApplicationsPayload; error?: string }
        | null
      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.error || "Applications could not be loaded.")
      }
      setPayload(body.data)
    } catch (requestError) {
      setPayload(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Applications could not be loaded.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const withdraw = async (
    source: "artist" | "staffing",
    applicationId: string,
    title: string,
  ) => {
    if (!window.confirm(`Withdraw your application for “${title}”? This cannot be undone.`)) {
      return
    }

    setWithdrawingId(applicationId)
    setActionError(null)
    try {
      const response = await fetch("/api/me/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          application_id: applicationId,
          action: "withdraw",
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Application could not be withdrawn.")
      }
      setPayload((current) => {
        if (!current) return current
        return source === "artist"
          ? {
              ...current,
              artist_applications: current.artist_applications.map((row) =>
                row.id === applicationId ? { ...row, status: "withdrawn" } : row,
              ),
            }
          : {
              ...current,
              venue_applications: current.venue_applications.map((row) =>
                row.id === applicationId ? { ...row, status: "withdrawn" } : row,
              ),
            }
      })
    } catch (withdrawError) {
      setActionError(
        withdrawError instanceof Error
          ? withdrawError.message
          : "Application could not be withdrawn.",
      )
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Jobs
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-purple-400" aria-hidden="true" />
              <h1 className="text-2xl font-semibold">My applications</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              One status view for artist and employer staffing applications.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </header>

        {loading && !payload ? (
          <div className="flex justify-center py-16 text-slate-400" aria-busy="true">
            <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading applications" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-900/50 bg-rose-950/30" role="alert">
            <CardContent className="flex gap-3 p-4 text-rose-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Applications unavailable</p>
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {payload?.partial ? (
          <p className="text-sm text-amber-300" role="status">
            One application source is temporarily unavailable. Available results are still shown.
          </p>
        ) : null}

        {actionError ? (
          <p className="text-sm text-rose-300" role="alert">
            {actionError}
          </p>
        ) : null}

        {payload ? (
          <div className="space-y-8">
            <section aria-labelledby="artist-applications-heading">
              <h2 id="artist-applications-heading" className="mb-3 text-lg font-medium">
                Artist opportunities
              </h2>
              {payload.sources.artist === "unavailable" ? (
                <p className="text-sm text-amber-300">Artist applications are unavailable.</p>
              ) : payload.artist_applications.length === 0 ? (
                <p className="text-sm text-slate-500">No artist applications yet.</p>
              ) : (
                <div className="space-y-3">
                  {payload.artist_applications.map((row) => (
                    <Card key={row.id} className="border-slate-800 bg-slate-900/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-white">
                          {row.job?.title || "Job no longer available"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status={row.status} />
                        <AppliedDate value={row.applied_at} />
                        {row.job?.id ? (
                          <Button variant="link" className="h-auto p-0 text-purple-400" asChild>
                            <Link href={`/jobs/${row.job.id}?source=artist`}>View job</Link>
                          </Button>
                        ) : null}
                        {canApplicantWithdraw(row.status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-rose-300 hover:text-rose-200"
                            disabled={withdrawingId === row.id}
                            onClick={() =>
                              void withdraw(
                                "artist",
                                row.id,
                                row.job?.title || "this opportunity",
                              )
                            }
                          >
                            {withdrawingId === row.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            Withdraw
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="staffing-applications-heading">
              <h2 id="staffing-applications-heading" className="mb-3 text-lg font-medium">
                Employer staffing
              </h2>
              {payload.sources.staffing === "unavailable" ? (
                <p className="text-sm text-amber-300">Staffing applications are unavailable.</p>
              ) : payload.venue_applications.length === 0 ? (
                <p className="text-sm text-slate-500">No staffing applications yet.</p>
              ) : (
                <div className="space-y-3">
                  {payload.venue_applications.map((row) => (
                    <Card key={row.id} className="border-slate-800 bg-slate-900/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-white">
                          {row.job_posting?.title || "Role no longer available"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status={row.status} />
                        <AppliedDate value={row.applied_at} />
                        {row.job_posting?.id ? (
                          <Button variant="link" className="h-auto p-0 text-purple-400" asChild>
                            <Link href={`/jobs/${row.job_posting.id}?source=venue`}>
                              View posting
                            </Link>
                          </Button>
                        ) : null}
                        {canApplicantWithdraw(row.status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-rose-300 hover:text-rose-200"
                            disabled={withdrawingId === row.id}
                            onClick={() =>
                              void withdraw(
                                "staffing",
                                row.id,
                                row.job_posting?.title || "this role",
                              )
                            }
                          >
                            {withdrawingId === row.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            Withdraw
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}
