"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function InteropOrganizationReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [authorities, setAuthorities] = useState<any[]>([])
  const [instruments, setInstruments] = useState<any[]>([])
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-interoperability-organization/status"),
      fetch("/api/creator-interoperability-organization/feasibility-packages"),
      fetch("/api/creator-interoperability-organization/participant-authority"),
      fetch("/api/creator-interoperability-organization/instruments"),
      fetch("/api/creator-interoperability-organization/gated"),
    ])
      .then(async ([statusRes, pkgRes, authRes, instRes, gatedRes]) => {
        if (cancelled) return
        if ([statusRes, pkgRes].every((res) => res.status === 404)) {
          setError("Interop organization modules are feature-flagged off.")
          return
        }
        if (statusRes.ok) {
          const json = await statusRes.json()
          setStatus(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (authRes.ok) setAuthorities((await authRes.json()).data || [])
        if (instRes.ok) setInstruments((await instRes.json()).data || [])
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!statusRes.ok && !pkgRes.ok)
          setError("Unable to load interop organization readiness.")
      })
      .catch(() => setError("Unable to load interop organization readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Global creator interoperability organization</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. No international organization, treaty, privilege, immunity, member-state status, or UN relationship exists.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · cannot launch from Phase 14</Badge>
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
          <CardTitle>Legal character status</CardTitle>
          <CardDescription>Blocked labels until instruments are effective</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.legalClaims || {}, null, 2)}</pre>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.activation || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feasibility / approval packages</CardTitle>
          <CardDescription>future_phase15_approval_packages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {packages.length === 0 ? <p className="text-muted-foreground">No packages.</p> : null}
          {packages.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">
                {item.package_key} · {item.status} · {item.legal_character}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participant authority</CardTitle>
          <CardDescription>Sandbox records — no inferred membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {authorities.length === 0 ? <p className="text-muted-foreground">No authorities.</p> : null}
          {authorities.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.participant_external_ref}</div>
              <div className="text-muted-foreground">
                {item.participant_class} · canBind={String(item.canBind)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Constitutive instruments</CardTitle>
          <CardDescription>Draft sandbox only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {instruments.length === 0 ? <p className="text-muted-foreground">No instruments.</p> : null}
          {instruments.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">v{item.version}</div>
              <div className="text-muted-foreground">{item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated public-law surfaces</CardTitle>
          <CardDescription>Treaty, privileges, UN, diplomatic, production</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
