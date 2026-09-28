"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorTreatyLegacyOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-treaty-system-legacy/ops")
    if (res.status === 404) {
      setError("Treaty legacy ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load treaty legacy ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load treaty legacy ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-treaty-system-legacy/ops", {
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
        <CardTitle>Treaty legacy ops</CardTitle>
        <CardDescription>
          Kill switches for readiness, custody, identifiers, public-law claims, and legacy freeze.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-muted-foreground">{error}</p> : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("public_law_claim_stop")}>
                Public-law claim
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("legacy_freeze")}>
                Legacy freeze
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_custody")}>
                Kill custody
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_identifiers")}>
                Kill identifiers
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_readiness")}>
                Kill readiness
              </Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
