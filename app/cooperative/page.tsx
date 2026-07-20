"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function CooperativeReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [policy, setPolicy] = useState<any[]>([])
  const [collective, setCollective] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-cooperative/entities"),
      fetch("/api/creator-cooperative/membership"),
      fetch("/api/creator-cooperative/policy"),
      fetch("/api/creator-cooperative/collective"),
    ])
      .then(async ([entitiesRes, membershipRes, policyRes, collectiveRes]) => {
        if (cancelled) return
        if ([entitiesRes, membershipRes, policyRes, collectiveRes].every((res) => res.status === 404)) {
          setError("Creator cooperative modules are feature-flagged off.")
          return
        }
        if (entitiesRes.ok) {
          const json = await entitiesRes.json()
          setEntities(json.data || [])
          setDisclaimer(json.disclaimer || "")
        }
        if (membershipRes.ok) {
          const json = await membershipRes.json()
          setMemberships(json.data || [])
        }
        if (policyRes.ok) {
          const json = await policyRes.json()
          setPolicy(json.data || [])
        }
        if (collectiveRes.ok) {
          const json = await collectiveRes.json()
          setCollective(json.activation)
        }
        if (![entitiesRes, membershipRes, policyRes, collectiveRes].some((res) => res.ok))
          setError("Unable to load cooperative readiness.")
      })
      .catch(() => setError("Unable to load cooperative readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Creator cooperative readiness</h1>
        <p className="text-sm text-muted-foreground">
          Education, voluntary membership applications, contribution controls, and policy observatory. Tourify is not the cooperative entity.
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
          <CardTitle>Entity readiness</CardTitle>
          <CardDescription>Separate entity records — not Tourify account membership.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {entities.length === 0 ? <p className="text-muted-foreground">No entity readiness records.</p> : null}
          {entities.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.legal_name}</div>
              <div className="text-muted-foreground">
                {item.readiness_status} · production_authority={String(item.production_authority)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership & observatory</CardTitle>
          <CardDescription>{memberships.length} applications · {policy.length} policy sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {memberships.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.status}</div>
              <div className="text-muted-foreground">{item.membership_class}</div>
            </div>
          ))}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(collective, null, 2)}</pre>
          <Button asChild variant="outline">
            <Link href="/artist/music">Back to music</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
