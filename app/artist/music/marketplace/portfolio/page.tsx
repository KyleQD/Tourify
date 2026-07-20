"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function MarketplacePortfolioPage() {
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/music-marketplace/portfolio")
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setEnabled(false)
          setError("Investor portal is feature-flagged off.")
          return
        }
        if (!res.ok) {
          setError("Unable to load portfolio.")
          return
        }
        setEnabled(true)
        setPayload(await res.json())
      })
      .catch(() => setError("Unable to load portfolio."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Investor portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Synchronized positions, distributions, and tax-document links. Official ownership remains with the transfer agent.
        </p>
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
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
              <Link href="/artist/music/marketplace">Back</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Read model</CardTitle>
            <CardDescription>{payload?.ownershipNote}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{payload?.disclaimer}</p>
            <div>
              <div className="font-medium">Positions</div>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(payload?.data?.positions || [], null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-medium">Distributions</div>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(payload?.data?.distributions || [], null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-medium">Tax document links</div>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(payload?.data?.taxDocumentLinks || [], null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
