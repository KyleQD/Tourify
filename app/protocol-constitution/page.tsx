"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function ProtocolConstitutionReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [constitutions, setConstitutions] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [amendments, setAmendments] = useState<any[]>([])
  const [activation, setActivation] = useState<any>(null)
  const [succession, setSuccession] = useState<any>(null)
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-protocol-constitution/constitutions"),
      fetch("/api/creator-protocol-constitution/membership"),
      fetch("/api/creator-protocol-constitution/amendments"),
      fetch("/api/creator-protocol-constitution/succession"),
      fetch("/api/creator-protocol-constitution/gated"),
    ])
      .then(async ([constRes, memRes, amendRes, succRes, gatedRes]) => {
        if (cancelled) return
        if ([constRes, memRes].every((res) => res.status === 404)) {
          setError("Protocol constitution modules are feature-flagged off.")
          return
        }
        if (constRes.ok) {
          const json = await constRes.json()
          setConstitutions(json.data || [])
          setActivation(json.activation)
          setDisclaimer(json.disclaimer || "")
        }
        if (memRes.ok) setMemberships((await memRes.json()).data || [])
        if (amendRes.ok) setAmendments((await amendRes.json()).data || [])
        if (succRes.ok) setSuccession((await succRes.json()).data)
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!constRes.ok && !memRes.ok)
          setError("Unable to load protocol constitution readiness.")
      })
      .catch(() => setError("Unable to load protocol constitution readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Protocol constitutional stewardship</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox constitutional readiness. Not a treaty. No irreversible asset transfer. No permanent emergency override.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <MusicTrustFlagOffNote enabled={false} showStagingHint={Boolean(error)} />
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <MusicTrustFlagOffNote enabled={false} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Constitution drafts</CardTitle>
          <CardDescription>Separate steward required — Tourify is optional provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {constitutions.length === 0 ? <p className="text-muted-foreground">No constitutions.</p> : null}
          {constitutions.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.legal_name || "Untitled"}</div>
              <div className="text-muted-foreground">
                {item.status} · charter {item.charter_version} · production_authority={String(item.production_authority)}
              </div>
            </div>
          ))}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(activation, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compact membership</CardTitle>
          <CardDescription>{memberships.length} applications · never implied by Phase 12</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {memberships.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.organization_name}</div>
              <div className="text-muted-foreground">{item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amendments</CardTitle>
          <CardDescription>Classification sandbox — fundamental blocked without package</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {amendments.length === 0 ? <p className="text-muted-foreground">No amendment proposals.</p> : null}
          {amendments.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">{item.amendment_class} · {item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Succession / fork drills</CardTitle>
          <CardDescription>Tourify-unavailable continuity planner — release blocked</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(succession, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Emergency override, universal ID, collective action, limited production</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
