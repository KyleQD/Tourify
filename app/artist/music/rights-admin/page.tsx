"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function ArtistMusicRightsAdminPage() {
  const [error, setError] = useState<string | null>(null)
  const [cases, setCases] = useState<any[]>([])
  const [mandates, setMandates] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/rights-admin/cases"),
      fetch("/api/rights-admin/mandates"),
    ])
      .then(async ([casesRes, mandatesRes]) => {
        if (cancelled) return
        if (casesRes.status === 404 && mandatesRes.status === 404) {
          setError("Rights administration modules are feature-flagged off.")
          return
        }
        if (casesRes.ok) {
          const json = await casesRes.json()
          setCases(json.data || [])
          setDisclaimer(json.disclaimer || "")
        }
        if (mandatesRes.ok) {
          const json = await mandatesRes.json()
          setMandates(json.data || [])
        }
        if (!casesRes.ok && !mandatesRes.ok)
          setError("Unable to load rights administration.")
      })
      .catch(() => setError("Unable to load rights administration."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Rights administration</h1>
        <p className="text-sm text-muted-foreground">
          Catalog health, registrations, claims, and protection. A Rights Passport is evidence — not an administration mandate.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <MusicTrustFlagOffNote enabled={false} showStagingHint={Boolean(error)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>{error || "Cases require an active written mandate before external submission."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!error && cases.length === 0 ? <p className="text-muted-foreground">No cases yet.</p> : null}
          {cases.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.case_type}</div>
              <div className="text-muted-foreground">{item.status} · {item.workflow_module}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protection & mandates</CardTitle>
          <CardDescription>Matches and confidence scores are not infringement findings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {mandates.length === 0 ? <p className="text-muted-foreground">No mandates on file.</p> : null}
          {mandates.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.status}</div>
              <div className="text-muted-foreground">
                {(item.service_codes || []).join(", ") || "no services"} · v{item.version}
              </div>
            </div>
          ))}
          <Button asChild variant="outline">
            <Link href="/artist/music">Back to music</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
