"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function PublicInfrastructureReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [identifiers, setIdentifiers] = useState<any[]>([])
  const [activation, setActivation] = useState<any>(null)
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-public-infrastructure/entities"),
      fetch("/api/creator-public-infrastructure/participation"),
      fetch("/api/creator-public-infrastructure/identifiers"),
      fetch("/api/creator-public-infrastructure/gated"),
    ])
      .then(async ([entitiesRes, participationRes, identifiersRes, gatedRes]) => {
        if (cancelled) return
        if ([entitiesRes, participationRes].every((res) => res.status === 404)) {
          setError("Creator public-infrastructure modules are feature-flagged off.")
          return
        }
        if (entitiesRes.ok) {
          const json = await entitiesRes.json()
          setEntities(json.data || [])
          setActivation(json.activation)
          setDisclaimer(json.disclaimer || "")
        }
        if (participationRes.ok) {
          const json = await participationRes.json()
          setParticipations(json.data || [])
        }
        if (identifiersRes.ok) {
          const json = await identifiersRes.json()
          setIdentifiers(json.data || [])
        }
        if (gatedRes.ok) {
          const json = await gatedRes.json()
          setGated(json.data)
        }
        if (!entitiesRes.ok && !participationRes.ok)
          setError("Unable to load public-infrastructure readiness.")
      })
      .catch(() => setError("Unable to load public-infrastructure readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Global creator public infrastructure</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. Optional participation, sandbox identifiers, trust projections, and rights-reference status views.
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
          <CardTitle>Public-interest entity readiness</CardTitle>
          <CardDescription>Production commons require a separate entity — Tourify is optional tech provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {entities.length === 0 ? <p className="text-muted-foreground">No infrastructure entities.</p> : null}
          {entities.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.legal_name}</div>
              <div className="text-muted-foreground">
                {item.status} · production_authority={String(item.production_authority)}
              </div>
            </div>
          ))}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(activation, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
          <CardDescription>{participations.length} records · never implied by Tourify or Phase 8–10</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {participations.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.status}</div>
              <div className="text-muted-foreground">terms {item.terms_version}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox identifiers</CardTitle>
          <CardDescription>References only — not ownership proof</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {identifiers.length === 0 ? <p className="text-muted-foreground">No sandbox identifiers.</p> : null}
          {identifiers.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium break-all">{item.public_identifier}</div>
              <div className="text-muted-foreground">{item.method} · {item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Universal ID, global mandate, collective action, funding, regulator</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
