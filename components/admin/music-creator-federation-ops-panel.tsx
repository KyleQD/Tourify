"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorFederationOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-federation/ops")
    if (res.status === 404) {
      setError("Creator federation ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load creator federation ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load creator federation ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-federation/ops", {
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
        <CardTitle>Creator federation ops</CardTitle>
        <CardDescription>
          Kill switches for membership, credentials, mandates, directory, and partition/compromise stops.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_credentials")}>Kill credentials</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_mandates")}>Kill mandates</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("credential_compromise_stop")}>Credential compromise</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("federation_partition_stop")}>Partition stop</Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_representation")}>Kill representation</Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
