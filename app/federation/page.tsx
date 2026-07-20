"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function FederationReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [activation, setActivation] = useState<any>(null)
  const [collective, setCollective] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-federation/entities"),
      fetch("/api/creator-federation/membership"),
      fetch("/api/creator-federation/collective"),
    ])
      .then(async ([entitiesRes, membershipRes, collectiveRes]) => {
        if (cancelled) return
        if ([entitiesRes, membershipRes].every((res) => res.status === 404)) {
          setError("Creator federation modules are feature-flagged off.")
          return
        }
        if (entitiesRes.ok) {
          const json = await entitiesRes.json()
          setEntities(json.data || [])
          setActivation(json.activation)
          setDisclaimer(json.disclaimer || "")
        }
        if (membershipRes.ok) {
          const json = await membershipRes.json()
          setMemberships(json.data || [])
        }
        if (collectiveRes.ok) {
          const json = await collectiveRes.json()
          setCollective(json.data)
        }
        if (!entitiesRes.ok && !membershipRes.ok)
          setError("Unable to load federation readiness.")
      })
      .catch(() => setError("Unable to load federation readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Creator governance federation</h1>
        <p className="text-sm text-muted-foreground">
          Bilateral federation-readiness sandbox. Local sovereignty is default-deny. No automatic pooling or representation.
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
          <CardTitle>Federation entities</CardTitle>
          <CardDescription>Separate from Tourify and Phase 9 cooperatives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {entities.length === 0 ? <p className="text-muted-foreground">No federation entities.</p> : null}
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
          <CardTitle>Org applications</CardTitle>
          <CardDescription>{memberships.length} applications · collective actions gated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {memberships.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.organization_name}</div>
              <div className="text-muted-foreground">{item.status}</div>
            </div>
          ))}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(collective, null, 2)}</pre>
          <Button asChild variant="outline">
            <Link href="/cooperative">Cooperative readiness</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
