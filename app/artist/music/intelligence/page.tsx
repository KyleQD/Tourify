"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function ArtistMusicIntelligencePage() {
  const [error, setError] = useState<string | null>(null)
  const [consents, setConsents] = useState<any[]>([])
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [education, setEducation] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/rights-intelligence/consents"),
      fetch("/api/rights-intelligence/benchmarks"),
      fetch("/api/rights-intelligence/education"),
      fetch("/api/rights-intelligence/groups"),
    ])
      .then(async ([consentsRes, benchmarksRes, educationRes, groupsRes]) => {
        if (cancelled) return
        if ([consentsRes, benchmarksRes, educationRes, groupsRes].every((res) => res.status === 404)) {
          setError("Rights intelligence modules are feature-flagged off.")
          return
        }
        if (consentsRes.ok) {
          const json = await consentsRes.json()
          setConsents(json.data || [])
          setDisclaimer(json.disclaimer || "")
        }
        if (benchmarksRes.ok) {
          const json = await benchmarksRes.json()
          setBenchmarks(json.data || [])
        }
        if (educationRes.ok) {
          const json = await educationRes.json()
          setEducation(json.data || [])
        }
        if (groupsRes.ok) {
          const json = await groupsRes.json()
          setGroups(json.data || [])
        }
        if (![consentsRes, benchmarksRes, educationRes, groupsRes].some((res) => res.ok))
          setError("Unable to load rights intelligence.")
      })
      .catch(() => setError("Unable to load rights intelligence."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Rights intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Consent-gated education and aggregate benchmarks. Not legal advice, not pricing coordination, and not representation.
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
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Consent</CardTitle>
          <CardDescription>Purpose-specific consent is required before any intelligence use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {consents.length === 0 ? <p className="text-muted-foreground">No active consents.</p> : null}
          {consents.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.status}</div>
              <div className="text-muted-foreground">v{item.version}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benchmarks & education</CardTitle>
          <CardDescription>Historical descriptive aggregates only — never recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{benchmarks.length} benchmark releases · {education.length} education items</p>
          {groups.length === 0 ? <p className="text-muted-foreground">No readiness groups.</p> : null}
          {groups.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.state}</div>
              <div className="text-muted-foreground">
                external_action={String(item.external_action_enabled)} · {item.legal_status}
              </div>
            </div>
          ))}
          <Button asChild variant="outline">
            <Link href="/artist/music">Back to music</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
