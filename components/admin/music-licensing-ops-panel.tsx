"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicLicensingOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/licensing/ops")
    if (res.status === 404) {
      setError("Licensing admin ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load licensing ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load licensing ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/licensing/ops", {
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
        <CardTitle>Music licensing ops</CardTitle>
        <CardDescription>
          Independent kill switches for availability, briefs, requests, quotes, agreements, delivery, cues, payments, AI, and DDEX.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_requests")}>Kill requests</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_quotes")}>Kill quotes</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_agreements")}>Kill agreements</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_delivery")}>Kill delivery</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_ai")}>Kill AI</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
