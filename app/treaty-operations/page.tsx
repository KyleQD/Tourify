"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TreatyOperationsReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-multilateral-treaty-operations/status"),
      fetch("/api/creator-multilateral-treaty-operations/readiness-packages"),
      fetch("/api/creator-multilateral-treaty-operations/review-cycles"),
      fetch("/api/creator-multilateral-treaty-operations/gated"),
    ])
      .then(async ([statusRes, pkgRes, revRes, gatedRes]) => {
        if (cancelled) return
        if ([statusRes, pkgRes].every((res) => res.status === 404)) {
          setError("Treaty operations modules are feature-flagged off.")
          return
        }
        if (statusRes.ok) {
          const json = await statusRes.json()
          setStatus(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (revRes.ok) setReviews((await revRes.json()).data || [])
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!statusRes.ok && !pkgRes.ok)
          setError("Unable to load treaty operations readiness.")
      })
      .catch(() => setError("Unable to load treaty operations readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Multilateral treaty operations</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. No live treaty system, formal depositary, competence expansion, or collective authority exists.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · cannot launch from Phase 16</Badge>
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
          <CardDescription>Blocked until real multi-year evidence and exact scope/sunset</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.legalClaims || {}, null, 2)}</pre>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status?.activation || {}, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness / approval packages</CardTitle>
          <CardDescription>future_phase17_approval_packages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {packages.length === 0 ? <p className="text-muted-foreground">No packages.</p> : null}
          {packages.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">
                {item.package_key} · {item.status} · multi_year=
                {String(item.multi_year_evidence_verified)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Periodic review cycles</CardTitle>
          <CardDescription>Sandbox only — review cannot expand competence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {reviews.length === 0 ? <p className="text-muted-foreground">No review cycles.</p> : null}
          {reviews.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.review_state}</div>
              <div className="text-muted-foreground">mandate={item.mandate_status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated public-law surfaces</CardTitle>
          <CardDescription>Depositary, Article 102, competence, collective authority, activation</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
