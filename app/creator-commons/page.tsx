"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function CreatorCommonsReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [stewards, setStewards] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [protocols, setProtocols] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [activation, setActivation] = useState<any>(null)
  const [gated, setGated] = useState<any>(null)
  const [transition, setTransition] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-digital-commons/stewards"),
      fetch("/api/creator-digital-commons/participation"),
      fetch("/api/creator-digital-commons/assets"),
      fetch("/api/creator-digital-commons/protocols"),
      fetch("/api/creator-digital-commons/registry"),
      fetch("/api/creator-digital-commons/transition"),
      fetch("/api/creator-digital-commons/gated"),
    ])
      .then(async ([stewardsRes, participationRes, assetsRes, protocolsRes, registryRes, transitionRes, gatedRes]) => {
        if (cancelled) return
        if ([stewardsRes, participationRes].every((res) => res.status === 404)) {
          setError("Creator digital commons modules are feature-flagged off.")
          return
        }
        if (stewardsRes.ok) {
          const json = await stewardsRes.json()
          setStewards(json.data || [])
          setActivation(json.activation)
          setDisclaimer(json.disclaimer || "")
        }
        if (participationRes.ok) {
          const json = await participationRes.json()
          setParticipations(json.data || [])
        }
        if (assetsRes.ok) {
          const json = await assetsRes.json()
          setAssets(json.data || [])
        }
        if (protocolsRes.ok) setProtocols((await protocolsRes.json()).data)
        if (registryRes.ok) setRegistry((await registryRes.json()).data)
        if (transitionRes.ok) setTransition((await transitionRes.json()).data)
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!stewardsRes.ok && !participationRes.ok)
          setError("Unable to load digital commons readiness.")
      })
      .catch(() => setError("Unable to load digital commons readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Global creator digital commons</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox multilateral stewardship readiness. No irreversible asset transfer. No production commons launch.
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
          <CardTitle>Steward entity readiness</CardTitle>
          <CardDescription>Separate steward required for production — Tourify is optional provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {stewards.length === 0 ? <p className="text-muted-foreground">No steward entities.</p> : null}
          {stewards.map((item) => (
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
          <CardDescription>{participations.length} records · never implied by Tourify or Phase 11</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {participations.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.status}</div>
              <div className="text-muted-foreground">policy {item.policy_version}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critical asset inventory</CardTitle>
          <CardDescription>Public projections only — transfer hard-disabled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {assets.length === 0 ? <p className="text-muted-foreground">No assets inventoried.</p> : null}
          {assets.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.display_name}</div>
              <div className="text-muted-foreground">{item.asset_kind} · {item.transfer_status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protocols & registry</CardTitle>
          <CardDescription>Sandbox change control and minimized projections</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify({ protocols, registry }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tourify-exit / transition escrow</CardTitle>
          <CardDescription>Checklist planner — release blocked</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(transition, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated surfaces</CardTitle>
          <CardDescription>Irreversible transfer, universal ID, collective action, limited production</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
