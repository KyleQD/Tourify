"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicInstitutionalOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/institutional/ops")
    if (res.status === 404) {
      setError("Institutional admin ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load institutional ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load institutional ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/institutional/ops", {
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
        <CardTitle>Music institutional ops</CardTitle>
        <CardDescription>
          Independent kill switches for deals, funds, bids, NAV, secondaries, tokenization, and cross-border modules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_deals")}>Kill deals</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_funds")}>Kill funds</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_bids")}>Kill bids</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_nav")}>Kill NAV</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
