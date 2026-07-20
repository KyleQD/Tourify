"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function ArtistCatalogCapitalPage() {
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [cases, setCases] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/institutional/opportunities")
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setEnabled(false)
          setError("Catalog capital deals are feature-flagged off.")
          return
        }
        if (!res.ok) {
          setError("Unable to load catalog capital.")
          return
        }
        const json = await res.json()
        setEnabled(true)
        setCases(json.data || [])
      })
      .catch(() => setError("Unable to load catalog capital."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog capital</h1>
        <p className="text-sm text-muted-foreground">
          Prepare institutional transaction cases with immutable Phase 2/3 snapshots. Separate from music download marketplace and Phase 4 retail offerings.
        </p>
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your cases</CardTitle>
          <CardDescription>{error || "Draft cases require classification before marketing or closing."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!error && cases.length === 0 ? <p className="text-muted-foreground">No cases yet.</p> : null}
          {cases.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">{item.status} · {item.classification_status}</div>
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
