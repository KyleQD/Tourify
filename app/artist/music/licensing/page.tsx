"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function ArtistMusicLicensingPage() {
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [availability, setAvailability] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/licensing/availability"),
      fetch("/api/licensing/requests"),
    ])
      .then(async ([availRes, reqRes]) => {
        if (cancelled) return
        if (availRes.status === 404 && reqRes.status === 404) {
          setEnabled(false)
          setError("Licensing modules are feature-flagged off.")
          return
        }
        if (availRes.ok) {
          const json = await availRes.json()
          setAvailability(json.data || [])
        }
        if (reqRes.ok) {
          const json = await reqRes.json()
          setRequests(json.data || [])
        }
        if (availRes.ok || reqRes.ok) setEnabled(true)
        if (!availRes.ok && !reqRes.ok)
          setError("Unable to load artist licensing.")
      })
      .catch(() => setError("Unable to load artist licensing."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Music licensing</h1>
        <p className="text-sm text-muted-foreground">
          Configure availability and review inbound clearance requests. Passport claims are evidence, not automatic authority.
        </p>
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
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
          <CardTitle>Availability inventory</CardTitle>
          <CardDescription>{error || "Default deny when authority is incomplete, disputed, or expired."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!error && availability.length === 0 ? <p className="text-muted-foreground">No availability rows.</p> : null}
          {availability.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.right_category}</div>
              <div className="text-muted-foreground">{item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inbound requests</CardTitle>
          <CardDescription>Quotes and approvals are not licences until an agreement is effective.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {requests.length === 0 ? <p className="text-muted-foreground">No requests yet.</p> : null}
          {requests.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.workflow_module || item.license_class || "request"}</div>
              <div className="text-muted-foreground">
                {item.status} · {item.classification_status}
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
