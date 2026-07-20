"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function InteropConventionReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [networks, setNetworks] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [recognitions, setRecognitions] = useState<any[]>([])
  const [activation, setActivation] = useState<any>(null)
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-interoperability-convention/networks"),
      fetch("/api/creator-interoperability-convention/approval-packages"),
      fetch("/api/creator-interoperability-convention/recognition"),
      fetch("/api/creator-interoperability-convention/gated"),
    ])
      .then(async ([netRes, pkgRes, recRes, gatedRes]) => {
        if (cancelled) return
        if ([netRes, pkgRes].every((res) => res.status === 404)) {
          setError("Interop convention modules are feature-flagged off.")
          return
        }
        if (netRes.ok) {
          const json = await netRes.json()
          setNetworks(json.data || [])
          setActivation(json.activation)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (recRes.ok) setRecognitions((await recRes.json()).data || [])
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!netRes.ok && !pkgRes.ok)
          setError("Unable to load interop convention readiness.")
      })
      .catch(() => setError("Unable to load interop convention readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Global creator interoperability convention</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. Not a treaty. Not universal representation. Cannot launch from Phase 13 flags.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · derived package</Badge>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Networks</CardTitle>
          <CardDescription>Inter-network registry stubs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {networks.length === 0 ? <p className="text-muted-foreground">No networks.</p> : null}
          {networks.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.display_name}</div>
              <div className="text-muted-foreground">
                {item.status} · treaty_claim={String(item.claims_treaty_status)}
              </div>
            </div>
          ))}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(activation, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval packages</CardTitle>
          <CardDescription>future_phase14_approval_packages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {packages.length === 0 ? <p className="text-muted-foreground">No approval packages.</p> : null}
          {packages.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">{item.package_key} · {item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mutual recognition</CardTitle>
          <CardDescription>Phase 13 constitutions as inputs only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {recognitions.length === 0 ? <p className="text-muted-foreground">No recognitions.</p> : null}
          {recognitions.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.source_id}</div>
              <div className="text-muted-foreground">{item.status} · {item.purpose}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Treaty, universal representation, state/IO, limited production</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
