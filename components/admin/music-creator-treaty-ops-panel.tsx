"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorTreatyOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-multilateral-treaty-operations/ops")
    if (res.status === 404) {
      setError("Treaty operations ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load treaty operations ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load treaty operations ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-multilateral-treaty-operations/ops", {
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
        <CardTitle>Treaty operations ops</CardTitle>
        <CardDescription>
          Kill switches for readiness, review, public-law claims, competence, depositary, and freeze.
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
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("competence_stop")}>
                Competence
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("depositary_stop")}>
                Depositary
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("treaty_ops_freeze")}>
                Treaty ops freeze
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_review")}>
                Kill review
              </Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
