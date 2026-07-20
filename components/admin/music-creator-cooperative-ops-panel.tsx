"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorCooperativeOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-cooperative/ops")
    if (res.status === 404) {
      setError("Creator cooperative ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load creator cooperative ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load creator cooperative ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-cooperative/ops", {
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
        <CardTitle>Creator cooperative ops</CardTitle>
        <CardDescription>
          Kill switches for membership, vault, research, policy, collective readiness, and incident stops.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_membership")}>Kill membership</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_research")}>Kill research</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("privacy_incident_stop")}>Privacy stop</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("research_misconduct_stop")}>Misconduct stop</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_representation")}>Kill representation</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
