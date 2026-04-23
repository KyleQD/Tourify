"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Briefcase } from 'lucide-react'

export default function MyApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [artist, setArtist] = useState<any[]>([])
  const [venue, setVenue] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/me/applications', { credentials: 'include' })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load')
        if (!cancelled) {
          setArtist(json.data?.artist_applications ?? [])
          setVenue(json.data?.venue_applications ?? [])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Jobs
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-purple-400" />
          <h1 className="text-2xl font-semibold">My applications</h1>
        </div>
        <p className="text-slate-400 text-sm">Artist board and venue staffing applications tied to your account.</p>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : error ? (
          <Card className="border-red-900/50 bg-red-950/30">
            <CardContent className="p-4 text-red-200">{error}</CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-medium text-white">Artist board</h2>
              {artist.length === 0 ? (
                <p className="text-slate-500 text-sm">No artist job applications yet.</p>
              ) : (
                <div className="space-y-3">
                  {artist.map((row) => (
                    <Card key={row.id} className="border-slate-800 bg-slate-900/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-white">
                          {row.job?.title || 'Job'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {row.status}
                        </Badge>
                        <span className="text-slate-400">
                          Applied {row.applied_at ? new Date(row.applied_at).toLocaleDateString() : '—'}
                        </span>
                        {row.job?.id ? (
                          <Button variant="link" className="h-auto p-0 text-purple-400" asChild>
                            <Link href={`/jobs/${row.job.id}?source=artist`}>View job</Link>
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-medium text-white">Venue staffing</h2>
              {venue.length === 0 ? (
                <p className="text-slate-500 text-sm">No staffing applications yet.</p>
              ) : (
                <div className="space-y-3">
                  {venue.map((row) => (
                    <Card key={row.id} className="border-slate-800 bg-slate-900/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-white">
                          {row.job_posting?.title || 'Role'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {row.status}
                        </Badge>
                        <span className="text-slate-400">
                          Applied {row.applied_at ? new Date(row.applied_at).toLocaleDateString() : '—'}
                        </span>
                        {row.job_posting_id ? (
                          <Button variant="link" className="h-auto p-0 text-purple-400" asChild>
                            <Link href={`/jobs/${row.job_posting_id}?source=venue`}>View posting</Link>
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
