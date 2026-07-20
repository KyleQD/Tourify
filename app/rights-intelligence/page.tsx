"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function RightsIntelligenceEnterprisePage() {
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [collective, setCollective] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/rights-intelligence/metrics"),
      fetch("/api/rights-intelligence/alerts"),
      fetch("/api/rights-intelligence/collective"),
    ])
      .then(async ([metricsRes, alertsRes, collectiveRes]) => {
        if (cancelled) return
        if (metricsRes.status === 404 && alertsRes.status === 404) {
          setError("Enterprise rights intelligence is feature-flagged off.")
          return
        }
        if (metricsRes.ok) {
          const json = await metricsRes.json()
          setMetrics(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (alertsRes.ok) {
          const json = await alertsRes.json()
          setAlerts(json.data || [])
        }
        if (collectiveRes.ok) {
          const json = await collectiveRes.json()
          setCollective(json.data)
        }
        if (!metricsRes.ok && !alertsRes.ok)
          setError("Unable to load rights intelligence workspace.")
      })
      .catch(() => setError("Unable to load rights intelligence workspace."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Rights intelligence portal</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate benchmarks, policy education, and negotiation readiness. Tourify is not a union, CMO, rate bureau, or bargaining representative.
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Metric runs</CardTitle>
          <CardDescription>Approved metric definitions and runs only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {(metrics?.definitions || []).length} definitions · {(metrics?.runs || []).length} approved runs
          </p>
          <p className="text-muted-foreground">{alerts.length} educational alerts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collective readiness stubs</CardTitle>
          <CardDescription>External collective action remains counsel/entity gated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(collective, null, 2)}</pre>
          <Button asChild variant="outline">
            <Link href="/artist/music/intelligence">Creator intelligence</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
