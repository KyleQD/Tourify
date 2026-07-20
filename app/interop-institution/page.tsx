"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function InteropInstitutionReadinessPage() {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [gated, setGated] = useState<any>(null)
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/creator-interoperability-institution/status"),
      fetch("/api/creator-interoperability-institution/readiness-packages"),
      fetch("/api/creator-interoperability-institution/participants"),
      fetch("/api/creator-interoperability-institution/services"),
      fetch("/api/creator-interoperability-institution/gated"),
    ])
      .then(async ([statusRes, pkgRes, partRes, svcRes, gatedRes]) => {
        if (cancelled) return
        if ([statusRes, pkgRes].every((res) => res.status === 404)) {
          setError("Interop institution modules are feature-flagged off.")
          return
        }
        if (statusRes.ok) {
          const json = await statusRes.json()
          setStatus(json.data)
          setDisclaimer(json.disclaimer || "")
        }
        if (pkgRes.ok) setPackages((await pkgRes.json()).data || [])
        if (partRes.ok) setParticipants((await partRes.json()).data || [])
        if (svcRes.ok) setServices((await svcRes.json()).data || [])
        if (gatedRes.ok) setGated((await gatedRes.json()).data)
        if (!statusRes.ok && !pkgRes.ok)
          setError("Unable to load interop institution readiness.")
      })
      .catch(() => setError("Unable to load interop institution readiness."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Global creator interoperability institution</h1>
        <p className="text-sm text-muted-foreground">
          Sandbox readiness only. No treaty system, international organization, privilege, formal depositary, or UN relationship exists.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <Badge variant="outline">Flags default off · cannot launch from Phase 15</Badge>
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
          <CardTitle>Readiness / approval packages</CardTitle>
          <CardDescription>future_phase16_approval_packages</CardDescription>
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
          <CardTitle>Participant authority evidence</CardTitle>
          <CardDescription>No live state membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {participants.length === 0 ? <p className="text-muted-foreground">No participants.</p> : null}
          {participants.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.participant_class}</div>
              <div className="text-muted-foreground">
                {item.authority_state} · live_membership={String(item.live_membership)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public-law service definitions</CardTitle>
          <CardDescription>Sandbox status only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {services.length === 0 ? <p className="text-muted-foreground">No services.</p> : null}
          {services.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.display_name}</div>
              <div className="text-muted-foreground">
                {item.service_key} · {item.status}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard-gated public-law surfaces</CardTitle>
          <CardDescription>Depositary, Article 102, UN, privileges, production</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(gated, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
