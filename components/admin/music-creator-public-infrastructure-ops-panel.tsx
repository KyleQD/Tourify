"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorPublicInfrastructureOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-public-infrastructure/ops")
    if (res.status === 404) {
      setError("Creator public-infrastructure ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load creator public-infrastructure ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load creator public-infrastructure ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-public-infrastructure/ops", {
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
        <CardTitle>Creator public infrastructure ops</CardTitle>
        <CardDescription>
          Kill switches for participation, identifiers, trust, resolver, directory, and compromise stops.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_identifiers")}>Kill identifiers</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_trust")}>Kill trust</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("identifier_abuse_stop")}>Identifier abuse</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("trust_compromise_stop")}>Trust compromise</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_public_api")}>Kill public API</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
