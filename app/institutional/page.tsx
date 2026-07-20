"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function InstitutionalHomePage() {
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/institutional/opportunities")
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setEnabled(false)
          setError("Institutional deals are feature-flagged off.")
          return
        }
        if (!res.ok) {
          setError("Unable to load institutional workspace.")
          return
        }
        const json = await res.json()
        setEnabled(true)
        setOpportunities(json.data || [])
        setDisclaimer(json.disclaimer || "")
      })
      .catch(() => setError("Unable to load institutional workspace."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Institutional catalog capital</h1>
        <p className="text-sm text-muted-foreground">
          Partner-led diligence, underwriting, and fund synchronization. Tourify does not act as adviser, broker-dealer, ATS, custodian, or fund administrator.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
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
        <Card>
          <CardHeader>
            <CardTitle>Opportunities</CardTitle>
            <CardDescription>Classification required before bids, subscriptions, or closing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No opportunities yet.</p>
            ) : (
              opportunities.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-muted-foreground">
                    {item.status} · {item.classification_status} · {item.approved_path || "unclassified"}
                  </div>
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/institutional/opportunities">Browse opportunities</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/artist/music/catalog-capital">Artist catalog capital</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
