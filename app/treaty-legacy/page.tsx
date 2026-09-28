"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TreatyLegacyReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [custody, setCustody] = useState<any>(null)
  const [identifiers, setIdentifiers] = useState<any>(null)
  const [ethics, setEthics] = useState<any[]>([])
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-treaty-system-legacy/status"),
      fetch("/api/creator-treaty-system-legacy/readiness-packages"),
      fetch("/api/creator-treaty-system-legacy/custody"),
      fetch("/api/creator-treaty-system-legacy/identifiers"),
      fetch("/api/creator-treaty-system-legacy/ethics"),
      fetch("/api/creator-treaty-system-legacy/gated"),
    ])
      .then(async ([statusRes, pkgRes, custodyRes, idRes, ethicsRes, gatedRes]) => {
        if (cancelled) return
        if ([statusRes, pkgRes].every((res) => res.status === 404)) {
          setError("Treaty legacy modules are feature-flagged off.")
          return
        }
        if (statusRes.ok) {
          const json = await statusRes.json()
          setStatus(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (custodyRes.ok) setCustody((await custodyRes.json()).data)
        if (idRes.ok) setIdentifiers((await idRes.json()).data)
        if (ethicsRes.ok) setEthics((await ethicsRes.json()).data || [])
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!statusRes.ok && !pkgRes.ok)
          setError("Unable to load treaty legacy readiness.")
      })
      .catch(() => setError("Unable to load treaty legacy readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Treaty system legacy</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. No perpetual authority, future-person representation, or Phase 20 features exist.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · cannot launch from Phase 18</Badge>
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
          <CardTitle>Legal character / activation</CardTitle>
          <CardDescription>Blocked until Phase 18 proofs and century-scale package criteria complete</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.legalClaims || {}, null, 2)}</pre>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.activation || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness / approval packages</CardTitle>
          <CardDescription>future_phase19_approval_packages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {packages.length === 0 ? <p className="text-muted-foreground">No packages.</p> : null}
          {packages.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">
                {item.package_key} · {item.status} · archives={item.independent_archives_count}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Successor custody</CardTitle>
          <CardDescription>Sandbox metadata only</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(custody || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identifier / protocol resolution</CardTitle>
          <CardDescription>No universal identity or ownership adjudication</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(identifiers || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sensitive archive ethics</CardTitle>
          <CardDescription>Public dump hard-disabled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ethics.length === 0 ? <p className="text-muted-foreground">No ethics reviews.</p> : null}
          {ethics.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.review_key}</div>
              <div className="text-muted-foreground">{item.status} · {item.purpose}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Perpetual authority, future persons, century-scale launch, Phase 20</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
