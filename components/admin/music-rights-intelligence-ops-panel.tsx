"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicRightsIntelligenceOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/rights-intelligence/ops")
    if (res.status === 404) {
      setError("Rights intelligence ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load rights intelligence ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load rights intelligence ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/rights-intelligence/ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action_type, dual_control_required: true }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Music rights intelligence ops</CardTitle>
        <CardDescription>
          Independent kill switches for consent, cohorts, benchmarks, education, groups, clean rooms, and competition stop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_benchmarks")}>Kill benchmarks</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_groups")}>Kill groups</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("competition_stop")}>Competition stop</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_benchmark_public_publish")}>Kill public publish</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
