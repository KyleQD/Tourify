"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function RightsAdminEnterprisePage() {
  const [error, setError] = useState<string | null>(null)
  const [cases, setCases] = useState<any[]>([])
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/rights-admin/cases"),
      fetch("/api/rights-admin/deadlines"),
    ])
      .then(async ([casesRes, deadlinesRes]) => {
        if (cancelled) return
        if (casesRes.status === 404) {
          setError("Enterprise rights admin is feature-flagged off.")
          return
        }
        if (!casesRes.ok) {
          setError("Unable to load rights admin workspace.")
          return
        }
        const casesJson = await casesRes.json()
        setCases(casesJson.data || [])
        setDisclaimer(casesJson.disclaimer || "")
        if (deadlinesRes.ok) {
          const d = await deadlinesRes.json()
          setDeadlines(d.data?.openDeadlines || [])
        }
      })
      .catch(() => setError("Unable to load rights admin workspace."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Rights administration portal</h1>
        <p className="text-sm text-muted-foreground">
          Enterprise case queues, deadlines, and partner-led registration/claims. Tourify is not a CMO, counsel, or collection fiduciary.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <MusicTrustFlagOffNote enabled={false} showStagingHint={Boolean(error)} />
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <MusicTrustFlagOffNote enabled={false} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Case queue</CardTitle>
              <CardDescription>External actions require active mandate and human review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {cases.length === 0 ? <p className="text-muted-foreground">No cases.</p> : null}
              {cases.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="font-medium">{item.case_type}</div>
                  <div className="text-muted-foreground">{item.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open deadlines</CardTitle>
              <CardDescription>DMCA and statutory deadlines are monitored; missing partners stay blocked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deadlines.length === 0 ? <p className="text-muted-foreground">No open deadlines.</p> : null}
              {deadlines.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="font-medium">{item.deadline_type}</div>
                  <div className="text-muted-foreground">{item.due_at}</div>
                </div>
              ))}
              <Button asChild variant="outline" size="sm">
                <Link href="/artist/music/rights-admin">Artist catalog health</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
