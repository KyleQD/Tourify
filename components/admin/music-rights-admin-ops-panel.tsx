"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicRightsAdminOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/rights-admin/ops")
    if (res.status === 404) {
      setError("Rights admin ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load rights admin ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load rights admin ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/rights-admin/ops", {
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
        <CardTitle>Music rights admin ops</CardTitle>
        <CardDescription>
          Independent kill switches for mandates, registration, claims, enforcement, DMCA, settlements, and automation gates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_registration")}>Kill registration</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_claims")}>Kill claims</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_dmca")}>Kill DMCA</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_auto_takedown")}>Kill auto-takedown</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_litigation")}>Kill litigation</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
