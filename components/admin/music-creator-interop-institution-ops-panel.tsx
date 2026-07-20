"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MusicCreatorInteropInstitutionOpsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/creator-interoperability-institution/ops")
    if (res.status === 404) {
      setError("Interop institution ops are feature-flagged off.")
      return
    }
    if (!res.ok) {
      setError("Unable to load interop institution ops.")
      return
    }
    setData(await res.json())
    setError(null)
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load interop institution ops."))
  }, [])

  async function kill(action_type: string) {
    setBusy(true)
    try {
      await fetch("/api/admin/creator-interoperability-institution/ops", {
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
        <CardTitle>Interop institution ops</CardTitle>
        <CardDescription>
          Kill switches for readiness, public-law claims, depositary, UN relationship, and institution freeze.
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
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("depositary_stop")}>
                Depositary
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("un_relationship_stop")}>
                UN relationship
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("institution_freeze")}>
                Institution freeze
              </Button>
              <Button disabled={busy} size="sm" variant="destructive" onClick={() => kill("kill_switch_services")}>
                Kill services
              </Button>
            </div>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.data, null, 2)}</pre>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
