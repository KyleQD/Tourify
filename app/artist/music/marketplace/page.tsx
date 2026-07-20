"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

interface IssuerRow {
  id: string
  legal_name: string
  status: string
  readiness_score: number
  deficiency_codes: string[]
}

interface OfferingRow {
  id: string
  public_id: string
  pathway: string | null
  status: string
  liquidity_label: string
  accepts_subscriptions: boolean
}

export default function ArtistMusicMarketplacePage() {
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuers, setIssuers] = useState<IssuerRow[]>([])
  const [offerings, setOfferings] = useState<OfferingRow[]>([])
  const [disclaimer, setDisclaimer] = useState(
    "No liquidity, appreciation, income, or exit is guaranteed.",
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [issuerRes, offeringRes] = await Promise.all([
        fetch("/api/music-marketplace/issuers"),
        fetch("/api/music-marketplace/offerings"),
      ])
      if (cancelled) return
      if (issuerRes.status === 404 || offeringRes.status === 404) {
        setEnabled(false)
        setError("Marketplace offerings are feature-flagged off.")
        return
      }
      if (!issuerRes.ok || !offeringRes.ok) {
        setError("Unable to load marketplace workspace.")
        return
      }
      const issuerJson = await issuerRes.json()
      const offeringJson = await offeringRes.json()
      setEnabled(true)
      setIssuers(issuerJson.data || [])
      setOfferings(offeringJson.data || [])
      if (offeringJson.disclaimer) setDisclaimer(offeringJson.disclaimer)
    }
    load().catch(() => setError("Unable to load marketplace workspace."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Music marketplace (issuer)</h1>
        <p className="text-sm text-muted-foreground">
          Partner-led primary offering workspace. Tourify does not operate a matching engine, custody, or escrow.
        </p>
        <p className="text-sm text-muted-foreground">{disclaimer}</p>
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
        <Badge variant="outline">Securities ≠ music downloads</Badge>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MusicTrustFlagOffNote enabled={false} />
            <Button asChild variant="outline">
              <Link href="/artist/music">Back to music</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Issuers</CardTitle>
              <CardDescription>Eligibility and pathway decisions required before launch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {issuers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issuers yet.</p>
              ) : (
                issuers.map((issuer) => (
                  <div key={issuer.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{issuer.legal_name}</div>
                    <div className="text-muted-foreground">
                      {issuer.status} · readiness {issuer.readiness_score}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offerings</CardTitle>
              <CardDescription>Immutable disclosures and regulated partner IDs required to go live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {offerings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No offerings yet.</p>
              ) : (
                offerings.map((offering) => (
                  <div key={offering.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{offering.public_id}</div>
                    <div className="text-muted-foreground">
                      {offering.status} · {offering.pathway || "pathway pending"} · {offering.liquidity_label}
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="outline">
                <Link href="/artist/music/marketplace/portfolio">Investor portfolio read model</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
