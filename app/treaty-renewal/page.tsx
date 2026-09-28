"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TreatyRenewalReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [sunsets, setSunsets] = useState<any[]>([])
  const [archives, setArchives] = useState<any>(null)
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-treaty-system-renewal/status"),
      fetch("/api/creator-treaty-system-renewal/readiness-packages"),
      fetch("/api/creator-treaty-system-renewal/sunset"),
      fetch("/api/creator-treaty-system-renewal/archives"),
      fetch("/api/creator-treaty-system-renewal/gated"),
    ])
      .then(async ([statusRes, pkgRes, sunsetRes, archRes, gatedRes]) => {
        if (cancelled) return
        if ([statusRes, pkgRes].every((res) => res.status === 404)) {
          setError("Treaty renewal modules are feature-flagged off.")
          return
        }
        if (statusRes.ok) {
          const json = await statusRes.json()
          setStatus(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (sunsetRes.ok) setSunsets((await sunsetRes.json()).data || [])
        if (archRes.ok) setArchives((await archRes.json()).data)
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!statusRes.ok && !pkgRes.ok)
          setError("Unable to load treaty renewal readiness.")
      })
      .catch(() => setError("Unable to load treaty renewal readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Treaty system renewal</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. No perpetual institution, live treaty renewal, or Phase 19 features exist. Silence never renews authority.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · cannot launch from Phase 17</Badge>
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
          <CardDescription>Blocked until ≥2 Phase 17 cycles, archive restore, and non-expired package</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.legalClaims || {}, null, 2)}</pre>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.activation || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness / approval packages</CardTitle>
          <CardDescription>future_phase18_approval_packages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {packages.length === 0 ? <p className="text-muted-foreground">No packages.</p> : null}
          {packages.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">
                {item.package_key} · {item.status} · cycles={item.repeated_phase17_cycles}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sunset decisions</CardTitle>
          <CardDescription>Non-perpetuity lifecycle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {sunsets.length === 0 ? <p className="text-muted-foreground">No sunset decisions.</p> : null}
          {sunsets.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.mode}</div>
              <div className="text-muted-foreground">{item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archives / restore drills</CardTitle>
          <CardDescription>Sandbox metadata only</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(archives || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Public activation, privileges, dissolution, Phase 19</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
