"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicMarketplaceOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/music-marketplace/ops")
    if (res.status === 404) {
      setError("Admin marketplace ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load marketplace ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load marketplace ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/music-marketplace/ops", {
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
        <CardTitle>Music marketplace ops</CardTitle>
        <CardDescription>
          Partner-led shell controls. Kill switches disable offerings, subscriptions, transfers, and secondary sync independently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} variant="destructive" size="sm" onClick={() => kill("kill_switch_offerings")}>
                Kill offerings
              </Button>
              <Button disabled={busy} variant="destructive" size="sm" onClick={() => kill("kill_switch_subscriptions")}>
                Kill subscriptions
              </Button>
              <Button disabled={busy} variant="destructive" size="sm" onClick={() => kill("kill_switch_secondary")}>
                Kill secondary sync
              </Button>
              <Button disabled={busy} variant="destructive" size="sm" onClick={() => kill("kill_switch_transfers")}>
                Kill transfers
              </Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
