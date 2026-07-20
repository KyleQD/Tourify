"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorProtocolConstitutionOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-protocol-constitution/ops")
    if (res.status === 404) {
      setError("Protocol constitution ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load protocol constitution ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load protocol constitution ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-protocol-constitution/ops", {
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
        <CardTitle>Protocol constitution ops</CardTitle>
        <CardDescription>
          Kill switches for membership, amendments, assets, succession crisis, and emergency sunset.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("fundamental_provision_freeze")}>Fundamental freeze</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("succession_crisis_stop")}>Succession crisis</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("emergency_sunset")}>Emergency sunset</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_amendments")}>Kill amendments</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_limited_production")}>Kill limited prod</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
